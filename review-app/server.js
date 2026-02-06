const express = require("express");
const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

// Load .env file
const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf-8").split("\n").forEach((line) => {
    const [key, ...val] = line.split("=");
    if (key && val.length) process.env[key.trim()] = val.join("=").trim();
  });
}

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const POSTS_FILE = path.join(__dirname, "posts.json");

// Config from environment
const FB_PAGE_ID = process.env.FB_PAGE_ID;
const FB_PAGE_TOKEN = process.env.FB_PAGE_TOKEN;
const OPENAI_KEY = process.env.OPENAI_API_KEY;

function readPosts() {
  return JSON.parse(fs.readFileSync(POSTS_FILE, "utf-8"));
}

function writePosts(posts) {
  fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2));
}

// GET all posts
app.get("/api/posts", (req, res) => {
  res.json(readPosts());
});

// UPDATE a post (edit copy, change status)
app.put("/api/posts/:id", (req, res) => {
  const posts = readPosts();
  const id = parseInt(req.params.id);
  const idx = posts.findIndex((p) => p.id === id);
  if (idx === -1) return res.status(404).json({ error: "Post not found" });

  if (req.body.copy !== undefined) posts[idx].copy = req.body.copy;
  if (req.body.status !== undefined) posts[idx].status = req.body.status;
  if (req.body.imageUrl !== undefined) posts[idx].imageUrl = req.body.imageUrl;

  writePosts(posts);
  res.json(posts[idx]);
});

