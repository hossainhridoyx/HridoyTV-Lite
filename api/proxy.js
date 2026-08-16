export default async function handler(req, res) {
  // CORS হেডার সেট করা
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // রিকোয়েস্টের URL নেওয়া অথবা ডিফল্ট লিংক ব্যবহার করা
  const targetUrl = req.query.url || 'http://mxonlive.xyz/live/xap/444348.m3u8?e=1786991382&token=ab73f64105580c1ccac35c501b57e15f8ce4c4cf938f1e054656a6d830d0c61f';

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'http://mxonlive.xyz/'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Stream failed to fetch' });
    }

    // যদি m3u8 ফাইল হয়, তবে ভেতরের সাব-লিংকগুলোকে প্রক্সি লিংকে রূপান্তর করা
    if (targetUrl.includes('.m3u8')) {
      let content = await response.text();
      const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);

      // m3u8 ফাইলের ভেতরের লাইনগুলো প্রক্সি দিয়ে রিরাইট করা
      const modifiedContent = content.split('\n').map(line => {
        if (line.trim() && !line.startsWith('#')) {
          const absoluteUrl = line.startsWith('http') ? line : baseUrl + line;
          return `https://${req.headers.host}/api/proxy?url=${encodeURIComponent(absoluteUrl)}`;
        }
        return line;
      }).join('\n');

      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      return res.status(200).send(modifiedContent);
    } 

    // যদি TS ভিডিও সেগমেন্ট বা ফাইল হয়, সরাসরি বাইনারি হিসেবে পাঠানো
    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'video/mp2t';
    res.setHeader('Content-Type', contentType);
    return res.status(200).send(Buffer.from(buffer));

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
