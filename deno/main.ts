import { handleLlm } from "./llm.ts";

const PORT = Number(Deno.env.get("PORT") || 5000);
const FRONTEND_ORIGIN = Deno.env.get("FRONTEND_ORIGIN") || "*";
const ROOT = new URL("../", import.meta.url);

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": FRONTEND_ORIGIN,
      "access-control-allow-headers": "content-type, authorization",
      "access-control-allow-methods": "GET,POST,OPTIONS",
    },
  });
}

function mime(path: string) {
  if (path.endsWith(".html")) return "text/html; charset=utf-8";
  if (path.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (path.endsWith(".json")) return "application/json; charset=utf-8";
  if (path.endsWith(".svg")) return "image/svg+xml";
  return "application/octet-stream";
}

async function staticFile(pathname: string) {
  let rel = pathname === "/" ? "index.html" : pathname.replace(/^\//, "");
  if (rel.includes("..")) return new Response("blocked", { status: 400 });
  try {
    const file = await Deno.readFile(new URL(rel, ROOT));
    return new Response(file, { headers: { "content-type": mime(rel), "access-control-allow-origin": FRONTEND_ORIGIN } });
  } catch {
    return new Response("not found", { status: 404 });
  }
}

Deno.serve({ port: PORT }, async (req) => {
  const url = new URL(req.url);
  if (req.method === "OPTIONS") return json({ ok: true });
  const llm = await handleLlm(req, url);
  if (llm) {
    const headers = new Headers(llm.headers);
    headers.set("access-control-allow-origin", FRONTEND_ORIGIN);
    return new Response(llm.body, { status: llm.status, headers });
  }
  if (url.pathname === "/api/health" || url.pathname === "/health") {
    return json({ ok: true, service: "rotation-social", runtime: "deno", features: ["live", "llm", "pwa"] });
  }
  return staticFile(url.pathname);
});
