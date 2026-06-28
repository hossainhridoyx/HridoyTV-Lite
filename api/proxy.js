export default async function handler(req, res) {
  const target =
    "http://cdn.moviemazic.xyz:8083/NagorikTV/index.m3u8";

  try {
    const response = await fetch(target, {
      headers: {
        "User-Agent":
          req.headers["user-agent"] ||
          "Mozilla/5.0",
        "Accept": "*/*",
        "Referer": target,
        "Origin": "http://cdn.moviemazic.xyz:8083",
        "Range": req.headers["range"] || "bytes=0-"
      },
      redirect: "follow",
    });

    res.status(response.status);

    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "*");

    const buffer = Buffer.from(await response.arrayBuffer());
    res.send(buffer);

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
}