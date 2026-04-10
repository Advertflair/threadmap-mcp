# ThreadMap Chrome Extension

**Installs ThreadMap drift visualization directly into claude.ai.**

Color-coded dots appear next to every message. Timeline panel shows full conversation map. Fork any message to open a clean new chat with context pre-loaded.

## Install (2 minutes)

1. Clone or download this repo
2. Open Chrome → `chrome://extensions`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** → select the `chrome-extension` folder
5. Open any Claude conversation — ThreadMap activates automatically

## Features

- **Color dots** next to every message showing drift % from your original intent
- **Top bar** with live drift status + message count
- **↺ rescan** — loads all messages from previous conversations
- **Timeline panel** — full conversation map, click any row to jump to that message
- **⑂ fork** — opens new chat with full context pre-loaded in the input

## How forking works

1. Click any **⑂ fork** button in the timeline or next to a message
2. A new Claude tab opens automatically
3. The full context (origin intent + all messages up to that point) is pasted into the input
4. Review and hit Send — Claude picks up exactly where the clean version left off

## Color legend

| Color | Drift | Meaning |
|-------|-------|---------|
| 🔵 Blue | 0–15% | On track |
| 🟢 Green | 16–35% | Productive expansion |
| 🟡 Yellow | 36–55% | Adjacent drift |
| 🟠 Orange | 56–72% | Inflection point |
| 🔴 Red | 73–88% | Context break |
| 🟣 Purple | 89–95% | Meta conversation |
| ⚪ White | 96–100% | Resolution |

## Links

- MCP Server: [npmjs.com/package/threadmap-mcp](https://www.npmjs.com/package/threadmap-mcp)
- GitHub: [github.com/Advertflair/threadmap-mcp](https://github.com/Advertflair/threadmap-mcp)
- Registry: [registry.modelcontextprotocol.io](https://registry.modelcontextprotocol.io)
