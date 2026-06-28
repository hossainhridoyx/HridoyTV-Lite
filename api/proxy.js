module.exports = async (req, res) => {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "*");
    return res.status(204).end();
  }

  // আপনার নিজের origin URL এখানে দিন
  const target = "http://cdn.moviemazic.xyz:8083/NagorikTV/index.m3u8";

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

    res.status(response.status);

    for (const [key, value] of response.headers.entries()) {
      res.setHeader(key, value);
    }

    res.setHeader("Access-Control-Allow-Origin", "*");

    const buffer = Buffer.from(await response.arrayBuffer());
    res.end(buffer);

  } catch (err) {
    res.status(500).json({
      success: false,
      error: String(err)
    });
  }
};