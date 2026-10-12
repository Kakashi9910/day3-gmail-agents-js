/**
 * DAY 3 - DEMO 5a: Memory & Tools (JS version of fix_memory.py)
 *
 * 1. The "goldfish" problem: the LLM remembers nothing between calls
 * 2. Memory = we resend the conversation history every time
 *
 * Run the goldfish part too with:  npm run memory -- --goldfish
 */
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { createLLM, textOf } from "./llm.js";

const llm = createLLM(0.3);

// ============================================
// PART 1: WITHOUT MEMORY (optional)
// ============================================
if (process.argv.includes("--goldfish")) {
  console.log("=".repeat(60));
  console.log("PART 1: WITHOUT Memory (Goldfish Mode 🐟)");
  console.log("=".repeat(60));

  console.log("\nMessage 1:");
  const r1 = await llm.invoke([
    new HumanMessage("My name is Palash and I teach Python in Chennai."),
  ]);
  console.log(`🤖: ${textOf(r1.content).slice(0, 200)}`);

  console.log("\nMessage 2:");
  const r2 = await llm.invoke([
    new HumanMessage("What's my name and what do I teach?"),
  ]);
  console.log(`🤖: ${textOf(r2.content).slice(0, 300)}`);

  console.log("\n❌ The LLM doesn't know because we didn't give it Message 1.");
}

// ============================================
// PART 1B: WITH MEMORY
// ============================================
console.log("\n" + "=".repeat(60));
console.log("PART 1B: WITH Memory (Elephant Mode 🐘)");
console.log("=".repeat(60));

// Our memory: just an array we keep in our program
const conversationHistory = [];

async function chatWithMemory(userMessage) {
  // 1. Store user message
  conversationHistory.push(new HumanMessage(userMessage));

  // 2. Send the entire conversation to the LLM
  const response = await llm.invoke(conversationHistory);

  // 3. Store the AI response
  const reply = textOf(response.content);
  conversationHistory.push(new AIMessage(reply));

  return reply;
}

console.log("\nMessage 1:");
console.log(
  `🤖: ${(await chatWithMemory("My name is Dharini and I teach Python in Chennai.")).slice(0, 200)}`
);

console.log("\nMessage 2:");
console.log(
  `🤖: ${(await chatWithMemory("What's my name and what do I teach?")).slice(0, 300)}`
);
console.log("\n✅ It remembers because we sent the previous conversation.");

console.log("\nMessage 3:");
console.log(
  `🤖: ${(await chatWithMemory("Suggest a fun Python project for my students.")).slice(0, 300)}`
);
console.log("\n✅ It can use the previous context as well.");

// ============================================
// LOOK INSIDE MEMORY
// ============================================
console.log("\n" + "=".repeat(60));
console.log("📦 WHAT IS ACTUALLY STORED IN MEMORY?");
console.log("=".repeat(60));

for (const message of conversationHistory) {
  const role = message instanceof HumanMessage ? "Human" : "AI";
  console.log(`\n[${role}]`);
  console.log(textOf(message.content).slice(0, 200));
}

console.log("\n" + "=".repeat(60));
console.log("🔑 KEY MEMORY INSIGHT");
console.log("=".repeat(60));
console.log(`
The LLM itself is NOT storing the memory.

Our program stores:

    conversationHistory

Every new question is sent together with the previous conversation.

So:

    User
      ↓
    Memory
      ↓
    Previous conversation + New question
      ↓
    LLM
      ↓
    Response
      ↓
    Memory
`);
