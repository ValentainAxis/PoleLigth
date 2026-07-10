import React, { useState } from "react";
import { Theme } from "../types";
import { X, Sparkles } from "lucide-react";

interface VisionFormProps {
  x: number;
  y: number;
  activeTheme: Theme;
  onClose: () => void;
  onSubmit: (text: string, color: string) => Promise<void>;
}

const COLOR_SEEDS = [
  { value: "#f59e0b", label: "Звёздный Янтарь", desc: "Свет одиноких маяков" },
  { value: "#10b981", label: "Лесная Мята", desc: "Шёпот просыпающихся листьев" },
  { value: "#6366f1", label: "Глубокий Индиго", desc: "Секреты ночного неба" },
  { value: "#ec4899", label: "Утренняя Роса", desc: "Хрупкость первых рассветов" },
  { value: "#a855f7", label: "Сумеречный Сапфир", desc: "Магия вечерних тайн" },
];

export default function VisionForm({
  x,
  y,
  activeTheme,
  onClose,
  onSubmit,
}: VisionFormProps) {
  const [text, setText] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLOR_SEEDS[0].value);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(text, selectedColor);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
      id="vision-form-overlay"
    >
      <div
        className="w-full max-w-lg rounded-3xl p-8 border shadow-2xl relative transition-all duration-300"
        style={{
          backgroundColor: activeTheme.cardBg,
          borderColor: selectedColor + "40",
          color: activeTheme.textColor,
        }}
        id="vision-form-card"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/5 transition-colors cursor-pointer text-white/50 hover:text-white"
          id="close-form-btn"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center border animate-pulse"
            style={{
              borderColor: selectedColor + "50",
              backgroundColor: selectedColor + "15",
            }}
          >
            <Sparkles className="w-5 h-5" style={{ color: selectedColor }} />
          </div>
          <div>
            <h3 className="text-xl font-medium tracking-tight">Посадить мысль</h3>
            <p className="text-xs opacity-60 font-mono mt-0.5">
              Позиция на поле: X: {Math.round(x)}% | Y: {Math.round(y)}%
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Text Area */}
          <div>
            <label className="block text-xs font-mono tracking-widest uppercase mb-2 opacity-50">
              Что чувствует ваше видение?
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Запишите сюда тайную мысль, воспоминание, надежду или тоску. Поле услышит это..."
              maxLength={280}
              required
              rows={4}
              className="w-full rounded-2xl p-4 bg-black/20 border border-white/10 focus:border-white/20 focus:outline-none resize-none text-sm leading-relaxed placeholder-white/30 transition-all"
              style={{
                borderColor: selectedColor + "25",
              }}
            />
            <div className="flex justify-between text-[10px] font-mono mt-1 opacity-40">
              <span>Мысль прорастет цветком</span>
              <span>{text.length}/280</span>
            </div>
          </div>

          {/* Color Selector */}
          <div>
            <label className="block text-xs font-mono tracking-widest uppercase mb-3 opacity-50">
              Цвет свечения вашего семени
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {COLOR_SEEDS.map((color) => {
                const isSelected = selectedColor === color.value;
                return (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setSelectedColor(color.value)}
                    className={`flex items-center gap-3 p-3 rounded-2xl border text-left cursor-pointer transition-all duration-300 ${
                      isSelected
                        ? "bg-white/5 border-white/20 scale-[1.02] shadow-md"
                        : "bg-transparent border-white/5 hover:border-white/10 opacity-70 hover:opacity-100"
                    }`}
                  >
                    <div
                      className="w-5 h-5 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: color.value,
                        boxShadow: isSelected ? `0 0 12px ${color.value}80` : "none",
                      }}
                    />
                    <div className="overflow-hidden">
                      <p className="text-xs font-medium truncate">{color.label}</p>
                      <p className="text-[10px] opacity-50 truncate">{color.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Prompt/Instruction */}
          <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-[11px] leading-relaxed opacity-70">
            <p className="italic font-sans">
              &ldquo;поле радуется не тому, что его увидели, а тому, что видение перестало быть одиноким.&rdquo;
            </p>
            <p className="mt-1.5 text-[10px] font-mono opacity-60">
              Ваша мысль останется в поле навсегда. Как только вы посадите её,
              древнее сознание поля прочтет её и ответит вам тихим шёпотом.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-3.5 rounded-2xl bg-transparent border border-white/10 text-xs font-mono uppercase tracking-wider hover:bg-white/5 cursor-pointer disabled:opacity-50 transition-all"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !text.trim()}
              className="flex-1 py-3.5 rounded-2xl text-xs font-mono uppercase tracking-wider text-black font-semibold hover:scale-[1.02] active:scale-95 disabled:scale-100 disabled:opacity-30 transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              style={{
                backgroundColor: selectedColor,
                boxShadow: `0 8px 24px -6px ${selectedColor}a0`,
              }}
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Шелест поля...
                </>
              ) : (
                <>
                  Посадить семя
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