// Generate AI image for a post
app.post("/api/posts/:id/generate-image", (req, res) => {
  const posts = readPosts();
  const id = parseInt(req.params.id);
  const post = posts.find((p) => p.id === id);
  if (!post) return res.status(404).json({ error: "Post not found" });

  const defaultStyle =
    "Stylized digital illustration, vibrant neon colors, futuristic cyberpunk aesthetic mixed with warm fun energy, no text, no words, no letters, no writing, no watermarks";
  const customPrompt = req.body && req.body.prompt;
  const prompt = customPrompt || `${defaultStyle}. Scene: ${post.imageNote || post.copy}. Context: music lesson studio for kids and teens.`;

  const data = JSON.stringify({
    model: "dall-e-3",
    prompt: prompt.slice(0, 1000),
    n: 1,
    size: "1024x1024",
    quality: "standard",
  });

  const options = {
    hostname: "api.openai.com",
    path: "/v1/images/generations",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_KEY}`,
      "Content-Length": Buffer.byteLength(data),
    },
  };

  const apiReq = https.request(options, (apiRes) => {
    let body = "";
    apiRes.on("data", (chunk) => (body += chunk));
    apiRes.on("end", () => {
      try {
        const result = JSON.parse(body);
        if (result.data && result.data[0]) {
          const imageUrl = result.data[0].url;

          // Download and save locally
          const imgDir = path.join(__dirname, "public", "images");
          if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });
          const imgPath = `/images/post-${id}.png`;
          const fullPath = path.join(__dirname, "public", imgPath);

          const imgReq = https.get(imageUrl, (imgRes) => {
            // Handle redirects
            if (imgRes.statusCode >= 300 && imgRes.statusCode < 400 && imgRes.headers.location) {
              https.get(imgRes.headers.location, (redirectRes) => {
                const file = fs.createWriteStream(fullPath);
                redirectRes.pipe(file);
                file.on("finish", () => {
                  file.close();
                  const idx = posts.findIndex((p) => p.id === id);
                  posts[idx].imageUrl = imgPath;
                  writePosts(posts);
                  res.json({ imageUrl: imgPath });
                });
              });
              return;
            }
            const file = fs.createWriteStream(fullPath);
            imgRes.pipe(file);
            file.on("finish", () => {
              file.close();
              const idx = posts.findIndex((p) => p.id === id);
              posts[idx].imageUrl = imgPath;
              writePosts(posts);
              res.json({ imageUrl: imgPath });
            });
          });
          imgReq.on("error", (e) =>
            res.status(500).json({ error: e.message })
          );
        } else {
          res.status(500).json({ error: "No image returned", details: result });
        }
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });
  });
  apiReq.on("error", (e) => res.status(500).json({ error: e.message }));
  apiReq.write(data);
  apiReq.end();
});

// Publish to Facebook
app.post("/api/posts/:id/publish", (req, res) => {
  const posts = readPosts();
  const id = parseInt(req.params.id);
  const post = posts.find((p) => p.id === id);
  if (!post) return res.status(404).json({ error: "Post not found" });

  const caption = `${post.copy}\n\nbestlessonever.com/friendswood`;

  // If post has a local image, read and upload it
  if (post.imageUrl && post.imageUrl.startsWith("/images/")) {
    const imgFullPath = path.join(__dirname, "public", post.imageUrl);
    if (fs.existsSync(imgFullPath)) {
      // Upload image via multipart
      const boundary = "----FormBoundary" + Date.now();
      const imageData = fs.readFileSync(imgFullPath);

      const header = Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="source"; filename="post-${id}.png"\r\nContent-Type: image/png\r\n\r\n`
      );
      const messageField = Buffer.from(
        `\r\n--${boundary}\r\nContent-Disposition: form-data; name="message"\r\n\r\n${caption}`
      );
      const tokenField = Buffer.from(
        `\r\n--${boundary}\r\nContent-Disposition: form-data; name="access_token"\r\n\r\n${FB_PAGE_TOKEN}`
      );
      const scheduledField = req.body.scheduledTime
        ? Buffer.from(
            `\r\n--${boundary}\r\nContent-Disposition: form-data; name="scheduled_publish_time"\r\n\r\n${req.body.scheduledTime}\r\n--${boundary}\r\nContent-Disposition: form-data; name="published"\r\n\r\nfalse`
          )
        : Buffer.from("");
      const footer = Buffer.from(`\r\n--${boundary}--\r\n`);

      const body = Buffer.concat([
        header,
        imageData,
        messageField,
        tokenField,
        scheduledField,
        footer,
      ]);

      const options = {
        hostname: "graph.facebook.com",
        path: `/v19.0/${FB_PAGE_ID}/photos`,
        method: "POST",
        headers: {
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
          "Content-Length": body.length,
        },
      };

      const apiReq = https.request(options, (apiRes) => {
        let respBody = "";
        apiRes.on("data", (chunk) => (respBody += chunk));
        apiRes.on("end", () => {
          try {
            const result = JSON.parse(respBody);
            if (result.id) {
              const idx = posts.findIndex((p) => p.id === id);
              posts[idx].status = "published";
              posts[idx].fbPostId = result.id;
              writePosts(posts);
              res.json({ success: true, fbPostId: result.id });
            } else {
              res.status(500).json({ error: "FB error", details: result });
            }
          } catch (e) {
            res.status(500).json({ error: e.message });
          }
        });
      });
      apiReq.on("error", (e) => res.status(500).json({ error: e.message }));
      apiReq.write(body);
      apiReq.end();
      return;
    }
  }

  // Text-only post
  const postData = `message=${encodeURIComponent(caption)}&access_token=${encodeURIComponent(FB_PAGE_TOKEN)}${req.body.scheduledTime ? `&scheduled_publish_time=${req.body.scheduledTime}&published=false` : ""}`;

  const options = {
    hostname: "graph.facebook.com",
    path: `/v19.0/${FB_PAGE_ID}/feed`,
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Content-Length": Buffer.byteLength(postData),
    },
  };

  const apiReq = https.request(options, (apiRes) => {
    let body = "";
    apiRes.on("data", (chunk) => (body += chunk));
    apiRes.on("end", () => {
      try {
        const result = JSON.parse(body);
        if (result.id) {
          const idx = posts.findIndex((p) => p.id === id);
          posts[idx].status = "published";
          posts[idx].fbPostId = result.id;
          writePosts(posts);
          res.json({ success: true, fbPostId: result.id });
        } else {
          res.status(500).json({ error: "FB error", details: result });
        }
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });
  });
  apiReq.on("error", (e) => res.status(500).json({ error: e.message }));
  apiReq.write(postData);
  apiReq.end();
});

const PORT = 3847;
app.listen(PORT, () => {
  console.log(`\n  BLE Post Review Dashboard`);
  console.log(`  http://localhost:${PORT}\n`);
});
