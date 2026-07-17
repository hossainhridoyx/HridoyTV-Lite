// api/proxy.js

export default async function handler(req, res) {
  // মূল টার্গেট লিংক
  const targetUrl = 'https://madanitv.assadikb.workers.dev/live.php?id=756&e=.m3u8';

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        // ব্রাউজার হিসেবে নকল করা যেন ক্লাউডফ্লেয়ার বা ওয়ার্কার ব্লক না করে
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer': 'https://madanitv.assadikb.workers.dev/'
      }
    });

    if (!response.ok) {
      return res.status(response.status).send(`Worker Error: ${response.statusText}`);
    }

    // CORS এবং সঠিক ভিডিও টাইপ হেডার সেট করা
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');

    // Fetch নিজে থেকেই রিডাইরেক্ট ফলো করে আসল স্ট্রিম লিংক বের করে নেয়
    const finalUrl = response.url; 
    const urlObj = new URL(finalUrl);
    
    // ভিডিওর মূল ডোমেইন এবং ফোল্ডার পাথ বের করা
    const domainUrl = urlObj.origin; // e.g., https://example.com
    const basePath = finalUrl.substring(0, finalUrl.lastIndexOf('/') + 1); // e.g., https://example.com/live/

    // m3u8 ফাইলটিকে টেক্সট হিসেবে পড়া
    let text = await response.text();
    
    // লাইনের ভেতরের রিলেটিভ লিংকগুলোকে সম্পূর্ণ লিংকে রূপান্তর করা
    const lines = text.split('\n');
    const rewrittenLines = lines.map(line => {
      let trimmed = line.trim();
      
      // যদি লাইনটি খালি না হয়, # (কমেন্ট) দিয়ে শুরু না হয় এবং সরাসরি http দিয়ে শুরু না হয়
      if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('http')) {
        if (trimmed.startsWith('/')) {
          return `${domainUrl}${trimmed}`;
        } else {
          return `${basePath}${trimmed}`;
        }
      }
      return line;
    });

    // নতুন লিংকসহ মডিফাইড m3u8 রিটার্ন করা
    return res.status(200).send(rewrittenLines.join('\n'));

  } catch (error) {
    return res.status(500).send(`Proxy System Error: ${error.message}`);
  }
}
