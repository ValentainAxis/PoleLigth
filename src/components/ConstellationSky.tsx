import React, { useEffect, useRef, useState } from "react";
import { Vision, Theme } from "../types";
import { ambientAudio } from "../utils/audio";
import { Sparkles, Compass, Eye, Disc, Play, Pause, ListMusic } from "lucide-react";

interface ConstellationSkyProps {
  visions: Vision[];
  activeTheme: Theme;
  onVisionClick: (v: Vision) => void;
  isAudioEnabled: boolean;
}

interface StarParticle {
  id: string;
  vision: Vision;
  // Layouts
  fieldX: number; // percentage (0..100)
  fieldY: number; // percentage (0..100)
  spiralX: number; // percentage (0..100)
  spiralY: number; // percentage (0..100)
  // Animation coordinates
  x: number; // current percentage (0..100)
  y: number; // current percentage (0..100)
  size: number;
  glowPhase: number;
  pulseSpeed: number;
  energy: number;
  angleFromCenter: number;
  radiusFromCenter: number;
  hasTriggeredInSweep: boolean;
  timbreFactor: number; // 0.0 for old (muffled/deep), 1.0 for new (crisp/crystal)
}

interface CosmicDust {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
}

interface CelestialRipple {
  x: number; // percentage (0..100)
  y: number; // percentage (0..100)
  radius: number;
  maxRadius: number;
  opacity: number;
  color: string;
}

interface Comet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  length: number;
  opacity: number;
  color: string;
  active: boolean;
}

