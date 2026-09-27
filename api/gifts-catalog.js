const FALLBACK = [
  { sku: "rose", name: "Rose", stars: 1, category: "popular" },
  { sku: "mask", name: "Mask", stars: 100, category: "popular" },
  { sku: "crystal", name: "Crystal", stars: 999, category: "glory" },
  { sku: "queen", name: "Queen", stars: 10000, category: "glory" },
];

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method !== "GET") return res.status(405).json({ error: "GET only" });

  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  if (!url || !anon) return res.status(200).json({ source: "fallback", items: FALLBACK });

  const category = (req.query && req.query.category) || "";
  let path = `${url}/rest/v1/rtv_gift_skus?select=*&order=stars.asc`;
  if (category && category !== "all") path += `&category=eq.${encodeURIComponent(category)}`;

  const r = await fetch(path, { headers: { apikey: anon, authorization: `Bearer ${anon}` } });
  if (!r.ok) return res.status(200).json({ source: "fallback", items: FALLBACK });
  const items = await r.json();
  return res.status(200).json({ source: "supabase", items });
};
