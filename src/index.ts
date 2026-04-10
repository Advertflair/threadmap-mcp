#!/usr/bin/env node
/**
 * ThreadMap MCP Server
 * Conversation drift visualization and forking for Claude
 * Open Source - MIT License
 *
 * Install: claude mcp add threadmap npx threadmap-mcp
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  driftScore: number;
  color: DriftColor;
  keywords: string[];
  topic: string;
}

interface Branch {
  id: string;
  name: string;
  forkPointId: string;
  forkPointIndex: number;
  createdAt: number;
  messages: Message[];
  originSummary: string;
}

interface ThreadState {
  sessionId: string;
  originIntent: string;
  originKeywords: string[];
  messages: Message[];
  branches: Branch[];
  currentBranchId: string | null;
  inflectionPoints: InflectionPoint[];
}

interface InflectionPoint {
  messageId: string;
  messageIndex: number;
  color: DriftColor;
  driftScore: number;
  topic: string;
  summary: string;
}

type DriftColor = "blue" | "green" | "yellow" | "orange" | "red" | "purple" | "white";

// ─── Color Logic ──────────────────────────────────────────────────────────────

const COLOR_MAP: Record<DriftColor, { range: [number, number]; label: string; meaning: string }> = {
  blue:   { range: [0, 15],   label: "🔵 Blue",   meaning: "On track — core intent" },
  green:  { range: [16, 35],  label: "🟢 Green",  meaning: "Productive expansion" },
  yellow: { range: [36, 55],  label: "🟡 Yellow", meaning: "Adjacent drift — related but expanding" },
  orange: { range: [56, 72],  label: "🟠 Orange", meaning: "Meaningful pivot — new thread started here" },
  red:    { range: [73, 88],  label: "🔴 Red",    meaning: "Full context break — different territory" },
  purple: { range: [89, 95],  label: "🟣 Purple", meaning: "Meta layer — talking about the conversation" },
  white:  { range: [96, 100], label: "⚪ White",  meaning: "Resolution — conclusion reached" },
};

function scoreToColor(score: number): DriftColor {
  for (const [color, config] of Object.entries(COLOR_MAP)) {
    if (score >= config.range[0] && score <= config.range[1]) {
      return color as DriftColor;
    }
  }
  return "blue";
}

// ─── Semantic Drift Engine ────────────────────────────────────────────────────

function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    "the","a","an","and","or","but","in","on","at","to","for","of","with",
    "is","are","was","were","be","been","being","have","has","had","do",
    "does","did","will","would","could","should","may","might","this","that",
    "these","those","i","you","we","they","it","he","she","what","how","why",
    "when","where","can","just","like","so","get","also","now","let","me",
    "from","about","if","then","there","than","not","my","your","our","its"
  ]);
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopWords.has(w))
    .slice(0, 20);
}

function extractTopic(text: string, _keywords: string[]): string {
  const firstSentence = text.split(/[.!?]/)[0]?.trim() || text.slice(0, 80);
  return firstSentence.slice(0, 80) + (firstSentence.length > 80 ? "..." : "");
}

function calculateDrift(originKeywords: string[], currentKeywords: string[]): number {
  if (originKeywords.length === 0 || currentKeywords.length === 0) return 0;
  const originSet = new Set(originKeywords);
  const currentSet = new Set(currentKeywords);
  const intersection = new Set([...originSet].filter(k => currentSet.has(k)));
  const union = new Set([...originSet, ...currentSet]);
  const similarity = intersection.size / union.size;
  return Math.min(Math.round((1 - similarity) * 100), 100);
}

function detectMetaConversation(text: string): boolean {
  return /\b(this conversation|this chat|we've been talking|our discussion|you said earlier|going back to|let's refocus|thread|context|drift|fork|branch)\b/i.test(text);
}

function detectResolution(text: string): boolean {
  return /\b(in conclusion|to summarize|final answer|that's the solution|we've solved|problem solved|this is working|decided to go with)\b/i.test(text);
}

// ─── State Store ──────────────────────────────────────────────────────────────

const sessions = new Map<string, ThreadState>();

function getOrCreateSession(sessionId: string): ThreadState {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      sessionId,
      originIntent: "",
      originKeywords: [],
      messages: [],
      branches: [],
      currentBranchId: null,
      inflectionPoints: [],
    });
  }
  return sessions.get(sessionId)!;
}

// ─── Core Operations ──────────────────────────────────────────────────────────

function addMessage(state: ThreadState, role: "user" | "assistant", content: string): Message {
  const keywords = extractKeywords(content);

  if (state.messages.length === 0 && role === "user") {
    state.originIntent = content.slice(0, 200);
    state.originKeywords = keywords;
  }

  let driftScore = 0;
  let color: DriftColor = "blue";

  if (state.originKeywords.length > 0) {
    if (detectMetaConversation(content)) {
      driftScore = 92;
    } else if (detectResolution(content)) {
      driftScore = 98;
    } else {
      driftScore = calculateDrift(state.originKeywords, keywords);
    }
    color = scoreToColor(driftScore);
  }

  const message: Message = {
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    role,
    content,
    timestamp: Date.now(),
    driftScore,
    color,
    keywords,
    topic: extractTopic(content, keywords),
  };

  state.messages.push(message);

  const prevMsg = state.messages[state.messages.length - 2];
  if (prevMsg) {
    const prevColors = Object.keys(COLOR_MAP);
    const prevIdx = prevColors.indexOf(prevMsg.color);
    const currIdx = prevColors.indexOf(color);
    if (Math.abs(currIdx - prevIdx) >= 2) {
      state.inflectionPoints.push({
        messageId: message.id,
        messageIndex: state.messages.length - 1,
        color,
        driftScore,
        topic: message.topic,
        summary: `Topic shifted: ${message.topic}`,
      });
    }
  }

  return message;
}

function forkFromMessage(state: ThreadState, messageIndex: number, branchName: string): Branch {
  const forkPoint = state.messages[messageIndex];
  if (!forkPoint) throw new Error(`Message at index ${messageIndex} not found`);

  const branch: Branch = {
    id: `branch_${Date.now()}`,
    name: branchName,
    forkPointId: forkPoint.id,
    forkPointIndex: messageIndex,
    createdAt: Date.now(),
    messages: state.messages.slice(0, messageIndex + 1),
    originSummary: state.originIntent.slice(0, 150),
  };

  state.branches.push(branch);
  return branch;
}

function getTimeline(state: ThreadState): string {
  if (state.messages.length === 0) {
    return "No messages tracked yet. Start by calling `threadmap_track` with your first message.";
  }

  const lines: string[] = [
    `📍 **ThreadMap Timeline** — Session: ${state.sessionId}`,
    `🎯 **Origin Intent:** ${state.originIntent.slice(0, 100)}${state.originIntent.length > 100 ? "..." : ""}`,
    ``,
    `**Messages (${state.messages.length} total):**`,
    ``,
  ];

  state.messages.forEach((msg, i) => {
    const colorConfig = COLOR_MAP[msg.color];
    const inflection = state.inflectionPoints.find(ip => ip.messageId === msg.id);
    const mark = inflection ? " ← **INFLECTION POINT**" : "";
    lines.push(`${i + 1}. ${colorConfig.label} [drift: ${msg.driftScore}%] ${msg.role.toUpperCase()}: ${msg.topic}${mark}`);
  });

  if (state.inflectionPoints.length > 0) {
    lines.push(``, `**⚡ Inflection Points (fork candidates):**`, ``);
    state.inflectionPoints.forEach((ip, i) => {
      const colorConfig = COLOR_MAP[ip.color];
      lines.push(`${i + 1}. ${colorConfig.label} at message #${ip.messageIndex + 1}: ${ip.summary}`);
      lines.push(`   → Fork: call \`threadmap_fork\` with messageIndex: ${ip.messageIndex}`);
    });
  }

  if (state.branches.length > 0) {
    lines.push(``, `**🌿 Branches:**`, ``);
    state.branches.forEach(b => {
      lines.push(`• **${b.name}** — forked at message #${b.forkPointIndex + 1} (${b.messages.length} messages)`);
    });
  }

  return lines.join("\n");
}

function getColorLegend(): string {
  const lines = ["**ThreadMap Color Legend:**", ""];
  for (const [, config] of Object.entries(COLOR_MAP)) {
    lines.push(`${config.label}: ${config.meaning} (drift ${config.range[0]}–${config.range[1]}%)`);
  }
  lines.push("", "**Tip:** Orange+ dots are inflection points worth forking from.");
  return lines.join("\n");
}

// ─── MCP Server ───────────────────────────────────────────────────────────────

const server = new Server(
  { name: "threadmap", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "threadmap_track",
      description: "Track a message in the conversation timeline. Call after each user or assistant message to build the drift map.",
      inputSchema: {
        type: "object",
        properties: {
          sessionId: { type: "string", description: "Unique session ID for this conversation" },
          role: { type: "string", enum: ["user", "assistant"], description: "Who sent this message" },
          content: { type: "string", description: "The message content" },
        },
        required: ["sessionId", "role", "content"],
      },
    },
    {
      name: "threadmap_timeline",
      description: "Show the full color-coded conversation timeline with drift scores, inflection points, and branches.",
      inputSchema: {
        type: "object",
        properties: {
          sessionId: { type: "string", description: "Session ID to show timeline for" },
        },
        required: ["sessionId"],
      },
    },
    {
      name: "threadmap_fork",
      description: "Fork the conversation from a specific message index. Creates a clean branch with only context up to that point.",
      inputSchema: {
        type: "object",
        properties: {
          sessionId: { type: "string" },
          messageIndex: { type: "number", description: "Index of message to fork from (0-based)" },
          branchName: { type: "string", description: "Name for this branch (e.g. 'auth-restart')" },
        },
        required: ["sessionId", "messageIndex", "branchName"],
      },
    },
    {
      name: "threadmap_branch_context",
      description: "Get the context packet for a specific branch — summarized intent and messages up to the fork point.",
      inputSchema: {
        type: "object",
        properties: {
          sessionId: { type: "string" },
          branchId: { type: "string", description: "Branch ID returned from threadmap_fork" },
        },
        required: ["sessionId", "branchId"],
      },
    },
    {
      name: "threadmap_status",
      description: "Get current drift status — latest color, score, and whether an inflection point was just hit.",
      inputSchema: {
        type: "object",
        properties: {
          sessionId: { type: "string" },
        },
        required: ["sessionId"],
      },
    },
    {
      name: "threadmap_reset",
      description: "Reset the session. Archives current thread and starts fresh tracking from a new origin.",
      inputSchema: {
        type: "object",
        properties: {
          sessionId: { type: "string" },
          newOriginContent: { type: "string", description: "The new starting message to set as origin" },
        },
        required: ["sessionId", "newOriginContent"],
      },
    },
    {
      name: "threadmap_legend",
      description: "Show the color legend explaining what each dot color means.",
      inputSchema: { type: "object", properties: {}, required: [] },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "threadmap_track": {
        const { sessionId, role, content } = args as { sessionId: string; role: "user" | "assistant"; content: string };
        const state = getOrCreateSession(sessionId);
        const msg = addMessage(state, role, content);
        const colorConfig = COLOR_MAP[msg.color];
        const isInflection = state.inflectionPoints.some(ip => ip.messageId === msg.id);
        return {
          content: [{
            type: "text",
            text: [
              `**ThreadMap:** ${colorConfig.label} — Drift: ${msg.driftScore}%`,
              `**Topic:** ${msg.topic}`,
              isInflection ? `⚡ **INFLECTION POINT** — significant topic shift detected. Consider forking here.` : "",
              `**Message #${state.messages.length}** tracked. Session: ${sessionId}`,
            ].filter(Boolean).join("\n"),
          }],
        };
      }

      case "threadmap_timeline": {
        const { sessionId } = args as { sessionId: string };
        const state = getOrCreateSession(sessionId);
        return { content: [{ type: "text", text: getTimeline(state) }] };
      }

      case "threadmap_fork": {
        const { sessionId, messageIndex, branchName } = args as { sessionId: string; messageIndex: number; branchName: string };
        const state = getOrCreateSession(sessionId);
        const branch = forkFromMessage(state, messageIndex, branchName);
        const forkMsg = state.messages[messageIndex];
        return {
          content: [{
            type: "text",
            text: [
              `🌿 **Branch Created: "${branchName}"**`,
              `**Branch ID:** ${branch.id}`,
              `**Forked at:** Message #${messageIndex + 1} — ${forkMsg.topic}`,
              `**Context:** ${branch.messages.length} messages carried forward`,
              `**Origin preserved:** ${branch.originSummary}`,
              ``,
              `Resume with: \`threadmap_branch_context\` branchId: ${branch.id}`,
            ].join("\n"),
          }],
        };
      }

      case "threadmap_branch_context": {
        const { sessionId, branchId } = args as { sessionId: string; branchId: string };
        const state = getOrCreateSession(sessionId);
        const branch = state.branches.find(b => b.id === branchId);
        if (!branch) {
          return { content: [{ type: "text", text: `Branch ${branchId} not found in session ${sessionId}` }] };
        }
        const contextSummary = branch.messages
          .slice(-5)
          .map(m => `${m.role.toUpperCase()}: ${m.topic}`)
          .join("\n");
        return {
          content: [{
            type: "text",
            text: [
              `🌿 **Branch Context: "${branch.name}"**`,
              `**Original Intent:** ${branch.originSummary}`,
              `**Fork Point:** Message #${branch.forkPointIndex + 1}`,
              `**Messages in branch:** ${branch.messages.length}`,
              ``,
              `**Recent context (last 5):**`,
              contextSummary,
            ].join("\n"),
          }],
        };
      }

      case "threadmap_status": {
        const { sessionId } = args as { sessionId: string };
        const state = getOrCreateSession(sessionId);
        if (state.messages.length === 0) {
          return { content: [{ type: "text", text: "No messages tracked yet." }] };
        }
        const lastMsg = state.messages[state.messages.length - 1];
        const colorConfig = COLOR_MAP[lastMsg.color];
        return {
          content: [{
            type: "text",
            text: [
              `**ThreadMap Status**`,
              `Current: ${colorConfig.label} — ${colorConfig.meaning}`,
              `Drift from origin: ${lastMsg.driftScore}%`,
              `Messages tracked: ${state.messages.length}`,
              `Inflection points: ${state.inflectionPoints.length}`,
              `Active branches: ${state.branches.length}`,
              lastMsg.driftScore > 55 ? `⚠️ Significant drift. Consider forking or returning to origin.` : `✓ Conversation on track.`,
            ].join("\n"),
          }],
        };
      }

      case "threadmap_reset": {
        const { sessionId, newOriginContent } = args as { sessionId: string; newOriginContent: string };
        const state = getOrCreateSession(sessionId);
        const oldBranches = [...state.branches];
        if (state.messages.length > 0) {
          oldBranches.push({
            id: `branch_archive_${Date.now()}`,
            name: `archived_${new Date().toISOString().slice(0, 10)}`,
            forkPointId: state.messages[state.messages.length - 1].id,
            forkPointIndex: state.messages.length - 1,
            createdAt: Date.now(),
            messages: [...state.messages],
            originSummary: state.originIntent.slice(0, 150),
          });
        }
        state.messages = [];
        state.inflectionPoints = [];
        state.originIntent = "";
        state.originKeywords = [];
        state.branches = oldBranches;
        addMessage(state, "user", newOriginContent);
        return {
          content: [{
            type: "text",
            text: `🔄 **ThreadMap Reset**\nPrevious conversation archived.\nNew origin set: ${newOriginContent.slice(0, 100)}`,
          }],
        };
      }

      case "threadmap_legend":
        return { content: [{ type: "text", text: getColorLegend() }] };

      default:
        return { content: [{ type: "text", text: `Unknown tool: ${name}` }], isError: true };
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { content: [{ type: "text", text: `ThreadMap error: ${msg}` }], isError: true };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("ThreadMap MCP server running");
}

main().catch(console.error);
