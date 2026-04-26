import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  Check,
  Circle,
  Copy,
  Download,
  Globe,
  Hexagon,
  Layers,
  Pause,
  Play,
  RotateCcw,
  Shield,
  Sliders,
  Square,
  Star,
  Triangle,
  Zap,
} from 'lucide-react';

/* ================================================================
   TYPES
   ================================================================ */

type PresetCategory = 'animations' | 'logos';

interface AnimationPreset {
  id: string;
  name: string;
  category: 'animations';
  keyframesName: string;
  keyframesCSS: string;
  defaultDuration: number;
  defaultEasing: string;
  defaultIterations: string;
  defaultDirection: string;
  svgContent: (size: number) => string;
  icon: typeof Play;
}

interface LogoPreset {
  id: string;
  name: string;
  category: 'logos';
  svgContent: (opts: LogoOptions) => string;
  icon: typeof Shield;
}

interface LogoOptions {
  size: number;
  primary: string;
  secondary: string;
  accent: string;
  strokeWidth: number;
  filled: boolean;
  rotation: number;
}

type Preset = AnimationPreset | LogoPreset;

type ExportFormat = 'css' | 'svg' | 'lottie-stub';

/* ================================================================
   STYLE-INJECTION ID
   ================================================================ */

const STYLE_ID = 'animation-studio-keyframes';

/* ================================================================
   ANIMATION PRESETS (8)
   ================================================================ */

const ANIMATION_PRESETS: AnimationPreset[] = [
  {
    id: 'pulse',
    name: 'Pulse',
    category: 'animations',
    keyframesName: 'asPulse',
    keyframesCSS: `@keyframes asPulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.15); opacity: 0.7; }
}`,
    defaultDuration: 1.2,
    defaultEasing: 'ease-in-out',
    defaultIterations: 'infinite',
    defaultDirection: 'normal',
    svgContent: (s: number) => {
      const c = s / 2;
      const r = s * 0.3;
      return `<circle cx="${c}" cy="${c}" r="${r}" fill="#0078d4" opacity="0.9"/>
<circle cx="${c}" cy="${c}" r="${r * 0.6}" fill="#3ca0e0"/>`;
    },
    icon: Circle,
  },
  {
    id: 'spin',
    name: 'Spin',
    category: 'animations',
    keyframesName: 'asSpin',
    keyframesCSS: `@keyframes asSpin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}`,
    defaultDuration: 2,
    defaultEasing: 'linear',
    defaultIterations: 'infinite',
    defaultDirection: 'normal',
    svgContent: (s: number) => {
      const c = s / 2;
      const r = s * 0.32;
      return `<rect x="${c - r}" y="${c - r}" width="${r * 2}" height="${r * 2}" rx="${r * 0.2}" fill="none" stroke="#4ec9b0" stroke-width="${s * 0.04}" stroke-dasharray="${r * 1.5} ${r * 0.8}"/>
<circle cx="${c}" cy="${c}" r="${r * 0.35}" fill="#4ec9b0"/>`;
    },
    icon: RotateCcw,
  },
  {
    id: 'bounce',
    name: 'Bounce',
    category: 'animations',
    keyframesName: 'asBounce',
    keyframesCSS: `@keyframes asBounce {
  0%, 100% { transform: translateY(0); animation-timing-function: cubic-bezier(0.28, 0.84, 0.42, 1); }
  25% { transform: translateY(-30%); animation-timing-function: cubic-bezier(0.55, 0.06, 0.68, 0.19); }
  50% { transform: translateY(0); animation-timing-function: cubic-bezier(0.28, 0.84, 0.42, 1); }
  75% { transform: translateY(-15%); animation-timing-function: cubic-bezier(0.55, 0.06, 0.68, 0.19); }
}`,
    defaultDuration: 1.4,
    defaultEasing: 'ease',
    defaultIterations: 'infinite',
    defaultDirection: 'normal',
    svgContent: (s: number) => {
      const c = s / 2;
      const r = s * 0.22;
      return `<circle cx="${c}" cy="${c}" r="${r}" fill="#dcdcaa"/>
<ellipse cx="${c}" cy="${c + r * 1.6}" rx="${r * 0.8}" ry="${r * 0.15}" fill="rgba(0,0,0,0.2)"/>`;
    },
    icon: Zap,
  },
  {
    id: 'fadeInOut',
    name: 'Fade In/Out',
    category: 'animations',
    keyframesName: 'asFadeInOut',
    keyframesCSS: `@keyframes asFadeInOut {
  0%, 100% { opacity: 0; }
  30%, 70% { opacity: 1; }
}`,
    defaultDuration: 2.5,
    defaultEasing: 'ease-in-out',
    defaultIterations: 'infinite',
    defaultDirection: 'normal',
    svgContent: (s: number) => {
      const c = s / 2;
      const r = s * 0.28;
      return `<polygon points="${c},${c - r} ${c + r * 0.87},${c + r * 0.5} ${c - r * 0.87},${c + r * 0.5}" fill="#569cd6"/>`;
    },
    icon: Triangle,
  },
  {
    id: 'slideIn',
    name: 'Slide In',
    category: 'animations',
    keyframesName: 'asSlideIn',
    keyframesCSS: `@keyframes asSlideIn {
  0% { transform: translateX(-100%) scale(0.8); opacity: 0; }
  60% { transform: translateX(5%) scale(1.02); opacity: 1; }
  100% { transform: translateX(0) scale(1); opacity: 1; }
}`,
    defaultDuration: 0.8,
    defaultEasing: 'ease-out',
    defaultIterations: '1',
    defaultDirection: 'normal',
    svgContent: (s: number) => {
      const c = s / 2;
      const r = s * 0.25;
      return `<rect x="${c - r}" y="${c - r}" width="${r * 2}" height="${r * 2}" rx="${r * 0.15}" fill="#c586c0"/>
<line x1="${c - r * 0.5}" y1="${c}" x2="${c + r * 0.5}" y2="${c}" stroke="rgba(255,255,255,0.6)" stroke-width="${s * 0.03}" stroke-linecap="round"/>
<polygon points="${c + r * 0.2},${c - r * 0.3} ${c + r * 0.6},${c} ${c + r * 0.2},${c + r * 0.3}" fill="rgba(255,255,255,0.6)"/>`;
    },
    icon: Play,
  },
  {
    id: 'ripple',
    name: 'Ripple',
    category: 'animations',
    keyframesName: 'asRipple',
    keyframesCSS: `@keyframes asRipple {
  0% { transform: scale(0.5); opacity: 1; }
  100% { transform: scale(2.2); opacity: 0; }
}`,
    defaultDuration: 1.5,
    defaultEasing: 'ease-out',
    defaultIterations: 'infinite',
    defaultDirection: 'normal',
    svgContent: (s: number) => {
      const c = s / 2;
      const r = s * 0.18;
      return `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="#f44747" stroke-width="${s * 0.02}"/>
<circle cx="${c}" cy="${c}" r="${r * 0.5}" fill="#f44747" opacity="0.8"/>`;
    },
    icon: Circle,
  },
  {
    id: 'morph',
    name: 'Morph',
    category: 'animations',
    keyframesName: 'asMorph',
    keyframesCSS: `@keyframes asMorph {
  0% { border-radius: 50%; transform: scale(1) rotate(0deg); }
  25% { border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%; transform: scale(1.1) rotate(45deg); }
  50% { border-radius: 50% 20% 50% 20% / 20% 50% 20% 50%; transform: scale(0.95) rotate(90deg); }
  75% { border-radius: 20% 50% 20% 50% / 50% 20% 50% 20%; transform: scale(1.1) rotate(135deg); }
  100% { border-radius: 50%; transform: scale(1) rotate(180deg); }
}`,
    defaultDuration: 3,
    defaultEasing: 'ease-in-out',
    defaultIterations: 'infinite',
    defaultDirection: 'normal',
    svgContent: (s: number) => {
      const c = s / 2;
      const r = s * 0.28;
      return `<foreignObject x="${c - r}" y="${c - r}" width="${r * 2}" height="${r * 2}">
  <div xmlns="http://www.w3.org/1999/xhtml" style="width:100%;height:100%;background:linear-gradient(135deg,#0078d4,#4ec9b0);border-radius:50%;"></div>
</foreignObject>`;
    },
    icon: Hexagon,
  },
  {
    id: 'wave',
    name: 'Wave',
    category: 'animations',
    keyframesName: 'asWave',
    keyframesCSS: `@keyframes asWave {
  0%, 100% { transform: translateY(0) scaleY(1); }
  25% { transform: translateY(-20%) scaleY(1.1); }
  50% { transform: translateY(0) scaleY(0.9); }
  75% { transform: translateY(10%) scaleY(1.05); }
}`,
    defaultDuration: 1.8,
    defaultEasing: 'ease-in-out',
    defaultIterations: 'infinite',
    defaultDirection: 'normal',
    svgContent: (s: number) => {
      const c = s / 2;
      const bw = s * 0.06;
      const gap = bw * 1.8;
      const bars = 5;
      const startX = c - ((bars - 1) * gap) / 2;
      let out = '';
      for (let i = 0; i < bars; i++) {
        const h = s * (0.15 + 0.1 * Math.sin((i / bars) * Math.PI));
        out += `<rect x="${startX + i * gap - bw / 2}" y="${c - h / 2}" width="${bw}" height="${h}" rx="${bw / 2}" fill="#ce9178" opacity="${0.6 + i * 0.08}"/>`;
      }
      return out;
    },
    icon: Layers,
  },
];

