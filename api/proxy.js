export default async function handler(req, res) {
  // CORS হেডার সেট করা (যেন যেকোনো প্লেয়ারে চলে)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // ডিফল্টভাবে আপনার দেওয়া GitHub Playlist URL ব্যবহার করা হয়েছে
  const targetUrl = req.query.url || 'https://raw.githubusercontent.com/johirxofficial/otv-auto-updated-playlist/main/otv.m3u';

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch the URL' });
    }

    // যদি URL টি .m3u বা .m3u8 ফাইল হয়, তবে ফাইলটি পড়ে ভেতরের লিংকগুলো প্রক্সি দিয়ে রিরাইট করা হবে
    if (targetUrl.includes('.m3u') || targetUrl.includes('.m3u8')) {
      let content = await response.text();
      const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);

      const modifiedContent = content.split('\n').map(line => {
        let trimmedLine = line.trim();
        // যদি লাইনটি কোনো ট্যাগ (#) না হয় এবং খালি না হয় (অর্থাৎ এটি একটি লিংক)
        if (trimmedLine && !trimmedLine.startsWith('#')) {
          let absoluteUrl = trimmedLine.startsWith('http') ? trimmedLine : baseUrl + trimmedLine;
          // চ্যানেলের মূল লিংকটিকে আপনার Vercel প্রক্সিতে পাঠিয়ে দেওয়া হচ্ছে
          return `https://${req.headers.host}/api/proxy?url=${encodeURIComponent(absoluteUrl)}`;
        }
        return line; // #EXTINF বা অন্যান্য ট্যাগগুলো আগের মতোই থাকবে
      }).join('\n');

      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
      return res.status(200).send(modifiedContent);
    } 

    // যদি কোনো ভিডিও সেগমেন্ট (.ts) হয়, তবে সরাসরি প্লেয়ারে পাঠানো হবে
    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'video/mp2t';
    res.setHeader('Content-Type', contentType);
    return res.status(200).send(Buffer.from(buffer));

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
