export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const key = url.searchParams.get("key");

  if (!key) {
    return new Response(JSON.stringify({ error: "Missing key parameter" }), { 
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  // 🕵️‍♂️ সার্ভার-টু-সার্ভার রিকোয়েস্ট: টোকেনটি গোপনে হেডারের ভেতরে চলে যাবে
  const workerUrl = `https://jbd.hossainhridoy.workers.dev/${key}`;
  
  try {
    const response = await fetch(workerUrl, {
      headers: {
        "X-Secure-Token": env.SECURE_TOKEN, // সিক্রেট এনভায়রনমেন্ট ভ্যারিয়েবল থেকে টোকেন পাস
        "User-Agent": request.headers.get("User-Agent") || "Mozilla/5.0"
      }
    });

    if (!response.ok) {
      return new Response("Failed to fetch stream from secure node", { status: response.status });
    }

    const m3u8Text = await response.text();

    // সরাসরি ফ্রন্টএন্ড প্লেয়ারের উপযোগী ডাটা রিটার্ন
    return new Response(m3u8Text, {
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store"
      }
    });

  } catch (err) {
    return new Response("Internal Server Error Gateway", { status: 500 });
  }
}
