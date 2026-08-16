// ===================================================
//  এখানে ৪৮৪৩৬৮৪৪ বা আপনার পছন্দমতো Expire Code পরিবর্তন করুন
// ===================================================
const EXPIRE_CODE = "48436844"; 

// মূল M3U প্লেলিস্টের লিংক
const PLAYLIST_URL = "https://raw.githubusercontent.com/johirxofficial/otv-auto-updated-playlist/main/otv.m3u";
// ===================================================

export default async function handler(req, res) {
  // CORS হেডার
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const requestUrl = req.url || '';

  // ১. প্লেলিস্টের রিকোয়েস্ট (যেমন: /api/proxy/playlist-expire=48436844.m3u)
  if (requestUrl.includes('.m3u') && !req.query.url) {
    try {
      const response = await fetch(PLAYLIST_URL, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: 'Playlist fetch failed' });
      }

      let content = await response.text();
      const baseUrl = PLAYLIST_URL.substring(0, PLAYLIST_URL.lastIndexOf('/') + 1);

      // প্লেলিস্টের প্রতিটা চ্যানেলের লিংক প্রক্সি লিংকে পরিবর্তন করা
      const modifiedContent = content.split('\n').map(line => {
        let trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith('#')) {
          let absoluteUrl = trimmedLine.startsWith('http') ? trimmedLine : baseUrl + trimmedLine;
          return `https://${req.headers.host}/api/proxy?url=${encodeURIComponent(absoluteUrl)}`;
        }
        return line;
      }).join('\n');

      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
      return res.status(200).send(modifiedContent);

    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // ২. প্লেলিস্টের ভেতরের প্রতিটি ইন্ডিভিজুয়াল চ্যানেলের স্ট্রিম ফেচ করার রিকোয়েস্ট
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).json({ error: 'No URL provided' });
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
        'Referer': targetUrl.startsWith('http') ? new URL(targetUrl).origin + '/' : ''
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Stream fetch failed' });
    }

    // M3U8 সাব-প্লেলিস্ট ফাইল হলে লিংক রিরাইট
    if (targetUrl.includes('.m3u8')) {
      let content = await response.text();
      const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);

      const modifiedContent = content.split('\n').map(line => {
        let trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith('#')) {
          let absoluteUrl = trimmedLine.startsWith('http') ? trimmedLine : baseUrl + trimmedLine;
          return `https://${req.headers.host}/api/proxy?url=${encodeURIComponent(absoluteUrl)}`;
        }
        return line;
      }).join('\n');

      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
      return res.status(200).send(modifiedContent);
    }

    // TS ভিডিও সেগমেন্ট
    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'video/mp2t';
    res.setHeader('Content-Type', contentType);
    return res.status(200).send(Buffer.from(buffer));

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
