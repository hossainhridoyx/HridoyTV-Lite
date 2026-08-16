// ===================================================
// এখানে আপনার সিক্রেট বা এক্সপায়ার আইডি সেট করুন
// ===================================================
const EXPIRE_CODE = "48436844"; 

const PLAYLIST_URL = "https://raw.githubusercontent.com/johirxofficial/otv-auto-updated-playlist/main/otv.m3u";
// ===================================================

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const requestUrl = req.url || '';

  // ১. প্লেলিস্ট রিকোয়েস্ট
  if (requestUrl.includes('.m3u') && !req.query.url) {
    
    // আইডি সঠিক না হলে অ্যাক্সেস ব্লক করা (403 Forbidden)
    if (!requestUrl.includes(EXPIRE_CODE)) {
      return res.status(403).json({ error: 'Access Denied: Invalid or Expired ID' });
    }

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

  // ২. স্ট্রিম ফেচ রিকোয়েস্ট
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

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'video/mp2t';
    res.setHeader('Content-Type', contentType);
    return res.status(200).send(Buffer.from(buffer));

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
