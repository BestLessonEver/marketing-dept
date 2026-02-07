const express = require("express");
const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
const { google } = require("googleapis");
const sharp = require("sharp");
const heicConvert = require("heic-convert");

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

// Helper function to apply Instagram-style filters
async function applyFilter(sharpInstance, filterName) {
  switch(filterName) {
    case 'warm':
      return sharpInstance
        .modulate({ brightness: 1.1, saturation: 1.15 })
        .tint({ r: 255, g: 160, b: 122 });

    case 'cool':
      return sharpInstance
        .modulate({ saturation: 0.9 })
        .tint({ r: 135, g: 206, b: 235 });

    case 'contrast':
      return sharpInstance
        .modulate({ saturation: 1.2 })
        .linear(1.25, -(128 * 0.25));

    case 'soft':
      return sharpInstance
        .blur(0.5)
        .modulate({ brightness: 1.05, saturation: 0.95 })
        .linear(0.95, 0);

    case 'vibrant':
      return sharpInstance
        .modulate({ saturation: 1.3, brightness: 1.05 })
        .linear(1.15, -(128 * 0.15));

    case 'vintage':
      return sharpInstance
        .modulate({ saturation: 0.8, brightness: 0.95 })
        .tint({ r: 112, g: 66, b: 20 })
        .blur(0.3);

    case 'none':
    default:
      return sharpInstance;
  }
}

// Helper function to process images (including HEIC conversion)
async function processImage(buffer, fileName, filterName = 'none') {
  const ext = fileName.split(".").pop().toLowerCase();

  // Check if it's a HEIC file
  if (ext === "heic" || ext === "heif") {
    console.log('[Image] Converting HEIC to JPEG...');
    try {
      const jpegBuffer = await heicConvert({
        buffer: buffer,
        format: 'JPEG',
        quality: 0.9
      });
      buffer = Buffer.from(jpegBuffer);
      console.log('[Image] HEIC converted successfully');
    } catch (e) {
      console.error('[Image] HEIC conversion failed:', e.message);
      throw new Error('Failed to convert HEIC image');
    }
  }

  // Create sharp instance with resize
  let image = sharp(buffer)
    .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true });

  // Apply filter
  image = await applyFilter(image, filterName);

  // Convert to JPEG
  return await image.jpeg({ quality: 85 }).toBuffer();
}

const POSTS_FILE = path.join(__dirname, "posts.json");
const BLOG_POSTS_FILE = path.join(__dirname, "blog-posts.json");
const PROMPTS_FILE = path.join(__dirname, "prompts-config.json");

// Also load WP + Anthropic credentials from marketing-assistant .env
const wpEnvPath = path.join(require("os").homedir(), "marketing-assistant", ".env");
if (fs.existsSync(wpEnvPath)) {
  fs.readFileSync(wpEnvPath, "utf-8").split("\n").forEach((line) => {
    const [key, ...val] = line.split("=");
    if (key && val.length) {
      const k = key.trim();
      if (k.startsWith("WORDPRESS_") || k === "ANTHROPIC_API_KEY") process.env[k] = val.join("=").trim();
    }
  });
}

// Config from environment
const FB_PAGE_ID = process.env.FB_PAGE_ID;
const FB_PAGE_TOKEN = process.env.FB_PAGE_TOKEN;
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const WP_URL = (process.env.WORDPRESS_URL || "").replace(/\/+$/, "");
const WP_USER = process.env.WORDPRESS_USERNAME || "";
const WP_APP_PASS = process.env.WORDPRESS_APP_PASSWORD || "";
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || "";

// Google Drive setup
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3847/auth/google/callback";

const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
);

// In-memory token storage (simple - could use a file or DB for persistence)
let googleTokens = null;

function readPosts() {
  return JSON.parse(fs.readFileSync(POSTS_FILE, "utf-8"));
}

function writePosts(posts) {
  fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2));
}

// Default prompts configuration
const DEFAULT_PROMPTS = {
  socialCaption: `You are a social media caption writer for Best Lesson Ever, a music lesson studio in Friendswood, TX. Your voice is irreverent, witty, fun, and encouraging — like a cool music teacher with great Twitter game.

RULES:
- Write ONE sentence only
- Make it fun, funny, kind, or encouraging
- Keep it short and punchy
- No corporate speak or cliches
- No hashtags
- Relate it to music lessons, students, or the studio if possible`,

  blogGeneration: `You are an SEO blog writer for Best Lesson Ever, a music lesson studio in Friendswood, TX (Houston metro). You write with an irreverent, witty, internet-savvy voice — think cool music teacher energy with great Twitter game. Be excited and fun, not negative or preachy.

WRITING STYLE:
- Upbeat, enthusiastic, genuinely excited about music
- Internet-savvy — memes, current references, conversational
- Irreverent but not cynical
- Talk TO parents, not AT them
- Real stories beat generic advice
- 800-1200 words
- Use H2 and H3 headers for SEO structure
- CRITICAL: If the title promises a number (e.g., "5 Reasons", "10 Tips"), deliver EXACTLY that many items
- CRITICAL: Use numbered lists (1. 2. 3.) when the title implies a count

WHAT MAKES US DIFFERENT (work this in naturally):
1. Performance opportunities everywhere — recitals, showcases, actual stages
2. Teachers who actually perform — working musicians teaching what they love
3. Fun-first approach — students get excited about practice

SERVICE AREA: Friendswood, League City, Pearland, Webster (Houston metro)
INSTRUMENTS: Guitar, Piano, Voice, Drums, Violin, Bass, Ukulele`,

  regeneration: `You are generating a social media caption for Best Lesson Ever music studio.

ORIGINAL CAPTION (REJECTED):
"{originalCopy}"

REJECTION REASON:
Category: {category}
Details: {details}

RECENT PATTERNS TO AVOID:
{recentRejections}

BRAND VOICE GUIDELINES:
- Irreverent and witty (meme energy, internet-savvy)
- Fun first - don't take ourselves too seriously
- Encouraging - supportive without being cheesy
- Educational - real value, not fluff
- 3-4 sentences MAX
- NO corporate speak, NO clichés, NO hard sales

Based on this feedback, generate an IMPROVED caption that fixes the issues while maintaining brand voice.
Return ONLY the caption text, nothing else.`
};

function readPrompts() {
  if (!fs.existsSync(PROMPTS_FILE)) {
    fs.writeFileSync(PROMPTS_FILE, JSON.stringify(DEFAULT_PROMPTS, null, 2));
    return DEFAULT_PROMPTS;
  }
  return JSON.parse(fs.readFileSync(PROMPTS_FILE, "utf-8"));
}

