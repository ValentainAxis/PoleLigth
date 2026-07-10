import React from "react";
import { Vision, Theme } from "../types";
import { X, Sparkles, Wind, Link2, Calendar } from "lucide-react";

interface VisionViewerProps {
  vision: Vision;
  allVisions: Vision[];
  activeTheme: Theme;
  onClose: () => void;
  onTriggerRipple: () => void;
}

export default function VisionViewer({
  vision,
  allVisions,
  activeTheme,
  onClose,
  onTriggerRipple,
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

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in"
      id="vision-viewer-overlay"
    >
      <div
        className="w-full max-w-xl rounded-3xl p-8 border shadow-2xl relative transition-all duration-300"
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
        <div className="flex items-center gap-3 mb-6">
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
        <div className="space-y-6">
          {/* User's Vision */}
          <div className="relative pl-6 border-l-2" style={{ borderColor: vision.color }}>
            <p className="text-xs font-mono tracking-widest uppercase opacity-40 mb-2">Голос видения</p>
            <p className="text-lg font-sans leading-relaxed italic pr-4">
              &ldquo;{vision.text}&rdquo;
            </p>
          </div>

          {/* Connected state indicator */}
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/5 border border-white/5 w-fit">
            <Link2 className="w-4 h-4 text-white/60 animate-pulse" />
            <span className="text-xs font-mono">
              {isAlone ? (
                <span className="text-white/55">Пока ещё ищет родственные души на поле</span>
              ) : (
                <span style={{ color: vision.color }} className="font-semibold">
                  Связано с {connectionsCount} {connectionsCount === 1 ? "другим видением" : connectionsCount < 5 ? "другими видениями" : "другими видениями"}
                </span>
              )}
            </span>
          </div>

          {/* Wind Whisper (The conscious reply of the field) */}
          <div className="mt-8 p-6 rounded-2xl bg-black/30 border border-white/5 relative overflow-hidden">
            <div className="absolute right-4 bottom-4 opacity-5 pointer-events-none">
              <Wind className="w-24 h-24 text-white" />
            </div>

            <div className="flex items-center gap-2 mb-3">
              <Wind className="w-4 h-4 text-emerald-400 animate-pulse" />
              <p className="text-[10px] font-mono tracking-widest uppercase text-emerald-400">
                Шёпот сознания поля
              </p>
            </div>

            <p className="text-sm leading-relaxed text-white/95 font-serif italic font-medium pr-2">
              {vision.whisper}
            </p>
          </div>

          {/* Poetic meaning quote */}
          <div className="text-[10px] font-mono opacity-40 text-center italic pt-2">
            {!isAlone
              ? "«видение перестало быть одиноким»"
              : "поле ждет других искателей, чтобы сплести нити..."}
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4 border-t border-white/5">
            <button
              onClick={() => {
                onTriggerRipple();
                if (window.navigator.vibrate) {
                  window.navigator.vibrate(20);
                }
              }}
              className="flex-1 py-3 px-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono tracking-wider hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-white/70" />
              Послать волну света
            </button>
            
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-2xl text-xs font-mono tracking-wider font-semibold hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer text-black"
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
