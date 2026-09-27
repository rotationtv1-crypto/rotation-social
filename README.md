# Rotation Studio

One display. Live, PK, and the LLM write the same state (`rtv.studio.v1` plus a `BroadcastChannel`), so every open tab shows the same stage.

- Static display: GitHub Pages (`index.html`, `?pane=live|pk|llm`)
- Functions, only when this repo is deployed on the existing Vercel project: `/api/health`, `/api/query`, `/api/coach`, `/api/gifts-catalog`
- Model: `XAI_API_KEY` (Grok) or `GEMINI_API_KEY`. Neither key is in the page. Without one, the stage still updates and says the gateway is offline.

Deno Deploy Classic is retired and is not part of this stack. Do not add a second origin for the same studio.
