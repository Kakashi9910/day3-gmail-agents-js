/**
 * Tool-calling agent with LangGraph: the LLM decides which tools to use.
 * JS version of gmail_agent_test.py
 *
 *   START -> agent --(tool calls?)--> tools --> agent ... --> END
 *
 * Usage:
 *   npm run gmail:agent
 *   npm run gmail:agent -- "Find emails about 'invoice' and draft a thank-you reply"
 */
import { MessagesAnnotation, StateGraph, START } from "@langchain/langgraph";
import { ToolNode, toolsCondition } from "@langchain/langgraph/prebuilt";
import { tool } from "@langchain/core/tools";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import { searchBySubject } from "./gmail.js";
import { createLLM, textOf } from "./llm.js";

const llm = createLLM(0);

// ============================================================
// TOOL 1 — SEARCH EMAILS
// ============================================================
const searchEmails = tool(
  async ({ query }) => {
    console.log(`\n🔎 TOOL CALLED: search_emails('${query}')`);

    const matches = await searchBySubject(query, 5);
    if (matches.length === 0) return "No matching emails found.";

    return matches
      .map(
        (m) =>
          `From: ${m.sender}\n\nSubject: ${m.subject}\n\nBody:\n${m.body.slice(0, 2000)}`
      )
      .join("\n--------------------\n");
  },
  {
    name: "search_emails",
    description:
      "Search the user's Gmail inbox for previous emails matching a keyword or phrase. " +
      "Use this tool when the current email refers to previous conversations or " +
      "information that is not available in the current email.",
    schema: z.object({
      query: z.string().describe("Keyword or phrase to look for in the subject"),
    }),
  }
);

// ============================================================
// TOOL 2 — GET EMAIL THREAD / CONVERSATION
// ============================================================
const getEmailThread = tool(
  async ({ subject }) => {
    console.log(`\n🧵 TOOL CALLED: get_email_thread('${subject}')`);

    const matches = await searchBySubject(subject, 10);
    if (matches.length === 0) return "No previous conversation found.";

    return matches
      .map(
        (m) =>
          `From: ${m.sender}\nDate: ${m.date}\nSubject: ${m.subject}\n\nBody:\n${m.body.slice(0, 3000)}`
      )
      .join("\n====================\n");
  },
  {
    name: "get_email_thread",
    description:
      "Retrieve recent emails from the inbox that belong to the same conversation " +
      "or have the same subject. Use this when you need more context from a previous email conversation.",
    schema: z.object({
      subject: z.string().describe("Subject of the conversation"),
    }),
  }
);

// ============================================================
// TOOL 3 — DRAFT REPLY (only drafts, never sends)
// ============================================================
const draftReply = tool(
  async ({ recipient, subject, context }) => {
    console.log(`\n✍️ TOOL CALLED: draft_reply('${subject}')`);

    const prompt = `
Draft a professional and concise email reply.

Recipient:
${recipient}

Subject:
${subject}

Context:
${context}

Requirements:
- Be professional and friendly.
- Do not invent facts.
- Use only the information provided in the context.
- Keep the reply concise.
- Do not include a subject line.
- Return only the email body.
`;
    const response = await llm.invoke(prompt);
    return textOf(response.content);
  },
  {
    name: "draft_reply",
    description:
      "Draft a professional email reply based on the provided context. " +
      "Use this when the user wants a reply drafted. This tool only creates a draft. It does not send email.",
    schema: z.object({
      recipient: z.string(),
      subject: z.string(),
      context: z.string(),
    }),
  }
);

// ============================================================
// REGISTER TOOLS + GIVE THEM TO GEMINI
// ============================================================
const tools = [searchEmails, getEmailThread, draftReply];
const llmWithTools = llm.bindTools(tools);

const SYSTEM_PROMPT = `
You are an intelligent personal email assistant.

You have access to three tools:

1. search_emails
   Use this to find relevant previous emails.

2. get_email_thread
   Use this when you need conversation history for a particular email subject.

3. draft_reply
   Use this when the user wants a reply drafted.
   This tool only creates a draft. It does NOT send email.

Your workflow is flexible.

Use tools only when necessary.

If previous context is needed:

1. Search for relevant emails.
2. Retrieve the conversation history if necessary.
3. Use the information you found to understand the situation.
4. If the user asks for a reply, use draft_reply.

Do not invent information.

Do not send emails.

Once you have enough information, provide the answer.
`;

// ============================================================
// AGENT NODE
// ============================================================
async function agent(state) {
  console.log("\n🤖 NODE: AGENT");

  const response = await llmWithTools.invoke([
    new SystemMessage(SYSTEM_PROMPT),
    ...state.messages,
  ]);

  if (response.tool_calls?.length) {
    console.log("\n🧠 Agent decided to use a tool:");
    for (const call of response.tool_calls) {
      console.log("Tool:", call.name);
      console.log("Arguments:", call.args);
    }
  } else {
    console.log("\n✅ Agent decided no tool was needed.");
    console.log("\nAgent response:");
    console.log(textOf(response.content));
  }

  return { messages: [response] };
}

// ============================================================
// BUILD THE GRAPH
// ============================================================
const graph = new StateGraph(MessagesAnnotation)
  .addNode("agent", agent)
  .addNode("tools", new ToolNode(tools))
  .addEdge(START, "agent")
  .addConditionalEdges("agent", toolsCondition) // -> "tools" or END
  .addEdge("tools", "agent")
  .compile();

// ============================================================
// RUN
// ============================================================
const defaultRequest = `
I need to reply to an email whose subject contains 'meeting'.

Please:

1. Find the relevant previous emails from the sender if any
2. Retrieve the conversation history.
3. Understand what the email was about
4. Draft a professional reply thanking them.
Do not send the email.
`;

const request = process.argv.slice(2).join(" ").trim() || defaultRequest;

console.log("\n🚀 STARTING AGENT...\n");

const result = await graph.invoke({ messages: [new HumanMessage(request)] });

console.log("\n" + "=".repeat(60));
console.log("FINAL AGENT RESPONSE");
console.log("=".repeat(60));
console.log(textOf(result.messages.at(-1).content));
