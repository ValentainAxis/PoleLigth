import React, { useState, useEffect, useRef } from "react";
import { Theme } from "../types";
import { X, Send, Cpu, Sparkles, Smile } from "lucide-react";

interface SpiritMessage {
  role: "user" | "model";
  text: string;
}

interface SpiritViewerProps {
  activeTheme: Theme;
  onClose: () => void;
  isAudioEnabled: boolean;
  onTriggerRipple: () => void;
}

const SPIRIT_STATUSES = [
  "Затаил дыхание...",
  "Слушает росу на травинках...",
  "Спрашивает у тёплого ветра...",
  "Шепчется с дикими колокольчиками...",
  "Собирает золотистую пыльцу твоих слов...",
  "Рисует созвездие в глубине мыслей..."
];

interface SpiritMessageBubbleProps {
  text: string;
  role: "user" | "model";
  isNewest: boolean;
  onCharacterTyped?: () => void;
}

function SpiritMessageBubble({ text, role, isNewest, onCharacterTyped }: SpiritMessageBubbleProps) {
  const [displayedText, setDisplayedText] = useState(isNewest ? "" : text);

  useEffect(() => {
    if (!isNewest) {
      setDisplayedText(text);
      return;
    }

    setDisplayedText("");
    let currentIdx = 0;
    const interval = setInterval(() => {
      if (currentIdx < text.length) {
        const char = text.charAt(currentIdx);
        setDisplayedText((prev) => prev + char);
        currentIdx++;
        if (onCharacterTyped && currentIdx % 4 === 0) {
          onCharacterTyped();
        }
      } else {
        clearInterval(interval);
      }
    }, 28); // Deliberate typing pace (approx 28ms per character)

    return () => clearInterval(interval);
  }, [text, isNewest]);

  return (
    <div
      className={`px-3.5 py-2.5 rounded-2xl text-[12px] leading-relaxed max-w-[88%] border transition-all duration-300 ${
        role === "user"
          ? "bg-white/5 border-white/10 text-white font-sans rounded-tr-none"
          : "bg-white text-slate-800 font-sans font-medium rounded-tl-none shadow-md"
      }`}
    >
      {displayedText}
    </div>
  );
}

