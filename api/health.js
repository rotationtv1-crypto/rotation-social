module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");
  const llm = Boolean(process.env.XAI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY);
  res.status(200).json({
    status: "ok",
    stack: "github-pages-display+vercel-functions",
    surfaces: ["display", "live", "pk", "llm"],
    sync: "rtv-studio",
    llm: llm ? "ready" : "offline",
    payments: "stars-fallback",
  });
};
