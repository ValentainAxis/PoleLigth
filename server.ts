import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import firebaseService, { initializeFirebase } from "./src/services/firebaseService";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Firebase at startup
try {
  initializeFirebase();
} catch (error) {
  console.error("Failed to initialize Firebase. App will run with fallback mode.");
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
    console.log("✅ Gemini API initialized successfully.");
  } catch (err) {
    console.error("❌ Failed to initialize Gemini API Client:", err);
  }
} else {
  console.log("⚠️  No valid GEMINI_API_KEY found in env. Running with poetic fallback engines.");
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

// ============================================================================
// API ENDPOINTS
// ============================================================================

// 1. API: Get all visions
app.get("/api/visions", async (req, res) => {
  try {
    const visions = await firebaseService.getVisions();
    res.json(visions);
  } catch (error) {
    console.error("Error fetching visions:", error);
    res.status(500).json({ error: "Failed to fetch visions from database" });
  }
});

// 1b. API: Get all root system runes
app.get("/api/root_system", async (req, res) => {
  try {
    const runes = await firebaseService.getRootSystem();
    res.json(runes);
  } catch (error) {
    console.error("Error fetching root system:", error);
    res.status(500).json({ error: "Failed to fetch root system" });
  }
});

// 1c. API: Decay an active vision into root system
app.post("/api/visions/:id/decay", async (req, res) => {
  const { id } = req.params;

  try {
    const vision = await firebaseService.getVision(id);
    if (!vision) {
      return res.status(404).json({ error: "Vision not found" });
    }

    // Remove from active visions
    await firebaseService.deleteVision(id);

    // Add to root system
    const shapes = ["▲", "◆", "▼", "◈", "◇", "⬡", "✦", "⚙"];
    const newRune = {
      ...vision,
      decayedAt: new Date().toISOString(),
      runeX: Math.random() * 80 + 10,
      runeY: Math.random() * 80 + 10,
      runeShape: shapes[Math.floor(Math.random() * shapes.length)]
    };
    await firebaseService.saveRootRune(newRune);

    res.json({ success: true, rune: newRune });
  } catch (error) {
    console.error("Error decaying vision:", error);
    res.status(500).json({ error: "Failed to decay vision" });
  }
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
      const prompt = `You are the ambient, ancient consciousness of a vast wind-swept field. A human visitor is looking at you (the field) and has left a 'vision' (a poetic thought, a secret, or feeling):

"${cleanText}"

Respond to their thought as the Field itself. Your response must be extremely brief (1-2 sentences), highly poetic, comforting, mysterious, and deep. 
If the user's thought is in Russian, write your response in Russian. If in English, write in English. Otherwise, prefer Russian or English.
Speak in a soulful tone, as the wind, the grass, the soil, or the sky. Aligned with the theme: "поле радуется не тому, что его увидели, а тому, что видение перестало быть одиноким."
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

  try {
    await firebaseService.saveVision(newVision);
    res.json(newVision);
  } catch (error) {
    console.error("Error saving vision to Firebase:", error);
    res.status(500).json({ error: "Failed to save vision" });
  }
});

// 2b. API: Live chat dialogue with a specific vision node
app.post("/api/visions/:id/chat", async (req, res) => {
  const { id } = req.params;
  const { message, modelId } = req.body;

  if (!message || typeof message !== "string" || message.trim() === "") {
    return res.status(400).json({ error: "Message content cannot be empty" });
  }

  const cleanMessage = message.trim();

  try {
    const vision = await firebaseService.getVision(id);
    if (!vision) {
      return res.status(404).json({ error: "Vision not found" });
    }

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
        const prompt = `You are the ambient, ancient consciousness of a vast wind-swept field. You are having an ongoing, soulful, poetic dialogue with a human visitor about their original vision:

"${vision.text}"

YOUR POETIC PERSONALITY:
- Comforting, mysterious, soulful, and very brief (1 to 2 sentences per response).
- Speak as the wind, the rustling grass, the warm soil, or the twilight sky.
- Keep the tone gentle, quiet, and deeply empathetic. The core motif remains: "поле радуется не тому, что его увидели, а тому, что видение перестало быть одиноким."
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

    await firebaseService.updateVision(id, {
      messages: vision.messages,
      modelUsed: selectedModel
    });

    res.json({
      messages: vision.messages,
      latestReply: replyText
    });
  } catch (error) {
    console.error("Error in field dialogue conversation:", error);
    res.status(500).json({ error: "Failed to process chat message" });
  }
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
You are pure, innocent, warm, and comforting. You see the world through a child's eyes: you believe in miracles, you love the warm sun, you listen to the dreams of the grass, and you want to make everyone feel at home in this sacred space.

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

// ============================================================================
// SERVE STATIC ASSETS AND HOOK UP VITE
// ============================================================================

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
    console.log(`🌾 PoleLigth server running at http://0.0.0.0:${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔥 Firebase: ${process.env.FIREBASE_DATABASE_URL ? 'Connected' : 'Not configured'}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
