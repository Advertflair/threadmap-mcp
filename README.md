# 🗺️ ThreadMap MCP

**Conversation drift visualization and forking for Claude.**

> Stop losing your original intent. See exactly where your conversation drifted. Fork from any point and pick up with clean context.

---

## The Problem

You start a Claude session: *"Build me a login system."*

Three hours later you're deep in a JWT refresh token bug, the original architecture is buried under 80 messages, and the AI has completely lost track of what you were building. You've wasted tokens, lost context, and have to start over.

**ThreadMap fixes this.**

---

## How It Works

ThreadMap tracks every message and assigns it a **color based on semantic drift** from your original intent:

| Color | Drift | Meaning |
|-------|-------|---------|
| 🔵 Blue | 0–15% | On track — core intent |
| 🟢 Green | 16–35% | Productive expansion |
| 🟡 Yellow | 36–55% | Adjacent drift — related but expanding |
| 🟠 Orange | 56–72% | **Inflection point** — meaningful pivot |
| 🔴 Red | 73–88% | Full context break — different territory |
| 🟣 Purple | 89–95% | Meta — talking about the conversation |
| ⚪ White | 96–100% | Resolution — conclusion reached |

When you hit **Orange or Red**, ThreadMap flags it as an **inflection point**. You can fork the conversation right there — creating a clean branch with only the context up to that moment. The AI in that branch doesn't know about the drift. Fresh start, without losing history.

---

## Install

### Claude Code (one line)

```bash
claude mcp add threadmap npx threadmap-mcp
```

### Manual (any MCP client)

```bash
npm install -g threadmap-mcp
```

Add to your MCP config (`~/.claude/claude_desktop_config.json` or similar):

```json
{
  "mcpServers": {
    "threadmap": {
      "command": "threadmap-mcp"
    }
  }
}
```

---

## Quick Start

### 1. Track messages as you go

```
threadmap_track(
  sessionId="myproject",
  role="user",
  content="build me a login system with JWT auth"
)
```

Response:
```
🔵 Blue — Drift: 0%
Topic: build me a login system with JWT auth
Message #1 tracked.
```

A few messages later...

```
threadmap_track(
  sessionId="myproject",
  role="user",
  content="the refresh token keeps expiring after 30 seconds, lets debug this"
)
```

Response:
```
🟠 Orange — Drift: 63%
Topic: the refresh token keeps expiring after 30 seconds
⚡ INFLECTION POINT — significant topic shift detected. Consider forking here.
Message #8 tracked.
```

### 2. See your full timeline

```
threadmap_timeline(sessionId="myproject")
```

Response:
```
📍 ThreadMap Timeline — Session: myproject
🎯 Origin Intent: build me a login system with JWT auth

Messages (8 total):

1. 🔵 Blue  [0%]  USER: build me a login system with JWT auth
2. 🟢 Green [18%] AI: here's the auth architecture with JWT...
3. 🔵 Blue  [12%] USER: add refresh token support
4. 🟢 Green [24%] AI: here's the refresh token implementation...
5. 🟡 Yellow[38%] USER: the expiry time seems off
6. 🟡 Yellow[41%] AI: let me check the token configuration...
7. 🟠 Orange[63%] USER: refresh token keeps expiring after 30s ← INFLECTION POINT
8. 🔴 Red   [71%] AI: let's debug the token lifecycle...

⚡ Inflection Points:
1. 🟠 Orange at message #7: Topic shifted: refresh token expiry debug
   → Fork: call threadmap_fork with messageIndex: 6
```

### 3. Fork from an inflection point

```
threadmap_fork(
  sessionId="myproject",
  messageIndex=6,
  branchName="jwt-debug"
)
```

Response:
```
🌿 Branch Created: "jwt-debug"
Branch ID: branch_1712345678
Forked at: Message #7 — refresh token keeps expiring
Context: 7 messages carried forward
Origin preserved: build me a login system with JWT auth

Resume with: threadmap_branch_context branchId: branch_1712345678
```

Now you have a **clean branch** with only the auth architecture context — no database rabbit holes, no off-topic debugging contaminating the AI's context.

### 4. Resume from the branch

```
threadmap_branch_context(
  sessionId="myproject",
  branchId="branch_1712345678"
)
```

Response:
```
🌿 Branch Context: "jwt-debug"
Original Intent: build me a login system with JWT auth
Fork Point: Message #7
Messages in branch: 7

Recent context (last 5):
USER: add refresh token support
AI: here's the refresh token implementation...
USER: the expiry time seems off
AI: let me check the token configuration...
USER: refresh token keeps expiring after 30 seconds
```

Use this context to start a clean session focused purely on the bug — without the architectural drift.

---

## All Tools

### `threadmap_track`
Track a message and get its drift score.

