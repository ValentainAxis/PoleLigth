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

// 1. API: Get all visions
app.get("/api/visions", (req, res) => {
  const visions = loadVisions();
  res.json(visions);
});

// 2. API: Plant a new vision
app.post("/api/visions", async (req, res) => {
  const { text, x, y, color } = req.body;

  if (!text || typeof text !== "string" || text.trim() === "") {
    return res.status(400).json({ error: "Vision content cannot be empty" });
  }

  const cleanText = text.trim();
  const coordinateX = typeof x === "number" ? Math.max(5, Math.min(95, x)) : Math.random() * 80 + 10;
  const coordinateY = typeof y === "number" ? Math.max(5, Math.min(95, y)) : Math.random() * 80 + 10;
  const finalColor = color || "#ffffff";
  const size = Math.floor(Math.random() * 5) + 12; // 12 to 16

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
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          temperature: 0.9,
          maxOutputTokens: 150,
        }
      });

      whisper = response.text ? response.text.trim() : "";
    } catch (err) {
      console.error("Gemini API call failed, using fallback:", err);
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
    createdAt: new Date().toISOString()
  };

  const visions = loadVisions();
  visions.push(newVision);
  saveVisions(visions);

  res.json(newVision);
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