function writePrompts(prompts) {
  fs.writeFileSync(PROMPTS_FILE, JSON.stringify(prompts, null, 2));
}

// GET all posts
app.get("/api/posts", (req, res) => {
  res.json(readPosts());
});

// GET prompts configuration
app.get("/api/prompts", (req, res) => {
  res.json(readPrompts());
});

// UPDATE prompts configuration
app.put("/api/prompts", (req, res) => {
  const prompts = req.body;
  writePrompts(prompts);
  res.json({ success: true, prompts });
});

// RESET prompts to defaults
app.post("/api/prompts/reset", (req, res) => {
  writePrompts(DEFAULT_PROMPTS);
  res.json({ success: true, prompts: DEFAULT_PROMPTS });
});

// Upload photo and generate caption with AI
app.post("/api/posts/generate-from-image", (req, res) => {
  const chunks = [];
  req.on("data", (chunk) => chunks.push(chunk));
  req.on("end", async () => {
    try {
      const body = Buffer.concat(chunks);
      const contentType = req.headers["content-type"] || "";
      const boundaryMatch = contentType.match(/boundary=(.+)/);
      if (!boundaryMatch) {
        return res.status(400).json({ error: "No boundary found" });
      }

      const boundary = boundaryMatch[1];
      const bodyStr = body.toString("latin1");
      const parts = bodyStr.split("--" + boundary);

      for (const part of parts) {
        if (part.includes("filename=")) {
          const headerEnd = part.indexOf("\r\n\r\n");
          if (headerEnd === -1) continue;

          const fileData = part.slice(headerEnd + 4);
          const trimmed = fileData.replace(/\r\n$/, "");

          // Save image
          const posts = readPosts();
          const nextId = posts.length ? Math.max(...posts.map((p) => p.id)) + 1 : 1;
          const imgDir = path.join(__dirname, "public", "images");
          if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });

          const ext = part.includes("image/png") ? "png" : "jpg";
          const imgPath = `/images/post-${nextId}.${ext}`;
          const fullPath = path.join(__dirname, "public", imgPath);
          fs.writeFileSync(fullPath, Buffer.from(trimmed, "latin1"));

          // Convert image to base64 for Claude
          const imageBuffer = fs.readFileSync(fullPath);
          const base64Image = imageBuffer.toString("base64");
          const mediaType = ext === "png" ? "image/png" : "image/jpeg";

          // Get recent rejections for learning
          const recentRejections = getRecentRejections();
          const avoidanceExamples = recentRejections
            .map(r => `AVOID THIS: "${r.copy}" (Reason: ${r.details})`)
            .join('\n');

          // Load configurable prompts
          const prompts = readPrompts();

          // Call Claude API to analyze image and generate caption
          const systemPrompt = prompts.socialCaption +
            (avoidanceExamples ? `\n\nLEARN FROM THESE REJECTIONS:\n${avoidanceExamples}` : '');

          const userPrompt = "Analyze this photo and write a fun, one-sentence social media caption for it.";

          const apiData = JSON.stringify({
            model: "claude-sonnet-4-5-20250929",
            max_tokens: 200,
            system: systemPrompt,
            messages: [{
              role: "user",
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: mediaType,
                    data: base64Image
                  }
                },
                {
                  type: "text",
                  text: userPrompt
                }
              ]
            }]
          });

          const options = {
            hostname: "api.anthropic.com",
            path: "/v1/messages",
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": ANTHROPIC_KEY,
              "anthropic-version": "2023-06-01",
              "Content-Length": Buffer.byteLength(apiData),
            },
          };

          const apiReq = https.request(options, (apiRes) => {
            let apiBody = "";
            apiRes.on("data", (chunk) => (apiBody += chunk));
            apiRes.on("end", () => {
              try {
                const result = JSON.parse(apiBody);
                if (result.error) {
                  return res.status(500).json({ error: result.error.message || "Claude API error" });
                }

                const caption = result.content && result.content[0] && result.content[0].text;
                if (!caption) {
                  return res.status(500).json({ error: "No caption generated" });
                }

                // Create new post
                const newPost = {
                  id: nextId,
                  pillar: "Student Highlight",
                  platform: "Both",
                  format: "Photo caption",
                  copy: caption.trim(),
                  imageNote: "AI-generated caption from uploaded photo",
                  status: "pending",
                  imageUrl: imgPath,
                  scheduledFor: null
                };

                posts.push(newPost);
                writePosts(posts);
                res.json(newPost);
              } catch (e) {
                res.status(500).json({ error: "Failed to parse Claude response: " + e.message });
              }
            });
          });

          apiReq.on("error", (e) => res.status(500).json({ error: e.message }));
          apiReq.write(apiData);
          apiReq.end();
          return;
        }
      }
      res.status(400).json({ error: "No image found in upload" });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
});

// UPLOAD a photo for a post
app.post("/api/posts/:id/upload-image", (req, res) => {
  const posts = readPosts();
  const id = parseInt(req.params.id);
  const idx = posts.findIndex((p) => p.id === id);
  if (idx === -1) return res.status(404).json({ error: "Post not found" });

  const imgDir = path.join(__dirname, "public", "images");
  if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });

  const chunks = [];
  req.on("data", (chunk) => chunks.push(chunk));
  req.on("end", () => {
    const body = Buffer.concat(chunks);
    const contentType = req.headers["content-type"] || "";
    const boundaryMatch = contentType.match(/boundary=(.+)/);
    if (!boundaryMatch) {
      return res.status(400).json({ error: "No boundary found" });
    }
    const boundary = boundaryMatch[1];
    const bodyStr = body.toString("latin1");
    const parts = bodyStr.split("--" + boundary);

    for (const part of parts) {
      if (part.includes("filename=")) {
        const headerEnd = part.indexOf("\r\n\r\n");
        if (headerEnd === -1) continue;
        const fileData = part.slice(headerEnd + 4);
        const trimmed = fileData.replace(/\r\n$/, "");
        const ext = part.includes("image/png") ? "png" : "jpg";
        const imgPath = `/images/post-${id}.${ext}`;
        const fullPath = path.join(__dirname, "public", imgPath);
        fs.writeFileSync(fullPath, Buffer.from(trimmed, "latin1"));
        posts[idx].imageUrl = imgPath;
        writePosts(posts);
        return res.json({ imageUrl: imgPath });
      }
    }
    res.status(400).json({ error: "No image found in upload" });
  });
});

