async function grok(prompt, key) {
  const r = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "grok-4.5",
      max_tokens: 280,
      messages: [
        {
          role: "system",
          content: "You are the Rotation Studio display writer. Two or three sentences. No fake guest names. Same facts the host can read on a live wall.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!r.ok) throw new Error(String(r.status));
  const json = await r.json();
  return json?.choices?.[0]?.message?.content?.trim() || "";
}

async function gemini(prompt, key) {
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Rotation Studio display. Two or three sentences.\n${prompt}` }] }],
      }),
    }
  );
  if (!r.ok) throw new Error(String(r.status));
  const json = await r.json();
  return json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const prompt = String(body.prompt || "").trim().slice(0, 2000);
  if (!prompt) return res.status(400).json({ ok: false, text: "Prompt required.", offline: true });

  const xai = process.env.XAI_API_KEY;
  const gem = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  try {
    if (xai) {
      const text = await grok(prompt, xai);
      return res.status(200).json({ ok: true, provider: "xai", text, offline: false });
    }
    if (gem) {
      const text = await gemini(prompt, gem);
      return res.status(200).json({ ok: true, provider: "gemini", text, offline: false });
    }
  } catch {
    return res.status(200).json({
      ok: false,
      provider: xai ? "xai" : "gemini",
      text: "The model did not answer. The display kept your prompt.",
      offline: true,
    });
  }
  return res.status(200).json({
    ok: false,
    provider: "none",
    text: "No model key on this host. Set XAI_API_KEY or GEMINI_API_KEY. The display is still in sync.",
    offline: true,
  });
};
