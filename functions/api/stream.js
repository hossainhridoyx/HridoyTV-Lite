// functions/api/stream.js

const SECRET_KEY_STR = "abqtdfghijklzxspqyatuvwxyz073116";
const WORKER_URL = "https://sports.hridoytv.workers.dev"; // আপনার ওয়ার্কার লিংক

async function generateIPToken(ip) {
  const message = `${ip}:${SECRET_KEY_STR}`;
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  
  // ইউজার কোন চ্যানেল বা KV কি (Key) দেখতে চায় (যেমন: ?id=somoytv)
  const channelId = url.searchParams.get("id") || "";

  // ইউজারের রিয়েল আইপি অ্যাড্রেস নেওয়া
  const clientIP = request.headers.get("CF-Connecting-IP") || "0.0.0.0";
  
  // আইপি অনুযায়ী সিকিউর টোকেন জেনারেট করা
  const token = await generateIPToken(clientIP);

  // ফাইনাল প্লেয়ার ইউআরএল তৈরি
  const secureUrl = `${WORKER_URL}/${channelId}?token=${token}`;

  return new Response(JSON.stringify({ url: secureUrl }), {
    headers: { 
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
}