/* ================================================================
   LOGO PRESETS (6)
   ================================================================ */

const LOGO_PRESETS: LogoPreset[] = [
  {
    id: 'copilothub-shield',
    name: 'CopilotHub Shield',
    category: 'logos',
    icon: Shield,
    svgContent: (o: LogoOptions) => {
      const c = o.size / 2;
      const s = o.size * 0.4;
      const f = o.filled ? o.primary : 'none';
      return `<g transform="rotate(${o.rotation} ${c} ${c})">
  <path d="${shieldPath(c, s)}" fill="${f}" stroke="${o.primary}" stroke-width="${o.strokeWidth}" stroke-linejoin="round"/>
  <path d="M${c - s * 0.25} ${c + s * 0.05} L${c - s * 0.05} ${c + s * 0.25} L${c + s * 0.3} ${c - s * 0.2}" fill="none" stroke="${o.accent}" stroke-width="${o.strokeWidth * 1.2}" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="${c}" cy="${c - s * 0.25}" r="${s * 0.08}" fill="${o.secondary}"/>
</g>`;
    },
  },
  {
    id: 'copilotbrowser-globe',
    name: 'CopilotBrowser Globe',
    category: 'logos',
    icon: Globe,
    svgContent: (o: LogoOptions) => {
      const c = o.size / 2;
      const r = o.size * 0.35;
      const f = o.filled ? o.primary : 'none';
      return `<g transform="rotate(${o.rotation} ${c} ${c})">
  <circle cx="${c}" cy="${c}" r="${r}" fill="${f}" stroke="${o.primary}" stroke-width="${o.strokeWidth}"/>
  <ellipse cx="${c}" cy="${c}" rx="${r * 0.5}" ry="${r}" fill="none" stroke="${o.secondary}" stroke-width="${o.strokeWidth * 0.7}"/>
  <line x1="${c - r}" y1="${c}" x2="${c + r}" y2="${c}" stroke="${o.secondary}" stroke-width="${o.strokeWidth * 0.7}"/>
  <path d="M${c - r * 0.85} ${c - r * 0.4} Q${c} ${c - r * 0.55} ${c + r * 0.85} ${c - r * 0.4}" fill="none" stroke="${o.accent}" stroke-width="${o.strokeWidth * 0.6}"/>
  <path d="M${c - r * 0.85} ${c + r * 0.4} Q${c} ${c + r * 0.55} ${c + r * 0.85} ${c + r * 0.4}" fill="none" stroke="${o.accent}" stroke-width="${o.strokeWidth * 0.6}"/>
</g>`;
    },
  },
  {
    id: 'hexagon-tech',
    name: 'Hexagon Tech',
    category: 'logos',
    icon: Hexagon,
    svgContent: (o: LogoOptions) => {
      const c = o.size / 2;
      const r = o.size * 0.36;
      const f = o.filled ? o.primary : 'none';
      const pts = hexPoints(c, c, r);
      const inner = hexPoints(c, c, r * 0.55);
      return `<g transform="rotate(${o.rotation} ${c} ${c})">
  <polygon points="${pts}" fill="${f}" stroke="${o.primary}" stroke-width="${o.strokeWidth}" stroke-linejoin="round"/>
  <polygon points="${inner}" fill="none" stroke="${o.secondary}" stroke-width="${o.strokeWidth * 0.7}" stroke-linejoin="round"/>
  <circle cx="${c}" cy="${c}" r="${r * 0.15}" fill="${o.accent}"/>
  <line x1="${c}" y1="${c - r * 0.55}" x2="${c}" y2="${c - r * 0.15}" stroke="${o.accent}" stroke-width="${o.strokeWidth * 0.6}"/>
  <line x1="${c}" y1="${c + r * 0.15}" x2="${c}" y2="${c + r * 0.55}" stroke="${o.accent}" stroke-width="${o.strokeWidth * 0.6}"/>
</g>`;
    },
  },
  {
    id: 'circuit-mark',
    name: 'Circuit Mark',
    category: 'logos',
    icon: Zap,
    svgContent: (o: LogoOptions) => {
      const c = o.size / 2;
      const s = o.size * 0.3;
      const f = o.filled ? o.primary : 'none';
      return `<g transform="rotate(${o.rotation} ${c} ${c})">
  <rect x="${c - s}" y="${c - s}" width="${s * 2}" height="${s * 2}" rx="${s * 0.18}" fill="${f}" stroke="${o.primary}" stroke-width="${o.strokeWidth}"/>
  <circle cx="${c - s * 0.45}" cy="${c - s * 0.45}" r="${s * 0.12}" fill="${o.accent}"/>
  <circle cx="${c + s * 0.45}" cy="${c - s * 0.45}" r="${s * 0.12}" fill="${o.accent}"/>
  <circle cx="${c - s * 0.45}" cy="${c + s * 0.45}" r="${s * 0.12}" fill="${o.accent}"/>
  <circle cx="${c + s * 0.45}" cy="${c + s * 0.45}" r="${s * 0.12}" fill="${o.accent}"/>
  <line x1="${c - s * 0.45}" y1="${c - s * 0.45}" x2="${c + s * 0.45}" y2="${c + s * 0.45}" stroke="${o.secondary}" stroke-width="${o.strokeWidth * 0.6}"/>
  <line x1="${c + s * 0.45}" y1="${c - s * 0.45}" x2="${c - s * 0.45}" y2="${c + s * 0.45}" stroke="${o.secondary}" stroke-width="${o.strokeWidth * 0.6}"/>
  <circle cx="${c}" cy="${c}" r="${s * 0.2}" fill="${o.secondary}"/>
</g>`;
    },
  },
  {
    id: 'neural-node',
    name: 'Neural Node',
    category: 'logos',
    icon: Star,
    svgContent: (o: LogoOptions) => {
      const c = o.size / 2;
      const r = o.size * 0.35;
      const nodes: [number, number][] = [
        [c, c - r * 0.8],
        [c + r * 0.7, c - r * 0.25],
        [c + r * 0.45, c + r * 0.65],
        [c - r * 0.45, c + r * 0.65],
        [c - r * 0.7, c - r * 0.25],
      ];
      let lines = '';
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          lines += `<line x1="${nodes[i][0]}" y1="${nodes[i][1]}" x2="${nodes[j][0]}" y2="${nodes[j][1]}" stroke="${o.secondary}" stroke-width="${o.strokeWidth * 0.5}" opacity="0.6"/>`;
        }
      }
      let dots = '';
      for (const [nx, ny] of nodes) {
        dots += `<circle cx="${nx}" cy="${ny}" r="${r * 0.1}" fill="${o.accent}"/>`;
      }
      return `<g transform="rotate(${o.rotation} ${c} ${c})">
  ${o.filled ? `<circle cx="${c}" cy="${c}" r="${r}" fill="${o.primary}" opacity="0.15"/>` : ''}
  ${lines}
  ${dots}
  <circle cx="${c}" cy="${c}" r="${r * 0.18}" fill="${o.primary}" stroke="${o.accent}" stroke-width="${o.strokeWidth * 0.5}"/>
</g>`;
    },
  },
  {
    id: 'enterprise-diamond',
    name: 'Enterprise Diamond',
    category: 'logos',
    icon: Square,
    svgContent: (o: LogoOptions) => {
      const c = o.size / 2;
      const r = o.size * 0.35;
      const f = o.filled ? o.primary : 'none';
      return `<g transform="rotate(${o.rotation} ${c} ${c})">
  <polygon points="${c},${c - r} ${c + r},${c} ${c},${c + r} ${c - r},${c}" fill="${f}" stroke="${o.primary}" stroke-width="${o.strokeWidth}" stroke-linejoin="round"/>
  <polygon points="${c},${c - r * 0.55} ${c + r * 0.55},${c} ${c},${c + r * 0.55} ${c - r * 0.55},${c}" fill="none" stroke="${o.secondary}" stroke-width="${o.strokeWidth * 0.7}" stroke-linejoin="round"/>
  <line x1="${c}" y1="${c - r}" x2="${c}" y2="${c + r}" stroke="${o.accent}" stroke-width="${o.strokeWidth * 0.5}" opacity="0.4"/>
  <line x1="${c - r}" y1="${c}" x2="${c + r}" y2="${c}" stroke="${o.accent}" stroke-width="${o.strokeWidth * 0.5}" opacity="0.4"/>
  <circle cx="${c}" cy="${c}" r="${r * 0.12}" fill="${o.accent}"/>
</g>`;
    },
  },
];

