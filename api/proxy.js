const response = await fetch(url, {
  redirect: "follow",
  headers: {
    "User-Agent": "Mozilla/5.0",
    "Referer": "http://cdn.moviemazic.xyz:8083/",
    "Origin": "http://cdn.moviemazic.xyz:8083/"
  }
});

if (!response.ok) {
  return res.status(response.status).send(await response.text());
}

const contentType = response.headers.get("content-type") || "";

res.setHeader("Access-Control-Allow-Origin", "*");
res.setHeader("Content-Type", contentType);

if (
  contentType.includes("mpegurl") ||
  url.endsWith(".m3u8")
) {
  let body = await response.text();

  const base = new URL(url);

  body = body.replace(/^([^#].*)$/gm, (line) => {
    if (!line.trim()) return line;

    return `/api/proxy?url=${encodeURIComponent(
      new URL(line, base).toString()
    )}`;
  });

  return res.send(body);
}

// বাইনারি ফাইল (.ts, .key, .m4s)
const buffer = Buffer.from(await response.arrayBuffer());
return res.send(buffer);