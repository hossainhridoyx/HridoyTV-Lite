export default async function handler(req, res) {
  // CORS হেডার সেট করা (যাতে যেকোনো ওয়েবসাইট বা প্লেয়ার থেকে স্ট্রিম কাজ করে)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // URL প্যারামিটার না থাকলে ডিফল্টভাবে আপনার প্রদত্ত লিংকটি ব্যবহার করবে
  const targetUrl = req.query.url || 'http://mxonlive.xyz/live/xap/444348.m3u8?e=1786991382&token=ab73f64105580c1ccac35c501b57e15f8ce4c4cf938f1e054656a6d830d0c61f';

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'http://mxonlive.xyz/'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Stream loading failed' });
    }

    const contentType = response.headers.get('content-type') || 'application/vnd.apple.mpegurl';
    const data = await response.text();

    res.setHeader('Content-Type', contentType);
    return res.status(200).send(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