/* ================================================================
   SVG GEOMETRY HELPERS
   ================================================================ */

function shieldPath(cx: number, s: number): string {
  return `M${cx} ${cx - s} C${cx + s * 0.9} ${cx - s * 0.8} ${cx + s} ${cx - s * 0.4} ${cx + s} ${cx * 0.1 + cx - s * 0.1} C${cx + s} ${cx + s * 0.35} ${cx + s * 0.55} ${cx + s * 0.75} ${cx} ${cx + s} C${cx - s * 0.55} ${cx + s * 0.75} ${cx - s} ${cx + s * 0.35} ${cx - s} ${cx * 0.1 + cx - s * 0.1} C${cx - s} ${cx - s * 0.4} ${cx - s * 0.9} ${cx - s * 0.8} ${cx} ${cx - s}Z`;
}

function hexPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
  }).join(' ');
}

/* ================================================================
   CONSTANTS
   ================================================================ */

const ALL_PRESETS: Preset[] = [...ANIMATION_PRESETS, ...LOGO_PRESETS];

const EASING_OPTIONS = ['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out', 'cubic-bezier(0.68,-0.55,0.27,1.55)'];
const ITERATION_OPTIONS = ['1', '2', '3', 'infinite'];
const DIRECTION_OPTIONS = ['normal', 'reverse', 'alternate', 'alternate-reverse'];
const CANVAS_SIZES = [128, 256, 512] as const;

