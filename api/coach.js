function fallbackTip(d, t, v, g) {
  if (t > 0 && v === 0) return { text: 'Come closer to the camera for a better viewing experience.', action: 'show_guide' };
  if (d > 90 && g === 0 && t >= 5) return { text: 'Room is quiet. Invite a seat or start a short PK.', action: 'invite_seat' };
  return { text: 'Viewers are here. Ask them to say hi.', action: 'ask_chat' };
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const durationSec = Number(body.durationSec) || 0;
  const totalViewers = Number(body.totalViewers) || 0;
  const validViewers = Number(body.validViewers) || 0;
  const gifters = Number(body.gifters) || 0;
  const luma = body.luma;

  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!key) {
    return res.status(200).json({
      provider: 'google-ai-studio',
      tip: fallbackTip(durationSec, totalViewers, validViewers, gifters),
      offline: true,
    });
  }

  const prompt = `You are the RotationTV live coach. One short tip for the host. No fake guests.\ndurationSec=${durationSec} totalViewers=${totalViewers} validViewers=${validViewers} gifters=${gifters} luma=${luma ?? ''}\nReturn JSON { "text": string, "action": "show_guide"|"invite_seat"|"start_pk"|"ask_chat"|null }`;

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );
    const json = await r.json();
    const text =
      json?.candidates?.[0]?.content?.parts?.[0]?.text ||
      fallbackTip(durationSec, totalViewers, validViewers, gifters).text;
    return res.status(200).json({ provider: 'google-ai-studio', tip: { text, action: 'ask_chat' } });
  } catch (err) {
    return res.status(200).json({
      provider: 'google-ai-studio',
      tip: fallbackTip(durationSec, totalViewers, validViewers, gifters),
      offline: true,
    });
  }
};