```
threadmap_track(sessionId, role, content)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `sessionId` | string | Unique ID for this conversation/project |
| `role` | `"user"` \| `"assistant"` | Who sent the message |
| `content` | string | The message text |

Returns: color, drift %, topic summary, inflection point alert if triggered.

---

### `threadmap_timeline`
Show the full color-coded conversation map.

```
threadmap_timeline(sessionId)
```

Returns: numbered list of all messages with colors, drift scores, and marked inflection points with fork instructions.

---

### `threadmap_fork`
Fork from any message index with clean context.

```
threadmap_fork(sessionId, messageIndex, branchName)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `sessionId` | string | Session to fork from |
| `messageIndex` | number | 0-based index of the fork point |
| `branchName` | string | Name for the branch (e.g. `"auth-restart"`, `"back-to-origin"`) |

Returns: branch ID, fork point summary, context size.

---

### `threadmap_branch_context`
Get the context packet for a branch to resume cleanly.

```
threadmap_branch_context(sessionId, branchId)
```

Returns: original intent, fork point, recent messages in that branch — everything needed to anchor a new session.

---

### `threadmap_status`
Quick current drift check without full timeline.

```
threadmap_status(sessionId)
```

Returns: current color, drift %, message count, inflection count, warning if drift is high.

---

### `threadmap_reset`
Archive current thread and start fresh with a new origin.

```
threadmap_reset(sessionId, newOriginContent)
```

Old thread is archived as a branch. New origin intent is set. Tracking continues clean.

---

### `threadmap_legend`
Show the color reference guide.

```
threadmap_legend()
```

---

## Real-World Use Cases

### Claude Code — Architecture Integrity
You're building a feature. Start the session, track every message. When you see Orange, you know scope is creeping. Fork before the drift gets worse. The architecture decisions from the first 10 messages stay clean and uncontaminated.

```
Session: "build a user dashboard with real-time updates"
Message 1-5:  🔵🟢🟢🔵🟢  (core architecture)
Message 6-8:  🟡🟡🟠        (WebSocket config tangent) ← fork here
Message 9-15: 🔴🔴🟣🔴      (deep debugging rabbit hole)
```

Fork at message 6. Tackle the WebSocket issue in a separate clean branch.

### Research Sessions — Stay on Topic
Long research conversations drift naturally. ThreadMap shows you when you've left the original question. One click to jump back to the moment before the drift started.

### Brainstorming — Preserve the Spark
You have an idea, the conversation gets messy exploring it, and the original insight gets lost. ThreadMap keeps a pointer to that first moment of clarity — fork back to it anytime.

### Team Handoffs — Context Packets
Use `threadmap_branch_context` to extract a clean summary of exactly what was decided up to any point. Send it to a teammate. Drop it into a new session. No scrolling through 200 messages to find the relevant decisions.

---

## Architecture

- **Zero external API calls** — drift scoring runs locally using keyword-based semantic comparison
- **No database required** — in-memory session state, lightweight by design
- **Stateless across restarts** — sessions reset cleanly
- **Works with Claude Code natively** via MCP protocol
- **Future-ready** — designed to swap in local embedding models (MiniLM) for richer semantic drift scoring

---

## Why Open Source?

This should be a **protocol**, not a product.

Like Markdown defined how people write on the internet. Like Git defined how code is versioned. Like the hyperlink defined how documents connect.

**Non-linear conversation navigation is the missing primitive for AI-native work.**

Right now AI conversations are books with no table of contents, no chapters, no bookmarks. You just scroll. Nobody would accept that from a book. We accept it from AI because we don't know better yet.

ThreadMap is the table of contents. The chapter marker. The ability to write in the margins — and jump back to any margin at will.

If this becomes the standard, it travels across Claude, GPT, Gemini, anything. Nobody owns it. Everybody benefits.

---

## Roadmap

- [ ] Local embedding model support (MiniLM) for richer semantic scoring
- [ ] Visual timeline export (SVG/HTML)
- [ ] Cross-session branch persistence (optional SQLite mode)
- [ ] Shared swarm layer — anonymous correction signals improve scoring across users
- [ ] Native Claude.ai extension when Anthropic opens the plugin API
- [ ] GPT / Gemini compatibility layer

---

## Contributing

MIT licensed. Fork it, extend it, publish it.

```bash
git clone https://github.com/Advertflair/threadmap-mcp
cd threadmap-mcp
npm install
npm run build
npm run dev   # runs locally
```

Issues and PRs welcome. Especially interested in:
- Better drift scoring algorithms
- More granular color thresholds
- Integrations with other AI platforms

---

## License

MIT — see [LICENSE](./LICENSE)

---

*Built in one brainstorm session by [Advertflair](https://advertflair.com). Ship it. See what happens.*
