import React, { useEffect, useState } from "react";
import { Vision, Theme } from "./types";
import { ambientAudio } from "./utils/audio";
import CanvasField from "./components/CanvasField";
import ConstellationSky from "./components/ConstellationSky";
import VisionForm from "./components/VisionForm";
import VisionViewer from "./components/VisionViewer";
import AdjacentContours from "./components/AdjacentContours";
import WorkspacePortal from "./components/WorkspacePortal";
import {
  Volume2,
  VolumeX,
  Search,
  RefreshCw,
  Sparkles,
  Wind,
  Plus,
  HelpCircle,
  Clock,
  ExternalLink,
  ChevronRight,
  Heart,
  HardDrive
} from "lucide-react";

// Definitions of gorgeous ambient themes matching times of day
const THEMES: Theme[] = [
  {
    id: "dawn",
    name: "Dawn",
    nameRu: "Рассвет",
    bgGradient: "bg-gradient-to-tr from-[#0d091a] via-[#210f22] to-[#3a101f]",
    grassColor1: "#fda4af", // rose
    grassColor2: "#f43f5e", // deep rose
    sporeColor: "#ffe4e6", // mist pink
    accentColor: "#f43f5e",
    textColor: "text-rose-100",
    textMutedColor: "text-rose-300/60",
    cardBg: "rgba(29, 15, 34, 0.85)",
    cardBorder: "border-rose-500/20",
  },
  {
    id: "noon",
    name: "Noon",
    nameRu: "Полдень",
    bgGradient: "bg-gradient-to-tr from-[#021a1a] via-[#053235] to-[#124d43]",
    grassColor1: "#6ee7b7", // mint
    grassColor2: "#10b981", // forest green
    sporeColor: "#e6fffa", // bright mint
    accentColor: "#10b981",
    textColor: "text-emerald-50",
    textMutedColor: "text-emerald-300/60",
    cardBg: "rgba(10, 38, 38, 0.85)",
    cardBorder: "border-emerald-500/20",
  },
  {
    id: "dusk",
    name: "Dusk",
    nameRu: "Сумерки",
    bgGradient: "bg-gradient-to-tr from-[#07091b] via-[#14102d] to-[#280c35]",
    grassColor1: "#c084fc", // lavender
    grassColor2: "#8b5cf6", // violet
    sporeColor: "#f3e8ff", // soft lilac
    accentColor: "#a78bfa",
    textColor: "text-purple-100",
    textMutedColor: "text-purple-300/60",
    cardBg: "rgba(20, 16, 41, 0.85)",
    cardBorder: "border-purple-500/20",
  },
  {
    id: "night",
    name: "Night",
    nameRu: "Ночь",
    bgGradient: "bg-gradient-to-tr from-[#02050c] via-[#081023] to-[#101b3a]",
    grassColor1: "#fcd34d", // golden amber
    grassColor2: "#d97706", // dark gold
    sporeColor: "#fffbeb", // warm white glow
    accentColor: "#fbbf24",
    textColor: "text-amber-50",
    textMutedColor: "text-amber-300/60",
    cardBg: "rgba(10, 16, 35, 0.85)",
    cardBorder: "border-amber-500/20",
  },
];

