export default async function handler(req, res) {
  // আপনার আসল লিঙ্ক যা ব্যাকএন্ডে ১০০% লক এবং হাইড থাকবে
  const targetUrl = 'http://moviemazic.xyz';

  try {
    const response = await fetch(targetUrl);
    const data = await response.text();

    // সঠিক হেডার সেট করা যেন যেকোনো প্লেয়ারে লাইভ চালু হয়
    res.setHeader('Content-Type', 'application/x-mpegURL');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-cache');

    return res.status(200).send(data);
  } catch (error) {
    return res.status(500).send('Streaming proxy connection failed');
  }
}
