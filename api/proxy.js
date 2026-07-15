export const config = {
  runtime: "nodejs",
};

export default async function handler(req, res) {
  const url = req.query.url;

  if (!url) {
    return res.status(400).send("Missing url");
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0",
        "Referer": "http://cdn.moviemazic.xyz:8083/",
        "Origin": "http://cdn.moviemazic.xyz:8083/"
      }
    });

    const contentType =
      response.headers.get("content-type") ||
      "application/octet-stream";

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", contentType);

    let body = await response.text();

    if (contentType.includes("application/vnd.apple.mpegurl") ||
        contentType.includes("application/x-mpegURL")) {

      const base = new URL(url);

      body = body.replace(
        /^([^#].*)$/gm,
        (line) => {
          if (!line.trim()) return line;

          const absolute = new URL(line, base).toString();

          return `/api/proxy?url=${encodeURIComponent(absolute)}`;
        }
      );
    }

    res.send(body);

  } catch (e) {
    res.status(500).send(e.message);
  }
}