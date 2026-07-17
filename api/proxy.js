// api/proxy.js

export default async function handler(req, res) {
  // CORS হেডার সেট করা যেন যেকোনো প্লেয়ারে চলে
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const host = req.headers.host;
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const proxyBaseUrl = `${protocol}://${host}/api/proxy`;

  // ইউআরএল থেকে টার্গেট লিংক খুঁজে বের করা
  const urlParams = new URL(req.url, `http://${host}`).searchParams;
  let targetUrl = urlParams.get('url');

  // যদি কোনো নির্দিষ্ট ইউআরএল না থাকে, তবে মূল লিংকটি লোড হবে
  if (!targetUrl) {
    targetUrl = 'https://madanitv.assadikb.workers.dev/live.php?id=756&e=.m3u8';
  }

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer': new URL(targetUrl).origin + '/'
      }
    });

    if (!response.ok) {
      return res.status(response.status).send(`Target Error: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    const finalTargetUrl = response.url;
    const urlObj = new URL(finalTargetUrl);
    const domainUrl = urlObj.origin;
    const basePath = finalTargetUrl.substring(0, finalTargetUrl.lastIndexOf('/') + 1);

    // ১. যদি এটি M3U8 প্লেলিস্ট হয় (টেক্সট ফাইল)
    if (contentType.includes('mpegurl') || contentType.includes('application/x-mpegURL') || targetUrl.includes('.m3u8') || !urlParams.get('url')) {
      let text = await response.text();

      // যদি ভুলবশত বাইনারি ফাইল চলে আসে
      if (!text.includes('#EXTM3U')) {
        const buffer = Buffer.from(await response.arrayBuffer());
        res.setHeader('Content-Type', contentType || 'video/mp2t');
        return res.status(200).send(buffer);
      }

      // ফাইলের ভেতরের প্রতিটা ভিডিও লিংক Vercel প্রক্সির সাথে রিরাইট (Rewrite) করা
      const lines = text.split('\n');
      const rewrittenLines = lines.map(line => {
        let trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          let absoluteUrl = '';
          if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
            absoluteUrl = trimmed;
          } else if (trimmed.startsWith('/')) {
            absoluteUrl = `${domainUrl}${trimmed}`;
          } else {
            absoluteUrl = `${basePath}${trimmed}`;
          }
          // লিংকটিকে আমাদের Vercel প্রক্সির মাধ্যমে রিরাইট করা হলো
          return `${proxyBaseUrl}?url=${encodeURIComponent(absoluteUrl)}`;
        }
        return line;
      });

      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      return res.status(200).send(rewrittenLines.join('\n'));
    } 
    
    // ২. যদি এটি ভিডিওর টুকরো বা চ্যাংক হয় (TS বাইনারি ফাইল)
    else {
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      res.setHeader('Content-Type', contentType || 'video/mp2t');
      return res.status(200).send(buffer);
    }

  } catch (error) {
    return res.status(500).send(`Proxy Error: ${error.message}`);
  }
}