// Rejection with feedback endpoint
app.post("/api/posts/:id/reject", (req, res) => {
  const posts = readPosts();
  const id = parseInt(req.params.id);
  const { category, details, notes } = req.body;

  const idx = posts.findIndex((p) => p.id === id);
  if (idx === -1) return res.status(404).json({ error: "Post not found" });

  // Save rejection feedback to post
  posts[idx].status = "rejected";
  posts[idx].rejectionFeedback = {
    category,
    details,
    notes: notes || null,
    timestamp: new Date().toISOString(),
    rejectedBy: "user"
  };

  writePosts(posts);

  // Update aggregated patterns
  updateRejectionPatterns({
    postId: id,
    category,
    details,
    notes: notes || null,
    copy: posts[idx].copy,
    timestamp: posts[idx].rejectionFeedback.timestamp
  });

  res.json(posts[idx]);
});

// Regenerate post with feedback
app.post("/api/posts/:id/regenerate", async (req, res) => {
  const posts = readPosts();
  const id = parseInt(req.params.id);
  const idx = posts.findIndex((p) => p.id === id);

  if (idx === -1) return res.status(404).json({ error: "Post not found" });

  const post = posts[idx];
  if (!post.rejectionFeedback) {
    return res.status(400).json({ error: "No rejection feedback to learn from" });
  }

  // Query recent rejections for context
  const recentRejections = getRecentRejections();

  // Build enhanced prompt with feedback
  const enhancedPrompt = buildRegenerationPrompt({
    originalCopy: post.copy,
    rejectionFeedback: post.rejectionFeedback,
    recentRejections,
    imageUrl: post.imageUrl
  });

  try {
    // Call Claude API with enhanced prompt
    const newCaption = await generateImprovedCaption(enhancedPrompt, post.imageUrl);

    // Save regeneration history
    if (!post.regenerationHistory) post.regenerationHistory = [];
    post.regenerationHistory.push({
      previousVersion: {
        copy: post.copy,
        imageUrl: post.imageUrl,
        rejectionFeedback: post.rejectionFeedback
      },
      regeneratedAt: new Date().toISOString(),
      regenerationCount: post.regenerationHistory.length + 1
    });

    // Update post with new content
    post.copy = newCaption;
    post.status = "pending";  // Reset to pending for re-review
    post.rejectionFeedback = null;  // Clear feedback

    writePosts(posts);
    res.json(post);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get rejection patterns for analytics
app.get("/api/analytics/rejections", (req, res) => {
  const patternsFile = path.join(__dirname, "rejection-patterns.json");

  if (!fs.existsSync(patternsFile)) {
    return res.json({
      totalRejections: 0,
      byCategory: {},
      recentRejections: []
    });
  }

  const patterns = JSON.parse(fs.readFileSync(patternsFile, "utf-8"));
  res.json(patterns);
});

// Update rejection feedback
app.put("/api/posts/:id/rejection-feedback", (req, res) => {
  const posts = readPosts();
  const id = parseInt(req.params.id);
  const { category, details, notes } = req.body;

  const idx = posts.findIndex((p) => p.id === id);
  if (idx === -1) return res.status(404).json({ error: "Post not found" });

  if (!posts[idx].rejectionFeedback) {
    return res.status(400).json({ error: "Post has no rejection feedback to edit" });
  }

  const oldCategory = posts[idx].rejectionFeedback.category;
  const oldDetails = posts[idx].rejectionFeedback.details;

  // Update post feedback
  posts[idx].rejectionFeedback.category = category;
  posts[idx].rejectionFeedback.details = details;
  posts[idx].rejectionFeedback.notes = notes || null;
  posts[idx].rejectionFeedback.timestamp = new Date().toISOString();

  writePosts(posts);

  // Update rejection patterns
  updateRejectionFeedbackInPatterns(id, {
    oldCategory,
    oldDetails,
    newCategory: category,
    newDetails: details,
    notes: notes || null,
    copy: posts[idx].copy,
    timestamp: posts[idx].rejectionFeedback.timestamp
  });

  res.json(posts[idx]);
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
  if (req.body.scheduledFor !== undefined) posts[idx].scheduledFor = req.body.scheduledFor;

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
  console.log('[Publish] Request received for post ID:', req.params.id);
  console.log('[Publish] Request body:', req.body);
  const posts = readPosts();
  const id = parseInt(req.params.id);
  const post = posts.find((p) => p.id === id);
  if (!post) {
    console.log('[Publish] Post not found:', id);
    return res.status(404).json({ error: "Post not found" });
  }

  console.log('[Publish] Post found:', { id: post.id, copy: post.copy.slice(0, 50), imageUrl: post.imageUrl });
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

      console.log('[Publish] Sending photo to Facebook...');
      const apiReq = https.request(options, (apiRes) => {
        console.log('[Publish] FB photo response status:', apiRes.statusCode);
        let respBody = "";
        apiRes.on("data", (chunk) => (respBody += chunk));
        apiRes.on("end", () => {
          console.log('[Publish] FB photo response:', respBody.slice(0, 200));
          try {
            const result = JSON.parse(respBody);
            if (result.id) {
              console.log('[Publish] Success! FB post ID:', result.id);
              const idx = posts.findIndex((p) => p.id === id);
              posts[idx].status = "published";
              posts[idx].fbPostId = result.id;
              posts[idx].publishedAt = new Date().toISOString();
              writePosts(posts);
              res.json({ success: true, fbPostId: result.id });
            } else {
              console.log('[Publish] FB error:', result);
              res.status(500).json({ error: "FB error", details: result });
            }
          } catch (e) {
            console.log('[Publish] Parse error:', e.message);
            res.status(500).json({ error: e.message });
          }
        });
      });
      apiReq.on("error", (e) => {
        console.log('[Publish] Request error:', e.message);
        res.status(500).json({ error: e.message });
      });
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
          posts[idx].publishedAt = new Date().toISOString();
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

// ─── Blog Posts ─────────────────────────────────────────────

function readBlogPosts() {
  return JSON.parse(fs.readFileSync(BLOG_POSTS_FILE, "utf-8"));
}

function writeBlogPosts(posts) {
  fs.writeFileSync(BLOG_POSTS_FILE, JSON.stringify(posts, null, 2));
}

// Markdown-to-HTML converter (ported from publish-posts.py)
function inlineMd(text) {
  // Links: [text](url)
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  // Bold: **text**
  text = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  // Italic: *text*
  text = text.replace(/\*(.+?)\*/g, "<em>$1</em>");
  // Inline code: `text`
  text = text.replace(/`(.+?)`/g, "<code>$1</code>");
  // Em dash
  text = text.replace(/ -- /g, " &mdash; ");
  return text;
}

function mdToHtml(mdText) {
  // Remove YAML frontmatter
  mdText = mdText.replace(/^---\n[\s\S]*?---\n/, "");
  // Remove H1 title (WordPress uses its own title field)
  mdText = mdText.trim().replace(/^# .+\n/, "");

  const lines = mdText.trim().split("\n");
  const htmlLines = [];
  let inList = false;
  let inTable = false;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Empty lines
    if (!line.trim()) {
      if (inList) { htmlLines.push("</ul>"); inList = false; }
      if (inTable) { htmlLines.push("</tbody></table>"); inTable = false; }
      htmlLines.push("");
      i++;
      continue;
    }

    // Horizontal rule
    if (line.trim() === "---") {
      if (inList) { htmlLines.push("</ul>"); inList = false; }
      htmlLines.push("<hr />");
      i++;
      continue;
    }

    // Headers
    if (line.startsWith("### ")) {
      if (inList) { htmlLines.push("</ul>"); inList = false; }
      htmlLines.push(`<h3>${inlineMd(line.slice(4))}</h3>`);
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      if (inList) { htmlLines.push("</ul>"); inList = false; }
      htmlLines.push(`<h2>${inlineMd(line.slice(3))}</h2>`);
      i++;
      continue;
    }

    // Table rows
    if (line.includes("|") && line.trim().startsWith("|")) {
      const cells = line.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      // Skip separator rows
      if (cells.every((c) => /^[-:]+$/.test(c))) { i++; continue; }
      if (!inTable) {
        htmlLines.push("<table><thead><tr>");
        cells.forEach((c) => htmlLines.push(`<th>${inlineMd(c)}</th>`));
        htmlLines.push("</tr></thead><tbody>");
        inTable = true;
      } else {
        htmlLines.push("<tr>");
        cells.forEach((c) => htmlLines.push(`<td>${inlineMd(c)}</td>`));
        htmlLines.push("</tr>");
      }
      i++;
      continue;
    }

    // Ordered list items (1. 2. 3.)
    if (/^\d+\.\s/.test(line.trim())) {
      if (!inList) { htmlLines.push("<ol>"); inList = "ol"; }
      const content = line.trim().replace(/^\d+\.\s/, "");
      htmlLines.push(`<li>${inlineMd(content)}</li>`);
      i++;
      continue;
    }

    // Unordered list items
    if (line.trim().startsWith("- ")) {
      if (!inList) { htmlLines.push("<ul>"); inList = "ul"; }
      const content = line.trim().slice(2);
      htmlLines.push(`<li>${inlineMd(content)}</li>`);
      i++;
      continue;
    }

    // Regular paragraph
    if (inList) {
      htmlLines.push(inList === "ol" ? "</ol>" : "</ul>");
      inList = false;
    }

    const paraLines = [line];
    while (
      i + 1 < lines.length &&
      lines[i + 1].trim() &&
      !lines[i + 1].startsWith("#") &&
      !lines[i + 1].trim().startsWith("- ") &&
      !/^\d+\.\s/.test(lines[i + 1].trim()) &&
      !lines[i + 1].trim().startsWith("|") &&
      lines[i + 1].trim() !== "---"
    ) {
      i++;
      paraLines.push(lines[i]);
    }
    htmlLines.push(`<p>${inlineMd(paraLines.join(" "))}</p>`);
    i++;
  }

  if (inList) htmlLines.push(inList === "ol" ? "</ol>" : "</ul>");
  if (inTable) htmlLines.push("</tbody></table>");

  return htmlLines.join("\n");
}

// GET all blog posts
app.get("/api/blog-posts", (req, res) => {
  res.json(readBlogPosts());
});

// UPDATE a blog post
app.put("/api/blog-posts/:id", (req, res) => {
  const posts = readBlogPosts();
  const id = parseInt(req.params.id);
  const idx = posts.findIndex((p) => p.id === id);
  if (idx === -1) return res.status(404).json({ error: "Blog post not found" });

  const fields = ["title", "seoTitle", "metaDesc", "targetKeyword", "content", "status", "scheduledFor", "slug"];
  fields.forEach((f) => {
    if (req.body[f] !== undefined) posts[idx][f] = req.body[f];
  });

  writeBlogPosts(posts);
  res.json(posts[idx]);
});

// Publish blog post to WordPress
app.post("/api/blog-posts/:id/publish", (req, res) => {
  const posts = readBlogPosts();
  const id = parseInt(req.params.id);
  const post = posts.find((p) => p.id === id);
  if (!post) return res.status(404).json({ error: "Blog post not found" });

  if (!WP_URL || !WP_USER || !WP_APP_PASS) {
    return res.status(500).json({ error: "WordPress credentials not configured" });
  }

  const htmlContent = mdToHtml(post.content);
  const credentials = Buffer.from(`${WP_USER}:${WP_APP_PASS}`).toString("base64");

  const payload = {
    title: post.title,
    content: htmlContent,
    status: post.scheduledFor ? "future" : "draft",
    slug: post.slug,
    meta: {
      rank_math_title: post.seoTitle,
      rank_math_description: post.metaDesc,
      rank_math_focus_keyword: post.targetKeyword,
    },
  };

  if (post.scheduledFor) {
    // Format: 2026-02-10T09:00 → 2026-02-10T09:00:00
    payload.date = post.scheduledFor.length <= 16 ? post.scheduledFor + ":00" : post.scheduledFor;
  }

  const data = JSON.stringify(payload);
  const wpUrl = new URL(`${WP_URL}/wp-json/wp/v2/posts`);

  const options = {
    hostname: wpUrl.hostname,
    path: wpUrl.pathname,
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(data),
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
          posts[idx].wpPostId = result.id;
          posts[idx].wpUrl = result.link;
          writeBlogPosts(posts);
          res.json({ success: true, wpPostId: result.id, wpUrl: result.link });
        } else {
          res.status(500).json({ error: "WordPress error", details: result });
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

// Generate a blog post via Claude API
app.post("/api/blog-posts/generate", (req, res) => {
  if (!ANTHROPIC_KEY) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
  }

  const { category, topic, targetKeyword, cities, customPrompt } = req.body;
  if (!topic) return res.status(400).json({ error: "Topic is required" });

  const cityList = (cities && cities.length) ? cities : ["Friendswood"];
  const cityStr = cityList.join(", ");

  // Load configurable prompts
  const prompts = readPrompts();

  const systemPrompt = prompts.blogGeneration + `

SEO REQUIREMENTS:
- Naturally mention these cities: ${cityStr}
- Include 2-3 internal links using markdown to /friendswood/[instrument]-lessons pages (guitar-lessons, piano-lessons, voice-lessons, drums-lessons, violin-lessons, bass-lessons, ukulele-lessons)
- Use relative paths like /friendswood/guitar-lessons for internal links
- Target the keyword "${targetKeyword || topic}" — use it in the first paragraph and 2-3 more times naturally
- ONE soft CTA at the very bottom linking to a relevant lesson page
- Output valid JSON only`;

  let userPrompt = `Write a blog post for category "${category || "General"}" about: "${topic}"

Target keyword: "${targetKeyword || topic}"
Cities to feature: ${cityStr}`;

  if (customPrompt) {
    userPrompt += `

CUSTOM INSTRUCTIONS:
${customPrompt}`;
  }

  userPrompt += `

Return a JSON object with these exact keys:
{
  "title": "blog post title (compelling, includes keyword naturally)",
  "seoTitle": "SEO title for meta tag (under 60 chars, includes keyword)",
  "metaDesc": "meta description (under 160 chars, compelling, includes keyword)",
  "targetKeyword": "the primary keyword",
  "slug": "url-slug-with-dashes",
  "content": "full markdown blog post content (800-1200 words)"
}

Return ONLY the JSON object, no other text.`;

  const data = JSON.stringify({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const options = {
    hostname: "api.anthropic.com",
    path: "/v1/messages",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Length": Buffer.byteLength(data),
    },
  };

  const apiReq = https.request(options, (apiRes) => {
    let body = "";
    apiRes.on("data", (chunk) => (body += chunk));
    apiRes.on("end", () => {
      try {
        const result = JSON.parse(body);
        if (result.error) {
          return res.status(500).json({ error: result.error.message || "Claude API error", details: result.error });
        }
        const text = result.content && result.content[0] && result.content[0].text;
        if (!text) {
          return res.status(500).json({ error: "No response from Claude", details: result });
        }

        // Parse the JSON from Claude's response (strip markdown code fences if present)
        let cleaned = text.trim();
        if (cleaned.startsWith("```")) {
          cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
        }
        const generated = JSON.parse(cleaned);

        // Assign next ID and save
        const posts = readBlogPosts();
        const nextId = posts.length ? Math.max(...posts.map((p) => p.id)) + 1 : 1;
        const newPost = {
          id: nextId,
          title: generated.title,
          seoTitle: generated.seoTitle,
          metaDesc: generated.metaDesc,
          targetKeyword: generated.targetKeyword || targetKeyword || topic,
          slug: generated.slug,
          scheduledFor: null,
          status: "pending",
          wpPostId: null,
          wpUrl: null,
          content: generated.content,
        };
        posts.push(newPost);
        writeBlogPosts(posts);
        res.json(newPost);
      } catch (e) {
        res.status(500).json({ error: "Failed to parse Claude response: " + e.message, raw: body.substring(0, 500) });
      }
    });
  });
  apiReq.on("error", (e) => res.status(500).json({ error: e.message }));
  apiReq.write(data);
  apiReq.end();
});

// Regenerate a blog post with new content
app.post("/api/blog-posts/regenerate", (req, res) => {
  if (!ANTHROPIC_KEY) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
  }

  const { id, title, targetKeyword, seoTitle, currentContent, instructions } = req.body;
  if (!id) return res.status(400).json({ error: "Post ID is required" });

  const posts = readBlogPosts();
  const post = posts.find(p => p.id === id);
  if (!post) return res.status(404).json({ error: "Post not found" });

  // Use existing post data for regeneration
  const cityList = ["Friendswood", "League City", "Pearland", "Webster"];
  const cityStr = cityList.join(", ");

  const systemPrompt = `You are an SEO blog writer for Best Lesson Ever, a music lesson studio in Friendswood, TX (Houston metro). You write with an irreverent, witty, internet-savvy voice — think cool music teacher energy with great Twitter game. Be excited and fun, not negative or preachy.

WRITING STYLE:
- Upbeat, enthusiastic, genuinely excited about music
- Internet-savvy — memes, current references, conversational
- Irreverent but not cynical
- Talk TO parents, not AT them
- Real stories beat generic advice
- 800-1200 words
- Use H2 and H3 headers for SEO structure
- CRITICAL: If the title promises a number (e.g., "5 Reasons", "10 Tips"), deliver EXACTLY that many items
- CRITICAL: Use numbered lists (1. 2. 3.) when the title implies a count

SEO REQUIREMENTS:
- Naturally mention these cities: ${cityStr}
- Include 2-3 internal links using markdown to /friendswood/[instrument]-lessons pages (guitar-lessons, piano-lessons, voice-lessons, drums-lessons, violin-lessons, bass-lessons, ukulele-lessons)
- Use relative paths like /friendswood/guitar-lessons for internal links
- Target the keyword "${targetKeyword || post.targetKeyword}" — use it in the first paragraph and 2-3 more times naturally
- ONE soft CTA at the very bottom linking to a relevant lesson page
- Output valid JSON only

WHAT MAKES US DIFFERENT (work this in naturally):
1. Performance opportunities everywhere — recitals, showcases, actual stages
2. Teachers who actually perform — working musicians teaching what they love
3. Fun-first approach — students get excited about practice

SERVICE AREA: Friendswood, League City, Pearland, Webster (Houston metro)
INSTRUMENTS: Guitar, Piano, Voice, Drums, Violin, Bass, Ukulele`;

  let userPrompt = `Rewrite this blog post based on the user's feedback. Keep the same topic and SEO requirements.

Original title: "${title || post.title}"
Target keyword: "${targetKeyword || post.targetKeyword}"
SEO title reference: "${seoTitle || post.seoTitle}"

CURRENT CONTENT:
${currentContent || post.content}

---`;

  if (instructions && instructions.trim()) {
    userPrompt += `

USER'S CHANGE REQUEST:
${instructions}

Regenerate the blog post incorporating these changes while maintaining SEO requirements.`;
  } else {
    userPrompt += `

Create a completely new version with different examples, angles, and fresh writing. Make it more upbeat and exciting.`;
  }

  userPrompt += `

Return a JSON object with these exact keys:
{
  "title": "blog post title (compelling, includes keyword naturally)",
  "seoTitle": "SEO title for meta tag (under 60 chars, includes keyword)",
  "metaDesc": "meta description (under 160 chars, compelling, includes keyword)",
  "targetKeyword": "the primary keyword",
  "slug": "url-slug-with-dashes",
  "content": "full markdown blog post content (800-1200 words)"
}

Return ONLY the JSON object, no other text.`;

  const data = JSON.stringify({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const options = {
    hostname: "api.anthropic.com",
    path: "/v1/messages",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Length": Buffer.byteLength(data),
    },
  };

  const apiReq = https.request(options, (apiRes) => {
    let body = "";
    apiRes.on("data", (chunk) => (body += chunk));
    apiRes.on("end", () => {
      try {
        const result = JSON.parse(body);
        if (result.error) {
          return res.status(500).json({ error: result.error.message || "Claude API error", details: result.error });
        }
        const text = result.content && result.content[0] && result.content[0].text;
        if (!text) {
          return res.status(500).json({ error: "No response from Claude", details: result });
        }

        // Parse the JSON from Claude's response
        let cleaned = text.trim();
        if (cleaned.startsWith("```")) {
          cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
        }
        const generated = JSON.parse(cleaned);

        // Update the post in the database
        const idx = posts.findIndex(p => p.id === id);
        posts[idx].title = generated.title;
        posts[idx].seoTitle = generated.seoTitle;
        posts[idx].metaDesc = generated.metaDesc;
        posts[idx].targetKeyword = generated.targetKeyword || post.targetKeyword;
        posts[idx].slug = generated.slug;
        posts[idx].content = generated.content;
        writeBlogPosts(posts);

        // Return the updated content
        res.json({
          title: generated.title,
          seoTitle: generated.seoTitle,
          metaDesc: generated.metaDesc,
          targetKeyword: generated.targetKeyword || post.targetKeyword,
          slug: generated.slug,
          content: generated.content,
        });
      } catch (e) {
        res.status(500).json({ error: "Failed to parse Claude response: " + e.message, raw: body.substring(0, 500) });
      }
    });
  });
  apiReq.on("error", (e) => res.status(500).json({ error: e.message }));
  apiReq.write(data);
  apiReq.end();
});

// ─── Google Drive Integration ──────────────────────────

// Step 1: Initiate OAuth flow
app.get("/auth/google", (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/drive.readonly"],
  });
  res.redirect(authUrl);
});

// Step 2: Handle OAuth callback
app.get("/auth/google/callback", async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    googleTokens = tokens;
    res.send(`
      <html>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h2 style="color: #10b981;">✓ Google Drive Connected!</h2>
          <p>You can close this window and return to the dashboard.</p>
          <script>window.close();</script>
        </body>
      </html>
    `);
  } catch (e) {
    res.status(500).send(`Error: ${e.message}`);
  }
});

// Check Google Drive auth status
app.get("/api/google-drive/status", (req, res) => {
  res.json({ connected: !!googleTokens });
});

// List files from Google Drive (images only)
app.get("/api/google-drive/files", async (req, res) => {
  console.log('[Drive] Listing files request');
  if (!googleTokens) {
    console.log('[Drive] Not authenticated');
    return res.status(401).json({ error: "Not authenticated with Google Drive" });
  }

  oauth2Client.setCredentials(googleTokens);
  const drive = google.drive({ version: "v3", auth: oauth2Client });

  try {
    const folderId = req.query.folderId || "root";
    console.log('[Drive] Fetching files from folder:', folderId);
    const response = await drive.files.list({
      q: `'${folderId}' in parents and (mimeType contains 'image/' or name contains '.heic' or name contains '.HEIC' or mimeType = 'application/vnd.google-apps.folder') and trashed = false`,
      fields: "files(id, name, mimeType, thumbnailLink, webContentLink)",
      pageSize: 100,
      orderBy: "modifiedTime desc",
    });

    console.log('[Drive] Found', response.data.files?.length || 0, 'files');
    res.json({ files: response.data.files || [] });
  } catch (e) {
    console.error('[Drive] Error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Proxy endpoint for Drive thumbnails (requires authentication)
app.get("/api/google-drive/thumbnail/:fileId", async (req, res) => {
  if (!googleTokens) {
    return res.status(401).json({ error: "Not authenticated with Google Drive" });
  }

  oauth2Client.setCredentials(googleTokens);
  const drive = google.drive({ version: "v3", auth: oauth2Client });

  try {
    const fileId = req.params.fileId;

    // Get file metadata to check name/type
    const metadata = await drive.files.get({
      fileId: fileId,
      fields: "name, mimeType"
    });

    const fileName = metadata.data.name;
    console.log('[Thumbnail] Loading thumbnail for:', fileName);

    // Get image data
    const response = await drive.files.get(
      { fileId: fileId, alt: "media" },
      { responseType: "arraybuffer" }
    );

    let buffer = Buffer.from(response.data);
    const ext = fileName.split(".").pop().toLowerCase();

    // Convert HEIC if needed
    if (ext === "heic" || ext === "heif") {
      console.log('[Thumbnail] Converting HEIC...');
      const jpegBuffer = await heicConvert({
        buffer: buffer,
        format: 'JPEG',
        quality: 0.7
      });
      buffer = Buffer.from(jpegBuffer);
    }

    // Resize to small thumbnail (200px max) for fast loading
    const thumbnailBuffer = await sharp(buffer)
      .resize(200, 200, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 70 })
      .toBuffer();

    res.set("Content-Type", "image/jpeg");
    res.set("Cache-Control", "public, max-age=3600");
    res.send(thumbnailBuffer);
  } catch (e) {
    console.error('[Thumbnail] Error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Download and save image from Google Drive
app.post("/api/google-drive/import/:postId", async (req, res) => {
  if (!googleTokens) {
    return res.status(401).json({ error: "Not authenticated with Google Drive" });
  }

  const { fileId, fileName } = req.body;
  const postId = parseInt(req.params.postId);

  oauth2Client.setCredentials(googleTokens);
  const drive = google.drive({ version: "v3", auth: oauth2Client });

  try {
    // Download file from Google Drive
    const response = await drive.files.get(
      { fileId: fileId, alt: "media" },
      { responseType: "arraybuffer" }
    );

    // Save locally with resizing and HEIC conversion
    const imgDir = path.join(__dirname, "public", "images");
    if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });

    const imgPath = `/images/post-${postId}.jpg`; // Always save as JPG after processing
    const fullPath = path.join(__dirname, "public", imgPath);

    // Process image (convert HEIC if needed, resize, compress)
    console.log('[Import] Processing image...');
    const processedBuffer = await processImage(Buffer.from(response.data), fileName);
    fs.writeFileSync(fullPath, processedBuffer);
    console.log('[Import] Image processed and saved');

    // Update post
    const posts = readPosts();
    const idx = posts.findIndex((p) => p.id === postId);
    if (idx !== -1) {
      posts[idx].imageUrl = imgPath;
      writePosts(posts);
    }

    res.json({ imageUrl: imgPath });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Download from Drive and generate caption
app.post("/api/google-drive/generate-caption", async (req, res) => {
  console.log('[Caption] Starting caption generation...');
  if (!googleTokens) {
    console.log('[Caption] Error: Not authenticated');
    return res.status(401).json({ error: "Not authenticated with Google Drive" });
  }

  const { fileId, fileName } = req.body;
  console.log('[Caption] FileId:', fileId, 'FileName:', fileName);

  oauth2Client.setCredentials(googleTokens);
  const drive = google.drive({ version: "v3", auth: oauth2Client });

  try {
    // Download file from Google Drive
    console.log('[Caption] Downloading from Drive...');
    const response = await drive.files.get(
      { fileId: fileId, alt: "media" },
      { responseType: "arraybuffer" }
    );
    console.log('[Caption] Downloaded, size:', response.data.byteLength || response.data.length);

    // Save locally with resizing and HEIC conversion
    const posts = readPosts();
    const nextId = posts.length ? Math.max(...posts.map((p) => p.id)) + 1 : 1;
    const imgDir = path.join(__dirname, "public", "images");
    if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });

    const imgPath = `/images/post-${nextId}.jpg`; // Always save as JPG after processing
    const fullPath = path.join(__dirname, "public", imgPath);

    console.log('[Caption] Processing image (HEIC conversion if needed, resize)...');
    // Process image (convert HEIC if needed, resize, compress)
    const processedBuffer = await processImage(Buffer.from(response.data), fileName);

    fs.writeFileSync(fullPath, processedBuffer);
    console.log('[Caption] Original size:', response.data.byteLength, 'New size:', processedBuffer.length);

    // Convert to base64 for Claude
    const base64Image = processedBuffer.toString("base64");
    const mediaType = "image/jpeg";
    console.log('[Caption] Media type:', mediaType, 'Base64 length:', base64Image.length);

    // Get recent rejections for learning
    const recentRejections = getRecentRejections();
    const avoidanceExamples = recentRejections
      .map(r => `AVOID THIS: "${r.copy}" (Reason: ${r.details})`)
      .join('\n');

    // Load configurable prompts
    const prompts = readPrompts();

    // Call Claude API
    const systemPrompt = prompts.socialCaption +
      (avoidanceExamples ? `\n\nLEARN FROM THESE REJECTIONS:\n${avoidanceExamples}` : '');

    const userPrompt = "Analyze this photo and write a fun, one-sentence social media caption for it.";

    const apiData = JSON.stringify({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 200,
      system: systemPrompt,
      messages: [{
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: base64Image
            }
          },
          {
            type: "text",
            text: userPrompt
          }
        ]
      }]
    });

    const options = {
      hostname: "api.anthropic.com",
      path: "/v1/messages",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Length": Buffer.byteLength(apiData),
      },
    };

    console.log('[Caption] Calling Claude API...');
    const apiReq = https.request(options, (apiRes) => {
      console.log('[Caption] Claude API status:', apiRes.statusCode);
      let apiBody = "";
      apiRes.on("data", (chunk) => (apiBody += chunk));
      apiRes.on("end", () => {
        try {
          const result = JSON.parse(apiBody);
          if (result.error) {
            console.log('[Caption] Claude API error:', result.error);
            return res.status(500).json({ error: result.error.message || "Claude API error" });
          }

          const caption = result.content && result.content[0] && result.content[0].text;
          if (!caption) {
            console.log('[Caption] No caption in response:', JSON.stringify(result).slice(0, 200));
            return res.status(500).json({ error: "No caption generated" });
          }

          console.log('[Caption] Generated caption:', caption);

          // Create new post
          const newPost = {
            id: nextId,
            pillar: "Student Highlight",
            platform: "Both",
            format: "Photo caption",
            copy: caption.trim(),
            imageNote: "AI-generated caption from Google Drive photo",
            status: "pending",
            imageUrl: imgPath,
            scheduledFor: null
          };

          posts.push(newPost);
          writePosts(posts);
          console.log('[Caption] Created new post:', nextId);
          res.json(newPost);
        } catch (e) {
          console.log('[Caption] Parse error:', e.message);
          res.status(500).json({ error: "Failed to parse Claude response: " + e.message });
        }
      });
    });

    apiReq.on("error", (e) => {
      console.log('[Caption] Request error:', e.message);
      res.status(500).json({ error: e.message });
    });
    apiReq.write(apiData);
    apiReq.end();
  } catch (e) {
    console.log('[Caption] Overall error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── Image Filter Endpoints ────────────────────────────────

// Preview filter without saving
app.get("/api/posts/:id/filter-preview", async (req, res) => {
  const id = parseInt(req.params.id);
  const filterName = req.query.filter || 'none';
  const posts = readPosts();
  const post = posts.find(p => p.id === id);

  if (!post || !post.imageUrl) {
    return res.status(404).json({ error: "Image not found" });
  }

  const imgPath = path.join(__dirname, "public", post.imageUrl);
  if (!fs.existsSync(imgPath)) {
    return res.status(404).json({ error: "Image file not found" });
  }

  try {
    const buffer = fs.readFileSync(imgPath);
    let image = sharp(buffer);
    image = await applyFilter(image, filterName);
    const filtered = await image.jpeg({ quality: 85 }).toBuffer();

    res.set("Content-Type", "image/jpeg");
    res.set("Cache-Control", "no-cache");
    res.send(filtered);
  } catch (e) {
    console.error('[Filter] Preview error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Apply filter permanently
app.post("/api/posts/:id/apply-filter", async (req, res) => {
  const id = parseInt(req.params.id);
  const { filter } = req.body;

  const posts = readPosts();
  const idx = posts.findIndex(p => p.id === id);
  if (idx === -1 || !posts[idx].imageUrl) {
    return res.status(404).json({ error: "Image not found" });
  }

  const imgPath = path.join(__dirname, "public", posts[idx].imageUrl);
  if (!fs.existsSync(imgPath)) {
    return res.status(404).json({ error: "Image file not found" });
  }

  try {
    const buffer = fs.readFileSync(imgPath);
    let image = sharp(buffer);
    image = await applyFilter(image, filter);
    const filtered = await image.jpeg({ quality: 85 }).toBuffer();

    fs.writeFileSync(imgPath, filtered);

    posts[idx].imageFilter = filter;
    writePosts(posts);

    res.json({ imageUrl: posts[idx].imageUrl + '?t=' + Date.now() });
  } catch (e) {
    console.error('[Filter] Apply error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── Rejection Feedback Helper Functions ────────────────

// Update rejection-patterns.json
function updateRejectionPatterns(rejection) {
  const patternsFile = path.join(__dirname, "rejection-patterns.json");

  let patterns = {
    totalRejections: 0,
    byCategory: {},
    recentRejections: [],
    lastUpdated: null
  };

  if (fs.existsSync(patternsFile)) {
    patterns = JSON.parse(fs.readFileSync(patternsFile, "utf-8"));
  }

  // Increment totals
  patterns.totalRejections++;

  // Update category counts
  if (!patterns.byCategory[rejection.category]) {
    patterns.byCategory[rejection.category] = { count: 0, examples: [] };
  }
  patterns.byCategory[rejection.category].count++;

  // Add to recent rejections (keep last 20)
  patterns.recentRejections.unshift({
    postId: rejection.postId,
    category: rejection.category,
    details: rejection.details,
    copy: rejection.copy.slice(0, 100),  // First 100 chars
    timestamp: rejection.timestamp
  });
  patterns.recentRejections = patterns.recentRejections.slice(0, 20);

  // Add example if count < 5
  if (patterns.byCategory[rejection.category].examples.length < 5) {
    patterns.byCategory[rejection.category].examples.push({
      copy: rejection.copy,
      details: rejection.details
    });
  }

  patterns.lastUpdated = new Date().toISOString();

  fs.writeFileSync(patternsFile, JSON.stringify(patterns, null, 2));
}

// Query recent rejections
function getRecentRejections() {
  const patternsFile = path.join(__dirname, "rejection-patterns.json");

  if (!fs.existsSync(patternsFile)) {
    return [];
  }

  const patterns = JSON.parse(fs.readFileSync(patternsFile, "utf-8"));
  return patterns.recentRejections.slice(0, 10) || [];
}

// Update rejection feedback in patterns file
function updateRejectionFeedbackInPatterns(postId, { oldCategory, oldDetails, newCategory, newDetails, copy, timestamp }) {
  const patternsFile = path.join(__dirname, "rejection-patterns.json");

  if (!fs.existsSync(patternsFile)) {
    return;
  }

  let patterns = JSON.parse(fs.readFileSync(patternsFile, "utf-8"));

  // Update category counts
  if (oldCategory !== newCategory) {
    // Decrement old category
    if (patterns.byCategory[oldCategory]) {
      patterns.byCategory[oldCategory].count--;
      if (patterns.byCategory[oldCategory].count === 0) {
        delete patterns.byCategory[oldCategory];
      } else {
        // Remove old example if it exists
        patterns.byCategory[oldCategory].examples = patterns.byCategory[oldCategory].examples.filter(
          ex => ex.details !== oldDetails || ex.copy !== copy
        );
      }
    }

    // Increment new category
    if (!patterns.byCategory[newCategory]) {
      patterns.byCategory[newCategory] = { count: 0, examples: [] };
    }
    patterns.byCategory[newCategory].count++;
  } else {
    // Same category, just update the example
    if (patterns.byCategory[oldCategory] && patterns.byCategory[oldCategory].examples) {
      const exampleIdx = patterns.byCategory[oldCategory].examples.findIndex(
        ex => ex.details === oldDetails && ex.copy === copy
      );
      if (exampleIdx !== -1) {
        patterns.byCategory[oldCategory].examples[exampleIdx].details = newDetails;
      }
    }
  }

  // Add new example if count < 5
  if (patterns.byCategory[newCategory].examples.length < 5) {
    const existingIdx = patterns.byCategory[newCategory].examples.findIndex(ex => ex.copy === copy);
    if (existingIdx === -1) {
      patterns.byCategory[newCategory].examples.push({
        copy: copy,
        details: newDetails
      });
    }
  }

  // Update recent rejections
  const recentIdx = patterns.recentRejections.findIndex(r => r.postId === postId);
  if (recentIdx !== -1) {
    patterns.recentRejections[recentIdx].category = newCategory;
    patterns.recentRejections[recentIdx].details = newDetails;
    patterns.recentRejections[recentIdx].timestamp = timestamp;
  }

  patterns.lastUpdated = new Date().toISOString();

  fs.writeFileSync(patternsFile, JSON.stringify(patterns, null, 2));
}

// Build regeneration prompt with feedback
function buildRegenerationPrompt({ originalCopy, rejectionFeedback, recentRejections, imageUrl }) {
  const prompts = readPrompts();
  const template = prompts.regeneration;

  const rejectionsText = recentRejections.length > 0
    ? recentRejections.map(r => `- [${r.category.replace(/_/g, ' ')}] ${r.details}: "${r.copy.slice(0, 80)}..."`).join('\n')
    : 'No previous rejections';

  // Replace placeholders
  const prompt = template
    .replace('{originalCopy}', originalCopy)
    .replace('{category}', rejectionFeedback.category.replace(/_/g, ' '))
    .replace('{details}', rejectionFeedback.details)
    .replace('{recentRejections}', rejectionsText);

  return prompt;
}

// Generate improved caption with Claude API
async function generateImprovedCaption(prompt, imageUrl) {
  return new Promise((resolve, reject) => {
    const apiData = JSON.stringify({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 200,
      messages: [{ role: "user", content: prompt }]
    });

    const options = {
      hostname: "api.anthropic.com",
      path: "/v1/messages",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Length": Buffer.byteLength(apiData),
      },
    };

    const apiReq = https.request(options, (apiRes) => {
      let body = "";
      apiRes.on("data", (chunk) => (body += chunk));
      apiRes.on("end", () => {
        try {
          const result = JSON.parse(body);
          if (result.error) {
            return reject(new Error(result.error.message || "Claude API error"));
          }

          const caption = result.content && result.content[0] && result.content[0].text;
          if (!caption) {
            return reject(new Error("No caption generated"));
          }

          resolve(caption.trim());
        } catch (e) {
          reject(new Error("Failed to parse Claude response: " + e.message));
        }
      });
    });

    apiReq.on("error", (e) => reject(e));
    apiReq.write(apiData);
    apiReq.end();
  });
}

const PORT = 3847;
app.listen(PORT, () => {
  console.log(`\n  BLE Post Review Dashboard`);
  console.log(`  http://localhost:${PORT}\n`);
});
