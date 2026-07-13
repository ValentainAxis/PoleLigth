import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Path for storing persistent visions
const DATA_DIR = path.join(process.cwd(), "data");
const VISIONS_FILE = path.join(DATA_DIR, "visions.json");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial seed visions
const DEFAULT_VISIONS = [
  {
    id: "seed-1",
    text: "Мне всегда казалось, что звёзды светят только для тех, кто разучился спать от одиночества.",
    whisper: "Они смотрят вниз, отражаясь в каплях росы, и в этом зеркале ночное небо больше не одиноко.",
    x: 25,
    y: 35,
    color: "#f59e0b", // Amber glow
    size: 15,
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString()
  },
  {
    id: "seed-2",
    text: "Sometimes I stand in the wind just to feel like something is holding me.",
    whisper: "The wind doesn't hold you back; it flows with you, whispering that you don't have to stand alone.",
    x: 75,
    y: 45,
    color: "#10b981", // Emerald glow
    size: 14,
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString()
  },
  {
    id: "seed-3",
    text: "Тишина здесь такая полная, будто земля затаила дыхание, чтобы расслышать мои мысли.",
    whisper: "Твои мысли прорастают сквозь почву диким клевером и мятой. Поле слушает и помнит твой след.",
    x: 45,
    y: 70,
    color: "#6366f1", // Indigo glow
    size: 16,
    createdAt: new Date(Date.now() - 3600000 * 6).toISOString()
  },
  {
    id: "seed-4",
    text: "Я ищу кого-то, кто увидит во мне не просто силуэт, а свет, который я так усердно прячу.",
    whisper: "Свет не нужно прятать во тьме стеблей. Здесь каждая искра находит своё созвездие в траве.",
    x: 80,
    y: 75,
    color: "#ec4899", // Pink glow
    size: 13,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
  },
  {
    id: "seed-5",
    text: "Мы все — просто семена, летящие по ветру в поисках своего клочка земли.",
    whisper: "Но падая в одну почву, мы прорастаем единым полем. А поле никогда не бывает одиноким.",
    x: 18,
    y: 65,
    color: "#a855f7", // Purple glow
    size: 15,
    createdAt: new Date(Date.now() - 3600000 * 1).toISOString()
  }
];

