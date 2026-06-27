// functions/api/getstream.js

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  
  // ইউজার কোন চ্যানেল চাচ্ছে (যেমন: ?key=channeli.m3u8)
  const key = url.searchParams.get("key"); 
  
  if (!key) {
    return new Response(JSON.stringify({ error: "KV Key (e.g. channeli.m3u8) is required" }), { 
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  // আপনার ওয়ার্কারের আসল ডোমেইন ইউআরএল
  const WORKER_DOMAIN = "https://jbd.hossainhridoy.workers.dev"; 
  
  // পেজেস এনভায়রনমেন্ট ভেরিয়েবল থেকে সিক্রেট টোকেন নেওয়া হচ্ছে
  const SECURE_TOKEN = env.SECURE_TOKEN; 

  if (!SECURE_TOKEN) {
    return new Response(JSON.stringify({ error: "Server configuration missing: SECURE_TOKEN" }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  // সম্পূর্ণ সুরক্ষিত এবং ভ্যালিড টোকেনসহ ওয়ার্কারের ইউআরএল তৈরি
  const secureStreamUrl = `${WORKER_DOMAIN}/${key}?token=${SECURE_TOKEN}`;

  // প্লেয়ার ফ্রন্টএন্ডের জন্য JSON রেসপন্স
  return new Response(JSON.stringify({ url: secureStreamUrl }), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*" 
    }
  });
}
