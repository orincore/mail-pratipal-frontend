import dotenv from "dotenv";
import path from "path";

// Load environment variables from the project root
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const CRON_SECRET = process.env.CRON_SECRET || "fallback-cron-secret-change-me";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
const INTERVAL_MS = 10000; // Poll every 10 seconds

console.log("=====================================================================");
console.log("📨 Pratipal Email Marketing Queue Daemon Started");
console.log(`Polling Target:  ${APP_URL}/api/jobs/process`);
console.log(`Polling Interv:  ${INTERVAL_MS / 1000}s`);
console.log("=====================================================================");

async function pollQueue() {
  try {
    const res = await fetch(`${APP_URL}/api/jobs/process`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${CRON_SECRET}`,
      },
    });

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error(`[${new Date().toLocaleTimeString()}] Non-JSON Response received:`, text.substring(0, 300));
      return;
    }

    if (res.ok) {
      const campCount = data.campaigns?.length || 0;
      const autoCount = data.automations?.length || 0;
      
      if (campCount > 0 || autoCount > 0) {
        console.log(`[${new Date().toLocaleTimeString()}] Queue processed successfully:`);
        if (campCount > 0) {
          console.log(`  - Campaigns:`, JSON.stringify(data.campaigns));
        }
        if (autoCount > 0) {
          console.log(`  - Automations:`, JSON.stringify(data.automations));
        }
      }
    } else {
      console.error(`[${new Date().toLocaleTimeString()}] Queue execution failed:`, data.error || data);
    }
  } catch (err: any) {
    console.error(`[${new Date().toLocaleTimeString()}] Network error:`, err.message);
  }
}

// Perform initial run immediately
pollQueue();

// Schedule polling loop
const timer = setInterval(pollQueue, INTERVAL_MS);

// Handle process termination cleanly
process.on("SIGINT", () => {
  clearInterval(timer);
  console.log("\nQueue daemon stopped. Goodbye!");
  process.exit(0);
});
