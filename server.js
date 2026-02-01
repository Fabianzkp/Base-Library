const express = require("express");

const app = express();
const PORT = 3000;

const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");

const fs = require("fs");
const cors = require("cors");
app.use(cors());
app.use(express.json());
app.use(express.static("."));

const USERS_FILE = "./users.json";

// simple cache in memory (avoids downloading the epub multiple times)
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

    // ✅ Support a Range requests (important for EPUB/PDF readers)
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

    res.setHeader("Content-Length", String(buf.length));
    return res.status(200).end(buf);
  } catch (err) {
    console.error("Proxy error:", err);
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(500).send("Proxy error: " + err.message);
  }
});



// LOGIN

// Leer usuarios
function getUsers() {
  const data = fs.readFileSync(USERS_FILE);
  return JSON.parse(data);
}

// Guardar usuarios
function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}


app.post("/register", async (req, res) => {
  const { email, password } = req.body;

  const users = getUsers();

  // Verificar si ya existe
  const userExists = users.find(u => u.email === email);
  if (userExists) {
    return res.status(400).json({ message: "User already exists" });
  }

  // Encriptar contraseña
  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = {
    id: Date.now(),
    email,
    password: hashedPassword
  };

  users.push(newUser);
  saveUsers(users);

  res.json({ message: "User registered successfully" });
});


app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const users = getUsers();
  const user = users.find(u => u.email === email);

  if (!user) {
    return res.status(400).json({ message: "User not found" });
  }

  const isValid = await bcrypt.compare(password, user.password);

  if (!isValid) {
    return res.status(400).json({ message: "Wrong password" });
  }

  res.json({
    message: "Login successful",
    userId: user.id,
    email: user.email
  });
});

app.listen(PORT, () => {
  console.log(`✅ Open: http://localhost:${PORT}/index.html`);
});