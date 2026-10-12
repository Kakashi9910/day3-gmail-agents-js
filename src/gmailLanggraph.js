/**
 * LangGraph workflow: classify -> decide -> (draft reply | flag for review | end)
 * JS version of gmail_langgraph.py
 *
 *   START -> classify -> decide --+--> draft_reply ------> END
 *                                 +--> flag_for_review --> END
 *                                 +--> END
 */
import { Annotation, StateGraph, START, END } from "@langchain/langgraph";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getLatestEmail, searchBySubject } from "./gmail.js";
import { createLLM, textOf } from "./llm.js";

const llm = createLLM(0);

// ============================================================
// Tool (also demonstrated at the end of the Python demo)
// ============================================================
export const searchEmails = tool(
  async ({ query }) => {
    console.log(`\n🔎 TOOL: search_emails('${query}')`);
    const matches = await searchBySubject(query, 5);
    if (matches.length === 0) return "No matching emails found.";
    return matches
      .map(
        (m) =>
          `From: ${m.sender}\nSubject: ${m.subject}\n\nBody:\n${m.body.slice(0, 2000)}`
      )
      .join("\n---\n");
  },
  {
    name: "search_emails",
    description:
      "Search the user's Gmail inbox for emails matching a query. Use this when previous email context is needed.",
    schema: z.object({ query: z.string() }),
  }
);

// ============================================================
// STATE
// ============================================================
const EmailState = Annotation.Root({
  sender: Annotation(),
  subject: Annotation(),
  body: Annotation(),

  intent: Annotation(),
  urgency: Annotation(),
  needsReply: Annotation(),
  summary: Annotation(),

  emailContext: Annotation(),
  draftReply: Annotation(),
  action: Annotation(),
});

// ============================================================
// NODE 1 — Classify email
// ============================================================
async function classifyEmail(state) {
  console.log("\n🧠 NODE: classify_email");

  const prompt = `
You are an intelligent email assistant.

Analyze this email.

From:
${state.sender}

Subject:
${state.subject}

Body:
${state.body}

Determine:

1. Intent
2. Urgency: Low, Medium, or High
3. Whether a reply is required
4. A short summary

Return exactly in this format:

Intent: ...
Urgency: ...
Needs Reply: Yes or No
Summary: ...
`;

  const response = await llm.invoke(prompt);
  const text = textOf(response.content);

  console.log("\nGemini says:");
  console.log(text);

  // Simple extraction, same approach as the Python demo
  let intent = "";
  let urgency = "";
  let needsReply = false;
  let summary = "";

  for (const line of text.split("\n")) {
    const lower = line.toLowerCase();
    const value = line.includes(":") ? line.split(":").slice(1).join(":").trim() : "";

    if (lower.startsWith("intent:")) intent = value;
    else if (lower.startsWith("urgency:")) urgency = value;
    else if (lower.startsWith("needs reply:")) needsReply = value.toLowerCase() === "yes";
    else if (lower.startsWith("summary:")) summary = value;
  }

  return { intent, urgency, needsReply, summary };
}

// ============================================================
// NODE 2 — Decide what to do
// ============================================================
function decideAction(state) {
  console.log("\n🔀 NODE: decide_action");

  let action;
  if (state.urgency.toLowerCase() === "high") action = "flag_for_review";
  else if (state.needsReply) action = "draft_reply";
  else action = "no_action";

  console.log(`Decision: ${action}`);
  return { action };
}

// ============================================================
// NODE 3 — Draft reply
// ============================================================
async function draftReply(state) {
  console.log("\n✍️ NODE: draft_reply");

  const prompt = `
You are helping me reply to an email.

Original email:

From:
${state.sender}

Subject:
${state.subject}

Body:
${state.body}

Write a concise, professional reply.

Rules:

- Do not invent facts.
- Do not make commitments that are not present.
- Be polite.
- Keep it short.
- Return only the email body.
`;

  const response = await llm.invoke(prompt);
  const draft = textOf(response.content);

  console.log("\nDraft generated:");
  console.log("-".repeat(50));
  console.log(draft);
  console.log("-".repeat(50));

  return { draftReply: draft };
}

// ============================================================
// NODE 4 — Flag important email for human review
// ============================================================
function flagForReview(state) {
  console.log("\n🚨 NODE: flag_for_review");
  console.log("\n⚠️ IMPORTANT EMAIL");
  console.log("Subject:", state.subject);
  console.log("Urgency:", state.urgency);
  console.log("Summary:", state.summary);
  return {};
}

// ============================================================
// CONDITIONAL ROUTING
// ============================================================
function routeAfterDecision(state) {
  if (state.action === "draft_reply") return "draft_reply";
  if (state.action === "flag_for_review") return "flag_for_review";
  return "end";
}

// ============================================================
// BUILD GRAPH
// ============================================================
const graph = new StateGraph(EmailState)
  .addNode("classify", classifyEmail)
  .addNode("decide", decideAction)
  .addNode("draft_reply", draftReply)
  .addNode("flag_for_review", flagForReview)
  .addEdge(START, "classify")
  .addEdge("classify", "decide")
  .addConditionalEdges("decide", routeAfterDecision, {
    draft_reply: "draft_reply",
    flag_for_review: "flag_for_review",
    end: END,
  })
  .addEdge("draft_reply", END)
  .addEdge("flag_for_review", END)
  .compile();

// ============================================================
// RUN
// ============================================================
const email = await getLatestEmail();

console.log("\n🚀 Starting LangGraph...\n");

const result = await graph.invoke({
  sender: email.sender,
  subject: email.subject,
  body: email.body,
  intent: "",
  urgency: "",
  needsReply: false,
  summary: "",
  emailContext: "",
  draftReply: "",
  action: "",
});

console.log("\n" + "=".repeat(60));
console.log("FINAL RESULT");
console.log("=".repeat(60));
console.log("Intent:", result.intent);
console.log("Urgency:", result.urgency);
console.log("Needs reply:", result.needsReply);
console.log("Action:", result.action);

if (result.draftReply) {
  console.log("\nDraft:");
  console.log(result.draftReply);
}
console.log("=".repeat(60));

// Same as the end of the Python demo: call the tool directly
console.log(await searchEmails.invoke({ query: "meeting" }));
