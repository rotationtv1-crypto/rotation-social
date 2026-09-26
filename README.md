# rotation-social

RotationTV Network LLC first-party PWA.

- Static: GitHub Pages
- Runtime: Deno Deploy (`deno/main.ts`)
- Payments: PayPal `rotationtv1@gmail.com`
- LLM: `deno/llm.ts` — **not** the pasted Express `server.js`

## Do not use Helm / Terraform unless you stand up a cluster
Chosen environment is **Deno Deploy + GitHub Pages**. K8s charts would be a third stack.

## Local Deno

```bash
deno task start
bash scripts/probe.sh http://localhost:5000
```

## Deno Deploy secrets

`DENO_DEPLOY_TOKEN`, `XAI_API_KEY` or `OPENAI_API_KEY`, `LLM_GATEWAY_KEY`, `FRONTEND_ORIGIN`

## Pages

Enable Settings → Pages → GitHub Actions.

PWA: iOS Safari Share → Add to Home Screen. Android Chrome → Install app.
