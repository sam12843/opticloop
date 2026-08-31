# Optic Loop

Optic Loop is a local visual-verification sidecar for coding agents. It closes the loop between “code changed” and “the UI is correct” while returning compact structured evidence instead of continuously spending context on full screenshots.

## MVP loop

`source change -> Playwright render -> deterministic UI checks -> compact NDJSON -> agent fixes -> verify again`

The first release detects console and HTTP failures, horizontal overflow, off-screen controls, and undersized mobile tap targets across configured viewports. It captures visual baselines, scores pixel changes, and produces a tightly cropped changed-region image for optional semantic vision—not a full screenshot by default.

## Run

```powershell
npm.cmd install
npx.cmd playwright install chromium
Copy-Item opticloop.config.example.json opticloop.config.json
npm.cmd run dev -- check --config opticloop.config.json --pretty
npm.cmd run dev -- baseline --config opticloop.config.json --pretty
npm.cmd run dev -- watch --config opticloop.config.json
```

The `watch` command emits one JSON object per verification. Codex, Claude Code, an MCP adapter, or a shell hook can consume the stream without vendor lock-in.

## MCP integration

After `npm.cmd run build`, configure an MCP client to launch:

```text
node C:\absolute\path\to\opticloop\dist\mcp.js
```

The server exposes `visual_check`, accepting either `{ "configPath": "..." }` or `{ "url": "http://localhost:3000" }`. Keep the application's dev server running; the coding agent can call the tool after meaningful UI changes and must treat a failing result as unfinished work.

## Success metrics

Optic Loop should be evaluated against a control agent on the same UI tasks:

- median time to satisfy visual acceptance criteria;
- correctly completed tasks per dollar;
- total input/output tokens per correctly completed task;
- number of human correction turns;
- visual, responsive, console, network, and accessibility defects at completion.

The target is **50% lower context/token spend per correctly completed UI task**, not merely 50% smaller screenshots. The `context` field is an early instrumentation estimate and must not be presented as benchmark proof.

## Roadmap

See [ARCHITECTURE.md](ARCHITECTURE.md) for the persistent observer, acceptance compiler, vision adapters, trust rules, and benchmark design.

## License

MIT. The core is intentionally free and open source to maximize adoption, external validation, and portfolio value.
