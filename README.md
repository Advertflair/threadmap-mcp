# 🗺️ ThreadMap MCP for Claude

**Conversation drift visualization and forking for Claude.**

> Stop losing your original intent. See exactly where your conversation drifted. Fork from any point and pick up with clean context.

---

## The Problem

You start a Claude session: *"Build me a login system."*

Three hours later you're deep in a JWT refresh token bug, the original architecture is buried under 80 messages, and Claude has completely lost track of what you were building. You've wasted tokens, lost context, and have to start over.

**ThreadMap MCP for Claude fixes this.**

---

## How It Works

ThreadMap MCP for Claude tracks every message and assigns it a **color based on semantic drift** from your original intent:

| Color | Drift | Meaning |
|-------|-------|---------|
| 🔵 Blue | 0–15% | On track — core intent |
| 🟢 Green | 16–35% | Productive expansion |
| 🟡 Yellow | 36–55% | Adjacent drift — related but expanding |
| 🟠 Orange | 56–72% | **Inflection point** — meaningful pivot |
| 🔴 Red | 73–88% | Full context break — different territory |
| 🟣 Purple | 89–95% | Meta — talking about the conversation |
| ⚪ White | 96–100% | Resolution — conclusion reached |

When you hit **Orange or Red**, ThreadMap flags it as an **inflection point**. You can fork the conversation right there — creating a clean branch with only the context up to that moment. Claude in that branch doesn't know about the drift. Fresh start, without losing history.

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

1. 🔵 Blue   [0%]  USER: build me a login system with JWT auth
2. 🟢 Green  [18%] Claude: here's the auth architecture with JWT...
3. 🔵 Blue   [12%] USER: add refresh token support
4. 🟢 Green  [24%] Claude: here's the refresh token implementation...
5. 🟡 Yellow [38%] USER: the expiry time seems off
6. 🟡 Yellow [41%] Claude: let me check the token configuration...
7. 🟠 Orange [63%] USER: refresh token keeps expiring after 30s ← INFLECTION POINT
8. 🔴 Red    [71%] Claude: let's debug the token lifecycle...

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

Now you have a **clean branch** with only the auth architecture context — no rabbit holes, no off-topic debugging contaminating Claude's context.

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
Claude: here's the refresh token implementation...
USER: the expiry time seems off
Claude: let me check the token configuration...
USER: refresh token keeps expiring after 30 seconds
```

Use this to anchor a clean focused session — without the drift.

---

## All Tools

### `threadmap_track`
Track a message and get its drift score.

| Parameter | Type | Description |
|-----------|------|-------------|
| `sessionId` | string | Unique ID for this conversation/project |
| `role` | `"user"` \| `"assistant"` | Who sent the message |
| `content` | string | The message text |

Returns: color, drift %, topic summary, inflection point alert if triggered.

---

### `threadmap_timeline`
Show the full color-coded conversation map with all drift scores, inflection points, and branch markers.

| Parameter | Type | Description |
|-----------|------|-------------|
| `sessionId` | string | Session to display |

---

### `threadmap_fork`
Fork from any message index with clean context.

| Parameter | Type | Description |
|-----------|------|-------------|
| `sessionId` | string | Session to fork from |
| `messageIndex` | number | 0-based index of the fork point |
| `branchName` | string | Name for the branch (e.g. `"auth-restart"`, `"back-to-origin"`) |

Returns: branch ID, fork point summary, context size.

---

### `threadmap_branch_context`
Get the context packet for a branch to resume cleanly.

| Parameter | Type | Description |
|-----------|------|-------------|
| `sessionId` | string | Session ID |
| `branchId` | string | Branch ID from `threadmap_fork` |

Returns: original intent, fork point, recent messages — everything needed to anchor a new Claude session.

---

### `threadmap_status`
Quick current drift check without loading the full timeline.

| Parameter | Type | Description |
|-----------|------|-------------|
| `sessionId` | string | Session to check |

Returns: current color, drift %, message count, warning if drift is high.

---

### `threadmap_reset`
Archive current thread and start fresh with a new origin.

| Parameter | Type | Description |
|-----------|------|-------------|
| `sessionId` | string | Session to reset |
| `newOriginContent` | string | New starting message to set as origin |

Old thread is archived as a branch. Fresh tracking begins.

---

### `threadmap_legend`
Show the color reference guide — useful to paste into any Claude session.

---

## Real-World Use Cases

### Claude Code — Architecture Integrity
You're building a feature with Claude Code. Start the session, track every message. When you see Orange, scope is creeping. Fork before the drift gets worse. The architecture decisions from the first 10 messages stay clean and uncontaminated.

```
Session: "build a user dashboard with real-time updates"
Message 1-5:   🔵🟢🟢🔵🟢   (core architecture — on track)
Message 6-8:   🟡🟡🟠         (WebSocket config tangent) ← fork here
Message 9-15:  🔴🔴🟣🔴       (deep debugging rabbit hole)
```

Fork at message 6. Tackle the WebSocket issue in a clean separate branch. Main architecture stays untouched.

---

### Long Research Sessions — Stay on Topic
Long Claude research conversations drift naturally. ThreadMap shows you exactly when you left the original question. Jump back to the moment before the drift with one fork.

---

### Brainstorming — Preserve the Original Spark
You have an idea, the conversation gets messy exploring it, and the original insight gets buried. ThreadMap keeps a pointer to the first moment of clarity — fork back to it anytime.

---

### Team Handoffs — Clean Context Packets
Use `threadmap_branch_context` to extract a clean summary of exactly what was decided up to any point. Drop it into a new Claude session. No scrolling through 200 messages to find the relevant decisions.

---

## Architecture

- **Zero external API calls** — drift scoring runs locally using keyword-based semantic comparison
- **No database required** — in-memory session state, zero setup
- **Stateless across restarts** — sessions reset cleanly, lightweight by design
- **Works with Claude Code natively** via MCP protocol
- **Future-ready** — designed to support local embedding models (MiniLM) for richer semantic drift scoring

---

## Why Open Source?

This should be a **protocol**, not a product.

Like Markdown defined how people write on the internet. Like Git defined how code is versioned.

**Non-linear conversation navigation is the missing primitive for AI-native work.**

Right now Claude conversations are books with no table of contents, no chapters, no bookmarks. You just scroll. Nobody would accept that from a book. We accept it from AI because we don't know better yet.

ThreadMap MCP for Claude is the table of contents. The chapter marker. The ability to fork — and pick up from any margin at will.

If this becomes the standard, it travels across Claude, GPT, Gemini, anything. Nobody owns it. Everybody benefits.

---

## Roadmap

- [ ] Local embedding model support (MiniLM) for richer semantic scoring
- [ ] Visual timeline export (SVG/HTML mini-map)
- [ ] Cross-session branch persistence (optional SQLite mode)
- [ ] Shared learning layer — anonymous correction signals improve scoring across users
- [ ] Native Claude.ai extension when Anthropic opens the plugin API
- [ ] GPT / Gemini compatibility

---

## Contributing

MIT licensed. Fork it, extend it, publish it.

```bash
git clone https://github.com/Advertflair/threadmap-mcp
cd threadmap-mcp
npm install
npm run build
npm run dev   # runs locally for testing
```

Issues and PRs welcome. Especially interested in:
- Better drift scoring algorithms
- More granular color thresholds
- Integrations with other AI platforms

---

## License

MIT — see [LICENSE](./LICENSE)

---

*Built by [Advertflair](https://advertflair.com). Open source. Ship it. See what happens.*
