module.exports = async (req, res) => {
  const target = "http://cdn.moviemazic.xyz:8083/NagorikTV/index.m3u8";

  try {
    const headers = {};

    if (req.headers["user-agent"])
      headers["User-Agent"] = req.headers["user-agent"];

    if (req.headers["range"])
      headers["Range"] = req.headers["range"];

    headers["Accept"] = "*/*";
    headers["Referer"] = target;
    headers["Origin"] = "http://cdn.moviemazic.xyz:8083";

    const response = await fetch(target, {
      method: "GET",
      headers,
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
    res.end(buffer);

  } catch (e) {
    res.status(500).json({
      success: false,
      error: e.message
    });
  }
};