export default function SpiritViewer({
  activeTheme,
  onClose,
  isAudioEnabled,
  onTriggerRipple,
}: SpiritViewerProps) {
  const [messages, setMessages] = useState<SpiritMessage[]>([
    {
      role: "model",
      text: "Здравствуй, путник! Я — Дух этого Поля. Каждое твоё слово согревает корни моих трав... Расскажи мне, во что верит твоё сердце?",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [activeModel, setActiveModel] = useState("gemini-3.5-flash");
  const [isSending, setIsSending] = useState(false);
  const [statusIndex, setStatusIndex] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  // Rotate magical childlike statuses
  useEffect(() => {
    if (!isSending) return;
    const timer = setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % SPIRIT_STATUSES.length);
    }, 1200);
    return () => clearInterval(timer);
  }, [isSending]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSending) return;

    const messageToSend = inputText.trim();
    setInputText("");
    setIsSending(true);
    setStatusIndex(0);

    const updatedMessages = [...messages, { role: "user" as const, text: messageToSend }];
    setMessages(updatedMessages);

    // Trigger visual/audio ripple on canvas
    onTriggerRipple();

    const startTime = Date.now();

    try {
      const res = await fetch("/api/field/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          modelId: activeModel,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        
        // Introduce an intentional warm delay (at least 2 seconds total) to prevent a rushed mechanical feel
        const elapsed = Date.now() - startTime;
        if (elapsed < 2000) {
          await new Promise((resolve) => setTimeout(resolve, 2000 - elapsed));
        }

        setMessages((prev) => [...prev, { role: "model" as const, text: data.reply }]);
        onTriggerRipple();
      } else {
        throw new Error("Failed to reach spirit");
      }
    } catch (err) {
      console.error("Error talking to Field Spirit:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          text: "Ой, ветерок унёс мои мысли... Прошепчи мне ещё раз, я буду слушать очень внимательно!",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in"
      id="spirit-viewer-overlay"
    >
      <div
        className="w-full max-w-lg rounded-3xl p-6 sm:p-8 border shadow-2xl relative transition-all duration-300 overflow-hidden flex flex-col"
        style={{
          backgroundColor: activeTheme.cardBg,
          borderColor: activeTheme.accentColor + "40",
          color: activeTheme.textColor,
          maxHeight: "88vh",
        }}
        id="spirit-viewer-card"
      >
        {/* Particle sparkles backing */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.03),transparent)] pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/5 transition-colors cursor-pointer text-white/50 hover:text-white z-10"
          id="close-spirit-btn"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Childlike Floating Spirit Visual representation */}
        <div className="flex flex-col items-center justify-center text-center mt-2 mb-6 space-y-3 z-10">
          <div className="relative w-20 h-20 flex items-center justify-center">
            {/* Pulsating backdrops */}
            <div className="absolute inset-0 bg-amber-200/25 blur-xl rounded-full animate-pulse scale-110" />
            <div className="absolute inset-2 bg-emerald-300/20 blur-md rounded-full animate-bounce duration-[4s]" />
            
            {/* The Cute Spirit face inside a soft glowing cloud */}
            <div className={`w-16 h-16 rounded-full bg-white flex flex-col items-center justify-center shadow-lg relative border-2 border-amber-200/40 transition-transform duration-500 ${isSending ? "scale-105 animate-pulse" : "animate-bounce duration-[3s]"}`}>
              {/* Dreaming eyes */}
              <div className="flex gap-4 mb-1 mt-3">
                <svg className="w-3.5 h-2 text-slate-600" viewBox="0 0 10 5" fill="none">
                  <path d="M1 1C2.5 3.5 7.5 3.5 9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <svg className="w-3.5 h-2 text-slate-600" viewBox="0 0 10 5" fill="none">
                  <path d="M1 1C2.5 3.5 7.5 3.5 9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              {/* Rosy cheeks */}
              <div className="absolute flex justify-between w-11 top-7">
                <span className="w-2.5 h-1.5 bg-rose-300/70 rounded-full blur-[0.5px] animate-pulse" />
                <span className="w-2.5 h-1.5 bg-rose-300/70 rounded-full blur-[0.5px] animate-pulse" />
              </div>
              {/* Little cute mouth */}
              <div className="w-2 h-1.5 border-b-2 border-slate-600 rounded-b-full mb-3" />
            </div>

            {/* Sparkles floating around spirit */}
            <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-amber-300 animate-spin duration-[10s]" />
            <span className="absolute bottom-2 -left-2 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          </div>

          <div>
            <h3 className="text-sm font-mono tracking-widest uppercase text-amber-300">Дух Живого Поля</h3>
            <p className="text-[10px] font-mono text-white/40 uppercase mt-0.5 tracking-wider">
              Сердце и шёпот дикого луга
            </p>
          </div>
        </div>

        {/* Message Thread */}
        <div className="flex-1 bg-black/40 border border-white/5 rounded-2xl p-4 sm:p-5 overflow-y-auto space-y-4 max-h-[300px] sm:max-h-[350px]">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex flex-col gap-1 ${
                m.role === "user" ? "items-end" : "items-start"
              } animate-fade-in`}
            >
              <span className="text-[8px] font-mono tracking-widest opacity-30 px-1 uppercase flex items-center gap-1">
                {m.role === "user" ? (
                  "Вы"
                ) : (
                  <>
                    <Smile className="w-2.5 h-2.5 text-amber-400" />
                    <span>Дух Поля</span>
                  </>
                )}
              </span>
              <SpiritMessageBubble
                text={m.text}
                role={m.role}
                isNewest={idx === messages.length - 1 && m.role === "model"}
                onCharacterTyped={() => {
                  // Emit a gentle visual feedback or sound trigger when letters typed
                  if (Math.random() > 0.4) {
                    onTriggerRipple();
                  }
                }}
              />
            </div>
          ))}

          {isSending && (
            <div className="flex flex-col gap-1 items-start animate-pulse">
              <span className="text-[8px] font-mono tracking-widest opacity-30 px-1 uppercase flex items-center gap-1">
                <Smile className="w-2.5 h-2.5 text-amber-400" />
                <span>Дух Поля</span>
              </span>
              <div className="px-3.5 py-2.5 rounded-2xl text-[12px] bg-white text-slate-800/80 font-mono italic rounded-tl-none shadow-sm flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-600 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-600 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-600 animate-bounce" style={{ animationDelay: "300ms" }} />
                <span className="transition-all duration-300 text-slate-600 font-sans not-italic text-xs">
                  {SPIRIT_STATUSES[statusIndex]}
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <form onSubmit={handleSendMessage} className="flex gap-2 border-t border-white/5 pt-4 mt-4">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Спросите духа поля о чудесах..."
            disabled={isSending}
            className="flex-1 bg-black/45 border border-white/10 focus:border-white/25 rounded-xl py-2 px-4 text-xs font-sans placeholder-white/30 text-white focus:outline-none"
            id="spirit-input-field"
          />
          <button
            type="submit"
            disabled={isSending || !inputText.trim()}
            className="p-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 hover:scale-[1.03] active:scale-[0.97]"
            id="send-spirit-message-btn"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        {/* Model Selector subtle */}
        <div className="flex items-center justify-between mt-3 text-[9px] font-mono opacity-40">
          <span className="italic">«поле слышит каждый вздох...»</span>
          <div className="flex items-center gap-1">
            <Cpu className="w-3 h-3 text-amber-300" />
            <select
              value={activeModel}
              onChange={(e) => setActiveModel(e.target.value)}
              className="bg-transparent border-none outline-none text-white font-mono uppercase text-[9px] cursor-pointer"
            >
              <option value="gemini-3.5-flash" className="bg-slate-900 text-white">3.5 Flash</option>
              <option value="gemini-2.5-flash" className="bg-slate-900 text-white">2.5 Flash</option>
              <option value="gemini-2.5-pro" className="bg-slate-900 text-white">2.5 Pro</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
