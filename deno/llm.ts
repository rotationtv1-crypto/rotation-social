const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = Number(Deno.env.get("LLM_RATE_LIMIT") || 30);
const MAX_PROMPT = 8000;
const hits = new Map<string, number[]>();

export function rateLimit(req: Request): Response | null {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  if (arr.length >= MAX_PER_WINDOW) {
    return new Response(JSON.stringify({ ok: false, error: "rate limited" }), { status: 429, headers: { "content-type": "application/json", "retry-after": "60" } });
  }
  arr.push(now); hits.set(ip, arr); return null;
}

export function requireGatewayKey(req: Request): Response | null {
  const expected = Deno.env.get("LLM_GATEWAY_KEY") || "";
  if (!expected) return null;
  const got = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (got !== expected) return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), { status: 401, headers: { "content-type": "application/json" } });
  return null;
}

function providersPresent() {
  return { xai: Boolean(Deno.env.get("XAI_API_KEY")), openai: Boolean(Deno.env.get("OPENAI_API_KEY")) };
}

async function callXai(prompt: string) {
  const key = Deno.env.get("XAI_API_KEY"); if (!key) throw new Error("XAI_API_KEY missing");
  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ model: Deno.env.get("XAI_MODEL") || "grok-4", messages: [{ role: "user", content: prompt }], temperature: 0.4 }),
  });
  if (!res.ok) throw new Error(`xAI ${res.status}`);
  const data = await res.json() as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content || "";
}

async function callOpenAi(prompt: string) {
  const key = Deno.env.get("OPENAI_API_KEY"); if (!key) throw new Error("OPENAI_API_KEY missing");
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ model: Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini", messages: [{ role: "user", content: prompt }] }),
  });
  if (!res.ok) throw new Error(`openai ${res.status}`);
  const data = await res.json() as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content || "";
}

async function route(prompt: string, preferred?: string) {
  const have = providersPresent();
  const order = [preferred, have.xai && "xai", have.openai && "openai"].filter(Boolean) as string[];
  let last = "no provider configured";
  for (const name of order) {
    try {
      if (name === "xai") return { provider: "xai", response: await callXai(prompt) };
      if (name === "openai") return { provider: "openai", response: await callOpenAi(prompt) };
    } catch (err) { last = err instanceof Error ? err.message : String(err); }
  }
  throw new Error(last);
}

export async function handleLlm(req: Request, url: URL): Promise<Response | null> {
  const path = url.pathname;
  if (!path.startsWith("/api/query") && !path.startsWith("/api/research") && !path.startsWith("/api/call/") && path !== "/api/analysis/competition" && path !== "/api/llm/health") return null;
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });
  const limited = rateLimit(req); if (limited) return limited;
  const denied = requireGatewayKey(req); if (denied && path !== "/api/llm/health") return denied;
  try {
    if (path === "/api/llm/health") return Response.json({ ok: true, runtime: "deno", providers: providersPresent(), authRequired: Boolean(Deno.env.get("LLM_GATEWAY_KEY")) });
    if (path === "/api/analysis/competition" && req.method === "GET") return Response.json({ note: "First-party positioning only.", rotation: { frontend: "GitHub Pages", runtime: "Deno Deploy", payments: "PayPal rotationtv1@gmail.com" }, lastUpdated: new Date().toISOString() });
    if (path === "/api/research" && req.method === "POST") {
      const body = await req.json().catch(() => ({})) as { query?: string; numSources?: number };
      const query = String(body.query || "").slice(0, 400);
      if (!query) return Response.json({ ok: false, error: "query required" }, { status: 400 });
      const cap = Math.min(Number(body.numSources) || 3, 5);
      const result = await route(`RotationTV Network LLC first-party brief. Query: ${query}. Return ${cap} talking points.`, "xai");
      return Response.json({ ok: true, query, sourcesRequested: cap, ...result });
    }
    if (path === "/api/query" && req.method === "POST") {
      const body = await req.json().catch(() => ({})) as { prompt?: string; preferredProvider?: string; enableEnsemble?: boolean };
      const prompt = String(body.prompt || "").slice(0, MAX_PROMPT);
      if (!prompt) return Response.json({ ok: false, error: "prompt required" }, { status: 400 });
      if (body.enableEnsemble) {
        const have = providersPresent();
        const parts = [];
        if (have.xai) parts.push(route(prompt, "xai"));
        if (have.openai) parts.push(route(prompt, "openai"));
        if (!parts.length) throw new Error("no provider configured");
        const settled = await Promise.allSettled(parts);
        return Response.json({ ok: true, ensemble: settled.map((s) => s.status === "fulfilled" ? s.value : { error: String(s.reason) }) });
      }
      return Response.json({ ok: true, ...(await route(prompt, body.preferredProvider)) });
    }
    const call = path.match(/^\/api\/call\/([^/]+)$/);
    if (call && req.method === "POST") {
      const body = await req.json().catch(() => ({})) as { prompt?: string };
      const prompt = String(body.prompt || "").slice(0, MAX_PROMPT);
      if (!prompt) return Response.json({ ok: false, error: "prompt required" }, { status: 400 });
      return Response.json({ ok: true, ...(await route(prompt, call[1])) });
    }
    return Response.json({ ok: false, error: "method not allowed" }, { status: 405 });
  } catch (err) {
    return Response.json({ ok: false, error: err instanceof Error ? err.message : "llm failed" }, { status: 500 });
  }
}