const BG_OPTIONS: { label: string; value: string; style: CSSProperties }[] = [
  { label: 'Transparent', value: 'transparent', style: {} },
  { label: 'White', value: '#ffffff', style: { background: '#ffffff' } },
  { label: 'Dark', value: '#1a1a2e', style: { background: '#1a1a2e' } },
  { label: 'Custom', value: 'custom', style: {} },
];

/* ================================================================
   VOLUMETRIC STYLES
   ================================================================ */

const panelStyle: CSSProperties = {
  boxShadow: '0 12px 28px rgba(0,0,0,0.35), 0 4px 10px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)',
  borderRadius: '10px',
};

const tileStyle: CSSProperties = {
  boxShadow: '0 4px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)',
  borderRadius: '8px',
  cursor: 'pointer',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
};

const tileActiveStyle: CSSProperties = {
  ...tileStyle,
  boxShadow: '0 6px 20px rgba(0,120,212,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
};

const checkerBg: CSSProperties = {
  backgroundImage:
    'linear-gradient(45deg, rgba(255,255,255,0.04) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.04) 75%), linear-gradient(45deg, rgba(255,255,255,0.04) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.04) 75%)',
  backgroundSize: '20px 20px',
  backgroundPosition: '0 0, 10px 10px',
};

/* ================================================================
   MAIN COMPONENT
   ================================================================ */

