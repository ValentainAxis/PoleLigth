import React, { useEffect, useRef, useState } from "react";
import { Vision, Theme } from "../types";
import { ambientAudio } from "../utils/audio";

interface CanvasFieldProps {
  visions: Vision[];
  activeTheme: Theme;
  onVisionClick: (vision: Vision) => void;
  onPlantClick: (x: number, y: number) => void;
  isAudioEnabled: boolean;
}

interface Spore {
  x: number;
  y: number;
  size: number;
  speed: number;
  swayFreq: number;
  swayAmp: number;
  phase: number;
}

interface GrassBlade {
  xPercent: number; // store as % to be responsive
  heightPercent: number; // store as % to be responsive
  baseWidth: number;
  color: string;
  angle: number;
  targetAngle: number;
  flex: number;
  phase: number;
}

interface Firefly {
  x: number; // percentage (0..100)
  y: number; // percentage (0..100)
  vx: number;
  vy: number;
  size: number;
  color: string;
  phase: number;
  pulseSpeed: number;
  burstTimer: number;
}

export default function CanvasField({
  visions,
  activeTheme,
  onVisionClick,
  onPlantClick,
  isAudioEnabled,
}: CanvasFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [hoveredVision, setHoveredVision] = useState<Vision | null>(null);
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });
  const [isHoveringCanvas, setIsHoveringCanvas] = useState(false);

  // Refs to store animation values and prevent stale react closures
  const stateRef = useRef({
    time: 0,
    mouse: { x: -1000, y: -1000 },
    lastChimeTime: 0,
    windIntensity: 0.5,
    targetWindIntensity: 0.5,
    ripples: [] as Array<{ x: number; y: number; radius: number; maxRadius: number; speed: number; opacity: number }>,
  });

  const sporesRef = useRef<Spore[]>([]);
  const grassRef = useRef<GrassBlade[]>([]);
  const firefliesRef = useRef<Firefly[]>([]);
  const visionsEnergyRef = useRef<Record<string, number>>({});

  // 1. Manage resizing responsively
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        // Keep dimensions scaled
        setDimensions({ width, height: Math.max(height, 450) });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // 2. Initialize Grass Blades, Spores and Fireflies
  useEffect(() => {
    // Generate grass blades
    const numBlades = 120;
    const blades: GrassBlade[] = [];
    for (let i = 0; i < numBlades; i++) {
      // Pick color mix based on theme
      const colorRatio = Math.random();
      const color = colorRatio > 0.5 ? activeTheme.grassColor1 : activeTheme.grassColor2;
      blades.push({
        xPercent: (i / numBlades) * 100 + (Math.random() * 2 - 1),
        heightPercent: 20 + Math.random() * 25, // grass heights
        baseWidth: 2 + Math.random() * 3,
        color,
        angle: 0,
        targetAngle: 0,
        flex: 0.15 + Math.random() * 0.15,
        phase: Math.random() * Math.PI * 2,
      });
    }
    grassRef.current = blades;

    // Generate spores
    const numSpores = 40;
    const spores: Spore[] = [];
    for (let i = 0; i < numSpores; i++) {
      spores.push({
        x: Math.random() * 100, // percentage x
        y: Math.random() * 100, // percentage y
        size: 1.5 + Math.random() * 3,
        speed: 0.2 + Math.random() * 0.4,
        swayFreq: 0.01 + Math.random() * 0.02,
        swayAmp: 0.2 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
      });
    }
    sporesRef.current = spores;

    // Generate fireflies (Светляки)
    const numFireflies = 10;
    const fireflies: Firefly[] = [];
    const colors = ["#f59e0b", "#10b981", "#fbbf24", "#38bdf8", "#c084fc"];
    for (let i = 0; i < numFireflies; i++) {
      fireflies.push({
        x: Math.random() * 90 + 5,
        y: Math.random() * 80 + 10,
        vx: (Math.random() * 2 - 1) * 0.1,
        vy: (Math.random() * 2 - 1) * 0.1,
        size: 1.5 + Math.random() * 1.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        phase: Math.random() * Math.PI * 2,
        pulseSpeed: 0.015 + Math.random() * 0.025,
        burstTimer: 0,
      });
    }
    firefliesRef.current = fireflies;
  }, [activeTheme]);

  // 3. Main Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const state = stateRef.current;
      state.time += 1;
      
      // Decay firefly collision energy transfer on each frame
      Object.keys(visionsEnergyRef.current).forEach((key) => {
        visionsEnergyRef.current[key] *= 0.95;
        if (visionsEnergyRef.current[key] < 0.005) {
          delete visionsEnergyRef.current[key];
        }
      });

      const width = dimensions.width;
      const height = dimensions.height;

      // Clear with background color gradient (drawn via React but we draw transparent overlay here for crispness)
      ctx.clearRect(0, 0, width, height);

      // Smoothly interpolate wind intensity over time
      if (state.time % 240 === 0) {
        state.targetWindIntensity = 0.2 + Math.random() * 0.8;
      }
      state.windIntensity += (state.targetWindIntensity - state.windIntensity) * 0.01;
      if (isAudioEnabled) {
        ambientAudio.setWindIntensity(state.windIntensity);
      }

      // Precompute connection counts for each vision to gauge local semantic tension
      const maxDistPercent = 35;
      const connectionCounts = visions.map((v) => {
        return visions.filter((other) => {
          if (other.id === v.id) return false;
          const dx = other.x - v.x;
          const dy = other.y - v.y;
          return Math.sqrt(dx * dx + dy * dy) < maxDistPercent;
        }).length;
      });

      const bloomCenters: { x: number; y: number; weight: number }[] = [];

      // 3.1 Draw connections between close visions (Visions that found each other)
      ctx.lineWidth = 1.5;

      for (let i = 0; i < visions.length; i++) {
        for (let j = i + 1; j < visions.length; j++) {
          const v1 = visions[i];
          const v2 = visions[j];

          const dx = v1.x - v2.x;
          const dy = v1.y - v2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDistPercent) {
            const midXPercent = (v1.x + v2.x) / 2;
            const midYPercent = ((v1.y + v2.y) / 2) - ((30 * (1 - dist / maxDistPercent)) / (height || 1) * 100);
            bloomCenters.push({ x: midXPercent, y: midYPercent, weight: 1 - dist / maxDistPercent });

            const opacity = (1 - dist / maxDistPercent) * 0.35;
            const p1x = (v1.x / 100) * width;
            const p1y = (v1.y / 100) * height;
            const p2x = (v2.x / 100) * width;
            const p2y = (v2.y / 100) * height;

            // Gradient line
            const grad = ctx.createLinearGradient(p1x, p1y, p2x, p2y);
            grad.addColorStop(0, `${v1.color}40`);
            grad.addColorStop(0.5, `${activeTheme.accentColor}70`);
            grad.addColorStop(1, `${v2.color}40`);

            ctx.strokeStyle = grad;
            ctx.beginPath();
            // Draw slightly curved bezier rather than rigid straight line
            const midX = (p1x + p2x) / 2;
            const midY = (p1y + p2y) / 2 - (30 * (1 - dist / maxDistPercent));
            ctx.moveTo(p1x, p1y);
            ctx.quadraticCurveTo(midX, midY, p2x, p2y);
            ctx.stroke();

            // Draw a tiny traveling "seeing seed" along the line to show flow of connection
            const travelProgress = (state.time * 0.003 + (v1.x * v2.y)) % 1;
            const t = travelProgress;
            // Bezier formula
            const pulseX = (1 - t) * (1 - t) * p1x + 2 * (1 - t) * t * midX + t * t * p2x;
            const pulseY = (1 - t) * (1 - t) * p1y + 2 * (1 - t) * t * midY + t * t * p2y;

            ctx.fillStyle = activeTheme.sporeColor;
            ctx.shadowColor = activeTheme.accentColor;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(pulseX, pulseY, 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0; // reset

            // NEW: Gorgeous blooming midpoint flower!
            const bloomFactor = 0.65 + 0.35 * Math.sin(state.time * 0.035 + (v1.x * v2.y));
            const numPetals = 6;
            const petalMaxRadius = 13 * (1 - dist / maxDistPercent); // larger if closer connected

            ctx.shadowColor = v1.color;
            ctx.shadowBlur = 8 * bloomFactor;
            for (let k = 0; k < numPetals; k++) {
              const petalAngle = (k / numPetals) * Math.PI * 2 + (state.time * 0.007);
              const radius = petalMaxRadius * bloomFactor;

              const petalX = midX + Math.cos(petalAngle) * radius;
              const petalY = midY + Math.sin(petalAngle) * radius;

              // Bezier petal curves
              const cp1x = midX + Math.cos(petalAngle - 0.5) * radius * 0.6;
              const cp1y = midY + Math.sin(petalAngle - 0.5) * radius * 0.6;
              const cp2x = midX + Math.cos(petalAngle + 0.5) * radius * 0.6;
              const cp2y = midY + Math.sin(petalAngle + 0.5) * radius * 0.6;

              ctx.fillStyle = k % 2 === 0 ? `${v1.color}c0` : `${v2.color}c0`;
              ctx.beginPath();
              ctx.moveTo(midX, midY);
              ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, petalX, petalY);
              ctx.closePath();
              ctx.fill();
            }
            ctx.shadowBlur = 0;

            // Glowing central node
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(midX, midY, 2.2 * bloomFactor, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // 3.2 Update and draw ripples
      state.ripples.forEach((ripple, rIdx) => {
        ripple.radius += ripple.speed;
        ripple.opacity = Math.max(0, 1 - ripple.radius / ripple.maxRadius);

        ctx.strokeStyle = `${activeTheme.accentColor}${Math.floor(ripple.opacity * 255).toString(16).padStart(2, "0")}`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
        ctx.stroke();

        // Remove old ripples
        if (ripple.opacity <= 0) {
          state.ripples.splice(rIdx, 1);
        }
      });

      // 3.3 Draw spores floating upwards
      sporesRef.current.forEach((spore) => {
        // Move upward
        spore.y -= spore.speed;
        // Sway sideways
        spore.phase += spore.swayFreq;
        const currentXPercent = spore.x + Math.sin(spore.phase) * spore.swayAmp + (state.windIntensity * 0.5);

        // Convert % to pixels
        const spX = (currentXPercent / 100) * width;
        const spY = (spore.y / 100) * height;

        // Reset if goes off top or sides
        if (spore.y < -5) {
          spore.y = 105;
          spore.x = Math.random() * 100;
        }

        ctx.fillStyle = activeTheme.sporeColor;
        ctx.shadowColor = activeTheme.accentColor;
        ctx.shadowBlur = 4;
        ctx.globalAlpha = 0.5 + Math.sin(state.time * 0.05 + spore.phase) * 0.2;
        ctx.beginPath();
        ctx.arc(spX, spY, spore.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
        ctx.shadowBlur = 0;
      });

      // 3.4 Draw Grass blades
      const windSpeed = state.time * 0.02 * (1 + state.windIntensity);
      
      grassRef.current.forEach((blade) => {
        const bX = (blade.xPercent / 100) * width;
        const bHeight = (blade.heightPercent / 100) * height;

        // Base wave formula
        const windSway = Math.sin(windSpeed + blade.phase) * 0.15 * state.windIntensity;
        
        // Calculate mouse interaction
        let mouseForce = 0;
        const dx = bX - state.mouse.x;
        // only interact if mouse is on canvas and near the blade height range
        if (state.mouse.x > -500) {
          const mouseRadius = 150;
          const distToMouse = Math.abs(dx);
          if (distToMouse < mouseRadius) {
            // Push direction: mouse on left -> push right (+)
            const direction = dx > 0 ? 1 : -1;
            const forceRatio = 1 - distToMouse / mouseRadius; // 0..1
            mouseForce = direction * forceRatio * 0.45;

            // Trigger chime if crossing significantly
            if (
              isAudioEnabled &&
              forceRatio > 0.6 &&
              Math.random() < 0.015 && // sparse, contemplative bells
              Date.now() - state.lastChimeTime > 250
            ) {
              state.lastChimeTime = Date.now();
              ambientAudio.playChime(bX / width, state.mouse.y / height);
            }
          }
        }

        // NEW: Math calculation of semantic field tension (Deflection toward strong clusters & swirl)
        let semanticForce = 0;
        visions.forEach((v, vIdx) => {
          const sDx = v.x - blade.xPercent; // horizontal delta in %
          const sDy = v.y - 100;           // vertical delta in % (grass base is y=100)
          const distPercent = Math.sqrt(sDx * sDx + sDy * sDy);

          // Force decays with square of distance
          const localConnections = connectionCounts[vIdx] || 0;
          const strength = 1.0 + localConnections * 2.5;

          const pull = (sDx / (distPercent * distPercent + 25)) * strength * 0.14;

          // Rotational swirl/curl effect around connected nodes
          let swirl = 0;
          if (localConnections > 0 && distPercent < 28) {
            const direction = sDx > 0 ? 1 : -1;
            swirl = direction * (1.0 - distPercent / 28) * (localConnections * 0.08);
          }

          semanticForce += pull + swirl;
        });

        // Clamp the force to keep physics smooth and natural
        const finalSemanticForce = Math.max(-0.8, Math.min(0.8, semanticForce));

        // Interpolate current blade angle to targets (wind + mouse + semantic tension)
        blade.targetAngle = windSway + mouseForce + finalSemanticForce;
        blade.angle += (blade.targetAngle - blade.angle) * 0.1;

        // Draw blade curve
        const tipX = bX + Math.sin(blade.angle) * bHeight;
        const tipY = height - Math.cos(blade.angle) * bHeight;

        ctx.strokeStyle = blade.color;
        ctx.lineWidth = blade.baseWidth;
        ctx.lineCap = "round";

        ctx.beginPath();
        ctx.moveTo(bX, height);
        // Quadratic curve from ground, using middle control point
        const ctrlX = bX + Math.sin(blade.angle * 0.5) * (bHeight * 0.5);
        const ctrlY = height - (bHeight * 0.5);
        ctx.quadraticCurveTo(ctrlX, ctrlY, tipX, tipY);
        ctx.stroke();
      });

      // 3.4.1 Update and Draw Fireflies (Светляки & Вспышки)
      firefliesRef.current.forEach((ff) => {
        // Brown-like organic wandering
        ff.vx += (Math.random() * 2 - 1) * 0.02;
        ff.vy += (Math.random() * 2 - 1) * 0.02;

        // NEW: Pull towards blooming flowers at connection midpoints
        if (bloomCenters.length > 0) {
          let nearestBloom = bloomCenters[0];
          let minDist = 999999;
          
          bloomCenters.forEach((bloom) => {
            const dx = bloom.x - ff.x;
            const dy = bloom.y - ff.y;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d < minDist) {
              minDist = d;
              nearestBloom = bloom;
            }
          });

          // Gravitate towards nearest bloom center if within attraction range (e.g., 40 percentage units)
          if (minDist < 40 && minDist > 0.5) {
            const pullStrength = (1.0 - minDist / 40) * nearestBloom.weight * 0.016;
            ff.vx += ((nearestBloom.x - ff.x) / minDist) * pullStrength;
            ff.vy += ((nearestBloom.y - ff.y) / minDist) * pullStrength;
          }
        }

        // Cap speed
        const speed = Math.sqrt(ff.vx * ff.vx + ff.vy * ff.vy);
        if (speed > 0.35) {
          ff.vx = (ff.vx / speed) * 0.35;
          ff.vy = (ff.vy / speed) * 0.35;
        }

        ff.x += ff.vx;
        ff.y += ff.vy;

        // Keep inside canvas frame gracefully
        if (ff.x < 5 || ff.x > 95) ff.vx *= -1;
        if (ff.y < 8 || ff.y > 88) ff.vy *= -1;
        ff.x = Math.max(5, Math.min(95, ff.x));
        ff.y = Math.max(8, Math.min(88, ff.y));

        // Collision detection with vision nodes (mental thoughts)
        visions.forEach((v) => {
          const dx = ff.x - v.x;
          const dy = ff.y - v.y;
          const distPercent = Math.sqrt(dx * dx + dy * dy);

          // If extremely close (collision distance), bounce off and transfer energy
          if (distPercent < 4.0) {
            const currentEnergy = visionsEnergyRef.current[v.id] || 0;
            // Only trigger if not already overly saturated to avoid multiple triggers on the same pass
            if (currentEnergy < 1.0) {
              visionsEnergyRef.current[v.id] = currentEnergy + 1.2;

              // Physical reaction: bounce away
              const angle = Math.atan2(dy, dx);
              const pushForce = 0.35;
              ff.vx = Math.cos(angle) * pushForce + (Math.random() * 2 - 1) * 0.05;
              ff.vy = Math.sin(angle) * pushForce + (Math.random() * 2 - 1) * 0.05;

              // Flash/burst on collision
              ff.burstTimer = 25;

              // Soft audio feedback (sparkle on collision)
              if (isAudioEnabled) {
                ambientAudio.playChime(v.x / 100, (v.y / 100) * 0.45, "single");
              }
            }
          }
        });

        // Rare bright light flash triggers (night bursts)
        if (ff.burstTimer > 0) {
          ff.burstTimer--;
        } else if (Math.random() < 0.0012) {
          ff.burstTimer = 35 + Math.floor(Math.random() * 25);
        }

        // Calculate pulsing visibility
        let intensity = 0.25 + 0.75 * Math.max(0, Math.sin(state.time * ff.pulseSpeed + ff.phase));
        if (ff.burstTimer > 0) {
          const progress = ff.burstTimer / 60; // decaying
          intensity = 1.0 + Math.sin(progress * Math.PI) * 3.8;
        }

        const fx = (ff.x / 100) * width;
        const fy = (ff.y / 100) * height;

        // Glow ring
        const glowRad = ff.size * 6.5 * intensity;
        const grad = ctx.createRadialGradient(fx, fy, 0.5, fx, fy, glowRad > 1 ? glowRad : 1);
        grad.addColorStop(0, `${ff.color}${Math.floor(Math.min(1.0, intensity) * 210).toString(16).padStart(2, "0")}`);
        grad.addColorStop(0.4, `${ff.color}25`);
        grad.addColorStop(1, "rgba(0,0,0,0)");

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(fx, fy, glowRad > 1 ? glowRad : 1, 0, Math.PI * 2);
        ctx.fill();

        // White nucleus core
        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = ff.color;
        ctx.shadowBlur = ff.burstTimer > 0 ? 14 : 4;
        ctx.beginPath();
        ctx.arc(fx, fy, ff.size * (ff.burstTimer > 0 ? 1.5 : 1.0), 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; // reset
      });

      // 3.5 Draw Visions (seeds of light)
      visions.forEach((v) => {
        const px = (v.x / 100) * width;
        const py = (v.y / 100) * height;

        // Retrieve the collision energy boost
        const energyBoost = visionsEnergyRef.current[v.id] || 0;

        // Calculate pulsing ring (accelerated and widened by energy boost!)
        const pulse = 1 + Math.sin(state.time * (0.05 + energyBoost * 0.08) + v.x) * (0.15 + energyBoost * 0.12);
        const isHovered = hoveredVision?.id === v.id;
        const scale = (isHovered ? 1.4 : 1.0) + energyBoost * 0.4;

        // 1. Draw soft glow backing (widened by energy boost)
        const glowGrad = ctx.createRadialGradient(px, py, 2, px, py, v.size * 3 * pulse * scale);
        glowGrad.addColorStop(0, `${v.color}a0`); // brighter core with energy
        glowGrad.addColorStop(0.3, `${v.color}40`);
        glowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(px, py, v.size * 3 * pulse * scale, 0, Math.PI * 2);
        ctx.fill();

        // 2. Draw nested circles
        ctx.strokeStyle = `${v.color}cc`;
        ctx.lineWidth = isHovered ? 2.5 : (1.5 + energyBoost * 1.5);
        ctx.beginPath();
        ctx.arc(px, py, v.size * 0.8 * pulse * scale, 0, Math.PI * 2);
        ctx.stroke();

        // Inner glowing core
        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = v.color;
        ctx.shadowBlur = (10 + energyBoost * 18) * scale;
        ctx.beginPath();
        ctx.arc(px, py, (3.5 + energyBoost * 1.5) * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; // reset

        // Draw delicate dandelions/petals extending outward
        const numPetals = 8;
        ctx.strokeStyle = `${v.color}60`;
        ctx.lineWidth = 1;
        for (let k = 0; k < numPetals; k++) {
          const petalAngle = (k / numPetals) * Math.PI * 2 + (state.time * 0.005);
          const petalLen = v.size * 1.5 * pulse * scale;
          const endX = px + Math.cos(petalAngle) * petalLen;
          const endY = py + Math.sin(petalAngle) * petalLen;

          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(endX, endY);
          ctx.stroke();

          // Tiny tip dot
          ctx.fillStyle = v.color;
          ctx.beginPath();
          ctx.arc(endX, endY, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [dimensions, visions, activeTheme, hoveredVision, isAudioEnabled]);

  // 4. Interaction Handlers
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setMousePos({ x, y });
    stateRef.current.mouse = { x, y };

    // Check if hovering any vision flower
    let found: Vision | null = null;
    const width = dimensions.width;
    const height = dimensions.height;
    
    // Check visions
    for (const v of visions) {
      const px = (v.x / 100) * width;
      const py = (v.y / 100) * height;
      const dx = px - x;
      const dy = py - y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 28) {
        found = v;
        break;
      }
    }

    if (found !== hoveredVision) {
      setHoveredVision(found);
    }
  };

  const handleMouseLeave = () => {
    setIsHoveringCanvas(false);
    setMousePos({ x: -1000, y: -1000 });
    stateRef.current.mouse = { x: -1000, y: -1000 };
    setHoveredVision(null);
  };

  const handleMouseEnter = () => {
    setIsHoveringCanvas(true);
    if (isAudioEnabled) {
      ambientAudio.resume();
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const width = dimensions.width;
    const height = dimensions.height;

    // Check if clicked a vision
    let clickedVision: Vision | null = null;
    for (const v of visions) {
      const px = (v.x / 100) * width;
      const py = (v.y / 100) * height;
      const dx = px - x;
      const dy = py - y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 28) {
        clickedVision = v;
        break;
      }
    }

    if (clickedVision) {
      onVisionClick(clickedVision);
      if (isAudioEnabled) {
        // Measure local connection density of the clicked vision
        const localConnections = visions.filter((v) => {
          if (v.id === clickedVision.id) return false;
          const dx = v.x - clickedVision.x;
          const dy = v.y - clickedVision.y;
          return Math.sqrt(dx * dx + dy * dy) < 35;
        }).length;

        let chordType: "single" | "third" | "fifth" | "seventh" = "single";
        if (localConnections === 1) chordType = "third";
        else if (localConnections === 2) chordType = "fifth";
        else if (localConnections >= 3) chordType = "seventh";

        ambientAudio.playChime(clickedVision.x / 100, clickedVision.y / 100, chordType);
      }
    } else {
      // Create ripple
      stateRef.current.ripples.push({
        x,
        y,
        radius: 0,
        maxRadius: 180,
        speed: 4,
        opacity: 1.0,
      });

      // Play chime
      if (isAudioEnabled) {
        ambientAudio.playChime(x / width, y / height);
      }

      // Convert back to percentages (0..100) to trigger planting form at exact position
      const xPercent = (x / width) * 100;
      const yPercent = (y / height) * 100;
      onPlantClick(xPercent, yPercent);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[62vh] rounded-3xl overflow-hidden cursor-crosshair transition-all duration-700 shadow-2xl"
      id="canvas-field-container"
      style={{
        boxShadow: hoveredVision
          ? `0 25px 50px -12px ${hoveredVision.color}20`
          : "0 25px 50px -12px rgba(0,0,0,0.15)",
      }}
    >
      {/* Background Gradient matching Theme */}
      <div className={`absolute inset-0 transition-all duration-1000 ${activeTheme.bgGradient}`} />

      {/* Grid line overlay for soft alignment */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none mix-blend-overlay" />

      {/* Living Interactive Canvas */}
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseEnter={handleMouseEnter}
        onClick={handleCanvasClick}
        className="absolute inset-0 block z-10"
        id="field-canvas"
      />

      {/* Live Canvas hover coordinates indicator */}
      {isHoveringCanvas && mousePos.x > 0 && (
        <div
          className="absolute bottom-4 left-6 z-20 pointer-events-none font-mono text-[10px] tracking-widest flex items-center gap-3 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/5 transition-opacity duration-300"
          style={{ color: activeTheme.accentColor }}
        >
          <span className="inline-block w-1.5 h-1.5 rounded-full animate-ping" style={{ backgroundColor: activeTheme.accentColor }} />
          <span>X: {Math.round((mousePos.x / dimensions.width) * 100)}%</span>
          <span>Y: {Math.round((mousePos.y / dimensions.height) * 100)}%</span>
          {hoveredVision ? (
            <span className="text-white/80 font-medium">
              — {hoveredVision.text.slice(0, 20)}...
            </span>
          ) : (
            <span className="text-white/40 italic">Кликните, чтобы посадить мысль</span>
          )}
        </div>
      )}

      {/* Hover Floating Tooltip on Canvas */}
      {hoveredVision && (
        <div
          className="absolute z-30 pointer-events-none p-4 rounded-2xl max-w-xs shadow-xl border backdrop-blur-xl animate-fade-in transition-all duration-300"
          style={{
            left: `${(hoveredVision.x / 100) * dimensions.width > dimensions.width - 240 ? ((hoveredVision.x / 100) * dimensions.width) - 240 : (hoveredVision.x / 100) * dimensions.width + 15}px`,
            top: `${(hoveredVision.y / 100) * dimensions.height > dimensions.height - 180 ? ((hoveredVision.y / 100) * dimensions.height) - 150 : (hoveredVision.y / 100) * dimensions.height + 15}px`,
            backgroundColor: activeTheme.cardBg,
            borderColor: hoveredVision.color + "30",
            color: activeTheme.textColor,
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: hoveredVision.color }} />
            <span className="text-[10px] font-mono tracking-widest uppercase opacity-60">Семечко мысли</span>
          </div>
          <p className="text-xs leading-relaxed font-sans line-clamp-3 italic">
            &ldquo;{hoveredVision.text}&rdquo;
          </p>
          <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[9px] font-mono opacity-50">
            <span>Прочитано ветром</span>
            <span>{new Date(hoveredVision.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
        </div>
      )}
    </div>
  );
}
