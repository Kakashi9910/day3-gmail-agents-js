/**
 * Normal function vs LangChain tool (JS version of nf_vs_tool.py)
 */
import { tool } from "@langchain/core/tools";
import { z } from "zod";

const emails = [
  "Workshop schedule for Chennai",
  "Reminder: Mentor workshop tomorrow",
  "Student attendance report",
  "AI workshop resources",
  "Team meeting agenda",
];

// ============================================================
// DEMO 1 — NORMAL JS FUNCTION
// ============================================================
function searchEmails(query) {
  return emails.filter((e) => e.toLowerCase().includes(query.toLowerCase()));
}

// WE explicitly decide to call the function
console.log("NORMAL FUNCTION:");
console.log(searchEmails("reminder"));

// ============================================================
// DEMO 2 — TURN THE FUNCTION INTO A TOOL
// ============================================================
// A tool = function + name + description + input schema.
// The name/description/schema are what let an LLM decide WHEN to call it.
const searchEmailsTool = tool(
  async ({ query }) =>
    emails.filter((e) => e.toLowerCase().includes(query.toLowerCase())),
  {
    name: "search_emails_tool",
    description:
      "Search the user's email inbox for messages matching the given keyword.",
    schema: z.object({
      query: z.string().describe("Keyword to search for"),
    }),
  }
);

console.log("\nTOOL:");
console.log(await searchEmailsTool.invoke({ query: "workshop" }));

console.log("\nWhat the LLM sees about this tool:");
console.log({
  name: searchEmailsTool.name,
  description: searchEmailsTool.description,
});
