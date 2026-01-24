import express from "express";

const app = express();
const PORT = 3000;

app.use(express.static("."));

// cache simples em memória (evita baixar o epub várias vezes)
const cache = new Map(); // url -> { buf, contentType }

app.get("/proxy", async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).send("Missing url");

  try {
    let entry = cache.get(url);

    if (!entry) {
      const upstream = await fetch(url, { redirect: "follow" });

      if (!upstream.ok) {
        const text = await upstream.text().catch(() => "");
        res.setHeader("Access-Control-Allow-Origin", "*");
        return res.status(upstream.status).send(text || `Upstream error ${upstream.status}`);
      }

      const contentType = upstream.headers.get("content-type") || "application/octet-stream";
      const buf = Buffer.from(await upstream.arrayBuffer());

      entry = { buf, contentType };
      cache.set(url, entry);
    }

    const { buf, contentType } = entry;

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Content-Type", contentType);

    const range = req.headers.range;

    // ✅ Suporte a Range requests (muito importante para EPUB/PDF readers)
    if (range) {
      const match = /bytes=(\d+)-(\d*)/.exec(range);
      if (!match) return res.status(416).end();

      const start = parseInt(match[1], 10);
      const end = match[2] ? parseInt(match[2], 10) : buf.length - 1;

      if (start >= buf.length || end >= buf.length || start > end) {
        res.setHeader("Content-Range", `bytes */${buf.length}`);
        return res.status(416).end();
      }

      const chunk = buf.slice(start, end + 1);

      res.status(206);
      res.setHeader("Content-Range", `bytes ${start}-${end}/${buf.length}`);
      res.setHeader("Content-Length", String(chunk.length));
      return res.end(chunk);
    }

    // sem range: manda tudo
    res.setHeader("Content-Length", String(buf.length));
    return res.status(200).end(buf);
  } catch (err) {
    console.error("Proxy error:", err);
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(500).send("Proxy error: " + err.message);
  }
});

app.listen(PORT, () => {
  console.log(`✅ Open: http://localhost:${PORT}/index.html`);
});
