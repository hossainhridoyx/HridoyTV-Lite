/**
 * ============================================================
 * Cloudflare Pages Function — HMAC Authentication Proxy
 * ফাইল: functions/[[path]].js
 *
 * কাজ:
 *  - Browser থেকে Request গ্রহণ করা
 *  - HMAC-SHA256 Signature তৈরি করা
 *  - Timestamp + Nonce যোগ করা
 *  - Worker-এ Signed Request Forward করা
 *
 * Environment Variable (Cloudflare Pages → Settings → Variables):
 *  WORKER_SECRET   → Worker-এর সাথে Shared Secret (same value)
 *  WORKER_URL      → Worker-এর Base URL (e.g. https://your-worker.workers.dev)
 * ============================================================
 */

export async function onRequest(context) {
  const { request, env } = context;

  // ── Environment Variable Validation ──────────────────────
  const secret = env.WORKER_SECRET;
  const workerBaseUrl = env.WORKER_URL;

  if (!secret || !workerBaseUrl) {
    return new Response("Server misconfiguration: missing env vars", {
      status: 500,
    });
  }

  // ── Incoming Request থেকে Path + Query বের করা ──────────
  const incomingUrl = new URL(request.url);
  // /path/to/resource (query string সহ)
  const requestPath = incomingUrl.pathname + incomingUrl.search;

  // ── Timestamp (Unix seconds) ─────────────────────────────
  const timestamp = Math.floor(Date.now() / 1000).toString();

  // ── Nonce: Replay Attack Protection ─────────────────────
  // প্রতিটি Request-এ একটি Unique Random String যোগ করা হয়
  const nonce = generateNonce();

  // ── HMAC-SHA256 Signature তৈরি করা ──────────────────────
  // Signed Message = timestamp + "." + nonce + "." + requestPath
  // এই Format Worker-এও একই থাকবে
  const message = `${timestamp}.${nonce}.${requestPath}`;
  const signature = await createHmacSignature(secret, message);

  // ── Worker URL নির্মাণ ────────────────────────────────────
  const workerUrl = workerBaseUrl.replace(/\/$/, "") + requestPath;

  // ── Original Request থেকে Headers Copy করা ──────────────
  const forwardHeaders = new Headers(request.headers);

  // Auth Headers যোগ করা (Secret কখনো এখানে যায় না)
  forwardHeaders.set("X-Timestamp", timestamp);
  forwardHeaders.set("X-Nonce", nonce);
  forwardHeaders.set("X-Signature", signature);

  // Browser-এর Referer/Origin Override করা যাতে Worker
  // সঠিক Domain দেখতে পায় (Optional extra layer)
  forwardHeaders.set("X-Forwarded-Pages", "true");

  // ── Worker-এ Request Forward করা ────────────────────────
  const workerResponse = await fetch(workerUrl, {
    method: request.method,
    headers: forwardHeaders,
    // GET/HEAD ছাড়া Body Forward করা
    body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
    redirect: "follow",
  });

  // ── Worker Response Browser-এ পাঠানো ────────────────────
  // Response Headers Copy করা
  const responseHeaders = new Headers(workerResponse.headers);

  // Security Headers যোগ করা
  responseHeaders.set("X-Content-Type-Options", "nosniff");
  responseHeaders.set("X-Frame-Options", "SAMEORIGIN");

  return new Response(workerResponse.body, {
    status: workerResponse.status,
    statusText: workerResponse.statusText,
    headers: responseHeaders,
  });
}

// ============================================================
// Helper: HMAC-SHA256 Signature তৈরি করা
// Web Crypto API ব্যবহার করা হচ্ছে (Node.js নয়)
// ============================================================
async function createHmacSignature(secret, message) {
  const encoder = new TextEncoder();

  // Secret থেকে CryptoKey Import করা
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,        // extractable: false — Key বের করা যাবে না
    ["sign"]
  );

  // Message Sign করা
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(message)
  );

  // ArrayBuffer → Hex String রূপান্তর
  return bufferToHex(signatureBuffer);
}

// ============================================================
// Helper: Cryptographically Secure Nonce তৈরি করা
// ============================================================
function generateNonce() {
  // 16 bytes = 32 hex characters
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return bufferToHex(bytes.buffer);
}

// ============================================================
// Helper: ArrayBuffer → Hex String
// ============================================================
function bufferToHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