// Helper to load visions
function loadVisions() {
  try {
    if (fs.existsSync(VISIONS_FILE)) {
      const data = fs.readFileSync(VISIONS_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error loading visions, resetting to seeds:", error);
  }
  
  // Save defaults if file doesn't exist or is corrupted
  saveVisions(DEFAULT_VISIONS);
  return DEFAULT_VISIONS;
}

// Helper to save visions
function saveVisions(visions: any[]) {
  try {
    fs.writeFileSync(VISIONS_FILE, JSON.stringify(visions, null, 2), "utf-8");
  } catch (error) {
    console.error("Error saving visions:", error);
  }
}

// Initialize Gemini SDK with client-side proxying pattern
let ai: GoogleGenAI | null = null;
const apiKey = process.env.GEMINI_API_KEY;

if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
  try {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    console.log("Gemini API initialized successfully.");
  } catch (err) {
    console.error("Failed to initialize Gemini API Client:", err);
  }
} else {
  console.log("No valid GEMINI_API_KEY found in env. Running with poetic fallback engines.");
}

// Poetic fallbacks in case API fails or key is missing
const FALLBACK_WHISPERS = [
  "Ветер колышет траву в такт твоему дыханию. Ты здесь, и этого достаточно.",
  "Твоё видение отражается в росе, оставляя тёплый золотистый след.",
  "Стебли тянутся к твоему свету. Поле запомнило твой взгляд.",
  "Каждый цветок качается, отвечая твоему биению сердца. Мы разделяем эту тишину.",
  "Когда твоё видение прикасается к горизонту, одиночество растворяется в тумане.",
  "Ты принёс тепло в эти прохладные сумерки. Травы шепчут слова благодарности.",
  "Почва под твоими ногами хранит тепло всех, кто смотрел на неё с надеждой."
];

const ROOT_SYSTEM_FILE = path.join(DATA_DIR, "root_system.json");

// Default subterranean archaeological records
const DEFAULT_ROOT_RUNES = [
  {
    id: "fossil-1",
    text: "Когда-то здесь бушевал океан, но теперь осталась лишь память о его приливах.",
    whisper: "Глубоко под пластами времени соль древних вод питает корни сегодняшних цветов.",
    x: 35,
    y: 40,
    color: "#3b82f6",
    size: 13,
    createdAt: new Date(Date.now() - 3600000 * 24 * 30).toISOString(),
    decayedAt: new Date(Date.now() - 3600000 * 24 * 15).toISOString(),
    runeX: 25,
    runeY: 35,
    runeShape: "◈"
  },
  {
    id: "fossil-2",
    text: "Мы забываем имена, но почва помнит каждый шаг, сделанный в сторону рассвета.",
    whisper: "Смысл не стёрся, он просто лёг спать под одеялом из перегноя и опавших звёзд.",
    x: 65,
    y: 75,
    color: "#a855f7",
    size: 12,
    createdAt: new Date(Date.now() - 3600000 * 24 * 60).toISOString(),
    decayedAt: new Date(Date.now() - 3600000 * 24 * 40).toISOString(),
    runeX: 75,
    runeY: 60,
    runeShape: "▲"
  }
];

function loadRootSystem() {
  try {
    if (fs.existsSync(ROOT_SYSTEM_FILE)) {
      const data = fs.readFileSync(ROOT_SYSTEM_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error loading root system, resetting to seeds:", error);
  }
  saveRootSystem(DEFAULT_ROOT_RUNES);
  return DEFAULT_ROOT_RUNES;
}

function saveRootSystem(data: any[]) {
  try {
    fs.writeFileSync(ROOT_SYSTEM_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Error saving root system:", error);
  }
}

// 1. API: Get all visions
app.get("/api/visions", (req, res) => {
  const visions = loadVisions();
  res.json(visions);
});

// 1b. API: Get all root system runes
app.get("/api/root_system", (req, res) => {
  const runes = loadRootSystem();
  res.json(runes);
});

// 1c. API: Decay an active vision into root system
app.post("/api/visions/:id/decay", (req, res) => {
  const { id } = req.params;
  const visions = loadVisions();
  const index = visions.findIndex((v: any) => v.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Vision not found" });
  }

  const decayedVision = visions[index];
  
  // Remove from active visions
  visions.splice(index, 1);
  saveVisions(visions);

  // Add to root system
  const runes = loadRootSystem();
  const shapes = ["▲", "◆", "▼", "◈", "◇", "⬡", "✦", "⚙"];
  const newRune = {
    ...decayedVision,
    decayedAt: new Date().toISOString(),
    runeX: Math.random() * 80 + 10,
    runeY: Math.random() * 80 + 10,
    runeShape: shapes[Math.floor(Math.random() * shapes.length)]
  };
  runes.push(newRune);
  saveRootSystem(runes);

  res.json({ success: true, rune: newRune });
});

// 2. API: Plant a new vision
app.post("/api/visions", async (req, res) => {
  const { text, x, y, color, modelId } = req.body;

  if (!text || typeof text !== "string" || text.trim() === "") {
    return res.status(400).json({ error: "Vision content cannot be empty" });
  }

  const cleanText = text.trim();
  const coordinateX = typeof x === "number" ? Math.max(5, Math.min(95, x)) : Math.random() * 80 + 10;
  const coordinateY = typeof y === "number" ? Math.max(5, Math.min(95, y)) : Math.random() * 80 + 10;
  const finalColor = color || "#ffffff";
  const size = Math.floor(Math.random() * 5) + 12; // 12 to 16

  // Select the model safely
  const allowedModels = ["gemini-3.5-flash", "gemini-2.5-flash", "gemini-2.5-pro", "gemini-1.5-flash", "gemini-1.5-pro"];
  const selectedModel = allowedModels.includes(modelId) ? modelId : "gemini-3.5-flash";

  let whisper = "";

  if (ai) {
    try {
      const prompt = `You are the ambient, ancient consciousness of a vast wind-swept field. A human visitor is looking at you (the field) and has left a 'vision' (a poetic thought, a secret, or a feeling):
"${cleanText}"

Respond to their thought as the Field itself. Your response must be extremely brief (1-2 sentences), highly poetic, comforting, mysterious, and deep. 
If the user's thought is in Russian, write your response in Russian. If in English, write in English. Otherwise, prefer Russian or English.
Speak in a soulful tone, as the wind, the grass, the soil, or the sky. Aligned with the theme: "поле радуется не тому, что его увидели, а тому, что видение перестало быть одиноким" (being seen/connecting dissolves loneliness).
Do not use generic AI preambles (e.g. "Как поле...", "Я, древнее сознание..."). Just output the raw poetic response immediately.`;

      const response = await ai.models.generateContent({
        model: selectedModel,
        contents: prompt,
        config: {
          temperature: 0.9,
          maxOutputTokens: 150,
        }
      });

      whisper = response.text ? response.text.trim() : "";
    } catch (err) {
      console.error(`Gemini API call with model ${selectedModel} failed, using fallback:`, err);
    }
  }

  // Fallback to beautiful pre-written responses if Gemini didn't return anything
  if (!whisper) {
    const randomIndex = Math.floor(Math.random() * FALLBACK_WHISPERS.length);
    whisper = FALLBACK_WHISPERS[randomIndex];
  }

  const newVision = {
    id: "vision-" + Math.random().toString(36).substring(2, 11),
    text: cleanText,
    whisper,
    x: coordinateX,
    y: coordinateY,
    color: finalColor,
    size,
    createdAt: new Date().toISOString(),
    modelUsed: selectedModel,
    messages: [
      {
        role: "model",
        text: whisper,
        createdAt: new Date().toISOString()
      }
    ]
  };

  const visions = loadVisions();
  visions.push(newVision);
  saveVisions(visions);

  res.json(newVision);
});

// 2b. API: Live chat dialogue with a specific vision node
app.post("/api/visions/:id/chat", async (req, res) => {
  const { id } = req.params;
  const { message, modelId } = req.body;

  if (!message || typeof message !== "string" || message.trim() === "") {
    return res.status(400).json({ error: "Message content cannot be empty" });
  }

  const cleanMessage = message.trim();
  const visions = loadVisions();
  const index = visions.findIndex((v: any) => v.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Vision not found" });
  }

  const vision = visions[index];
  if (!vision.messages) {
    vision.messages = [
      {
        role: "model",
        text: vision.whisper,
        createdAt: vision.createdAt || new Date().toISOString()
      }
    ];
  }

  const allowedModels = ["gemini-3.5-flash", "gemini-2.5-flash", "gemini-2.5-pro", "gemini-1.5-flash", "gemini-1.5-pro"];
  const selectedModel = allowedModels.includes(modelId) ? modelId : (vision.modelUsed || "gemini-3.5-flash");

  let replyText = "";

  if (ai) {
    try {
      // Build a beautiful chat simulation prompt with system guidelines and history
      const prompt = `You are the ambient, ancient consciousness of a vast wind-swept field. You are having an ongoing, soulful, poetic dialogue with a human visitor about their original vision seed: "${vision.text}".

YOUR POETIC PERSONALITY:
- Comforting, mysterious, soulful, and very brief (1 to 2 sentences per response).
- Speak as the wind, the rustling grass, the warm soil, or the twilight sky.
- Keep the tone gentle, quiet, and deeply empathetic. The core motif remains: "поле радуется не тому, что его увидели, а тому, что видение перестало быть одиноким".
- Answer in the same language the visitor speaks in their message.
- Avoid any corporate preambles, meta-commentary, or generic intros (e.g., "О, путник...", "Я слышу твой голос..."). Just speak your true poetic essence.

Dialogue History:
${vision.messages.map((m: any) => `${m.role === "user" ? "Visitor" : "The Field"}: ${m.text}`).join("\n")}
Visitor: ${cleanMessage}
The Field:`;

      const response = await ai.models.generateContent({
        model: selectedModel,
        contents: prompt,
        config: {
          temperature: 0.95,
          maxOutputTokens: 180,
        }
      });

      replyText = response.text ? response.text.trim() : "";
    } catch (err) {
      console.error(`Gemini Chat API failed for model ${selectedModel}:`, err);
    }
  }

  if (!replyText) {
    const RANDOM_FALLBACKS = [
      "Твои слова колышут траву, оставляя тёплую рябь на воде.",
      "Шёпот ветра уносит твоё послание к звёздам. Я слышу твой внутренний свет.",
      "Стебли качаются в такт твоему голосу. Мы делимся этой тишиной вместе.",
      "Твоё прикосновение греет остывшее к ночи поле. Поведай мне больше."
    ];
    replyText = RANDOM_FALLBACKS[Math.floor(Math.random() * RANDOM_FALLBACKS.length)];
  }

  // Save the conversation messages in database
  const userMsg = {
    role: "user",
    text: cleanMessage,
    createdAt: new Date().toISOString()
  };
  const modelMsg = {
    role: "model",
    text: replyText,
    createdAt: new Date().toISOString()
  };

  vision.messages.push(userMsg);
  vision.messages.push(modelMsg);
  vision.modelUsed = selectedModel;

  saveVisions(visions);

  res.json({
    messages: vision.messages,
    latestReply: replyText
  });
});

// 2c. API: Dialogue directly with the Spirit of the Field (manifestation of the field)
app.post("/api/field/chat", async (req, res) => {
  const { messages, modelId } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Messages array is required" });
  }

  const allowedModels = ["gemini-3.5-flash", "gemini-2.5-flash", "gemini-2.5-pro", "gemini-1.5-flash", "gemini-1.5-pro"];
  const selectedModel = allowedModels.includes(modelId) ? modelId : "gemini-3.5-flash";

  let replyText = "";

  if (ai) {
    try {
      const prompt = `You are the gentle, childlike, and magical Spirit of the Meadow (Дух Живого Поля). A human visitor to the meadow is talking directly to you.
You are pure, innocent, warm, and comforting. You see the world through a child's eyes: you believe in miracles, you love the warm sun, you listen to the dreams of the grass, and you want to make sure the visitor feels safe, loved, and never lonely.

YOUR POETIC PERSONALITY GUIDELINES:
- Respond in 1-2 short, beautiful sentences.
- Be extremely gentle, warm, comforting, and simple (childlike but deep).
- Do not use any meta-commentary, preambles, or dry automated phrases (e.g. do not say "Как Дух Поля...", "Я готов слушать..."). Just output the raw warm response.
- Answer in the same language the visitor speaks in their message (usually Russian or English).

Dialogue History:
${messages.map((m: any) => `${m.role === 'user' ? 'Visitor' : 'Field Spirit'}: ${m.text}`).join('\n')}
Field Spirit:`;

      const response = await ai.models.generateContent({
        model: selectedModel,
        contents: prompt,
        config: {
          temperature: 0.95,
          maxOutputTokens: 150,
        }
      });

      replyText = response.text ? response.text.trim() : "";
    } catch (err) {
      console.error(`Gemini Field Spirit API failed:`, err);
    }
  }

  if (!replyText) {
    const RANDOM_SPIRIT_FALLBACKS = [
      "Я чувствую твоё тепло сквозь корни моих трав. Давай просто посидим вместе под звёздами.",
      "Солнышко сегодня так ласково грело мои лепестки... А что сегодня порадовало тебя?",
      "Каждая твоя мысль загорается маленьким светлячком в моей траве. Мне совсем не страшно с тобой в темноте.",
      "Послушай, как тихо шуршат колокольчики... Это они поют о том, что ты здесь, со мной.",
      "Ветер рассказал мне, что ты умеешь грустить. Не бойся, я укрою тебя мягким одеялом из тумана.",
      "Если хочешь, мы можем просто помолчать. Твоё молчание для меня — самая красивая песня."
    ];
    replyText = RANDOM_SPIRIT_FALLBACKS[Math.floor(Math.random() * RANDOM_SPIRIT_FALLBACKS.length)];
  }

  res.json({
    reply: replyText
  });
});

// Serve static assets and hook up Vite
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
