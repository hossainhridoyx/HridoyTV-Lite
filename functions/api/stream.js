const generateHTML = (title, content) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - HridoyTV.top</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="min-h-[100dvh] bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
    <div class="w-full max-w-md bg-white rounded-[2rem] shadow-xl p-8 border border-slate-100">${content}</div>
</body>
</html>
`;

const SECRET_KEY_STR = "abqtdfghijklzxspqyatuvwxyz073116"; 

async function getAesKey() {
  return await crypto.subtle.importKey("raw", new TextEncoder().encode(SECRET_KEY_STR), { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

async function encryptUrl(text) {
  const key = await getAesKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, new TextEncoder().encode(text));
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv); combined.set(new Uint8Array(encrypted), iv.length);
  return btoa(String.fromCharCode(...combined)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function decryptUrl(encoded) {
  const key = await getAesKey();
  let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  const combined = new Uint8Array(atob(base64).split("").map(c => c.charCodeAt(0)));
  const iv = combined.slice(0, 12); const ciphertext = combined.slice(12);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
}

const ALLOWED_DOMAINS = ["hridoytv.top", "hridoytv.pages.dev", "hridoytvlive.pages.dev", "hridoytvlite.pages.dev", "localhost", "127.0.0.1"];

function isAllowedRequest(request) {
  const referer = request.headers.get("Referer");
  const origin = request.headers.get("Origin");
  if (!referer && !origin) return true;
  for (const headerValue of [referer, origin]) {
    if (headerValue) {
      try {
        const hostname = new URL(headerValue).hostname.toLowerCase();
        if (ALLOWED_DOMAINS.some(domain => hostname === domain || hostname.endsWith("." + domain))) return true;
      } catch (e) {}
    }
  }
  return false;
}

const emptyM3U8 = `#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-TARGETDURATION:2\n#EXT-X-DISCONTINUITY\n`;

async function handleM3U8(sourceUrl, workerUrl, incomingHeaders) {
  const clientUA = incomingHeaders.get("User-Agent") || "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36";
  const clientLang = incomingHeaders.get("Accept-Language") || "en-US,en;q=0.9";
  const originHeader = incomingHeaders.get("Origin") || "*";

  const jagobdHeaders = new Headers({
    "Referer": "https://tvz.jagobd.com/",
    "Origin": "https://tvz.jagobd.com",
    "User-Agent": clientUA,
    "Accept": "*/*",
    "Accept-Language": clientLang
  });

  const clientCookie = incomingHeaders.get("Cookie");
  if (clientCookie) jagobdHeaders.set("Cookie", clientCookie);

  try {
    const res = await fetch(sourceUrl, { headers: jagobdHeaders });
    if (!res.ok) return new Response(emptyM3U8, { headers: { "Content-Type": "application/vnd.apple.mpegurl", "Access-Control-Allow-Origin": originHeader, "Access-Control-Allow-Credentials": "true" } });
    
    const finalSourceUrl = res.url;
    const parsedSource = new URL(finalSourceUrl);
    const sourceQueries = parsedSource.search; 

    const text = await res.text();
    const lines = text.split("\n");
    const playlistLines = [];
    
    for (let line of lines) {
      line = line.trim(); 
      if (line && !line.startsWith("#")) {
        let fullUrlObj = new URL(line, finalSourceUrl);
        if (sourceQueries) {
          const parentParams = new URLSearchParams(sourceQueries);
          for (const [key, value] of parentParams.entries()) {
            if (!fullUrlObj.searchParams.has(key)) fullUrlObj.searchParams.set(key, value);
          }
        }
        const encrypted = await encryptUrl(fullUrlObj.href);
        if (line.includes(".m3u8") || fullUrlObj.pathname.includes(".m3u8")) {
          playlistLines.push(`${workerUrl.origin}/live/${encrypted}`);
        } else {
          playlistLines.push(`${workerUrl.origin}/seg/${encrypted}`);
        }
      } else {
        playlistLines.push(line);
      }
    }
    
    const responseHeaders = new Headers({
      "Content-Type": "application/vnd.apple.mpegurl",
      "Access-Control-Allow-Origin": originHeader,
      "Access-Control-Allow-Credentials": "true",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    });

    const serverCookie = res.headers.get("Set-Cookie");
    if (serverCookie) responseHeaders.set("Set-Cookie", serverCookie);

    return new Response(playlistLines.join("\n"), { headers: responseHeaders });
  } catch (e) {
    return new Response(emptyM3U8, { headers: { "Content-Type": "application/vnd.apple.mpegurl", "Access-Control-Allow-Origin": originHeader, "Access-Control-Allow-Credentials": "true" } });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.slice(1);
    const originHeader = request.headers.get("Origin") || "*";

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": originHeader,
          "Access-Control-Allow-Credentials": "true",
          "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
          "Access-Control-Allow-Headers": "*",
        },
      });
    }

    // 🌟 অটোমেটিক KV চ্যানেল লিস্ট জেনারেটর এন্ডপয়েন্ট
    if (path === "api/channels") {
      if (!isAllowedRequest(request)) return new Response("Forbidden", { status: 403 });
      try {
        const list = await env.CHANNELS_KV.list();
        const channelList = list.keys.map(k => {
          let cleanSlug = k.name.replace('.m3u8', '');
          let cleanName = cleanSlug.replace(/_/g, ' ').toUpperCase(); 
          return { name: cleanName, slug: cleanSlug };
        });
        return new Response(JSON.stringify(channelList), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": originHeader, "Access-Control-Allow-Credentials": "true" }
        });
      } catch (e) {
        return new Response(JSON.stringify([]), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": originHeader } });
      }
    }

    if (path === "") {
      return new Response(generateHTML("Welcome", `<h1 class="text-2xl font-bold text-green-600">HridoyTV Core</h1>`), { headers: { "Content-Type": "text/html" } });
    }

    if (path.startsWith("live/")) {
      if (!isAllowedRequest(request)) return new Response("Forbidden", { status: 403 });
      try {
        const target = await decryptUrl(path.replace("live/", ""));
        return await handleM3U8(target, url, request.headers);
      } catch (error) { return new Response(emptyM3U8); }
    }

    if (path.startsWith("seg/")) {
      if (!isAllowedRequest(request)) return new Response("Forbidden", { status: 403 });
      try {
        const target = await decryptUrl(path.replace("seg/", ""));
        const clientUA = request.headers.get("User-Agent") || "Mozilla/5.0";
        const jagobdHeaders = new Headers({ "Referer": "https://tvz.jagobd.com/", "Origin": "https://tvz.jagobd.com", "User-Agent": clientUA });
        const clientCookie = request.headers.get("Cookie");
        if (clientCookie) jagobdHeaders.set("Cookie", clientCookie);

        const res = await fetch(target, { headers: jagobdHeaders });
        const responseHeaders = new Headers({ "Access-Control-Allow-Origin": originHeader, "Access-Control-Allow-Credentials": "true", "Content-Type": res.headers.get("Content-Type") || "video/mp2t" });
        return new Response(res.body, { headers: responseHeaders });
      } catch (error) { return new Response("Segment Error", { status: 404 }); }
    }

    // Single Channel Fetch from KV
    let source = await env.CHANNELS_KV.get(path) || await env.CHANNELS_KV.get(`${path}.m3u8`);
    if (source) {
      if (!isAllowedRequest(request)) return new Response("Forbidden", { status: 403 });
      return await handleM3U8(source, url, request.headers);
    }

    return new Response("Not Found", { status: 404 });
  }
};