export default function ConstellationSky({
  visions,
  activeTheme,
  onVisionClick,
  isAudioEnabled,
}: ConstellationSkyProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Layout setting: "field" (original positions) vs "spiral" (time chronos)
  const [layoutMode, setLayoutMode] = useState<"field" | "spiral">("spiral");
  // Sound scroll playing state
  const [isScrollPlaying, setIsScrollPlaying] = useState(true);

  // Local state reference to hold animation loop variables without triggering React re-renders
  const stateRef = useRef({
    time: 0,
    sweepAngle: 0,
    prevSweepAngle: 0,
    sweepSpeed: 0.004,
    hoveredStarId: null as string | null,
  });

  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const starsRef = useRef<StarParticle[]>([]);
  const dustRef = useRef<CosmicDust[]>([]);
  const ripplesRef = useRef<CelestialRipple[]>([]);
  const cometRef = useRef<Comet>({ x: 0, y: 0, vx: 0, vy: 0, length: 0, opacity: 0, color: "", active: false });

  // Handle container resizing
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({
          width: Math.max(width, 320),
          height: Math.max(height, 450),
        });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Recalculate and transition star positions when visions change or layoutMode changes
  useEffect(() => {
    const now = Date.now();
    const existingStarsMap = new Map<string, StarParticle>(starsRef.current.map((s) => [s.id, s]));

    const computedStars: StarParticle[] = visions.map((v) => {
      const existing = existingStarsMap.get(v.id);

      // Compute spiral coordinate based on creation time
      const ageMs = now - new Date(v.createdAt).getTime();
      const ageHours = ageMs / (1000 * 3600);

      // Spiral radius: older thoughts are closer to the center, newer at the periphery
      // Logarithmic compression so older memories cluster elegantly near the core
      const maxAgeHours = 72; // Normalize scale within 3 days
      const normAge = Math.min(1.0, ageHours / maxAgeHours);
      // radius percentage (12% to 45% from center)
      const radius = 12 + (1.0 - normAge) * 33; 

      // Spiral angle: offset by age to create a gorgeous galactic spiral arm
      const baseAngle = (v.x * 2.5) + (v.y * 1.5); // deterministic dispersion
      const spiralAngle = baseAngle + (1.0 - normAge) * Math.PI * 1.8;

      const spiralX = 50 + Math.cos(spiralAngle) * radius;
      const spiralY = 50 + Math.sin(spiralAngle) * radius;

      // Calculate relative angle from canvas center for the Chronos sweep
      const angleFromCenter = Math.atan2(spiralY - 50, spiralX - 50);

      return {
        id: v.id,
        vision: v,
        fieldX: v.x,
        fieldY: v.y,
        spiralX,
        spiralY,
        // If star existed, keep its current animation x/y to prevent jump cuts
        x: existing ? existing.x : v.x,
        y: existing ? existing.y : v.y,
        size: v.size * 0.55,
        glowPhase: existing ? existing.glowPhase : Math.random() * Math.PI * 2,
        pulseSpeed: 0.02 + Math.random() * 0.03,
        energy: existing ? existing.energy : 0,
        angleFromCenter,
        radiusFromCenter: radius,
        hasTriggeredInSweep: existing ? existing.hasTriggeredInSweep : false,
        timbreFactor: 1.0 - normAge, // newer is closer to 1.0, older is closer to 0.0
      };
    });

    starsRef.current = computedStars;

    // Generate Cosmic Dust (Stars in background)
    if (dustRef.current.length === 0) {
      const dust: CosmicDust[] = [];
      const colors = ["#a78bfa", "#f472b6", "#38bdf8", "#fbbf24", "#e2e8f0"];
      for (let i = 0; i < 60; i++) {
        dust.push({
          x: Math.random() * 100,
          y: Math.random() * 100,
          vx: (Math.random() * 2 - 1) * 0.005,
          vy: (Math.random() * 2 - 1) * 0.005,
          size: 0.4 + Math.random() * 1.2,
          opacity: 0.15 + Math.random() * 0.55,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }
      dustRef.current = dust;
    }
  }, [visions]);

  // Main animation canvas loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;

    const render = () => {
      stateRef.current.time += 1;
      const state = stateRef.current;
      const { width, height } = dimensions;

      // Clear with very dark space backing
      ctx.fillStyle = "#03040b";
      ctx.fillRect(0, 0, width, height);

      // Draw elegant nebulous background glow based on active theme
      const cx = width / 2;
      const cy = height / 2;
      const bgGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, Math.max(width, height) * 0.65);
      bgGrad.addColorStop(0, `${activeTheme.accentColor}12`);
      bgGrad.addColorStop(0.4, `${activeTheme.accentColor}04`);
      bgGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Draw faint coordinate grids or runic dials
      // Rotating Celestial Chronometer
      ctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
      ctx.lineWidth = 1.0;
      
      // Outer dial
      ctx.beginPath();
      ctx.arc(cx, cy, Math.min(width, height) * 0.46, 0, Math.PI * 2);
      ctx.stroke();

      // Concentric Chronos Rings representing time limits
      const rings = [
        { radius: 0.42, label: "СЕЙЧАС (NOW)", opacity: 0.04 },
        { radius: 0.30, label: "СЕГОДНЯ (TODAY)", opacity: 0.03 },
        { radius: 0.18, label: "НЕДЕЛЯ (PAST WEEK)", opacity: 0.02 },
        { radius: 0.08, label: "ИСТОК (ORIGIN)", opacity: 0.015 }
      ];

      rings.forEach((ring) => {
        ctx.strokeStyle = `rgba(255, 255, 255, ${ring.opacity})`;
        ctx.lineWidth = 0.8;
        ctx.setLineDash([4, 12]);
        ctx.beginPath();
        ctx.arc(cx, cy, Math.min(width, height) * ring.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]); // Reset

        // Render delicate labels along time rings
        ctx.fillStyle = `rgba(255, 255, 255, ${ring.opacity * 3})`;
        ctx.font = "8px 'JetBrains Mono', monospace";
        ctx.fillText(ring.label, cx + 15, cy - Math.min(width, height) * ring.radius + 3);
      });

      // Rotating tick marks
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(state.time * 0.0006);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.035)";
      ctx.beginPath();
      for (let i = 0; i < 36; i++) {
        const angle = (i / 36) * Math.PI * 2;
        const outerR = Math.min(width, height) * 0.46;
        const innerR = outerR - 6;
        ctx.moveTo(Math.cos(angle) * innerR, Math.sin(angle) * innerR);
        ctx.lineTo(Math.cos(angle) * outerR, Math.sin(angle) * outerR);
      }
      ctx.stroke();
      ctx.restore();

      // Update and Draw Cosmic Dust
      dustRef.current.forEach((d) => {
        d.x += d.vx;
        d.y += d.vy;
        if (d.x < 0 || d.x > 100) d.vx *= -1;
        if (d.y < 0 || d.y > 100) d.vy *= -1;

        const dx = (d.x / 100) * width;
        const dy = (d.y / 100) * height;

        ctx.fillStyle = d.color;
        ctx.globalAlpha = d.opacity * (0.35 + 0.65 * Math.sin(state.time * 0.02 + d.x));
        ctx.beginPath();
        ctx.arc(dx, dy, d.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0; // reset
      });

      // Update Chronos Sound Scroll Playback Head (Sweep line)
      if (isScrollPlaying) {
        state.prevSweepAngle = state.sweepAngle;
        
        // Dynamic angular velocity (omega): slow down when sweeping over dense star sectors
        const nearbyStarsCount = starsRef.current.filter((star) => {
          let starAngle = star.angleFromCenter;
          if (starAngle < 0) starAngle += Math.PI * 2;
          const diff = Math.abs(state.sweepAngle - starAngle);
          const wrappedDiff = Math.min(diff, Math.PI * 2 - diff);
          return wrappedDiff < 0.25; // 15 degrees sector range
        }).length;

        // Base speed is 0.004 radians per frame. We scale it down smoothly based on cluster density.
        const targetSpeed = Math.max(0.0007, 0.004 / (1.0 + nearbyStarsCount * 0.5));
        state.sweepSpeed += (targetSpeed - state.sweepSpeed) * 0.08; // smooth deceleration/acceleration
        
        state.sweepAngle = (state.sweepAngle + state.sweepSpeed) % (Math.PI * 2);
      }

      const sweepRad = Math.min(width, height) * 0.46;
      const sweepX = cx + Math.cos(state.sweepAngle) * sweepRad;
      const sweepY = cy + Math.sin(state.sweepAngle) * sweepRad;

      // Draw glowing sweeping clock hand
      if (layoutMode === "spiral") {
        const sweepGrad = ctx.createLinearGradient(cx, cy, sweepX, sweepY);
        sweepGrad.addColorStop(0, "rgba(255, 255, 255, 0.0)");
        sweepGrad.addColorStop(0.8, `${activeTheme.accentColor}08`);
        sweepGrad.addColorStop(1, `${activeTheme.accentColor}40`);

        ctx.strokeStyle = sweepGrad;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(sweepX, sweepY);
        ctx.stroke();

        // Draw outer locator cursor
        ctx.fillStyle = activeTheme.accentColor;
        ctx.shadowColor = activeTheme.accentColor;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(sweepX, sweepY, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Smoothly interpolate star positions towards their target layout
      starsRef.current.forEach((star) => {
        const targetX = layoutMode === "field" ? star.fieldX : star.spiralX;
        const targetY = layoutMode === "field" ? star.fieldY : star.spiralY;

        star.x += (targetX - star.x) * 0.08;
        star.y += (targetY - star.y) * 0.08;

        // Decay energy excitation smoothly
        star.energy *= 0.94;

        // Sound Scroll trigger detection
        if (layoutMode === "spiral" && isScrollPlaying) {
          // Normalize angle to 0..2PI
          let starAngle = star.angleFromCenter;
          if (starAngle < 0) starAngle += Math.PI * 2;

          // Check if sweep line crossed the star's angle
          let prev = state.prevSweepAngle;
          let curr = state.sweepAngle;
          let crossed = false;

          if (curr > prev) {
            crossed = starAngle >= prev && starAngle < curr;
          } else {
            // Crossed the zero boundary
            crossed = starAngle >= prev || starAngle < curr;
          }

          if (crossed) {
            if (!star.hasTriggeredInSweep) {
              star.energy = 1.8; // excite star!
              star.hasTriggeredInSweep = true;

              // Spawn physical chime resonance ripple
              ripplesRef.current.push({
                x: star.x,
                y: star.y,
                radius: 1,
                maxRadius: 80,
                opacity: 0.9,
                color: star.vision.color,
              });

              // Play arpeggiated interval based on coordinate position
              if (isAudioEnabled) {
                // Determine connection density for chord selection
                const connectionsCount = visions.filter((other) => {
                  if (other.id === star.id) return false;
                  const dx = other.x - star.vision.x;
                  const dy = other.y - star.vision.y;
                  return Math.sqrt(dx * dx + dy * dy) < 35;
                }).length;

                let chordType: "single" | "third" | "fifth" | "seventh" = "single";
                if (connectionsCount === 1) chordType = "third";
                else if (connectionsCount === 2) chordType = "fifth";
                else if (connectionsCount >= 3) chordType = "seventh";

                // Pass star's timbre factor (representing its age and depth) for sound shaping
                ambientAudio.playChime(star.x / 100, star.y / 100, chordType, star.timbreFactor);
              }
            }
          } else {
            // Reset trigger when sweep line has moved far enough away
            const diff = Math.abs(curr - starAngle);
            const wrappedDiff = Math.min(diff, Math.PI * 2 - diff);
            if (wrappedDiff > 0.4) {
              star.hasTriggeredInSweep = false;
            }
          }
        }
      });

      // Precompute star pixel coordinates for connection drawing
      const starCoords = starsRef.current.map((s) => ({
        id: s.id,
        px: (s.x / 100) * width,
        py: (s.y / 100) * height,
        color: s.vision.color,
        text: s.vision.text,
      }));

      // Draw Constellation Threads (Lines connecting close thoughts)
      ctx.lineWidth = 0.9;
      const maxConnectDist = 35; // % coordinates

      const clusters: Array<Set<string>> = [];

      for (let i = 0; i < starsRef.current.length; i++) {
        const s1 = starsRef.current[i];
        for (let j = i + 1; j < starsRef.current.length; j++) {
          const s2 = starsRef.current[j];

          const dx = s1.x - s2.x;
          const dy = s1.y - s2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxConnectDist) {
            // Draw celestial thread
            const c1 = starCoords[i];
            const c2 = starCoords[j];

            const opacity = (1 - dist / maxConnectDist) * 0.45;
            const grad = ctx.createLinearGradient(c1.px, c1.py, c2.px, c2.py);
            grad.addColorStop(0, `${c1.color}${Math.floor(opacity * 255).toString(16).padStart(2, "0")}`);
            grad.addColorStop(1, `${c2.color}${Math.floor(opacity * 255).toString(16).padStart(2, "0")}`);

            ctx.strokeStyle = grad;
            ctx.setLineDash([2, 5]); // Delicate starry thread appearance
            ctx.beginPath();
            ctx.moveTo(c1.px, c1.py);
            ctx.lineTo(c2.px, c2.py);
            ctx.stroke();
            ctx.setLineDash([]); // Reset

            // Group into clusters to identify constellations
            let putInCluster = false;
            for (let c of clusters) {
              if (c.has(s1.id) || c.has(s2.id)) {
                c.add(s1.id);
                c.add(s2.id);
                putInCluster = true;
                break;
              }
            }
            if (!putInCluster) {
              const newCluster = new Set<string>();
              newCluster.add(s1.id);
              newCluster.add(s2.id);
              clusters.push(newCluster);
            }
          }
        }
      }

      // Draw Constellation Cluster Boundaries and Poetic Labeled Centers
      const clusterNames = [
        "Созвездие Тепла", "Созвездие Разделенного Шепота", "Созвездие Тихой Зари",
        "Созвездие Надежды", "Созвездие Мечтателей", "Созвездие Хранителей", "Созвездие Искр"
      ];

      clusters.forEach((cluster, idx) => {
        // Find center of mass of this cluster
        let sumX = 0;
        let sumY = 0;
        let starCount = 0;
        let clusterColor = "#ffffff";

        starsRef.current.forEach((s) => {
          if (cluster.has(s.id)) {
            sumX += s.x;
            sumY += s.y;
            starCount++;
            clusterColor = s.vision.color;
          }
        });

        if (starCount >= 2) {
          const cxPercent = sumX / starCount;
          const cyPercent = sumY / starCount;
          const cpx = (cxPercent / 100) * width;
          const cpy = (cyPercent / 100) * height;

          // Poetic constellation label
          const name = clusterNames[idx % clusterNames.length];
          ctx.fillStyle = `${clusterColor}55`;
          ctx.font = "italic 9px 'Playfair Display', serif";
          ctx.textAlign = "center";
          ctx.fillText(`• ${name} (${starCount} звёзд) •`, cpx, cpy - 14);

          // Draw a very faint boundary polygon or connection backing
          ctx.strokeStyle = `${clusterColor}15`;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          starsRef.current.forEach((s) => {
            if (cluster.has(s.id)) {
              const px = (s.x / 100) * width;
              const py = (s.y / 100) * height;
              ctx.lineTo(px, py);
            }
          });
          ctx.closePath();
          ctx.stroke();
        }
      });

      // Update and Draw Celestial Ripples (Echoes)
      ripplesRef.current.forEach((r, idx) => {
        r.radius += 1.2;
        r.opacity *= 0.97;

        if (r.opacity < 0.01) {
          ripplesRef.current.splice(idx, 1);
          return;
        }

        const rx = (r.x / 100) * width;
        const ry = (r.y / 100) * height;

        ctx.strokeStyle = r.color;
        ctx.globalAlpha = r.opacity;
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.arc(rx, ry, r.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1.0; // Reset
      });

      // Update and Draw rare shooting stars/comets (Ночные вспышки)
      if (!cometRef.current.active && Math.random() < 0.003) {
        // Initialize a shooting star
        cometRef.current = {
          x: Math.random() * 40 + 10,
          y: Math.random() * 20 + 5,
          vx: 1.5 + Math.random() * 2.0,
          vy: 0.8 + Math.random() * 1.2,
          length: 40 + Math.random() * 50,
          opacity: 1.0,
          color: ["#ffffff", "#38bdf8", "#fcd34d", "#a78bfa"][Math.floor(Math.random() * 4)],
          active: true,
        };
      }

      const comet = cometRef.current;
      if (comet.active) {
        comet.x += comet.vx;
        comet.y += comet.vy;
        comet.opacity *= 0.985;

        if (comet.opacity < 0.02 || comet.x > 110 || comet.y > 110) {
          comet.active = false;
        } else {
          // Draw comet with a fading path
          const cpx = (comet.x / 100) * width;
          const cpy = (comet.y / 100) * height;
          const tailX = cpx - (comet.vx * comet.length * 0.15);
          const tailY = cpy - (comet.vy * comet.length * 0.15);

          const grad = ctx.createLinearGradient(cpx, cpy, tailX, tailY);
          grad.addColorStop(0, `rgba(255,255,255,${comet.opacity})`);
          grad.addColorStop(0.3, `${comet.color}${Math.floor(comet.opacity * 160).toString(16).padStart(2, "0")}`);
          grad.addColorStop(1, "rgba(0,0,0,0)");

          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(cpx, cpy);
          ctx.lineTo(tailX, tailY);
          ctx.stroke();

          // Shooting star head glow
          ctx.fillStyle = "#ffffff";
          ctx.shadowColor = comet.color;
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(cpx, cpy, 1.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      // Draw Star Nodes (Memory Points)
      starsRef.current.forEach((star) => {
        const px = (star.x / 100) * width;
        const py = (star.y / 100) * height;

        const isHovered = state.hoveredStarId === star.id;
        const scale = (isHovered ? 1.6 : 1.0) + star.energy * 0.7;

        // Fluctuating twinkling intensity
        const twinkle = 0.6 + 0.4 * Math.sin(state.time * star.pulseSpeed + star.glowPhase);
        const finalSize = star.size * scale * twinkle;

        // 1. Draw delicate radial glow halos
        const haloRad = finalSize * (4.5 + star.energy * 3);
        const grad = ctx.createRadialGradient(px, py, 1, px, py, haloRad > 1 ? haloRad : 1);
        grad.addColorStop(0, `${star.vision.color}${Math.floor((0.7 + star.energy * 0.3) * 200).toString(16).padStart(2, "0")}`);
        grad.addColorStop(0.4, `${star.vision.color}20`);
        grad.addColorStop(1, "rgba(0,0,0,0)");

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, haloRad > 1 ? haloRad : 1, 0, Math.PI * 2);
        ctx.fill();

        // 2. Sparkle spikes (for active/excited stars or hovered ones)
        if (isHovered || star.energy > 0.4) {
          ctx.strokeStyle = `${star.vision.color}aa`;
          ctx.lineWidth = 0.8;
          const spikeLen = finalSize * (3.0 + star.energy * 2);
          ctx.beginPath();
          // Horizontal spike
          ctx.moveTo(px - spikeLen, py);
          ctx.lineTo(px + spikeLen, py);
          // Vertical spike
          ctx.moveTo(px, py - spikeLen);
          ctx.lineTo(px, py + spikeLen);
          ctx.stroke();
        }

        // 3. Central hot star nucleus
        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = star.vision.color;
        ctx.shadowBlur = (isHovered ? 14 : 6) + star.energy * 12;
        ctx.beginPath();
        ctx.arc(px, py, finalSize > 0.8 ? finalSize : 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; // reset

        // Label for hovered nodes
        if (isHovered) {
          ctx.fillStyle = "#ffffff";
          ctx.font = "10px 'JetBrains Mono', monospace";
          ctx.textAlign = "center";
          // Poetic text snippet preview
          const snippet = star.vision.text.length > 25 ? star.vision.text.slice(0, 25) + "..." : star.vision.text;
          ctx.fillText(`“${snippet}”`, px, py - 18);
        }
      });

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationId);
  }, [dimensions, activeTheme, layoutMode, isScrollPlaying, isAudioEnabled]);

  // Handle Canvas Mouse Move to track hovering
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const { width, height } = dimensions;

    let foundStarId: string | null = null;
    starsRef.current.forEach((star) => {
      const px = (star.x / 100) * width;
      const py = (star.y / 100) * height;

      const dx = mx - px;
      const dy = my - py;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // 14px hover radius
      if (dist < 14) {
        foundStarId = star.id;
      }
    });

    stateRef.current.hoveredStarId = foundStarId;
  };

  // Handle Canvas Click to open a memory details modal or strike it
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const { width, height } = dimensions;

    let clickedStar: StarParticle | null = null;
    starsRef.current.forEach((star) => {
      const px = (star.x / 100) * width;
      const py = (star.y / 100) * height;

      const dx = mx - px;
      const dy = my - py;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 16) {
        clickedStar = star;
      }
    });

    if (clickedStar) {
      // Excite and open modal
      const star = clickedStar as StarParticle;
      star.energy = 2.0;

      ripplesRef.current.push({
        x: star.x,
        y: star.y,
        radius: 1,
        maxRadius: 100,
        opacity: 1.0,
        color: star.vision.color,
      });

      if (isAudioEnabled) {
        ambientAudio.playChime(star.x / 100, star.y / 100, "seventh", star.timbreFactor);
      }

      setTimeout(() => {
        onVisionClick(star.vision);
      }, 200);
    } else {
      // Create a gorgeous ambient ripple in the cosmic void
      const clickXPercent = (mx / width) * 100;
      const clickYPercent = (my / height) * 100;

      ripplesRef.current.push({
        x: clickXPercent,
        y: clickYPercent,
        radius: 1,
        maxRadius: 60,
        opacity: 0.6,
        color: activeTheme.accentColor,
      });

      if (isAudioEnabled) {
        ambientAudio.playChime(clickXPercent / 100, clickYPercent / 100, "fifth");
      }
    }
  };

  return (
    <div className="w-full space-y-4" id="constellation-sky-container">
      {/* Visual Header / Mode Selector */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-black/35 p-4 rounded-2xl border border-white/5 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-wider font-mono">НЕБО СВЯЗАННЫХ СОЗВЕЗДИЙ</h3>
            <p className="text-[10px] text-white/40 font-mono">Проекция воспоминаний в вечную звездную спираль времени</p>
          </div>
        </div>

        {/* Layout Mode Toggles */}
        <div className="flex items-center gap-2 bg-black/40 p-1 rounded-xl border border-white/5">
          <button
            onClick={() => setLayoutMode("field")}
            className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-mono transition-all duration-300 cursor-pointer ${
              layoutMode === "field"
                ? "bg-white/10 text-white font-medium"
                : "text-white/40 hover:text-white/80"
            }`}
            title="Отобразить в точности по координатам исходного поля"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>План Поля</span>
          </button>
          <button
            onClick={() => setLayoutMode("spiral")}
            className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-mono transition-all duration-300 cursor-pointer ${
              layoutMode === "spiral"
                ? "bg-white/10 text-white font-medium shadow"
                : "text-white/40 hover:text-white/80"
            }`}
            title="Свернуть мысли в спираль галактики по дате их прорастания"
          >
            <Disc className="w-3.5 h-3.5" />
            <span>Спираль Времени</span>
          </button>
        </div>
      </div>

      {/* Primary Canvas Window */}
      <div
        ref={containerRef}
        className="relative w-full rounded-3xl border overflow-hidden shadow-2xl transition-all duration-500 bg-black"
        style={{ borderColor: activeTheme.accentColor + "20" }}
        id="celestial-canvas-wrapper"
      >
        <canvas
          ref={canvasRef}
          width={dimensions.width}
          height={dimensions.height}
          onMouseMove={handleMouseMove}
          onClick={handleCanvasClick}
          className="block w-full cursor-crosshair"
        />

        {/* Floating Audio Playback Controls for Sound Scroll */}
        {layoutMode === "spiral" && (
          <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/10 shadow-lg">
            <button
              onClick={() => setIsScrollPlaying(!isScrollPlaying)}
              className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-all cursor-pointer"
              title={isScrollPlaying ? "Остановить считывание свитка" : "Запустить считывание свитка"}
            >
              {isScrollPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
            <div className="flex flex-col">
              <span className="text-[9px] font-mono tracking-widest text-emerald-400 uppercase font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                ЗВУКОВОЙ СВИТОК АКТИВЕН
              </span>
              <span className="text-[8px] font-mono text-white/40">Касание стрелы времени звучит аккордом</span>
            </div>
          </div>
        )}

        {/* Instructive Overlay */}
        <div className="absolute top-4 right-4 z-20 pointer-events-none flex items-center gap-2 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white/5 text-[9px] font-mono text-white/50">
          <Eye className="w-3.5 h-3.5" />
          <span>Нажмите на звезду, чтобы коснуться воспоминания</span>
        </div>
      </div>
    </div>
  );
}
