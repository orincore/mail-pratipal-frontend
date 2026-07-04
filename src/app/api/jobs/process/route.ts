import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import EmailSubscriber from "@/models/EmailSubscriber";
import EmailCampaign from "@/models/EmailCampaign";
import EmailTemplate from "@/models/EmailTemplate";
import EmailAutomation, { IAutomationStep } from "@/models/EmailAutomation";
import EmailEvent from "@/models/EmailEvent";
import { getEmailProvider } from "@/providers/provider-factory";
import { prepareEmailHtml } from "@/lib/tracking-parser";

const CRON_SECRET = process.env.CRON_SECRET || "fallback-cron-secret-change-me";

export async function POST(req: NextRequest) {
  // 1. Authorize the process request
  const authHeader = req.headers.get("authorization");
  const token = authHeader ? authHeader.replace("Bearer ", "") : "";

  if (token !== CRON_SECRET && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const provider = getEmailProvider();
    const trackingUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";

    const campaignResults = await processCampaigns(provider, trackingUrl);
    const automationResults = await processAutomations(provider, trackingUrl);

    return NextResponse.json({
      success: true,
      processed_at: new Date().toISOString(),
      campaigns: campaignResults,
      automations: automationResults,
    });
  } catch (error: any) {
    console.error("Worker processing failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * Handles batch dispatch of scheduled campaigns.
 */
async function processCampaigns(provider: any, trackingUrl: string) {
  // Find scheduled campaigns or those in sending state
  const campaigns = await EmailCampaign.find({
    status: { $in: ["scheduled", "sending"] },
    $or: [
      { scheduled_at: { $lte: new Date() } },
      { status: "sending" }
    ]
  });

  const summary = [];

  for (const campaign of campaigns) {
    // 1. Mark campaign as sending
    if (campaign.status === "scheduled") {
      campaign.status = "sending";
      await campaign.save();
    }

    // 2. Fetch campaign template
    const template = await EmailTemplate.findById(campaign.template_id);
    if (!template) {
      campaign.status = "paused";
      await campaign.save();
      summary.push({ campaignId: campaign._id, status: "failed", error: "Template not found" });
      continue;
    }

    // 3. Resolve the target audience
    const audienceQuery: any = { status: "subscribed" };

    if (!campaign.audience.all) {
      const matchCriteria = [];
      if (campaign.audience.lists?.length > 0) {
        matchCriteria.push({ lists: { $in: campaign.audience.lists } });
      }
      if (campaign.audience.tags?.length > 0) {
        matchCriteria.push({ tags: { $in: campaign.audience.tags } });
      }
      
      if (matchCriteria.length > 0) {
        audienceQuery["$or"] = matchCriteria;
      } else {
        // No audience criteria set
        campaign.status = "sent";
        campaign.sent_at = new Date();
        await campaign.save();
        summary.push({ campaignId: campaign._id, status: "completed", message: "Empty audience" });
        continue;
      }
    }

    // Find subscribers that haven't received this campaign yet
    // Fetch all subscribers in target audience
    const subscribers = await EmailSubscriber.find(audienceQuery);
    
    // Find already-sent recipients for this campaign
    const sentEmails = await EmailEvent.find({
      campaign_id: campaign._id,
      event_type: "sent"
    }).distinct("recipient_email");

    const sentEmailsSet = new Set(sentEmails.map(e => e.toLowerCase()));

    // Filter subscribers who have not yet received the email
    const pendingSubscribers = subscribers.filter(
      (sub) => !sentEmailsSet.has(sub.email.toLowerCase())
    );

    if (pendingSubscribers.length === 0) {
      campaign.status = "sent";
      campaign.sent_at = new Date();
      await campaign.save();
      summary.push({ campaignId: campaign._id, status: "completed" });
      continue;
    }

    // Batch send limit to prevent timeout (e.g. 50 per execution block)
    const BATCH_LIMIT = 50;
    const batch = pendingSubscribers.slice(0, BATCH_LIMIT);

    let sentInBatch = 0;
    let failedInBatch = 0;

    for (const sub of batch) {
      try {
        const customizedHtml = prepareEmailHtml({
          html: template.html_content || "",
          subscriber: sub,
          campaignId: campaign._id.toString(),
          trackingUrl,
          trackingEnabled: campaign.tracking,
        });

        let finalHtml = customizedHtml;
        if (template.type === "text") {
          finalHtml = `
            <div style="font-family: sans-serif; font-size: 15px; color: #1e293b; white-space: pre-wrap; line-height: 1.6;">
              ${customizedHtml}
            </div>
          `;
        }

        const { messageId } = await provider.sendEmail({
          to: sub.email,
          fromName: campaign.sender_name,
          fromEmail: campaign.sender_email,
          subject: campaign.subject,
          html: finalHtml,
          replyTo: campaign.reply_to,
        });

        // Log sent event
        await EmailEvent.create({
          campaign_id: campaign._id,
          recipient_email: sub.email.toLowerCase(),
          event_type: "sent",
          timestamp: new Date(),
          details: { messageId }
        });

        sentInBatch++;
      } catch (err: any) {
        console.error(`Failed to send campaign email to ${sub.email}:`, err);
        await EmailEvent.create({
          campaign_id: campaign._id,
          recipient_email: sub.email.toLowerCase(),
          event_type: "bounce", // Mark dispatch failure as bounce for metrics representation
          timestamp: new Date(),
          details: { error: err.message }
        });
        failedInBatch++;
      }
    }

    // Update campaign aggregates
    campaign.stats.sent += sentInBatch;
    campaign.stats.bounces += failedInBatch;
    
    // Check if we processed all pending subscribers
    if (pendingSubscribers.length <= BATCH_LIMIT) {
      campaign.status = "sent";
      campaign.sent_at = new Date();
    }
    
    await campaign.save();
    summary.push({
      campaignId: campaign._id,
      status: campaign.status,
      sentCount: sentInBatch,
      failedCount: failedInBatch,
      remaining: Math.max(0, pendingSubscribers.length - BATCH_LIMIT),
    });
  }

  return summary;
}

/**
 * Handles execution of active drip automation steps.
 */
async function processAutomations(provider: any, trackingUrl: string) {
  // Find active automation workflows
  const automations = await EmailAutomation.find({ status: "active" });
  const summary = [];

  for (const automation of automations) {
    // Select enrollments that are ready to run
    const activeEnrollments = automation.enrollments.filter(
      (enroll) => enroll.status === "active" && enroll.next_run_at <= new Date()
    );

    if (activeEnrollments.length === 0) continue;

    let processedCount = 0;

    for (const enroll of activeEnrollments) {
      try {
        const subscriber = await EmailSubscriber.findById(enroll.subscriber_id);
        if (!subscriber || subscriber.status !== "subscribed") {
          enroll.status = "completed";
          continue;
        }

        // Find current step config
        const currentStep = automation.steps.find((s) => s.id === enroll.current_step_id);
        if (!currentStep) {
          enroll.status = "completed";
          continue;
        }

        let nextStepId = currentStep.next_step_id;
        let nextRunAt = new Date(); // default immediate evaluation of next steps

        if (currentStep.type === "email") {
          // Process email sending
          const emailConfig = currentStep.email_config;
          if (emailConfig) {
            const template = await EmailTemplate.findById(emailConfig.template_id);
            if (template) {
              const customizedHtml = prepareEmailHtml({
                html: template.html_content || "",
                subscriber,
                campaignId: automation._id.toString(), // Uses automation ID as identifier
                trackingUrl,
                trackingEnabled: { opens: true, clicks: true },
              });

              let finalHtml = customizedHtml;
              if (template.type === "text") {
                finalHtml = `
                  <div style="font-family: sans-serif; font-size: 15px; color: #1e293b; white-space: pre-wrap; line-height: 1.6;">
                    ${customizedHtml}
                  </div>
                `;
              }

              const { messageId } = await provider.sendEmail({
                to: subscriber.email,
                fromName: emailConfig.sender_name,
                fromEmail: emailConfig.sender_email,
                subject: emailConfig.subject,
                html: finalHtml,
              });

              // Log event with automation_id
              await EmailEvent.create({
                automation_id: automation._id,
                recipient_email: subscriber.email.toLowerCase(),
                event_type: "sent",
                timestamp: new Date(),
                details: { messageId, step_id: currentStep.id }
              });

              enroll.history.push({
                step_id: currentStep.id,
                executed_at: new Date(),
                status: "success",
              });
            } else {
              throw new Error(`Email template not found: ${emailConfig.template_id}`);
            }
          }
        } 
        else if (currentStep.type === "delay") {
          // A delay step is handled by calculating the wait interval
          const delayConfig = currentStep.delay_config;
          if (delayConfig) {
            const now = new Date();
            let addedMs = 0;
            if (delayConfig.unit === "minutes") addedMs = delayConfig.duration * 60 * 1000;
            else if (delayConfig.unit === "hours") addedMs = delayConfig.duration * 60 * 60 * 1000;
            else if (delayConfig.unit === "days") addedMs = delayConfig.duration * 24 * 60 * 60 * 1000;

            nextRunAt = new Date(now.getTime() + addedMs);
            enroll.history.push({
              step_id: currentStep.id,
              executed_at: new Date(),
              status: "success",
              details: `Delayed for ${delayConfig.duration} ${delayConfig.unit}`,
            });
          }
        } 
        else if (currentStep.type === "condition") {
          const condition = currentStep.condition_config;
          let conditionMet = false;

          if (condition) {
            if (condition.field === "tag") {
              conditionMet = subscriber.tags.includes(condition.value);
            } 
            else if (condition.field === "open") {
              // Check if opened any email from this automation
              conditionMet = await EmailEvent.exists({
                automation_id: automation._id,
                recipient_email: subscriber.email.toLowerCase(),
                event_type: "open",
              }) !== null;
            } 
            else if (condition.field === "click") {
              conditionMet = await EmailEvent.exists({
                automation_id: automation._id,
                recipient_email: subscriber.email.toLowerCase(),
                event_type: "click",
              }) !== null;
            }

            nextStepId = conditionMet ? condition.yes_step_id : condition.no_step_id;
            
            enroll.history.push({
              step_id: currentStep.id,
              executed_at: new Date(),
              status: "success",
              details: `Condition checked: met=${conditionMet}`,
            });
          }
        }

        // Update enrollment path
        if (nextStepId) {
          enroll.current_step_id = nextStepId;
          enroll.next_run_at = nextRunAt;
        } else {
          enroll.status = "completed";
          automation.stats.completed += 1;
        }

        processedCount++;
      } catch (err: any) {
        console.error(`Error processing automation step for subscriber ${enroll.subscriber_id}:`, err);
        enroll.history.push({
          step_id: enroll.current_step_id,
          executed_at: new Date(),
          status: "failed",
          details: err.message,
        });
        
        // Auto retry in 5 minutes
        enroll.next_run_at = new Date(Date.now() + 5 * 60 * 1000);
      }
    }

    // Save automation modifications
    await automation.save();
    summary.push({
      automationId: automation._id,
      name: automation.name,
      processedEnrollments: processedCount,
    });
  }

  return summary;
}
