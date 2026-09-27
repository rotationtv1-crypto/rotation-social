module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({
    status: 'ok',
    stack: 'vercel-cloudflare-supabase-google-ai-studio',
    payments: 'telegram_stars',
    coach: 'gemini-2.0-flash',
    surface: 'rotation-social',
  });
};
