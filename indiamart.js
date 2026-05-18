// api/indiamart.js — Secure IndiaMART Proxy
// Deploy: Add INDIAMART_KEY to Vercel Environment Variables

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const API_KEY = process.env.INDIAMART_KEY || 'mRy2Fb5u7XjDSvet4nKP7lGHoVHCmTA=';
  const { start_time, end_time } = req.query;

  const st = start_time || getDefaultStart();
  const et = end_time   || getDefaultEnd();

  try {
    const url = `https://mapi.indiamart.com/wservce/crm/crmListing/v2/?glusr_crm_key=${API_KEY}&start_time=${encodeURIComponent(st)}&end_time=${encodeURIComponent(et)}`;
    const r   = await fetch(url, { headers: { 'Accept': 'application/json' } });
    const data = await r.json();
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

function getDefaultStart() {
  const d = new Date(); d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0,10) + ' 00:00:00';
}
function getDefaultEnd() {
  return new Date().toISOString().slice(0,10) + ' 23:59:59';
}