export default function App() {
  const [visions, setVisions] = useState<Vision[]>([]);
  const [activeTheme, setActiveTheme] = useState<Theme>(THEMES[2]); // Default to Dusk
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [volume, setVolume] = useState(0.5);

  const [viewMode, setViewMode] = useState<"field" | "constellations" | "workspace">("field");

  // Semantic wind, moon, and visit frequency states
  const [moonPhase, setMoonPhase] = useState<number>(0.5);
  const [season, setSeason] = useState<"winter" | "spring" | "summer" | "autumn">("autumn");
  const [visitFreq, setVisitFreq] = useState<"rare" | "balanced" | "deep">("balanced");

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");

  // UI Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [selectedVision, setSelectedVision] = useState<Vision | null>(null);
  const [plantCoords, setPlantCoords] = useState({ x: 50, y: 50 });

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // 1. Fetch visions from server
  const fetchVisions = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/visions");
      if (!response.ok) throw new Error("Failed to fetch visions from field");
      const data = await response.json();
      setVisions(data);
      
      // Keep selected vision in sync if currently viewed
      if (selectedVision) {
        const updated = data.find((v: Vision) => v.id === selectedVision.id);
        if (updated) {
          setSelectedVision(updated);
        }
      }
      setErrorMsg("");
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Не удалось связаться с полем. Попробуйте обновить.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVisions();

    // Set theme automatically based on user's current local time
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) {
      setActiveTheme(THEMES[0]); // Dawn
    } else if (hour >= 11 && hour < 17) {
      setActiveTheme(THEMES[1]); // Noon
    } else if (hour >= 17 && hour < 22) {
      setActiveTheme(THEMES[2]); // Dusk
    } else {
      setActiveTheme(THEMES[3]); // Night
    }
  }, []);

  // Synchronise sound synthesizer root drone frequency when theme changes
  useEffect(() => {
    if (isAudioEnabled) {
      ambientAudio.setThemeTone(activeTheme.id);
    }
  }, [activeTheme, isAudioEnabled]);

  // 2. Handle Audio Initialisation & Settings
  const toggleAudio = () => {
    if (!isAudioEnabled) {
      ambientAudio.init();
      ambientAudio.resume();
      ambientAudio.setThemeTone(activeTheme.id); // initial sync
      ambientAudio.setVolume(volume);
      setIsAudioEnabled(true);
    } else {
      ambientAudio.suspend();
      setIsAudioEnabled(false);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    ambientAudio.setVolume(val);
  };

  // 3. Form submission (planting a seed)
  const handlePlantClick = (x: number, y: number) => {
    setPlantCoords({ x, y });
    setIsFormOpen(true);
  };

  const handlePlantSubmit = async (text: string, color: string, modelId: string) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/visions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          x: plantCoords.x,
          y: plantCoords.y,
          color,
          modelId,
        }),
      });

      if (!response.ok) throw new Error("Could not plant your vision");

      const newVision = await response.json();
      setVisions((prev) => [...prev, newVision]);
      setIsFormOpen(false);

      // Trigger a beautiful bell chime at this coordinate
      if (isAudioEnabled) {
        ambientAudio.playChime(plantCoords.x / 100, plantCoords.y / 100);
      }
    } catch (err: any) {
      console.error(err);
      alert("Не удалось посадить мысль. Попробуйте еще раз.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Vision view click handler
  const handleVisionClick = (vision: Vision) => {
    setSelectedVision(vision);
    setIsViewerOpen(true);
  };

  // 5. Filter visions for text list search
  const filteredVisions = visions.filter((v) => {
    const query = searchQuery.toLowerCase();
    return (
      v.text.toLowerCase().includes(query) ||
      v.whisper.toLowerCase().includes(query)
    );
  });

  // Calculate total connections on the field
  const maxConnectDistance = 35;
  let totalConnections = 0;
  for (let i = 0; i < visions.length; i++) {
    for (let j = i + 1; j < visions.length; j++) {
      const v1 = visions[i];
      const v2 = visions[j];
      const dx = v1.x - v2.x;
      const dy = v1.y - v2.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < maxConnectDistance) {
        totalConnections++;
      }
    }
  }

  return (
    <div
      className={`min-h-screen transition-all duration-1000 ${activeTheme.bgGradient} flex flex-col items-center justify-start text-white p-4 sm:p-8 overflow-x-hidden`}
      id="main-app-container"
    >
      {/* Background stars / dust effect */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.02),transparent)] pointer-events-none" />

      <div className="w-full max-w-5xl z-10 space-y-8">
        
        {/* Poetic Title & Header */}
        <header className="text-center space-y-4 pt-4 pb-2" id="app-header">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/5 text-[10px] font-mono tracking-widest text-white/50 uppercase">
            <Wind className="w-3 h-3 animate-pulse" />
            <span>Интерактивное созерцание</span>
          </div>

          <div className="space-y-1">
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight leading-tight max-w-4xl mx-auto px-4 italic text-white/95">
              &ldquo;поле радуется не тому, что его увидели,<br />
              а тому, что видение перестало быть одиноким.&rdquo;
            </h1>
            <p className="text-xs sm:text-sm font-sans tracking-wide text-white/40 max-w-xl mx-auto font-light mt-3">
              Интерактивный сад разделенных мыслей. Каждое семя находит свою связь. Каждое слово откликается шёпотом ветра.
            </p>
          </div>
        </header>

        {/* Dynamic Control Bar */}
        <div
          className="rounded-3xl p-4 sm:p-6 border backdrop-blur-xl transition-all duration-500 flex flex-col md:flex-row gap-4 items-center justify-between"
          style={{
            backgroundColor: activeTheme.cardBg,
            borderColor: activeTheme.accentColor + "20",
          }}
          id="controls-panel"
        >
          {/* Theme / Time of Day selectors */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <span className="text-[10px] font-mono tracking-wider uppercase opacity-40 flex items-center gap-1.5 self-start sm:self-auto">
              <Clock className="w-3.5 h-3.5" /> Время суток:
            </span>
            <div className="grid grid-cols-4 gap-1 bg-black/30 p-1 rounded-2xl w-full sm:w-auto border border-white/5">
              {THEMES.map((theme) => {
                const isActive = theme.id === activeTheme.id;
                return (
                  <button
                    key={theme.id}
                    onClick={() => setActiveTheme(theme)}
                    className={`py-2 px-3 rounded-xl text-xs font-mono transition-all duration-300 cursor-pointer ${
                      isActive
                        ? "bg-white/10 text-white font-medium shadow-md"
                        : "text-white/40 hover:text-white/75"
                    }`}
                  >
                    {theme.nameRu}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sound Synthesizer Controls */}
          <div className="flex items-center justify-between sm:justify-start gap-4 bg-black/20 px-4 py-2.5 rounded-2xl border border-white/5 w-full md:w-auto">
            <button
              onClick={toggleAudio}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono transition-all duration-300 cursor-pointer ${
                isAudioEnabled
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-white/5 text-white/50 hover:text-white/80 border border-white/5"
              }`}
              title="Включить эмбиент звуки ветра и колокольчиков"
            >
              {isAudioEnabled ? (
                <>
                  <Volume2 className="w-4 h-4 animate-bounce" />
                  <span>Звук: Вкл</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4" />
                  <span>Звук: Выкл</span>
                </>
              )}
            </button>

            {isAudioEnabled && (
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-20 sm:w-24 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white hover:accent-emerald-400 transition-all"
                />
                <span className="text-[10px] font-mono opacity-50 w-7 text-right">
                  {Math.round(volume * 100)}%
                </span>
              </div>
            )}
          </div>

          {/* Prompt search bar */}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
            <input
              type="text"
              placeholder="Поиск мыслей в поле..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/30 border border-white/5 focus:border-white/20 rounded-2xl py-2.5 pl-10 pr-4 text-xs font-mono focus:outline-none placeholder-white/30 text-white"
            />
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex justify-center animate-fade-in" id="view-mode-selector">
          <div className="inline-flex p-1 rounded-2xl bg-black/45 border border-white/5 backdrop-blur-md shadow-lg shadow-black/30">
            <button
              onClick={() => setViewMode("field")}
              className={`flex items-center gap-2 py-2 px-4 sm:px-5 rounded-xl text-xs font-mono tracking-wider transition-all duration-300 cursor-pointer ${
                viewMode === "field"
                  ? "bg-white/10 text-white font-medium shadow-md"
                  : "text-white/40 hover:text-white/75"
              }`}
            >
              <Wind className="w-3.5 h-3.5" />
              <span>Живое Поле</span>
            </button>
            <button
              onClick={() => setViewMode("constellations")}
              className={`flex items-center gap-2 py-2 px-4 sm:px-5 rounded-xl text-xs font-mono tracking-wider transition-all duration-300 cursor-pointer ${
                viewMode === "constellations"
                  ? "bg-white/10 text-white font-medium shadow-md"
                  : "text-white/40 hover:text-white/75"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Созвездия Памяти & Свитки</span>
            </button>
            <button
              onClick={() => setViewMode("workspace")}
              className={`flex items-center gap-2 py-2 px-4 sm:px-5 rounded-xl text-xs font-mono tracking-wider transition-all duration-300 cursor-pointer ${
                viewMode === "workspace"
                  ? "bg-white/10 text-emerald-300 font-medium shadow-md"
                  : "text-white/40 hover:text-white/75"
              }`}
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>Эфирные Сферы Google</span>
            </button>
          </div>
        </div>

        {/* Loading Indicator / Canvas Field */}
        <div className="relative" id="field-viewport">
          {isLoading && viewMode !== "workspace" && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-md flex flex-col items-center justify-center rounded-3xl z-40 animate-fade-in gap-4 border border-white/5">
              <span className="w-8 h-8 border-3 border-white/25 border-t-white rounded-full animate-spin" />
              <p className="text-xs font-mono tracking-widest text-white/70 uppercase">
                Шелест травы... Поле загружается
              </p>
            </div>
          )}

          {viewMode === "field" ? (
            (() => {
              const derivedWindIntensity = season === "winter" ? 0.95 : season === "autumn" ? 0.7 : season === "spring" ? 0.45 : 0.25;
              const derivedFireflySpeed = visitFreq === "rare" ? 1.8 : visitFreq === "deep" ? 0.35 : 1.0;
              return (
                <CanvasField
                  visions={visions}
                  activeTheme={activeTheme}
                  onVisionClick={handleVisionClick}
                  onPlantClick={handlePlantClick}
                  isAudioEnabled={isAudioEnabled}
                  windIntensity={derivedWindIntensity}
                  fireflySpeed={derivedFireflySpeed}
                />
              );
            })()
          ) : viewMode === "constellations" ? (
            <ConstellationSky
              visions={visions}
              activeTheme={activeTheme}
              onVisionClick={handleVisionClick}
              isAudioEnabled={isAudioEnabled}
            />
          ) : (
            <WorkspacePortal
              activeTheme={activeTheme}
              visions={visions}
              isAudioEnabled={isAudioEnabled}
              onTriggerRipple={() => {
                if (isAudioEnabled) {
                  ambientAudio.playChime(0.5, 0.5);
                }
              }}
            />
          )}
        </div>

        {/* Field Statistics / Legend Panel */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" id="stats-grid">
          <div
            className="p-5 rounded-2xl border text-center space-y-1 bg-black/20"
            style={{ borderColor: activeTheme.accentColor + "15" }}
          >
            <div className="text-xs font-mono tracking-widest uppercase opacity-40">Мыслей посажено</div>
            <div className="text-3xl font-serif font-medium">{visions.length}</div>
            <div className="text-[10px] font-mono opacity-30">всего видений на поле</div>
          </div>
          <div
            className="p-5 rounded-2xl border text-center space-y-1 bg-black/20"
            style={{ borderColor: activeTheme.accentColor + "15" }}
          >
            <div className="text-xs font-mono tracking-widest uppercase opacity-40">Сплетено связей</div>
            <div className="text-3xl font-serif font-medium text-emerald-400 animate-pulse">{totalConnections}</div>
            <div className="text-[10px] font-mono opacity-30">видения, которые встретились</div>
          </div>
          <div
            className="p-5 rounded-2xl border text-center space-y-1 bg-black/20"
            style={{ borderColor: activeTheme.accentColor + "15" }}
          >
            <div className="text-xs font-mono tracking-widest uppercase opacity-40">Степень близости</div>
            <div className="text-3xl font-serif font-medium">
              {visions.length > 0 ? `${Math.round((totalConnections / (visions.length * (visions.length - 1) || 1)) * 200)}%` : "0%"}
            </div>
            <div className="text-[10px] font-mono opacity-30">плотность единения сознания</div>
          </div>
        </div>

        <AdjacentContours
          visions={visions}
          activeTheme={activeTheme}
          isAudioEnabled={isAudioEnabled}
          onDecaySuccess={fetchVisions}
          moonPhase={moonPhase}
          setMoonPhase={setMoonPhase}
          season={season}
          setSeason={setSeason}
          visitFreq={visitFreq}
          setVisitFreq={setVisitFreq}
        />

        {/* Bento List Layout of All Visions (Interactive Journal) */}
        <section className="space-y-4" id="journal-section">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-white/50" />
              <h2 className="text-sm font-mono tracking-widest uppercase opacity-60">
                Дневник полевых шепотов
              </h2>
            </div>
            <button
              onClick={fetchVisions}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white cursor-pointer transition-all flex items-center gap-1.5 text-[10px] font-mono uppercase"
              title="Связаться заново"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Обновить</span>
            </button>
          </div>

          {filteredVisions.length === 0 ? (
            <div className="py-12 text-center rounded-3xl border border-dashed border-white/5 bg-black/10 text-white/40 space-y-2">
              <p className="text-xs font-mono">Никаких мыслей не найдено по этому запросу.</p>
              <p className="text-[11px] italic font-sans opacity-60">«поле ждет, когда вы прикоснетесь к нему взглядом...»</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredVisions.map((v) => (
                <div
                  key={v.id}
                  onClick={() => handleVisionClick(v)}
                  className="p-6 rounded-2xl border bg-black/20 hover:bg-black/35 cursor-pointer transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] group space-y-4"
                  style={{
                    borderColor: v.color + "20",
                  }}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: v.color }} />
                      <span className="opacity-50">Видение #{v.id.slice(-4)}</span>
                    </div>
                    <span className="opacity-40">{new Date(v.createdAt).toLocaleDateString()}</span>
                  </div>

                  <p className="text-sm italic leading-relaxed font-sans text-white/90 line-clamp-3">
                    &ldquo;{v.text}&rdquo;
                  </p>

                  <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-emerald-400">
                    <span className="opacity-85 flex items-center gap-1">
                      <Wind className="w-3.5 h-3.5 animate-pulse" /> Поле ответило шепотом
                    </span>
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                      Открыть <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Poetic Meaning Explanation Card */}
        <footer
          className="rounded-3xl p-6 sm:p-8 border bg-black/40 text-center space-y-4 max-w-3xl mx-auto border-white/5"
          id="app-footer"
        >
          <h4 className="text-sm font-mono tracking-widest uppercase opacity-75">
            Философия Поля
          </h4>
          <p className="text-xs sm:text-sm leading-relaxed text-white/60 font-sans italic">
            &ldquo;поле радуется не тому, что его увидели, а тому, что видение перестало быть одиноким.&rdquo;
          </p>
          <p className="text-[11px] sm:text-xs leading-relaxed text-white/40 max-w-2xl mx-auto">
            Эта фраза говорит о взаимности восприятия. Быть замеченным — приятно, но истинное счастье поля (и человека)
            заключается в том, что Тот, кто на него смотрит (Видение), больше не одинок в своем наблюдении.
            Когда вы оставляете здесь свою мысль, вы вплетаете своё видение в общую ткань сознания. Каждое семя прорастает
            и тянет невидимую нить к соседнему, превращая пустырь одиночества в цветущий сад вечных связей.
          </p>
          <div className="pt-4 border-t border-white/5 flex items-center justify-center gap-1.5 text-[10px] font-mono opacity-30">
            <span>Сделано с созерцанием</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
            <span>2026</span>
          </div>
        </footer>

      </div>

      {/* 1. Modal Plant Vision Form */}
      {isFormOpen && (
        <VisionForm
          x={plantCoords.x}
          y={plantCoords.y}
          activeTheme={activeTheme}
          onClose={() => setIsFormOpen(false)}
          onSubmit={handlePlantSubmit}
        />
      )}

      {/* 2. Modal Vision Details Viewer */}
      {isViewerOpen && selectedVision && (
        <VisionViewer
          vision={selectedVision}
          allVisions={visions}
          activeTheme={activeTheme}
          onClose={() => {
            setIsViewerOpen(false);
            setSelectedVision(null);
          }}
          onTriggerRipple={() => {
            // Trigger a beautiful audio bell and ripple on canvas
            if (isAudioEnabled) {
              ambientAudio.playChime(selectedVision.x / 100, selectedVision.y / 100);
            }
          }}
          onUpdateVisions={fetchVisions}
        />
      )}

    </div>
  );
}