export function AnimationStudio() {
  /* ---------- State ---------- */
  const [activeTab, setActiveTab] = useState<PresetCategory>('animations');
  const [selectedId, setSelectedId] = useState<string>(ANIMATION_PRESETS[0].id);
  const [isPlaying, setIsPlaying] = useState(true);

  // Animation controls
  const [duration, setDuration] = useState(1.2);
  const [easing, setEasing] = useState('ease-in-out');
  const [iterations, setIterations] = useState('infinite');
  const [direction, setDirection] = useState('normal');
  const [delay, setDelay] = useState(0);

  // Logo controls
  const [primaryColor, setPrimaryColor] = useState('#0078d4');
  const [secondaryColor, setSecondaryColor] = useState('#4ec9b0');
  const [accentColor, setAccentColor] = useState('#dcdcaa');
  const [logoSize, setLogoSize] = useState(256);
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [filled, setFilled] = useState(true);
  const [rotation, setRotation] = useState(0);

  // Canvas
  const [canvasSize, setCanvasSize] = useState<128 | 256 | 512>(256);
  const [bgChoice, setBgChoice] = useState('transparent');
  const [customBg, setCustomBg] = useState('#2d2d3d');

  // Export
  const [exportFormat, setExportFormat] = useState<ExportFormat>('css');
  const [copied, setCopied] = useState(false);

  // Replay key to force re-mount for non-infinite animations
  const [replayKey, setReplayKey] = useState(0);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ---------- Derived ---------- */
  const selectedPreset = useMemo(
    () => ALL_PRESETS.find((p) => p.id === selectedId) ?? ANIMATION_PRESETS[0],
    [selectedId],
  );

  const isAnimation = selectedPreset.category === 'animations';

  const logoOpts: LogoOptions = useMemo(
    () => ({
      size: logoSize,
      primary: primaryColor,
      secondary: secondaryColor,
      accent: accentColor,
      strokeWidth,
      filled,
      rotation,
    }),
    [logoSize, primaryColor, secondaryColor, accentColor, strokeWidth, filled, rotation],
  );

  /* ---------- Keyframes injection ---------- */
  const allKeyframesCSS = useMemo(
    () => ANIMATION_PRESETS.map((p) => p.keyframesCSS).join('\n'),
    [],
  );

  useEffect(() => {
    if (document.getElementById(STYLE_ID)) {
      const el = document.getElementById(STYLE_ID) as HTMLStyleElement;
      el.textContent = allKeyframesCSS;
      return;
    }
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = allKeyframesCSS;
    document.head.appendChild(style);
    return () => {
      const el = document.getElementById(STYLE_ID);
      if (el) el.remove();
    };
  }, [allKeyframesCSS]);

  /* ---------- Sync controls on preset change ---------- */
  useEffect(() => {
    if (isAnimation) {
      const p = selectedPreset as AnimationPreset;
      setDuration(p.defaultDuration);
      setEasing(p.defaultEasing);
      setIterations(p.defaultIterations);
      setDirection(p.defaultDirection);
      setDelay(0);
      setIsPlaying(true);
      setReplayKey((k) => k + 1);
    }
  }, [selectedId, isAnimation, selectedPreset]);

  /* ---------- Handlers ---------- */
  const handleSelectPreset = useCallback(
    (preset: Preset) => {
      setSelectedId(preset.id);
      setActiveTab(preset.category);
      setCopied(false);
    },
    [],
  );

  const handlePlayPause = useCallback(() => setIsPlaying((v) => !v), []);

  const handleReset = useCallback(() => {
    setIsPlaying(true);
    setReplayKey((k) => k + 1);
  }, []);

  const animationStyle = useMemo((): CSSProperties => {
    if (!isAnimation || !isPlaying) return {};
    const p = selectedPreset as AnimationPreset;
    return {
      animation: `${p.keyframesName} ${duration}s ${easing} ${delay}s ${iterations} ${direction}`,
    };
  }, [isAnimation, isPlaying, selectedPreset, duration, easing, delay, iterations, direction]);

  /* ---------- SVG generation for preview ---------- */
  const previewSvg = useMemo(() => {
    if (isAnimation) {
      const p = selectedPreset as AnimationPreset;
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvasSize} ${canvasSize}" width="${canvasSize}" height="${canvasSize}">${p.svgContent(canvasSize)}</svg>`;
    }
    const p = selectedPreset as LogoPreset;
    const opts = { ...logoOpts, size: canvasSize };
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvasSize} ${canvasSize}" width="${canvasSize}" height="${canvasSize}">${p.svgContent(opts)}</svg>`;
  }, [selectedPreset, isAnimation, canvasSize, logoOpts]);

  /* ---------- Export helpers ---------- */
  const exportContent = useMemo(() => {
    if (isAnimation) {
      const p = selectedPreset as AnimationPreset;
      if (exportFormat === 'css') {
        return `${p.keyframesCSS}\n\n.${p.keyframesName} {\n  animation: ${p.keyframesName} ${duration}s ${easing} ${delay}s ${iterations} ${direction};\n}`;
      }
      if (exportFormat === 'svg') return previewSvg;
      return `/* Lottie JSON stub - convert CSS keyframes via LottieFiles or Bodymovin */\n{\n  "v": "5.7.0",\n  "nm": "${p.name}",\n  "fr": 60,\n  "w": ${canvasSize},\n  "h": ${canvasSize},\n  "layers": []\n}`;
    }
    if (exportFormat === 'svg') return previewSvg;
    if (exportFormat === 'css') return `/* Logo is SVG-only. Use "SVG" export format. */`;
    return `/* Lottie stub */\n{\n  "v": "5.7.0",\n  "nm": "${selectedPreset.name}",\n  "fr": 60,\n  "w": ${canvasSize},\n  "h": ${canvasSize},\n  "layers": []\n}`;
  }, [isAnimation, selectedPreset, exportFormat, duration, easing, delay, iterations, direction, previewSvg, canvasSize]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(exportContent).then(() => {
      setCopied(true);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    });
  }, [exportContent]);

  /* ---------- Background resolution ---------- */
  const resolvedBg = bgChoice === 'transparent' ? undefined : bgChoice === 'custom' ? customBg : bgChoice;

  /* ---------- Keyframe timeline phases ---------- */
  const timelinePhases = useMemo(() => {
    if (!isAnimation) return [];
    const p = selectedPreset as AnimationPreset;
    const matches = [...p.keyframesCSS.matchAll(/(\d+)%/g)];
    const pcts = matches.map((m) => parseInt(m[1], 10));
    const unique = [...new Set(pcts)].sort((a, b) => a - b);
    return unique;
  }, [isAnimation, selectedPreset]);

  /* ================================================================
     RENDER
     ================================================================ */
  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden bg-[var(--color-surface-primary)]"
      style={{ fontFamily: 'var(--font-family-sans)' }}
    >
      {/* ---- Header ---- */}
      <header
        className="flex shrink-0 items-center justify-between border-b border-[var(--color-border-default)] px-5 py-3"
        style={panelStyle}
      >
        <div className="flex items-center gap-3">
          <Layers className="h-5 w-5" style={{ color: 'var(--color-accent-primary)' }} />
          <h1 className="text-base font-semibold text-[var(--color-text-primary)]">Animation Studio</h1>
        </div>
        <div className="flex items-center gap-2">
          <Sliders className="h-4 w-4 text-[var(--color-text-muted)]" />
          <span className="text-xs text-[var(--color-text-muted)]">
            {isAnimation ? 'CSS Keyframes' : 'SVG Logo'} Mode
          </span>
        </div>
      </header>

      {/* ---- Main 3-Panel Layout ---- */}
      <div className="flex min-h-0 flex-1">
        {/* ======== LEFT PANEL: Preset Gallery ======== */}
        <aside
          className="flex w-[260px] shrink-0 flex-col border-r border-[var(--color-border-default)] bg-[var(--color-surface-secondary)]"
        >
          {/* Tabs */}
          <div className="flex shrink-0 border-b border-[var(--color-border-subtle)]">
            {(['animations', 'logos'] as PresetCategory[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="flex-1 px-3 py-2 text-xs font-medium capitalize transition-colors"
                style={{
                  color: activeTab === tab ? 'var(--color-accent-primary)' : 'var(--color-text-muted)',
                  borderBottom: activeTab === tab ? '2px solid var(--color-accent-primary)' : '2px solid transparent',
                  background: activeTab === tab ? 'var(--color-surface-hover)' : 'transparent',
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Preset Grid */}
          <div className="flex-1 overflow-auto p-3">
            <div className="grid grid-cols-2 gap-2">
              {(activeTab === 'animations' ? ANIMATION_PRESETS : LOGO_PRESETS).map((preset) => {
                const isActive = selectedId === preset.id;
                const Icon = preset.icon;
                return (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset)}
                    className="flex flex-col items-center gap-1.5 border p-2 text-center"
                    style={{
                      ...(isActive ? tileActiveStyle : tileStyle),
                      background: isActive
                        ? 'var(--color-surface-active)'
                        : 'var(--color-surface-elevated)',
                      borderColor: isActive
                        ? 'var(--color-accent-primary)'
                        : 'var(--color-border-subtle)',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = '';
                    }}
                  >
                    {/* Mini live preview */}
                    <div
                      className="flex h-10 w-10 items-center justify-center overflow-hidden"
                      style={{ borderRadius: '6px' }}
                    >
                      {preset.category === 'animations' ? (
                        <div
                          style={{
                            animation: `${(preset as AnimationPreset).keyframesName} ${(preset as AnimationPreset).defaultDuration}s ${(preset as AnimationPreset).defaultEasing} 0s infinite ${(preset as AnimationPreset).defaultDirection}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {preset.id === 'morph' ? (
                            <div
                              style={{
                                width: 24,
                                height: 24,
                                background: 'linear-gradient(135deg, #0078d4, #4ec9b0)',
                                borderRadius: '50%',
                                animation: `${(preset as AnimationPreset).keyframesName} ${(preset as AnimationPreset).defaultDuration}s ${(preset as AnimationPreset).defaultEasing} 0s infinite`,
                              }}
                            />
                          ) : (
                            <svg viewBox={`0 0 40 40`} width="32" height="32">
                              <g dangerouslySetInnerHTML={{ __html: (preset as AnimationPreset).svgContent(40) }} />
                            </svg>
                          )}
                        </div>
                      ) : (
                        <svg viewBox={`0 0 40 40`} width="32" height="32">
                          <g
                            dangerouslySetInnerHTML={{
                              __html: (preset as LogoPreset).svgContent({
                                size: 40,
                                primary: '#0078d4',
                                secondary: '#4ec9b0',
                                accent: '#dcdcaa',
                                strokeWidth: 1.2,
                                filled: true,
                                rotation: 0,
                              }),
                            }}
                          />
                        </svg>
                      )}
                    </div>
                    <span
                      className="text-[10px] font-medium leading-tight"
                      style={{ color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}
                    >
                      {preset.name}
                    </span>
                    <Icon
                      className="h-3 w-3"
                      style={{ color: isActive ? 'var(--color-accent-primary)' : 'var(--color-text-muted)' }}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* ======== CENTER PANEL: Preview Stage ======== */}
        <main className="flex min-w-0 flex-1 flex-col bg-[var(--color-surface-primary)]">
          {/* Canvas toolbar */}
          <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-border-subtle)] px-4 py-2">
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-[var(--color-text-secondary)]">Canvas</span>
              {CANVAS_SIZES.map((sz) => (
                <button
                  key={sz}
                  onClick={() => setCanvasSize(sz)}
                  className="rounded px-2 py-0.5 text-[10px] font-medium transition-colors"
                  style={{
                    background: canvasSize === sz ? 'var(--color-accent-primary)' : 'var(--color-surface-hover)',
                    color: canvasSize === sz ? '#fff' : 'var(--color-text-muted)',
                  }}
                >
                  {sz}x{sz}
                </button>
              ))}
            </div>

            {/* Background picker */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[var(--color-text-muted)]">BG:</span>
              {BG_OPTIONS.map((bg) => (
                <button
                  key={bg.value}
                  onClick={() => setBgChoice(bg.value)}
                  className="h-5 w-5 rounded-full border"
                  title={bg.label}
                  style={{
                    ...bg.style,
                    borderColor: bgChoice === bg.value ? 'var(--color-accent-primary)' : 'var(--color-border-default)',
                    ...(bg.value === 'transparent'
                      ? {
                          backgroundImage:
                            'linear-gradient(45deg, #666 25%, transparent 25%, transparent 75%, #666 75%), linear-gradient(45deg, #666 25%, transparent 25%, transparent 75%, #666 75%)',
                          backgroundSize: '6px 6px',
                          backgroundPosition: '0 0, 3px 3px',
                        }
                      : {}),
                    ...(bg.value === 'custom' ? { background: customBg } : {}),
                  }}
                />
              ))}
              {bgChoice === 'custom' && (
                <input
                  type="color"
                  value={customBg}
                  onChange={(e) => setCustomBg(e.target.value)}
                  className="h-5 w-5 cursor-pointer rounded border-0 p-0"
                />
              )}
            </div>
          </div>

          {/* Preview area */}
          <div
            className="flex flex-1 items-center justify-center overflow-auto p-6"
            style={{
              ...checkerBg,
              ...(resolvedBg ? { background: resolvedBg } : {}),
            }}
          >
            <div
              key={replayKey}
              className="flex items-center justify-center"
              style={{
                width: canvasSize,
                height: canvasSize,
                ...(isAnimation ? animationStyle : {}),
              }}
            >
              {selectedPreset.id === 'morph' && isAnimation ? (
                <div
                  key={`morph-${replayKey}`}
                  style={{
                    width: canvasSize * 0.56,
                    height: canvasSize * 0.56,
                    background: 'linear-gradient(135deg, #0078d4, #4ec9b0)',
                    borderRadius: '50%',
                    ...(isPlaying
                      ? {
                          animation: `asMorph ${duration}s ${easing} ${delay}s ${iterations} ${direction}`,
                        }
                      : {}),
                  }}
                />
              ) : (
                <svg
                  viewBox={`0 0 ${canvasSize} ${canvasSize}`}
                  width={canvasSize}
                  height={canvasSize}
                  dangerouslySetInnerHTML={{
                    __html: isAnimation
                      ? (selectedPreset as AnimationPreset).svgContent(canvasSize)
                      : (selectedPreset as LogoPreset).svgContent({ ...logoOpts, size: canvasSize }),
                  }}
                />
              )}
            </div>
          </div>

          {/* Keyframe timeline (animations only) */}
          {isAnimation && timelinePhases.length > 0 && (
            <div
              className="flex shrink-0 items-center gap-2 border-t border-[var(--color-border-subtle)] px-4 py-2"
            >
              <span className="text-[10px] font-medium text-[var(--color-text-muted)]">Keyframes</span>
              <div
                className="relative flex-1 rounded-full"
                style={{ height: 8, background: 'var(--color-surface-hover)' }}
              >
                {timelinePhases.map((pct) => (
                  <div
                    key={pct}
                    className="absolute top-0 h-full rounded-full"
                    title={`${pct}%`}
                    style={{
                      left: `${pct}%`,
                      width: 4,
                      transform: 'translateX(-2px)',
                      background: 'var(--color-accent-primary)',
                    }}
                  />
                ))}
              </div>
              <span className="text-[10px] text-[var(--color-text-muted)]">
                {timelinePhases.length} phases
              </span>
            </div>
          )}

          {/* Play controls */}
          <div
            className="flex shrink-0 items-center justify-between border-t border-[var(--color-border-subtle)] px-4 py-2"
          >
            <div className="flex items-center gap-2">
              <button
                onClick={handlePlayPause}
                className="flex h-7 w-7 items-center justify-center rounded-md transition-colors"
                style={{ background: 'var(--color-accent-primary)', color: '#fff' }}
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={handleReset}
                className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-text-secondary)] transition-colors"
                style={{ background: 'var(--color-surface-hover)' }}
                title="Reset"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
            <span className="text-[10px] text-[var(--color-text-muted)]">
              {selectedPreset.name} | {canvasSize}x{canvasSize}
            </span>
          </div>
        </main>

        {/* ======== RIGHT PANEL: Controls ======== */}
        <aside
          className="flex w-[260px] shrink-0 flex-col border-l border-[var(--color-border-default)] bg-[var(--color-surface-secondary)]"
        >
          <div className="flex-1 overflow-auto p-4">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              {isAnimation ? 'Animation Controls' : 'Logo Controls'}
            </h2>

            {isAnimation ? (
              <div className="flex flex-col gap-4">
                {/* Duration */}
                <ControlGroup label="Duration" value={`${duration.toFixed(1)}s`}>
                  <input
                    type="range"
                    min={0.1}
                    max={5}
                    step={0.1}
                    value={duration}
                    onChange={(e) => setDuration(parseFloat(e.target.value))}
                    className="w-full accent-[var(--color-accent-primary)]"
                  />
                </ControlGroup>

                {/* Easing */}
                <ControlGroup label="Easing">
                  <select
                    value={easing}
                    onChange={(e) => setEasing(e.target.value)}
                    className="w-full rounded border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] px-2 py-1 text-xs text-[var(--color-text-primary)]"
                  >
                    {EASING_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </ControlGroup>

                {/* Iterations */}
                <ControlGroup label="Iterations">
                  <div className="flex gap-1">
                    {ITERATION_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setIterations(opt)}
                        className="flex-1 rounded px-1.5 py-1 text-[10px] font-medium transition-colors"
                        style={{
                          background: iterations === opt ? 'var(--color-accent-primary)' : 'var(--color-surface-hover)',
                          color: iterations === opt ? '#fff' : 'var(--color-text-muted)',
                        }}
                      >
                        {opt === 'infinite' ? 'Inf' : opt}
                      </button>
                    ))}
                  </div>
                </ControlGroup>

                {/* Direction */}
                <ControlGroup label="Direction">
                  <select
                    value={direction}
                    onChange={(e) => setDirection(e.target.value)}
                    className="w-full rounded border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] px-2 py-1 text-xs text-[var(--color-text-primary)]"
                  >
                    {DIRECTION_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </ControlGroup>

                {/* Delay */}
                <ControlGroup label="Delay" value={`${delay.toFixed(1)}s`}>
                  <input
                    type="range"
                    min={0}
                    max={3}
                    step={0.1}
                    value={delay}
                    onChange={(e) => setDelay(parseFloat(e.target.value))}
                    className="w-full accent-[var(--color-accent-primary)]"
                  />
                </ControlGroup>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {/* Primary Color */}
                <ControlGroup label="Primary">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="h-6 w-8 cursor-pointer rounded border-0 p-0"
                    />
                    <span className="text-[10px] text-[var(--color-text-muted)]">{primaryColor}</span>
                  </div>
                </ControlGroup>

                {/* Secondary Color */}
                <ControlGroup label="Secondary">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="h-6 w-8 cursor-pointer rounded border-0 p-0"
                    />
                    <span className="text-[10px] text-[var(--color-text-muted)]">{secondaryColor}</span>
                  </div>
                </ControlGroup>

                {/* Accent Color */}
                <ControlGroup label="Accent">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="h-6 w-8 cursor-pointer rounded border-0 p-0"
                    />
                    <span className="text-[10px] text-[var(--color-text-muted)]">{accentColor}</span>
                  </div>
                </ControlGroup>

                {/* Size */}
                <ControlGroup label="Size" value={`${logoSize}px`}>
                  <input
                    type="range"
                    min={64}
                    max={512}
                    step={8}
                    value={logoSize}
                    onChange={(e) => setLogoSize(parseInt(e.target.value, 10))}
                    className="w-full accent-[var(--color-accent-primary)]"
                  />
                </ControlGroup>

                {/* Stroke Width */}
                <ControlGroup label="Stroke" value={`${strokeWidth}px`}>
                  <input
                    type="range"
                    min={0.5}
                    max={8}
                    step={0.5}
                    value={strokeWidth}
                    onChange={(e) => setStrokeWidth(parseFloat(e.target.value))}
                    className="w-full accent-[var(--color-accent-primary)]"
                  />
                </ControlGroup>

                {/* Fill Toggle */}
                <ControlGroup label="Fill">
                  <button
                    onClick={() => setFilled((f) => !f)}
                    className="rounded px-3 py-1 text-[10px] font-medium transition-colors"
                    style={{
                      background: filled ? 'var(--color-accent-primary)' : 'var(--color-surface-hover)',
                      color: filled ? '#fff' : 'var(--color-text-muted)',
                    }}
                  >
                    {filled ? 'Filled' : 'Outline'}
                  </button>
                </ControlGroup>

                {/* Rotation */}
                <ControlGroup label="Rotation" value={`${rotation} deg`}>
                  <input
                    type="range"
                    min={0}
                    max={360}
                    step={5}
                    value={rotation}
                    onChange={(e) => setRotation(parseInt(e.target.value, 10))}
                    className="w-full accent-[var(--color-accent-primary)]"
                  />
                </ControlGroup>
              </div>
            )}

            {/* ---- Export Section ---- */}
            <div
              className="mt-6 rounded-lg border border-[var(--color-border-subtle)] p-3"
              style={{ background: 'var(--color-surface-elevated)' }}
            >
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-primary)]">
                <Download className="h-3.5 w-3.5" style={{ color: 'var(--color-accent-primary)' }} />
                Export
              </h3>

              {/* Format selector */}
              <div className="mb-3 flex gap-1">
                {(['css', 'svg', 'lottie-stub'] as ExportFormat[]).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setExportFormat(fmt)}
                    className="flex-1 rounded px-1.5 py-1 text-[10px] font-medium uppercase transition-colors"
                    style={{
                      background: exportFormat === fmt ? 'var(--color-accent-primary)' : 'var(--color-surface-hover)',
                      color: exportFormat === fmt ? '#fff' : 'var(--color-text-muted)',
                    }}
                  >
                    {fmt}
                  </button>
                ))}
              </div>

              {/* Preview snippet */}
              <pre
                className="mb-2 max-h-28 overflow-auto rounded border border-[var(--color-border-subtle)] p-2 text-[10px] leading-relaxed text-[var(--color-text-secondary)]"
                style={{
                  background: 'var(--color-surface-primary)',
                  fontFamily: 'var(--font-family-mono)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}
              >
                {exportContent}
              </pre>

              {/* Copy buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
                  style={{
                    background: copied ? 'var(--color-status-success)' : 'var(--color-accent-primary)',
                    color: '#fff',
                  }}
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      {isAnimation && exportFormat === 'css' ? 'Copy CSS' : 'Copy SVG'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ================================================================
   SUB-COMPONENTS
   ================================================================ */

function ControlGroup({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium text-[var(--color-text-secondary)]">{label}</span>
        {value && (
          <span
            className="rounded px-1.5 py-0.5 text-[10px] font-mono"
            style={{
              background: 'var(--color-surface-hover)',
              color: 'var(--color-text-muted)',
              fontFamily: 'var(--font-family-mono)',
            }}
          >
            {value}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
