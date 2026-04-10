# 🗺️ ThreadMap MCP for Claude

**Conversation drift visualization and forking for Claude.**

> Stop losing your original intent. See exactly where your conversation drifted. Fork from any point and pick up with clean context.

---

## See it in action

**Color dots on every message — live drift tracking:**

![ThreadMap drift dots demo](docs/threadmap-demo.gif)

**Timeline panel with fork buttons at every inflection point:**

![ThreadMap timeline panel](docs/threadmap-timeline.gif)

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

### Chrome Extension (visual dots in claude.ai)

For color dots directly inside claude.ai, install the Chrome extension:

1. Download the [`threadmap-chrome`](./threadmap-chrome) folder
2. Go to `chrome://extensions` → enable **Developer mode**
3. Click **Load unpacked** → select the folder
4. Open claude.ai — dots appear automatically

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
```

### 4. Resume from the branch

```
threadmap_branch_context(
  sessionId="myproject",
  branchId="branch_1712345678"
)
```

---

## All Tools

### `threadmap_track`
Track a message and get its drift score.

| Parameter | Type | Description |
|-----------|------|-------------|
| `sessionId` | string | Unique ID for this conversation/project |
| `role` | `"user"` \| `"assistant"` | Who sent the message |
| `content` | string | The message text |

---

### `threadmap_timeline`
Show the full color-coded conversation map.

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
| `branchName` | string | Name for the branch |

---

### `threadmap_branch_context`
Get the context packet for a branch to resume cleanly.

| Parameter | Type | Description |
|-----------|------|-------------|
| `sessionId` | string | Session ID |
| `branchId` | string | Branch ID from `threadmap_fork` |

---

### `threadmap_status`
Quick current drift check.

| Parameter | Type | Description |
|-----------|------|-------------|
| `sessionId` | string | Session to check |

---

### `threadmap_reset`
Archive current thread and start fresh.

| Parameter | Type | Description |
|-----------|------|-------------|
| `sessionId` | string | Session to reset |
| `newOriginContent` | string | New starting message |

---

### `threadmap_legend`
Show the color reference guide.

---

## Real-World Use Cases

### Claude Code — Architecture Integrity
Track every message. When you see Orange, scope is creeping. Fork before the drift gets worse.

```
Session: "build a user dashboard with real-time updates"
Message 1-5:   🔵🟢🟢🔵🟢   (core architecture — on track)
Message 6-8:   🟡🟡🟠         (WebSocket config tangent) ← fork here
Message 9-15:  🔴🔴🟣🔴       (deep debugging rabbit hole)
```

### Long Research Sessions — Stay on Topic
ThreadMap shows you exactly when you left the original question. Jump back to the moment before the drift.

### Brainstorming — Preserve the Original Spark
ThreadMap keeps a pointer to the first moment of clarity — fork back to it anytime.

### Team Handoffs — Clean Context Packets
Use `threadmap_branch_context` to extract a clean summary of what was decided. Drop it into a new Claude session.

---

## Architecture

- **Zero external API calls** — drift scoring runs locally using keyword-based semantic comparison
- **No database required** — in-memory session state, zero setup
- **Works with Claude Code natively** via MCP protocol
- **Chrome extension** for visual dots in claude.ai

---

## Why Open Source?

This should be a **protocol**, not a product. Like Markdown. Like Git.

Non-linear conversation navigation is the missing primitive for AI-native work. If this becomes the standard, it travels across Claude, GPT, Gemini, anything. Nobody owns it. Everybody benefits.

---

## Roadmap

- [ ] Local embedding model support (MiniLM) for richer semantic scoring
- [ ] Visual timeline export (SVG/HTML)
- [ ] Cross-session persistence (SQLite mode)
- [ ] Chrome extension on Chrome Web Store
- [ ] GPT / Gemini compatibility

---

## Contributing

MIT licensed. See [CONTRIBUTING.md](./CONTRIBUTING.md).

```bash
git clone https://github.com/Advertflair/threadmap-mcp
cd threadmap-mcp
npm install
npm run build
```

---

## License

MIT — see [LICENSE](./LICENSE)

---

*Built by [Advertflair](https://advertflair.com). Open source. Ship it.*
