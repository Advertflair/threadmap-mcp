# Contributing to ThreadMap MCP for Claude

Thanks for your interest in contributing. This started as a one-session build — the more people who improve it, the better it gets for everyone.

## What We Need Most

- **Better drift scoring** — the current keyword-based approach is a starting point. Local embedding models (MiniLM, etc.) would make scoring much more accurate
- **Bug reports** — edge cases in conversation tracking, inflection point detection
- **Real-world examples** — use cases we haven't thought of
- **Platform support** — making it work cleanly with GPT, Gemini, and other AI interfaces

## Getting Started

```bash
git clone https://github.com/Advertflair/threadmap-mcp
cd threadmap-mcp
npm install
npm run dev
```

The server runs locally and connects via stdio. Test it by piping MCP JSON requests directly.

## How to Submit Changes

1. Fork the repo
2. Create a branch: `git checkout -b your-feature`
3. Make your changes
4. Test locally
5. Open a PR with a clear description of what changed and why

## Good First Issues

- Add topics tagging to inflection points (not just drift score)
- Add a `threadmap_search` tool to find messages by keyword
- Improve the color threshold boundaries based on real usage data
- Add unit tests for the drift scoring engine
- Write a SQLite persistence layer (optional mode)

## Code Style

TypeScript. Keep it simple. No unnecessary dependencies. The whole server is one file intentionally — easy to read, easy to fork, easy to understand.

## Questions?

Open an issue on GitHub or reach out to the team at [Advertflair](https://advertflair.com).
