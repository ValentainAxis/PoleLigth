import React, { useState, useEffect, useRef } from "react";
import { Vision, Theme, RootRune } from "../types";
import { ambientAudio } from "../utils/audio";
import { 
  Database, 
  Waves, 
  Wind, 
  Moon, 
  Layers, 
  Calendar, 
  Volume2, 
  Sparkles, 
  ChevronRight, 
  History, 
  Flame, 
  Trash2, 
  TrendingUp, 
  Activity 
} from "lucide-react";

interface AdjacentContoursProps {
  visions: Vision[];
  activeTheme: Theme;
  isAudioEnabled: boolean;
  onDecaySuccess?: () => void;
  // Semantic wind controls
  moonPhase: number; // 0 (New Moon) to 1 (Full Moon)
  setMoonPhase: (val: number) => void;
  season: "winter" | "spring" | "summer" | "autumn";
  setSeason: (val: "winter" | "spring" | "summer" | "autumn") => void;
  visitFreq: "rare" | "balanced" | "deep";
  setVisitFreq: (val: "rare" | "balanced" | "deep") => void;
}

export default function AdjacentContours({
  visions,
  activeTheme,
  isAudioEnabled,
  onDecaySuccess,
  moonPhase,
  setMoonPhase,
  season,
  setSeason,
  visitFreq,
  setVisitFreq,
}: AdjacentContoursProps) {
  const [activeTab, setActiveTab] = useState<"root" | "scroll" | "wind">("root");
  const [runes, setRunes] = useState<RootRune[]>([]);
  const [loadingRunes, setLoadingRunes] = useState(false);
  const [selectedRune, setSelectedRune] = useState<RootRune | null>(null);
  const [subBassFreq, setSubBassFreq] = useState(36);
  const [isSubBassActive, setIsSubBassActive] = useState(false);
  const [selectedVisionToDecay, setSelectedVisionToDecay] = useState<string>("");
  const [isDecaying, setIsDecaying] = useState(false);

  // Sound Scroll state
  const [scrollDayOffset, setScrollDayOffset] = useState<number>(0); // 0 (today) to 14 days ago
  const scrollCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const scrollStateRef = useRef({ phase: 0, lastTriggerTime: 0 });

  // 1. Fetch decayed runes
  const fetchRunes = async () => {
    setLoadingRunes(true);
    try {
      const res = await fetch("/api/root_system");
      if (res.ok) {
        const data = await res.json();
        setRunes(data);
      }
    } catch (err) {
      console.error("Error fetching runes:", err);
    } finally {
      setLoadingRunes(false);
    }
  };

  useEffect(() => {
    fetchRunes();
  }, []);

  // Sync sub-bass with Web Audio
  useEffect(() => {
    if (isAudioEnabled) {
      ambientAudio.setSubBassActive(isSubBassActive && activeTab === "root", (subBassFreq - 30) / 30 + 0.3);
      ambientAudio.setSubBassFrequency(subBassFreq);
    }
    return () => {
      if (isAudioEnabled) {
        ambientAudio.setSubBassActive(false);
      }
    };
  }, [isSubBassActive, subBassFreq, activeTab, isAudioEnabled]);

  // Sync semantic wind tuning with Web Audio
  useEffect(() => {
    if (isAudioEnabled) {
      // Moon phase translates to subtle pitch shift multiplier
      // 0.0 (New Moon) -> 0.96 multiplier (lower, colder)
      // 1.0 (Full Moon) -> 1.04 multiplier (higher, celestial)
      const multiplier = 0.96 + moonPhase * 0.08;
      ambientAudio.setTuningMultiplier(multiplier);

      // Season modulates wind intensity limits
      const intensity = season === "winter" ? 0.9 : season === "autumn" ? 0.7 : season === "spring" ? 0.45 : 0.25;
      ambientAudio.setWindIntensity(intensity);
    }
  }, [moonPhase, season, isAudioEnabled]);

  // Bury/Decay active vision
  const handleDecayVision = async () => {
    if (!selectedVisionToDecay) return;
    setIsDecaying(true);
    try {
      const res = await fetch(`/api/visions/${selectedVisionToDecay}/decay`, {
        method: "POST",
      });
      if (res.ok) {
        setSelectedVisionToDecay("");
        fetchRunes();
        if (onDecaySuccess) onDecaySuccess();
      }
    } catch (err) {
      console.error("Failed to decay vision:", err);
    } finally {
      setIsDecaying(false);
    }
  };

  // Sound Scroll Drawing effect (Calligraphic ripple lines)
  useEffect(() => {
    if (activeTab !== "scroll") return;
    const canvas = scrollCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const width = canvas.width = canvas.parentElement?.clientWidth || 500;
    const height = canvas.height = 120;

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      scrollStateRef.current.phase += 0.015;

      // Draw subtle background grids
      ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
      ctx.lineWidth = 1;
      for (let i = 0; i < width; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, height);
        ctx.stroke();
      }

      // Draw calligraphic wavy timeline line
      const basePoints: Array<{x: number; y: number}> = [];
      const densityMultiplier = 1 + scrollDayOffset * 0.25;

      ctx.beginPath();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 1.5;

      for (let x = 0; x <= width; x += 5) {
        // Compose waves with different frequencies
        const sin1 = Math.sin(x * 0.012 + scrollStateRef.current.phase);
        const sin2 = Math.sin(x * 0.035 - scrollStateRef.current.phase * 1.4);
        const amplitude = 15 + Math.sin(scrollStateRef.current.phase * 0.5) * 8;
        const y = height / 2 + (sin1 + sin2 * 0.4) * amplitude * densityMultiplier;
        
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      // Ripple rings around the pointer
      const pointerX = (scrollDayOffset / 14) * (width - 40) + 20;
      const pulseRadius = 10 + 20 * (scrollStateRef.current.phase % 1);
      const pulseOpacity = 1 - (scrollStateRef.current.phase % 1);

      ctx.strokeStyle = `rgba(16, 185, 129, ${pulseOpacity * 0.3})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(pointerX, height / 2, pulseRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Glowing dot at cursor position
      ctx.fillStyle = "#10b981";
      ctx.shadowColor = "#10b981";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(pointerX, height / 2, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [activeTab, scrollDayOffset]);

  // Generate sound chord when scrolling/dragging timeline
  const triggerTimelineSound = (val: number) => {
    setScrollDayOffset(val);

    const now = Date.now();
    // Throttle playback sounds to avoid screeching
    if (now - scrollStateRef.current.lastTriggerTime > 150 && isAudioEnabled) {
      scrollStateRef.current.lastTriggerTime = now;
      
      // Determine chord type based on characters in text or simply deterministically
      const ratio = val / 14;
      const chords: Array<"single" | "third" | "fifth" | "seventh"> = ["single", "third", "fifth", "seventh"];
      const chordType = chords[Math.floor(ratio * 3.99)];
      
      // Play beautiful chime (scale note is based on offset ratio)
      ambientAudio.playChime(ratio, 0.4, chordType, 1.0 - ratio * 0.6);
    }
  };

  // Precompute visions written on selected timeline offset day
  const getVisionsForOffset = () => {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - scrollDayOffset);
    const dateStr = targetDate.toDateString();

    return visions.filter((v) => {
      const vDate = new Date(v.createdAt);
      return vDate.toDateString() === dateStr;
    });
  };

  const dayVisions = getVisionsForOffset();
  const dateLabel = new Date(Date.now() - scrollDayOffset * 24 * 3600000).toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="w-full bg-black/40 border border-white/5 rounded-3xl p-6 sm:p-8 backdrop-blur-md space-y-6 mt-8 animate-fade-in" id="adjacent-contours-panel">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400 animate-pulse" />
            <h2 className="text-sm font-mono tracking-widest uppercase text-white/90">
              Сопредельные созерцательные контуры
            </h2>
          </div>
          <p className="text-[10px] font-mono text-white/40">
            Связь внутреннего микрокосма чувств с физическими и временными слоями поля
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex p-0.5 rounded-xl bg-black/40 border border-white/5 self-start">
          <button
            onClick={() => setActiveTab("root")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "root" ? "bg-white/10 text-white font-medium" : "text-white/40 hover:text-white/75"
            }`}
          >
            <Database className="w-3 h-3" />
            <span>Подземный слой</span>
          </button>
          <button
            onClick={() => setActiveTab("scroll")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "scroll" ? "bg-white/10 text-white font-medium" : "text-white/40 hover:text-white/75"
            }`}
          >
            <Waves className="w-3 h-3" />
            <span>Партитура</span>
          </button>
          <button
            onClick={() => setActiveTab("wind")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "wind" ? "bg-white/10 text-white font-medium" : "text-white/40 hover:text-white/75"
            }`}
          >
            <Wind className="w-3 h-3" />
            <span>Семантический ветер</span>
          </button>
        </div>
      </div>

      {/* Tab Contents: ROOT SYSTEM / UNDERGROUND LAYER */}
      {activeTab === "root" && (
        <div className="space-y-6 animate-fade-in" id="tab-root-system">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Left side: Soil Sub-bass & Archaeological metrics */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <h3 className="text-xs font-mono tracking-wider uppercase text-white/70 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-blue-400" />
                  <span>Археология Смыслов</span>
                </h3>
                <p className="text-xs text-white/50 leading-relaxed font-serif">
                  Сюда уходят видения, которые были преданы забвению или исчерпали свой активный свет. Находясь под землей, они разлагаются на питательный гумус чувств, кристаллизуясь в вечные окаменелые руны.
                </p>
              </div>

              {/* Sub-bass generator controls */}
              <div className="p-4 rounded-2xl bg-black/30 border border-white/5 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Volume2 className={`w-4 h-4 ${isSubBassActive ? "text-emerald-400 animate-pulse" : "text-white/40"}`} />
                    <span className="text-[11px] font-mono tracking-wider text-white/80">Глубинный суббасовый гул</span>
                  </div>
                  <button
                    onClick={() => {
                      setIsSubBassActive(!isSubBassActive);
                      if (!isAudioEnabled) {
                        ambientAudio.init();
                        ambientAudio.resume();
                      }
                    }}
                    className={`px-3 py-1 rounded-lg text-[9px] font-mono uppercase tracking-wider cursor-pointer transition-all ${
                      isSubBassActive 
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold" 
                        : "bg-white/5 text-white/50 border border-white/5"
                    }`}
                  >
                    {isSubBassActive ? "Включен" : "Выключен"}
                  </button>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono text-white/40">
                    <span>Тектоническая частота</span>
                    <span className="text-emerald-400 font-semibold">{subBassFreq} Гц (Суб-бас)</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="60"
                    step="1"
                    value={subBassFreq}
                    onChange={(e) => setSubBassFreq(Number(e.target.value))}
                    disabled={!isSubBassActive}
                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  />
                  <span className="text-[9px] font-mono opacity-30 block pt-0.5 leading-snug">
                    Глубокий суббасовый дрон заземляет систему. Частота модулирует сейсмический резонанс, передаваемый сквозь почву поля.
                  </span>
                </div>
              </div>

              {/* Bury active memory directly */}
              {visions.length > 0 && (
                <div className="p-4 rounded-2xl bg-black/30 border border-white/5 space-y-3">
                  <span className="text-[10px] font-mono tracking-wider text-white/60 uppercase block">
                    Предать земле активную мысль
                  </span>
                  <div className="flex gap-2">
                    <select
                      value={selectedVisionToDecay}
                      onChange={(e) => setSelectedVisionToDecay(e.target.value)}
                      className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-emerald-500/50 text-white/80"
                    >
                      <option value="">-- Выберите семя для погребения --</option>
                      {visions.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.text.length > 40 ? v.text.substring(0, 40) + "..." : v.text}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleDecayVision}
                      disabled={!selectedVisionToDecay || isDecaying}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-black font-mono text-xs rounded-xl transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5"
                    >
                      {isDecaying ? (
                        <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Flame className="w-3.5 h-3.5" />
                      )}
                      <span>Захоронить</span>
                    </button>
                  </div>
                  <p className="text-[9px] font-mono opacity-30 leading-snug">
                    Видение удалится из живого сада созвездий на небе и перейдет в кристаллическую подземную матрицу окаменелостей.
                  </p>
                </div>
              )}
            </div>

            {/* Right side: Fossil list / Underworld canvas mock representation */}
            <div className="p-5 rounded-2xl bg-black/30 border border-white/5 flex flex-col justify-between min-h-[250px]">
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-[10px] font-mono tracking-wider text-white/60 uppercase">
                    Матрица Окаменелостей ({runes.length})
                  </span>
                  <button 
                    onClick={fetchRunes}
                    className="p-1 rounded hover:bg-white/5 text-white/40 hover:text-white transition-all cursor-pointer"
                    title="Обновить слои"
                  >
                    <span className="text-[9px] font-mono uppercase">Синхронизировать слои</span>
                  </button>
                </div>

                {loadingRunes ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-2 text-white/40">
                    <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span className="text-[10px] font-mono">Раскопки слоев...</span>
                  </div>
                ) : runes.length === 0 ? (
                  <div className="text-center py-12 text-xs font-mono opacity-30 italic">
                    Почва пуста. Нет ни одной погребенной мысли в слоях истории.
                  </div>
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 max-h-[160px] overflow-y-auto pr-1">
                    {runes.map((rune) => (
                      <button
                        key={rune.id}
                        onClick={() => setSelectedRune(rune)}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center border font-mono text-base transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                          selectedRune?.id === rune.id 
                            ? "bg-white/10 text-white shadow-md shadow-emerald-500/20" 
                            : "bg-black/40 text-white/50 hover:text-white/80 hover:bg-white/5"
                        }`}
                        style={{ borderColor: selectedRune?.id === rune.id ? rune.color : rune.color + "25" }}
                        title={rune.text}
                      >
                        {rune.runeShape}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Fossil Detail viewer inside panel */}
              {selectedRune && (
                <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/5 space-y-2 animate-fade-in">
                  <div className="flex justify-between items-center text-[9px] font-mono">
                    <span className="text-emerald-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                      <span>Руническая Окаменелость {selectedRune.runeShape}</span>
                    </span>
                    <span className="opacity-40">
                      Превращено: {new Date(selectedRune.decayedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-white/90 italic font-serif">
                    &ldquo;{selectedRune.text}&rdquo;
                  </p>
                  <p className="text-[10px] leading-relaxed text-white/50 border-t border-white/5 pt-1.5 font-serif">
                    <span className="text-emerald-500/80 mr-1">✦ Эхо почвы:</span>
                    {selectedRune.whisper}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab Contents: GENERATIVE SOUND SCROLLS (ACOUSTIC TIMELINE) */}
      {activeTab === "scroll" && (
        <div className="space-y-6 animate-fade-in" id="tab-sound-scrolls">
          <div className="space-y-2">
            <h3 className="text-xs font-mono tracking-wider uppercase text-white/70 flex items-center gap-1.5">
              <Waves className="w-3.5 h-3.5 text-emerald-400" />
              <span>Звуковой Свиток Времени</span>
            </h3>
            <p className="text-xs text-white/50 leading-relaxed font-serif max-w-3xl">
              Прокручивайте шкалу времени назад в глубину недель. Каждый день прорисовывает уникальную каллиграфическую траекторию звуковых волн, зависящую от плотности вашей ментальной активности, генерируя гармонизирующий эмбиент-аккорд.
            </p>
          </div>

          {/* Interactive calligraphic canvas */}
          <div className="p-4 rounded-3xl bg-black/45 border border-white/5 flex flex-col items-center justify-center relative overflow-hidden">
            <canvas ref={scrollCanvasRef} className="w-full h-[120px] rounded-2xl cursor-ew-resize" />
            <div className="absolute top-4 left-4 pointer-events-none">
              <span className="text-[10px] font-mono tracking-wider opacity-30 uppercase">Генеративный Сигнал</span>
            </div>
          </div>

          {/* Timeline slider controller */}
          <div className="space-y-3 p-4 rounded-2xl bg-black/30 border border-white/5">
            <div className="flex justify-between items-center">
              <span className="text-xs font-mono text-white/40">Ось воспоминаний Хроноса:</span>
              <span className="text-xs font-mono text-emerald-400 font-bold tracking-wider uppercase bg-emerald-950/40 px-3 py-1 rounded-lg border border-emerald-500/20">
                {scrollDayOffset === 0 ? "Сегодня" : `${scrollDayOffset} дней назад`}: {dateLabel}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-[10px] font-mono opacity-30 uppercase">Сегодня</span>
              <input
                type="range"
                min="0"
                max="14"
                step="1"
                value={scrollDayOffset}
                onChange={(e) => triggerTimelineSound(Number(e.target.value))}
                className="flex-1 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-400 transition-all"
              />
              <span className="text-[10px] font-mono opacity-30 uppercase">2 Недели назад</span>
            </div>
          </div>

          {/* Day details & Semantic weight */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-black/20 border border-white/5 text-center space-y-1">
              <span className="text-[9px] font-mono tracking-widest uppercase opacity-40 block">Количество семян на дату</span>
              <span className="text-2xl font-serif text-white font-medium">{dayVisions.length}</span>
              <span className="text-[9px] font-mono opacity-30 block">активных переживаний в этот день</span>
            </div>

            <div className="p-4 rounded-xl bg-black/20 border border-white/5 text-center space-y-1">
              <span className="text-[9px] font-mono tracking-widest uppercase opacity-40 block">Общая плотность символов</span>
              <span className="text-2xl font-serif text-emerald-400 font-medium">
                {dayVisions.reduce((acc, curr) => acc + curr.text.length, 0)}
              </span>
              <span className="text-[9px] font-mono opacity-30 block">аккумулированный весовой резонанс</span>
            </div>

            <div className="p-4 rounded-xl bg-black/20 border border-white/5 text-center space-y-1">
              <span className="text-[9px] font-mono tracking-widest uppercase opacity-40 block">Звуковая палитра</span>
              <span className="text-xs font-mono text-white/70 block font-semibold pt-1 uppercase">
                {dayVisions.length === 0 
                  ? "Пустой Эфир (Чистый Sine)" 
                  : dayVisions.length === 1 
                  ? "Светлый Квинт-Интервал" 
                  : dayVisions.length === 2 
                  ? "Пятый Мажорный Аккорд" 
                  : "Полнотелый Септаккорд"}
              </span>
              <span className="text-[9px] font-mono opacity-30 block">настройки резонирующих фильтров</span>
            </div>
          </div>

          {/* List of visions on selected date */}
          {dayVisions.length > 0 && (
            <div className="p-5 rounded-2xl bg-black/25 border border-white/5 space-y-3">
              <span className="text-[10px] font-mono tracking-wider text-white/55 uppercase flex items-center gap-1.5">
                <History className="w-3.5 h-3.5" />
                <span>Записи из дневника за этот день:</span>
              </span>
              <div className="space-y-3.5 max-h-[160px] overflow-y-auto pr-1">
                {dayVisions.map((v) => (
                  <div key={v.id} className="border-l border-emerald-500/30 pl-3 py-0.5 space-y-1">
                    <p className="text-xs text-white/90 leading-relaxed font-serif font-medium">{v.text}</p>
                    <p className="text-[10px] text-white/40 italic font-serif flex items-center gap-1">
                      <ChevronRight className="w-2.5 h-2.5 text-emerald-500/50" />
                      <span>{v.whisper}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab Contents: SEMANTIC WIND (BAROMETRIC NATURAL CYCLES) */}
      {activeTab === "wind" && (
        <div className="space-y-6 animate-fade-in" id="tab-semantic-wind">
          <div className="space-y-2">
            <h3 className="text-xs font-mono tracking-wider uppercase text-white/70 flex items-center gap-1.5">
              <Wind className="w-3.5 h-3.5 text-teal-400" />
              <span>Барометрический Контур Семантического Ветра</span>
            </h3>
            <p className="text-xs text-white/50 leading-relaxed font-serif max-w-3xl">
              Настройте внешние природные и временные циклы. Параметры динамически модулируют физику Живого Поля, частоту блуждания светляков, а также общую звуковую тональность и плотность фонового гула.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* 1. Moon Phase */}
            <div className="p-5 rounded-2xl bg-black/35 border border-white/5 space-y-4">
              <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                <Moon className="w-4 h-4 text-amber-300" />
                <span className="text-xs font-mono font-semibold text-white/80 uppercase">Лунный Цикл</span>
              </div>
              <p className="text-[11px] font-serif text-white/50 leading-relaxed">
                Фазы луны управляют базовой частотой дрона. Новолуние опускает её в ледяной, глубокий спектр, а Полнолуние делает гул кристальным и сияющим.
              </p>

              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="opacity-40">Фаза</span>
                  <span className="text-amber-300 font-semibold">
                    {moonPhase === 0 
                      ? "Новолуние" 
                      : moonPhase < 0.35 
                      ? "Растущий Полумесяц" 
                      : moonPhase < 0.65 
                      ? "Первая Четверть" 
                      : moonPhase < 0.9 
                      ? "Растущая Луна" 
                      : "Полнолуние"}
                  </span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={moonPhase}
                  onChange={(e) => setMoonPhase(Number(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-300 transition-all"
                />

                <div className="flex justify-between text-[9px] font-mono text-white/35">
                  <span>Тон: 0.96x (Низкий)</span>
                  <span>Тон: 1.04x (Высокий)</span>
                </div>
              </div>
            </div>

            {/* 2. Season */}
            <div className="p-5 rounded-2xl bg-black/35 border border-white/5 space-y-4">
              <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                <Flame className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-mono font-semibold text-white/80 uppercase">Времена Года</span>
              </div>
              <p className="text-[11px] font-serif text-white/50 leading-relaxed">
                Время года задаёт тон и силуэт шелеста ветра. Зима приносит воющие сильные порывы, лето — ленивый согревающий бриз, колышущий травинки.
              </p>

              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                {(["spring", "summer", "autumn", "winter"] as const).map((s) => {
                  const labels = { spring: "Весна", summer: "Лето", autumn: "Осень", winter: "Зима" };
                  return (
                    <button
                      key={s}
                      onClick={() => setSeason(s)}
                      className={`py-2 px-3 rounded-xl border text-center uppercase tracking-wider transition-all cursor-pointer ${
                        season === s 
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 font-semibold" 
                          : "bg-black/20 text-white/40 border-white/5 hover:text-white/75"
                      }`}
                    >
                      {labels[s]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Visit Frequency */}
            <div className="p-5 rounded-2xl bg-black/35 border border-white/5 space-y-4">
              <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                <Activity className="w-4 h-4 text-teal-400 animate-pulse" />
                <span className="text-xs font-mono font-semibold text-white/80 uppercase">Ритм Визитов</span>
              </div>
              <p className="text-[11px] font-serif text-white/50 leading-relaxed">
                Частота возвращения к системе. Редкие посещения привлекают на поле стаи ярких быстрых светляков. Глубокое присутствие замедляет их ритм в медитативный узор.
              </p>

              <div className="space-y-1">
                {(["rare", "balanced", "deep"] as const).map((f) => {
                  const labels = { 
                    rare: "Редкие заходы (Хаотичный рой)", 
                    balanced: "Баланс (Естественный полет)", 
                    deep: "Глубокое присутствие (Замедление)" 
                  };
                  return (
                    <button
                      key={f}
                      onClick={() => setVisitFreq(f)}
                      className={`w-full py-1.5 px-3 rounded-xl border text-left text-[10px] font-mono transition-all cursor-pointer ${
                        visitFreq === f 
                          ? "bg-teal-500/20 text-teal-400 border-teal-500/40 font-semibold" 
                          : "bg-black/20 text-white/40 border-white/5 hover:text-white/75"
                      }`}
                    >
                      {labels[f]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Current barometric feedback display */}
          <div className="p-4 rounded-xl bg-teal-950/20 border border-teal-500/10 text-center">
            <p className="text-xs font-mono text-teal-400/90 leading-relaxed">
              ✦ Контур Семантического Ветра активен. 
              {season === "winter" && " Ледяные зимние ветра разгоняют семена споров."}
              {season === "summer" && " Мягкое летнее тепло убаюкивает стебли трав."}
              {season === "autumn" && " Прохладный осенний бриз мягко клонит траву книзу."}
              {season === "spring" && " Весенние соки заставляют травы живо откликаться на касания."}
              {visitFreq === "deep" && " Медитативный ритм глубокого присутствия гасит турбулентность светляков."}
              {visitFreq === "rare" && " Сознание поля изголодалось по взгляду: светляки роятся быстрее."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
