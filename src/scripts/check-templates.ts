import dotenv from "dotenv";
import path from "path";
// Load env before importing mongoose files
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import connectDB from "../lib/mongodb";
import EmailTemplate from "../models/EmailTemplate";

async function run() {
  try {
    await connectDB();
    const templates = await EmailTemplate.find();
    console.log("=================================================");
    console.log("Stored Templates Diagnostic:");
    templates.forEach(t => {
      console.log(`- ID: ${t._id}`);
      console.log(`  Name: "${t.name}"`);
      console.log(`  Subject: "${t.subject || ""}"`);
      console.log(`  Type: "${t.type}"`);
      console.log(`  html_content exists: ${t.html_content !== undefined}`);
      console.log(`  html_content type: ${typeof t.html_content}`);
      console.log(`  html_content length: ${t.html_content?.length || 0}`);
    });
    console.log("=================================================");
    process.exit(0);
  } catch (err: any) {
    console.error("Diagnostic failed:", err);
    process.exit(1);
  }
}

run();
