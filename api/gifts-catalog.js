const FALLBACK = [
  { sku: 'perfume', name: 'Perfume', stars: 1, category: 'popular' },
  { sku: 'butterfly_mask', name: 'Butterfly Mask', stars: 100, category: 'popular' },
  { sku: 'crystal_ball', name: 'Crystal Ball', stars: 999, category: 'glory' },
  { sku: 'yacht', name: 'Luxury Yacht', stars: 1000, category: 'popular' },
  { sku: 'cash_rain', name: 'Cash Rain', stars: 5000, category: 'glory' },
  { sku: 'dance_floor_queen', name: 'Dance Floor Queen', stars: 10000, category: 'glory' },
];

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return res.status(200).json({ source: 'fallback', items: FALLBACK });
  }

  const category = (req.query && req.query.category) || '';
  let path = `${url}/rest/v1/rtv_gift_skus?select=*&order=stars.asc`;
  if (category && category !== 'all') path += `&category=eq.${encodeURIComponent(category)}`;

  const r = await fetch(path, {
    headers: { apikey: anon, Authorization: `Bearer ${anon}` },
  });
  if (!r.ok) return res.status(200).json({ source: 'fallback', items: FALLBACK });
  const items = await r.json();
  return res.status(200).json({ source: 'supabase', items });
};
