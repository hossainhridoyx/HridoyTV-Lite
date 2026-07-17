// api/proxy.js

export default async function handler(req, res) {
  // আপনার টার্গেট URL
  const targetUrl = 'https://madanitv.assadikb.workers.dev/live.php?id=756&e=.m3u8';

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0'
      }
    });

    // CORS হেডার যুক্ত করা যাতে যেকোনো সাইট থেকে এটি ব্যবহার করা যায়
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Content-Type', response.headers.get('Content-Type'));

    // বাফার আকারে ডেটা রিটার্ন করা
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return res.status(200).send(buffer);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch the stream' });
  }
}
