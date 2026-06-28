module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  const target = "http://cdn.moviemazic.xyz:8083/NagorikTV/index.m3u8";
  // মূল সিডিএন-এর বেস ইউআরএল (রিলেটিভ পাথ ফিক্স করার জন্য)
  const targetBase = "http://cdn.moviemazic.xyz:8083/NagorikTV/";

  try {
    const headers = {};
    if (req.headers.range) headers.Range = req.headers.range;
    if (req.headers["user-agent"]) {
      headers["User-Agent"] = req.headers["user-agent"];
    }

    const response = await fetch(target, {
      method: "GET",
      headers,
      redirect: "follow",
    });

    // শুধুমাত্র প্রয়োজনীয় হেডার পাস করুন (সব হেডার কপি করলে Vercel-এ ইরর আসে)
    const contentType = response.headers.get("content-type");
    if (contentType) res.setHeader("Content-Type", contentType);
    
    res.status(response.status);

    // ফাইলটি মেইন্ড প্লেলিস্ট (.m3u8) হলে এর ভেতরের রিলেটিভ পাথ ফিক্স করুন
    if (target.endsWith(".m3u8") || (contentType && contentType.includes("mpegurl"))) {
      let text = await response.text();
      
      // লাইনের শুরুতে যদি HTTP না থাকে এবং লাইনটি যদি কমেন্ট (#) না হয়, তবে বেস ইউআরএল যোগ হবে
      text = text.split('\n').map(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('http')) {
          return targetBase + trimmed;
        }
        return line;
      }).join('\n');

      return res.send(text);
    } else {
      // অন্যান্য বাইনারি ফাইলের ক্ষেত্রে (যেমন .ts চঙ্ক)
      const buffer = Buffer.from(await response.arrayBuffer());
      return res.end(buffer);
    }

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: String(err)
    });
  }
};
