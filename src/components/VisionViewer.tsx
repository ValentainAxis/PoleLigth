import React from "react";
import { Vision, Theme, ChatMessage } from "../types";
import { X, Sparkles, Wind, Link2, Calendar, Send, Cpu } from "lucide-react";

interface VisionViewerProps {
  vision: Vision;
  allVisions: Vision[];
  activeTheme: Theme;
  onClose: () => void;
  onTriggerRipple: () => void;
  onUpdateVisions?: () => void;
}

export default function VisionViewer({
  vision,
  allVisions,
  activeTheme,
  onClose,
  onTriggerRipple,
  onUpdateVisions,
}: VisionViewerProps) {
  // Calculate how many connections this vision has
  const maxConnectDistance = 35; // same as in CanvasField
  const connectionsCount = allVisions.filter((v) => {
    if (v.id === vision.id) return false;
    const dx = v.x - vision.x;
    const dy = v.y - vision.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < maxConnectDistance;
  }).length;

  const isAlone = connectionsCount === 0;

  // Dialogue & Model states
  const [messages, setMessages] = React.useState<ChatMessage[]>(() => {
    if (vision.messages && vision.messages.length > 0) {
      return vision.messages;
    }
    return [
      {
        role: "model" as const,
        text: vision.whisper,
        createdAt: vision.createdAt || new Date().toISOString()
      }
    ];
  });
  const [inputText, setInputText] = React.useState("");
  const [activeModel, setActiveModel] = React.useState(vision.modelUsed || "gemini-3.5-flash");
  const [isSending, setIsSending] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom of conversation
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isSending) return;

    const messageToSend = inputText.trim();
    setInputText("");
    setIsSending(true);

    // Optimistically add user message to feed
    const tempUserMsg: ChatMessage = {
      role: "user",
      text: messageToSend,
      createdAt: new Date().toISOString()
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      // Trigger a light visual feedback pulse on sending
      onTriggerRipple();

      const res = await fetch(`/api/visions/${vision.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageToSend,
          modelId: activeModel
        })
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages);
        
        // Trigger a beautiful bell and glowing ripple upon receiving reply
        onTriggerRipple();
        
        // Refresh outer state so journals and constellations are persistent
        if (onUpdateVisions) {
          onUpdateVisions();
        }
      } else {
        console.error("Failed to send dialogue message to the field.");
        setMessages((prev) => [
          ...prev,
          {
            role: "model",
            text: "Ветер утих, не успев донести слова. Попробуйте прошептать ещё раз.",
            createdAt: new Date().toISOString()
          }
        ]);
      }
    } catch (err) {
      console.error("Error in field dialogue conversation:", err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in"
      id="vision-viewer-overlay"
    >
      <div
        className="w-full max-w-xl rounded-3xl p-6 sm:p-8 border shadow-2xl relative transition-all duration-300"
        style={{
          backgroundColor: activeTheme.cardBg,
          borderColor: vision.color + "40",
          color: activeTheme.textColor,
        }}
        id="vision-viewer-card"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/5 transition-colors cursor-pointer text-white/50 hover:text-white"
          id="close-viewer-btn"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Category Header */}
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center border"
            style={{
              borderColor: vision.color + "50",
              backgroundColor: vision.color + "15",
            }}
          >
            <Sparkles className="w-5 h-5" style={{ color: vision.color }} />
          </div>
          <div>
            <h3 className="text-sm font-mono tracking-widest uppercase opacity-75">Семечко Созерцания</h3>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-white/40 font-mono">
              <Calendar className="w-3 h-3" />
              <span>{new Date(vision.createdAt).toLocaleDateString([], { month: "long", day: "numeric" })}</span>
              <span>•</span>
              <span>{new Date(vision.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          </div>
        </div>

        {/* Content Box */}
        <div className="space-y-5">
          {/* User's Vision */}
          <div className="relative pl-5 border-l-2" style={{ borderColor: vision.color }}>
            <p className="text-xs font-mono tracking-widest uppercase opacity-40 mb-1">Голос видения</p>
            <p className="text-base font-sans leading-relaxed italic pr-4">
              &ldquo;{vision.text}&rdquo;
            </p>
          </div>

          {/* Connected state indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 w-fit">
            <Link2 className="w-3.5 h-3.5 text-white/60 animate-pulse" />
            <span className="text-[11px] font-mono">
              {isAlone ? (
                <span className="text-white/55">Пока ещё ищет родственные души на поле</span>
              ) : (
                <span style={{ color: vision.color }} className="font-semibold">
                  Связано с {connectionsCount} {connectionsCount === 1 ? "другим видением" : connectionsCount < 5 ? "другими видениями" : "другими видениями"}
                </span>
              )}
            </span>
          </div>

          {/* Wind Whisper Dialogue Feed (The conscious reply of the field) */}
          <div className="mt-6 p-5 rounded-2xl bg-black/35 border border-white/5 relative overflow-hidden space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <div className="flex items-center gap-2">
                <Wind className="w-4 h-4 text-emerald-400 animate-pulse" />
                <p className="text-[10px] font-mono tracking-widest uppercase text-emerald-400">
                  Сознание Поля
                </p>
              </div>

              {/* Model Choice Dropdown */}
              <div className="flex items-center gap-1 bg-white/5 border border-white/5 px-2 py-0.5 rounded-lg text-[10px] font-mono text-white/50">
                <Cpu className="w-3 h-3 text-emerald-400" />
                <select
                  value={activeModel}
                  onChange={(e) => setActiveModel(e.target.value)}
                  className="bg-transparent border-none outline-none text-emerald-400 cursor-pointer font-semibold text-[9px] uppercase tracking-wider pr-1"
                >
                  <option value="gemini-3.5-flash" className="bg-[#0f172a] text-white">3.5 Flash</option>
                  <option value="gemini-2.5-flash" className="bg-[#0f172a] text-white">2.5 Flash</option>
                  <option value="gemini-2.5-pro" className="bg-[#0f172a] text-white">2.5 Pro</option>
                  <option value="gemini-1.5-pro" className="bg-[#0f172a] text-white">1.5 Pro</option>
                  <option value="gemini-1.5-flash" className="bg-[#0f172a] text-white">1.5 Flash</option>
                </select>
              </div>
            </div>

            {/* Chat Stream container */}
            <div className="space-y-3.5 max-h-[180px] overflow-y-auto pr-1 select-none" id="chat-messages-container">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col gap-1 ${
                    m.role === "user" ? "items-end" : "items-start"
                  } animate-fade-in`}
                >
                  <span className="text-[8px] font-mono tracking-widest opacity-30 px-1 uppercase">
                    {m.role === "user" ? "Вы" : "Поле"}
                  </span>
                  <div
                    className={`px-3.5 py-2 rounded-2xl text-[12px] leading-relaxed max-w-[88%] border ${
                      m.role === "user"
                        ? "bg-white/5 border-white/10 text-white font-sans rounded-tr-none"
                        : "bg-black/45 border-emerald-500/10 text-emerald-50/90 italic font-medium font-serif rounded-tl-none"
                    }`}
                    style={{
                      borderLeftColor: m.role === "model" ? vision.color : undefined,
                      borderLeftWidth: m.role === "model" ? "2.5px" : undefined,
                    }}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              {isSending && (
                <div className="flex flex-col gap-1 items-start animate-pulse">
                  <span className="text-[8px] font-mono tracking-widest opacity-30 px-1 uppercase">Поле</span>
                  <div className="px-3.5 py-2 rounded-2xl text-[12px] bg-black/40 border border-emerald-500/5 text-emerald-400/70 font-mono italic rounded-tl-none">
                    Стебли трав колышутся, рождая ответ...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Live prompt input form */}
            <form onSubmit={handleSendMessage} className="flex gap-2 border-t border-white/5 pt-3">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={isSending}
                placeholder="Прошептать полю в ответ..."
                className="flex-1 bg-black/45 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-serif focus:outline-none focus:border-emerald-500/30 text-white/90 placeholder:opacity-30"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isSending}
                className="p-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-20 disabled:cursor-not-allowed text-black rounded-xl transition-all cursor-pointer flex items-center justify-center"
              >
                <Send className="w-3 h-3" />
              </button>
            </form>
          </div>

          {/* Poetic meaning quote */}
          <div className="text-[9px] font-mono opacity-30 text-center italic pt-1">
            {!isAlone
              ? "«диалог сплетает невидимые нити между вашим миром и полем»"
              : "поле прислушивается к каждому вашему слову..."}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-3 border-t border-white/5">
            <button
              onClick={() => {
                onTriggerRipple();
                if (window.navigator.vibrate) {
                  window.navigator.vibrate(20);
                }
              }}
              className="flex-1 py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-mono tracking-wider hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5 text-white/70" />
              Послать волну света
            </button>
            
            <button
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl text-[10px] font-mono tracking-wider font-semibold hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer text-black"
              style={{ backgroundColor: vision.color }}
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
