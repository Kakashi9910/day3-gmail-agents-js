/**
 * Read the latest email from Gmail over IMAP (JS version of gmail_test.py)
 */
import { countEmails, getLatestEmail } from "./gmail.js";

console.log("Connecting to Gmail...");

const total = await countEmails();
console.log("✅ Gmail login successful");
console.log(`📬 Emails found: ${total}`);

const { sender, subject, body } = await getLatestEmail();

console.log("\n" + "=".repeat(60));
console.log("FROM:");
console.log(sender);
console.log("\nSUBJECT:");
console.log(subject);
console.log("\nBODY:");
console.log(body);
console.log("=".repeat(60));

console.log("\n✅ Done");
