/**
 * Ask Gemini to understand the latest email (JS version of gmail_classify.py)
 */
import { getLatestEmail } from "./gmail.js";
import { createLLM, textOf } from "./llm.js";

console.log("Connecting to Gmail...");
const { sender, subject, body } = await getLatestEmail();

const llm = createLLM(0);

const prompt = `
You are an email assistant.

Analyze the following email.

EMAIL
-----
From: ${sender}
Subject: ${subject}

Body:
${body}
-----

Return:

1. Intent
2. Urgency: Low, Medium, or High
3. Whether a reply is needed
4. A short summary
5. Reason for your decision

Keep the answer concise.
`;

console.log("\n🤖 Asking Gemini to understand the email...\n");

const response = await llm.invoke(prompt);

console.log("=".repeat(60));
console.log("GEMINI ANALYSIS");
console.log("=".repeat(60));
console.log(textOf(response.content));
console.log("=".repeat(60));
