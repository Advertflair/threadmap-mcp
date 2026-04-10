# 🗺️ ThreadMap

**Conversation drift visualization and forking for Claude.**

> Know where you've been. Fork from anywhere. Never lose your original intent.

## Install — One Line

```bash
claude mcp add threadmap npx threadmap-mcp
```

## What it does

ThreadMap tracks every message in your Claude conversation and assigns it a **color based on how far it has drifted** from where you started.

```
🔵 Blue   — On track. Core intent. (0–15% drift)
🟢 Green  — Productive expansion. (16–35%)
🟡 Yellow — Adjacent drift. Related but expanding. (36–55%)
🟠 Orange — Meaningful pivot. Inflection point. (56–72%)
🔴 Red    — Full context break. Different territory. (73–88%)
🟣 Purple — Meta layer. Talking about the conversation. (89–95%)
⚪ White  — Resolution. Conclusion reached. (96–100%)
```

When you see orange or red — that's an **inflection point**. Fork right there, pick up from clean context.

## Tools

| Tool | What it does |
|------|-------------|
| `threadmap_track` | Track a message, get color + drift score |
| `threadmap_timeline` | Full color-coded conversation map |
| `threadmap_fork` | Fork from any message index |
| `threadmap_branch_context` | Clean context packet for any branch |
| `threadmap_status` | Quick current drift check |
| `threadmap_reset` | Archive current thread, start fresh |
| `threadmap_legend` | Show color legend |

## Example

```
threadmap_track(sessionId="myproject", role="user", content="build me a login system")
→ 🔵 Blue — Drift: 0%

threadmap_track(sessionId="myproject", role="user", content="JWT failing on refresh token")
→ 🟠 Orange — Drift: 61% — INFLECTION POINT

threadmap_fork(sessionId="myproject", messageIndex=3, branchName="jwt-fix")
→ 🌿 Branch Created: clean context from message #4 forward
```

## Why open source?

This should be a **protocol**, not a product. Like Markdown. Like Git.

If this becomes the standard way people navigate AI conversations — the format travels across Claude, GPT, Gemini, anything. Nobody owns it. Everybody benefits.

## Contributing

MIT licensed. Fork it, extend it, publish it.

```bash
git clone https://github.com/Advertflair/threadmap-mcp
cd threadmap-mcp
npm install
npm run build
```

---
*Built in one brainstorm session. Ship it. See what happens.*
