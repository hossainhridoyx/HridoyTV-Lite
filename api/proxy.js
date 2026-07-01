export default async function handler(req, res) {
  // CORS হেডার সেট করা হচ্ছে যেন যেকোনো প্লেয়ারে এটি সহজে চলে
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  // OPTIONS রিকোয়েস্ট হ্যান্ডেল করা (Preflight রিকোয়েস্টের জন্য)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { slug } = req.query;
  // যদি slug অ্যারে হয় তবে জয়েন করবে, অন্যথায় সরাসরি স্ট্রিং হিসেবে নিবে
  const path = Array.isArray(slug) ? slug.join('/') : (slug || '');
  
  // মূল HTTP স্ট্রিমিং সার্ভারের URL
  const targetUrl = `http://198.195.239.50:8095/${path}`;

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0',
      },
    });

    if (!response.ok) {
      return res.status(response.status).send(`Error fetching target: ${response.statusText}`);
    }

    // মূল সার্ভারের কন্টেন্ট টাইপ (যেমন: application/x-mpegURL বা video/MP2T) পাস করা
    const contentType = response.headers.get('content-type');
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }

    // ভিডিওর ডাটাসমূহ (.m3u8 ফাইল বা .ts ভিডিও চাঙ্ক) বাফার হিসেবে ক্লায়েন্টকে পাঠানো
    const arrayBuffer = await response.arrayBuffer();
    return res.status(200).send(Buffer.from(arrayBuffer));

  } catch (error) {
    return res.status(500).send(`Proxy Error: ${error.message}`);
  }
}
