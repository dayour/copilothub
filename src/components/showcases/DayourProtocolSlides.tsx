import { useState } from "react";
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, Tooltip,
  LineChart, Line,
  ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  CartesianGrid,
} from "recharts";

/* ------------------------------------------------------------------ */
/*  THEMES -- 8 curated dark themes                                   */
/* ------------------------------------------------------------------ */

function buildTheme(
  name: string,
  bg: string, card: string,
  accent: string, accentLight: string,
): Record<string, any> {
  const r = parseInt(accent.slice(1, 3), 16);
  const g = parseInt(accent.slice(3, 5), 16);
  const b = parseInt(accent.slice(5, 7), 16);
  const a = (o: number) => `rgba(${r},${g},${b},${o})`;
  return {
    name, bg, card, accent, accentLight,
    accentGlow: a(0.18),
    border: a(0.28),
    text: "#e8edf8",
    textMid: "#a8b4d0",
    textSubtle: "#5a6480",
    pill: card,
    pillBorder: a(0.34),
    headerGrad: `linear-gradient(138deg,${bg},${card},${bg})`,
    emphasisBg: card,
    emphasisBorder: a(0.24),
    emphasisLeft: a(0.65),
    goodBg: "rgba(22,163,74,0.08)",
    goodBorder: "rgba(22,120,60,0.35)",
    goodLeft: "rgba(22,163,74,0.70)",
    dangerBg: "rgba(220,38,38,0.08)",
    dangerBorder: "rgba(160,30,30,0.38)",
    dangerLeft: "rgba(220,38,38,0.70)",
    tableHeader: a(0.14),
    tableBorder: a(0.20),
    tableRow: a(0.05),
    swatches: [bg, card, accent, accentLight, a(0.40)],
  };
}

const THEMES: Record<string, any> = {
  "midnight-sapphire": buildTheme("Midnight & Sapphire", "#08090f", "#0f1120", "#3b82f6", "#60a5fa"),
  "slate-amber":       buildTheme("Slate & Amber",       "#0e0f11", "#17191d", "#d97706", "#fbbf24"),
  "obsidian-emerald":  buildTheme("Obsidian & Emerald",  "#080d0b", "#0f1612", "#10b981", "#34d399"),
  "charcoal-violet":   buildTheme("Charcoal & Violet",   "#0c0c10", "#141418", "#8b5cf6", "#a78bfa"),
  "abyss-cyan":        buildTheme("Abyss & Cyan",        "#060b0e", "#0b1318", "#06b6d4", "#22d3ee"),
  "deep-crimson":      buildTheme("Deep & Crimson",      "#0c0808", "#141010", "#dc2626", "#ef4444"),
  "void-aurora":       buildTheme("Void & Aurora",        "#06070c", "#0d0e18", "#2dd4bf", "#5eead4"),
  "ink-frost":         buildTheme("Ink & Frost",          "#090a0c", "#111317", "#cbd5e1", "#f1f5f9"),
};

/* ------------------------------------------------------------------ */
/*  CHART DATA -- DAYOUR Protocol specific                            */
/* ------------------------------------------------------------------ */

const SCORING_DATA = [
  { dim: "Code Qual",  score: 20, weight: 0.20 },
  { dim: "Fluent 2",   score: 20, weight: 0.20 },
  { dim: "UX",         score: 15, weight: 0.15 },
  { dim: "Arch Fit",   score: 20, weight: 0.20 },
  { dim: "Perf",       score: 10, weight: 0.10 },
  { dim: "Innovate",   score: 10, weight: 0.10 },
  { dim: "Complete",   score: 5,  weight: 0.05 },
];

const DISPATCH_DATA = [
  { phase: "P1 Arch",   dispatches: 8,  parallel: 4 },
  { phase: "P2 Lane O", dispatches: 10, parallel: 3 },
  { phase: "P3 Lane A", dispatches: 10, parallel: 3 },
  { phase: "P4 Lane D", dispatches: 10, parallel: 3 },
  { phase: "P5 Review", dispatches: 9,  parallel: 3 },
  { phase: "P6 QA",     dispatches: 8,  parallel: 4 },
  { phase: "P7 Merge",  dispatches: 5,  parallel: 2 },
  { phase: "P8 Docs",   dispatches: 3,  parallel: 3 },
];

const BACKLOG_PIE = [
  { name: "AI Chat",     value: 8 },
  { name: "MCP",         value: 3 },
  { name: "Enterprise",  value: 3 },
  { name: "Performance", value: 3 },
  { name: "Testing",     value: 3 },
  { name: "Docs",        value: 2 },
];

const LANE_TREND = [
  { round: "R1 Build",  laneO: 7.2, laneA: 7.5, laneD: 8.1 },
  { round: "R2 Review", laneO: 7.8, laneA: 8.0, laneD: 8.4 },
  { round: "R3 Fix",    laneO: 8.1, laneA: 8.3, laneD: 8.6 },
  { round: "R4 Final",  laneO: 8.4, laneA: 8.5, laneD: 8.9 },
];

const RADAR_DATA = [
  { dim: "Code",    score: 85 },
  { dim: "Fluent2", score: 92 },
  { dim: "UX",      score: 78 },
  { dim: "Arch",    score: 88 },
  { dim: "Perf",    score: 82 },
  { dim: "Innov",   score: 75 },
];

const BUGBASH_DATA = [
  { lane: "Lane O", critical: 1, high: 3, medium: 8 },
  { lane: "Lane A", critical: 0, high: 2, medium: 6 },
  { lane: "Lane D", critical: 0, high: 1, medium: 4 },
];

const KPI_BANK = [
  { label: "Total Dispatches", value: "63",  delta: "8 phases",    up: true },
  { label: "Backlog Items",    value: "22",  delta: "6 areas",     up: true },
  { label: "Scoring Dims",     value: "7",   delta: "Fluent2=20%", up: true },
  { label: "Parallel Max",     value: "30",  delta: "P2-P4",       up: true },
  { label: "Agents Used",      value: "13",  delta: "5 models",    up: true },
  { label: "Fluent 2 Refs",    value: "134", delta: "across docs", up: null as boolean | null },
];

/* ------------------------------------------------------------------ */
/*  TEMPLATES -- 8 slide layouts on a 12x7 grid                       */
/* ------------------------------------------------------------------ */

interface TileDef {
  id: string;
  type: string;
  col: number;
  row: number;
  cs: number;
  rs: number;
}

interface TemplateDef {
  id: string;
  name: string;
  desc: string;
  slideTitle: string;
  slideSubtitle: string;
  tiles: TileDef[];
}

const TEMPLATES: TemplateDef[] = [
  {
    id: "protocol-overview", name: "Protocol Overview", desc: "Hero + pillars + meta",
    slideTitle: "DAYOUR Protocol", slideSubtitle: "da your protocol -- CopilotHub Hackathon Framework",
    tiles: [
      { id: "hero",  type: "hero",           col: 1, row: 1, cs: 12, rs: 2 },
      { id: "cards", type: "overview-cards",  col: 1, row: 3, cs: 8,  rs: 5 },
      { id: "meta",  type: "meta-info",       col: 9, row: 3, cs: 4,  rs: 5 },
    ],
  },
  {
    id: "scoring-dashboard", name: "Scoring Dashboard", desc: "KPIs + scoring charts",
    slideTitle: "Synthesis Scoring Rubric", slideSubtitle: "7 Dimensions -- Fluent 2 at 20%",
    tiles: [
      { id: "hdr", type: "accent-header", col: 1,  row: 1, cs: 12, rs: 1 },
      { id: "m1",  type: "kpi",           col: 1,  row: 2, cs: 3,  rs: 2 },
      { id: "m2",  type: "kpi",           col: 4,  row: 2, cs: 3,  rs: 2 },
      { id: "m3",  type: "kpi",           col: 7,  row: 2, cs: 3,  rs: 2 },
      { id: "m4",  type: "kpi",           col: 10, row: 2, cs: 3,  rs: 2 },
      { id: "bar", type: "bar-chart",     col: 1,  row: 4, cs: 7,  rs: 4 },
      { id: "pie", type: "pie-chart",     col: 8,  row: 4, cs: 5,  rs: 4 },
    ],
  },
  {
    id: "lane-analytics", name: "Lane Analytics", desc: "Trends + radar + bugbash",
    slideTitle: "Lane Performance Analytics", slideSubtitle: "O / A / D Scoring Across Rounds",
    tiles: [
      { id: "hdr",     type: "accent-header", col: 1, row: 1, cs: 12, rs: 1 },
      { id: "line",    type: "line-chart",    col: 1, row: 2, cs: 7,  rs: 3 },
      { id: "radar",   type: "radar-chart",   col: 8, row: 2, cs: 5,  rs: 3 },
      { id: "stacked", type: "stacked-bar",   col: 1, row: 5, cs: 7,  rs: 3 },
      { id: "stats",   type: "stat-block",    col: 8, row: 5, cs: 5,  rs: 3 },
    ],
  },
  {
    id: "lane-comparison", name: "Lane Comparison", desc: "Self vs cross-lane validation",
    slideTitle: "Dual Bugbash Validation", slideSubtitle: "Phase 1 Self-Validation -- Phase 2 Adversarial",
    tiles: [
      { id: "hdr",   type: "accent-header", col: 1, row: 1, cs: 12, rs: 1 },
      { id: "left",  type: "compare-left",  col: 1, row: 2, cs: 6,  rs: 6 },
      { id: "right", type: "compare-right", col: 7, row: 2, cs: 6,  rs: 6 },
    ],
  },
  {
    id: "dispatch-pipeline", name: "Dispatch Pipeline", desc: "63 dispatches across 8 phases",
    slideTitle: "63-Agent Dispatch Pipeline",
    slideSubtitle: "Architecture --> Build --> Review --> QA --> Merge --> Docs",
    tiles: [
      { id: "hdr",    type: "accent-header", col: 1, row: 1, cs: 12, rs: 1 },
      { id: "flow",   type: "pipeline",      col: 1, row: 2, cs: 12, rs: 2 },
      { id: "status", type: "status-grid",   col: 1, row: 4, cs: 5,  rs: 4 },
      { id: "bar2",   type: "bar-chart",     col: 6, row: 4, cs: 7,  rs: 4 },
    ],
  },
  {
    id: "executive-brief", name: "Executive Brief", desc: "Protocol summary + KPIs",
    slideTitle: "DAYOUR Protocol -- Executive Summary",
    slideSubtitle: "CopilotHub 3-Lane Hackathon Execution Framework",
    tiles: [
      { id: "hdr",    type: "accent-header", col: 1, row: 1, cs: 12, rs: 1 },
      { id: "facts",  type: "fact-sheet",    col: 1, row: 2, cs: 5,  rs: 6 },
      { id: "kpi1",   type: "kpi",           col: 6, row: 2, cs: 3,  rs: 2 },
      { id: "kpi2",   type: "kpi",           col: 9, row: 2, cs: 4,  rs: 2 },
      { id: "em1",    type: "emphasis",       col: 6, row: 4, cs: 7,  rs: 2 },
      { id: "table2", type: "table",          col: 6, row: 6, cs: 7,  rs: 2 },
    ],
  },
  {
    id: "backlog-report", name: "Backlog Report", desc: "DAG items + complexity analysis",
    slideTitle: "Implementation Backlog DAG",
    slideSubtitle: "22 Items -- 6 Areas -- Critical Path = 5",
    tiles: [
      { id: "hdr",  type: "accent-header", col: 1, row: 1, cs: 12, rs: 1 },
      { id: "tbl",  type: "table",         col: 1, row: 2, cs: 6,  rs: 4 },
      { id: "line2",type: "line-chart",    col: 7, row: 2, cs: 6,  rs: 4 },
      { id: "pie2", type: "pie-chart",     col: 1, row: 6, cs: 4,  rs: 2 },
      { id: "em2",  type: "emphasis",       col: 5, row: 6, cs: 4,  rs: 2 },
      { id: "kpi5", type: "kpi",           col: 9, row: 6, cs: 4,  rs: 2 },
    ],
  },
  {
    id: "bugbash-board", name: "Bugbash Board", desc: "Validation KPIs + coverage",
    slideTitle: "Dual Bugbash Validation Board",
    slideSubtitle: "Automated Gates -- Fluent 2 Audit -- Severity Tracking",
    tiles: [
      { id: "hdr",    type: "accent-header", col: 1,  row: 1, cs: 12, rs: 1 },
      { id: "k1",     type: "kpi",           col: 1,  row: 2, cs: 2,  rs: 2 },
      { id: "k2",     type: "kpi",           col: 3,  row: 2, cs: 2,  rs: 2 },
      { id: "k3",     type: "kpi",           col: 5,  row: 2, cs: 2,  rs: 2 },
      { id: "k4",     type: "kpi",           col: 7,  row: 2, cs: 2,  rs: 2 },
      { id: "k5",     type: "kpi",           col: 9,  row: 2, cs: 2,  rs: 2 },
      { id: "k6",     type: "kpi",           col: 11, row: 2, cs: 2,  rs: 2 },
      { id: "radar2", type: "radar-chart",   col: 1,  row: 4, cs: 5,  rs: 4 },
      { id: "pie3",   type: "pie-chart",     col: 6,  row: 4, cs: 4,  rs: 4 },
      { id: "line3",  type: "line-chart",    col: 10, row: 4, cs: 3,  rs: 4 },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  HELPER -- resolve KPI for a tile by index within its template     */
/* ------------------------------------------------------------------ */

function getKpiForTile(templateId: string, tileId: string): (typeof KPI_BANK)[0] {
  const tmpl = TEMPLATES.find((t) => t.id === templateId);
  if (!tmpl) return KPI_BANK[0];
  const kpiTiles = tmpl.tiles.filter((t) => t.type === "kpi");
  const idx = kpiTiles.findIndex((t) => t.id === tileId);
  return KPI_BANK[Math.max(0, idx) % KPI_BANK.length];
}

/* ------------------------------------------------------------------ */
/*  CSS-IN-JS helpers                                                 */
/* ------------------------------------------------------------------ */

const css = (obj: Record<string, any>): React.CSSProperties => obj as React.CSSProperties;

const BASE_CARD = (t: any): React.CSSProperties =>
  css({
    background: t.card,
    border: `1px solid ${t.border}`,
    borderRadius: 10,
    padding: 16,
    height: "100%",
    boxSizing: "border-box",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  });

/* ------------------------------------------------------------------ */
/*  TILE COMPONENTS                                                   */
/* ------------------------------------------------------------------ */

function TileHero({ t }: { t: any }) {
  return (
    <div
      style={css({
        background: `linear-gradient(135deg, ${t.bg}, ${t.card}, ${t.accent}22)`,
        border: `1px solid ${t.border}`,
        borderRadius: 10,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        boxSizing: "border-box",
      })}
    >
      <div
        style={css({
          fontSize: 32,
          fontWeight: 800,
          letterSpacing: -1,
          background: `linear-gradient(135deg, ${t.accent}, ${t.accentLight})`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        })}
      >
        DAYOUR Protocol
      </div>
      <div style={{ color: t.textMid, fontSize: 14, letterSpacing: 1.5, textTransform: "uppercase" }}>
        da your protocol
      </div>
      <div style={{ color: t.textSubtle, fontSize: 12, marginTop: 4 }}>
        CopilotHub 3-Lane Hackathon Execution Framework
      </div>
    </div>
  );
}

function TileAccentHeader({ t, template }: { t: any; template: TemplateDef }) {
  return (
    <div
      style={css({
        background: t.headerGrad,
        border: `1px solid ${t.border}`,
        borderRadius: 10,
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        boxSizing: "border-box",
      })}
    >
      <div>
        <span style={{ color: t.text, fontSize: 16, fontWeight: 700 }}>{template.slideTitle}</span>
        <span style={{ color: t.textSubtle, fontSize: 12, marginLeft: 12 }}>{template.slideSubtitle}</span>
      </div>
      <span
        style={css({
          background: t.pill,
          border: `1px solid ${t.pillBorder}`,
          borderRadius: 20,
          padding: "2px 10px",
          fontSize: 10,
          fontWeight: 600,
          color: t.accent,
          letterSpacing: 0.8,
        })}
      >
        LIVE
      </span>
    </div>
  );
}

function TileKPI({ t, kpi }: { t: any; kpi: (typeof KPI_BANK)[0] }) {
  const arrow = kpi.up === true ? "\u2191" : kpi.up === false ? "\u2193" : "\u2022";
  return (
    <div style={{ ...BASE_CARD(t), alignItems: "center", justifyContent: "center", gap: 4, textAlign: "center" }}>
      <div style={{ fontSize: 28, fontWeight: 800, color: t.accent }}>{kpi.value}</div>
      <div style={{ fontSize: 11, fontWeight: 600, color: t.text, textTransform: "uppercase", letterSpacing: 0.5 }}>
        {kpi.label}
      </div>
      <div style={{ fontSize: 10, color: t.textSubtle }}>
        {arrow} {kpi.delta}
      </div>
    </div>
  );
}

function TileBarChart({ t, templateId }: { t: any; templateId: string }) {
  const data = templateId === "dispatch-pipeline" ? DISPATCH_DATA : SCORING_DATA;
  const dataKey = templateId === "dispatch-pipeline" ? "dispatches" : "score";
  const xKey = templateId === "dispatch-pipeline" ? "phase" : "dim";
  return (
    <div style={BASE_CARD(t)}>
      <div style={{ fontSize: 11, fontWeight: 600, color: t.textMid, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
        {templateId === "dispatch-pipeline" ? "Dispatches by Phase" : "Scoring Dimensions"}
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={t.tableBorder} />
            <XAxis dataKey={xKey} tick={{ fill: t.textSubtle, fontSize: 9 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: t.textSubtle, fontSize: 9 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 6, fontSize: 11, color: t.text }}
              itemStyle={{ color: t.text }}
            />
            <Bar dataKey={dataKey} fill={t.accent} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const PIE_COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f43f5e", "#d97706", "#06b6d4"];

function TilePieChart({ t }: { t: any }) {
  return (
    <div style={BASE_CARD(t)}>
      <div style={{ fontSize: 11, fontWeight: 600, color: t.textMid, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
        Backlog Distribution
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={BACKLOG_PIE} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="70%" innerRadius="40%" paddingAngle={2} stroke="none">
              {BACKLOG_PIE.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 6, fontSize: 11, color: t.text }}
              itemStyle={{ color: t.text }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
        {BACKLOG_PIE.map((d, i) => (
          <span key={i} style={{ fontSize: 9, color: t.textSubtle, display: "flex", alignItems: "center", gap: 3 }}>
            <span style={{ width: 6, height: 6, borderRadius: 2, background: PIE_COLORS[i % PIE_COLORS.length], display: "inline-block" }} />
            {d.name}
          </span>
        ))}
      </div>
    </div>
  );
}

function TileLineChart({ t }: { t: any }) {
  return (
    <div style={BASE_CARD(t)}>
      <div style={{ fontSize: 11, fontWeight: 600, color: t.textMid, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
        Lane Scoring Trend
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={LANE_TREND} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={t.tableBorder} />
            <XAxis dataKey="round" tick={{ fill: t.textSubtle, fontSize: 9 }} axisLine={false} tickLine={false} />
            <YAxis domain={[6, 10]} tick={{ fill: t.textSubtle, fontSize: 9 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 6, fontSize: 11, color: t.text }}
              itemStyle={{ color: t.text }}
            />
            <Line type="monotone" dataKey="laneO" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="Lane O" />
            <Line type="monotone" dataKey="laneA" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} name="Lane A" />
            <Line type="monotone" dataKey="laneD" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="Lane D" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function TileRadarChart({ t }: { t: any }) {
  return (
    <div style={BASE_CARD(t)}>
      <div style={{ fontSize: 11, fontWeight: 600, color: t.textMid, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
        Quality Radar
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="65%" data={RADAR_DATA}>
            <PolarGrid stroke={t.tableBorder} />
            <PolarAngleAxis dataKey="dim" tick={{ fill: t.textSubtle, fontSize: 9 }} />
            <Radar dataKey="score" stroke={t.accent} fill={t.accent} fillOpacity={0.25} strokeWidth={2} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function TileStackedBar({ t }: { t: any }) {
  return (
    <div style={BASE_CARD(t)}>
      <div style={{ fontSize: 11, fontWeight: 600, color: t.textMid, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
        Bugbash Severity by Lane
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={BUGBASH_DATA} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={t.tableBorder} />
            <XAxis dataKey="lane" tick={{ fill: t.textSubtle, fontSize: 9 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: t.textSubtle, fontSize: 9 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 6, fontSize: 11, color: t.text }}
              itemStyle={{ color: t.text }}
            />
            <Bar dataKey="critical" stackId="a" fill="#dc2626" radius={[0, 0, 0, 0]} />
            <Bar dataKey="high" stackId="a" fill="#d97706" />
            <Bar dataKey="medium" stackId="a" fill="#3b82f6" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const BACKLOG_TABLE_ROWS = [
  { id: 1,  area: "Chat",        item: "Provider Abstraction",  size: "M", deps: "--" },
  { id: 5,  area: "Chat",        item: "Chat Store (Zustand)",  size: "M", deps: "1" },
  { id: 7,  area: "Chat",        item: "Streaming Engine",      size: "L", deps: "5" },
  { id: 8,  area: "Chat",        item: "Cross-Provider Compare",size: "L", deps: "7" },
  { id: 9,  area: "MCP",         item: "Provider Adapters",     size: "M", deps: "1" },
  { id: 12, area: "Enterprise",  item: "Entra SSO",             size: "M", deps: "--" },
  { id: 15, area: "Performance", item: "Bundle Optimization",   size: "S", deps: "--" },
  { id: 19, area: "Testing",     item: "Integration Tests",     size: "M", deps: "8" },
];

function TileTable({ t }: { t: any }) {
  return (
    <div style={BASE_CARD(t)}>
      <div style={{ fontSize: 11, fontWeight: 600, color: t.textMid, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
        Backlog Items
      </div>
      <div style={{ flex: 1, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10, color: t.text }}>
          <thead>
            <tr>
              {["#", "Area", "Item", "Size", "Deps"].map((h) => (
                <th
                  key={h}
                  style={{
                    background: t.tableHeader,
                    padding: "4px 6px",
                    textAlign: "left",
                    borderBottom: `1px solid ${t.tableBorder}`,
                    fontWeight: 600,
                    color: t.textMid,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {BACKLOG_TABLE_ROWS.map((r) => (
              <tr key={r.id} style={{ background: r.id % 2 === 0 ? t.tableRow : "transparent" }}>
                <td style={{ padding: "3px 6px", borderBottom: `1px solid ${t.tableBorder}` }}>{r.id}</td>
                <td style={{ padding: "3px 6px", borderBottom: `1px solid ${t.tableBorder}`, color: t.accent }}>{r.area}</td>
                <td style={{ padding: "3px 6px", borderBottom: `1px solid ${t.tableBorder}` }}>{r.item}</td>
                <td style={{ padding: "3px 6px", borderBottom: `1px solid ${t.tableBorder}` }}>{r.size}</td>
                <td style={{ padding: "3px 6px", borderBottom: `1px solid ${t.tableBorder}`, color: t.textSubtle }}>{r.deps}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const FACT_ROWS: [string, string][] = [
  ["Protocol", "DAYOUR (da your protocol)"],
  ["Lanes", "O (OpenAI) / A (Anthropic) / D (Dayour)"],
  ["Features", "9 (F-01 through F-09)"],
  ["Dispatches", "63 across 8 phases"],
  ["Scoring", "7 dims, composite 1.00-10.00"],
  ["Fluent 2", "20% weight, mandatory compliance"],
  ["Bugbash", "Dual: self-validation + adversarial"],
  ["Merge", "Best-of-Breed / Hybrid / Winner-Take-All"],
  ["Agents", "13 agents, 5 model families"],
  ["Timeline", "8 days, P2-P4 parallel"],
];

function TileFactSheet({ t }: { t: any }) {
  return (
    <div style={BASE_CARD(t)}>
      <div style={{ fontSize: 11, fontWeight: 600, color: t.textMid, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>
        Protocol Facts
      </div>
      <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
        {FACT_ROWS.map(([k, v], i) => (
          <div key={i} style={{ display: "flex", gap: 8, fontSize: 11, lineHeight: 1.5 }}>
            <span style={{ minWidth: 80, color: t.textSubtle, fontWeight: 600 }}>{k}</span>
            <span style={{ color: t.text }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const PIPELINE_PHASES = [
  { label: "P1 Arch",   n: 8,  done: true },
  { label: "P2 Lane O", n: 10, done: true },
  { label: "P3 Lane A", n: 10, done: true },
  { label: "P4 Lane D", n: 10, done: true },
  { label: "P5 Review", n: 9,  done: false },
  { label: "P6 QA",     n: 8,  done: false },
  { label: "P7 Merge",  n: 5,  done: false },
  { label: "P8 Docs",   n: 3,  done: false },
];

function TilePipeline({ t }: { t: any }) {
  return (
    <div style={{ ...BASE_CARD(t), flexDirection: "row", alignItems: "center", gap: 2, justifyContent: "center" }}>
      {PIPELINE_PHASES.map((p, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center" }}>
          <div
            style={css({
              background: p.done ? t.accent : t.card,
              border: `1px solid ${p.done ? t.accent : t.border}`,
              borderRadius: 6,
              padding: "6px 10px",
              textAlign: "center",
              minWidth: 60,
            })}
          >
            <div style={{ fontSize: 10, fontWeight: 700, color: p.done ? t.bg : t.text }}>{p.label}</div>
            <div style={{ fontSize: 9, color: p.done ? t.bg : t.textSubtle }}>{p.n} dispatches</div>
          </div>
          {i < PIPELINE_PHASES.length - 1 && (
            <span style={{ color: t.textSubtle, fontSize: 12, margin: "0 2px" }}>{"\u2192"}</span>
          )}
        </div>
      ))}
    </div>
  );
}

const STATUS_ITEMS = [
  { label: "TypeScript Gate",   status: "good" as const, detail: "tsc --noEmit pass" },
  { label: "Unit Tests",        status: "good" as const, detail: "All pass, 0 skips" },
  { label: "Build Gate",        status: "good" as const, detail: "Exit code 0" },
  { label: "Coverage",          status: "emphasis" as const, detail: "New code covered" },
  { label: "Fluent 2 Audit",    status: "emphasis" as const, detail: "Token compliance" },
  { label: "Regression",        status: "danger" as const, detail: "1 flaky test" },
];

function TileStatusGrid({ t }: { t: any }) {
  return (
    <div style={BASE_CARD(t)}>
      <div style={{ fontSize: 11, fontWeight: 600, color: t.textMid, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
        Protocol Health
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, overflow: "auto" }}>
        {STATUS_ITEMS.map((s, i) => {
          const bgKey = s.status + "Bg" as "goodBg" | "dangerBg" | "emphasisBg";
          const borderKey = s.status + "Border" as "goodBorder" | "dangerBorder" | "emphasisBorder";
          const leftKey = s.status + "Left" as "goodLeft" | "dangerLeft" | "emphasisLeft";
          return (
            <div
              key={i}
              style={css({
                background: t[bgKey],
                border: `1px solid ${t[borderKey]}`,
                borderLeft: `3px solid ${t[leftKey]}`,
                borderRadius: 6,
                padding: "6px 10px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              })}
            >
              <span style={{ fontSize: 11, fontWeight: 600, color: t.text }}>{s.label}</span>
              <span style={{ fontSize: 10, color: t.textSubtle }}>{s.detail}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const OVERVIEW_PILLARS = [
  { title: "3-Lane Execution",        desc: "OpenAI, Anthropic, Dayour competing in parallel" },
  { title: "9 Feature Set",           desc: "F-01 to F-09 identical scope per lane" },
  { title: "63 Agent Dispatches",     desc: "8 phases, max 30 parallel" },
  { title: "7-Dim Scoring",           desc: "Composite rubric, Fluent 2 at 20% weight" },
  { title: "Dual Bugbash",            desc: "Self-validation then adversarial cross-lane" },
  { title: "Fluent 2 Mandate",        desc: "Tokens, spacing, elevation, density modes" },
  { title: "Synthesis Merge",         desc: "Best-of-Breed / Hybrid / Winner-Take-All" },
  { title: "8-Day Timeline",          desc: "Architecture --> Build --> Review --> Ship" },
];

function TileOverviewCards({ t }: { t: any }) {
  return (
    <div style={{ ...BASE_CARD(t), flexDirection: "row", flexWrap: "wrap", gap: 8, overflow: "auto" }}>
      {OVERVIEW_PILLARS.map((p, i) => (
        <div
          key={i}
          style={css({
            background: t.emphasisBg,
            border: `1px solid ${t.border}`,
            borderRadius: 8,
            padding: "10px 12px",
            flex: "1 1 calc(50% - 12px)",
            minWidth: 140,
          })}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: t.accent, marginBottom: 4 }}>{p.title}</div>
          <div style={{ fontSize: 10, color: t.textSubtle, lineHeight: 1.4 }}>{p.desc}</div>
        </div>
      ))}
    </div>
  );
}

function TileMetaInfo({ t }: { t: any }) {
  const items: [string, string][] = [
    ["Date",    "2025"],
    ["Author",  "DAYOURBOT Swarm"],
    ["Pages",   "8 slide templates"],
    ["Schema",  "adaptive-slide/v1.0"],
    ["Status",  "Active Development"],
    ["Lanes",   "O / A / D"],
    ["Grid",    "12 x 7"],
    ["Themes",  "8 curated"],
  ];
  return (
    <div style={BASE_CARD(t)}>
      <div style={{ fontSize: 11, fontWeight: 600, color: t.textMid, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>
        Metadata
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map(([k, v], i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
            <span style={{ color: t.textSubtle }}>{k}</span>
            <span style={{ color: t.text, fontWeight: 600 }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TileEmphasis({ t }: { t: any }) {
  return (
    <div
      style={css({
        ...BASE_CARD(t),
        background: t.emphasisBg,
        borderLeft: `3px solid ${t.emphasisLeft}`,
        justifyContent: "center",
        gap: 8,
      })}
    >
      <div style={{ fontSize: 12, fontWeight: 700, color: t.accent }}>Fluent 2 Design Mandate</div>
      <div style={{ fontSize: 11, color: t.textMid, lineHeight: 1.6, fontStyle: "italic" }}>
        All UI must use Microsoft Fluent 2 tokens -- colors, 4px spacing grid, Segoe UI typography, motion tokens, elevation shadows, density modes.
      </div>
      <div style={{ fontSize: 10, color: t.textSubtle }}>Weight: 20% of composite score</div>
    </div>
  );
}

const SELF_GATES = [
  "tsc --noEmit: zero errors",
  "Unit tests: all pass, no skips",
  "Build: exit code 0",
  "Regression: no broken tests",
  "Coverage: new code has tests",
  "Fluent 2: no hardcoded colors/spacing",
  "Manual: 8 checkpoints reviewed",
];

function TileCompareLeft({ t }: { t: any }) {
  return (
    <div style={BASE_CARD(t)}>
      <div style={{ fontSize: 13, fontWeight: 700, color: t.accent, marginBottom: 10 }}>SELF-VALIDATION</div>
      <div style={{ fontSize: 11, color: t.textMid, marginBottom: 12 }}>Phase 1 -- Automated Gates + Manual Review</div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, overflow: "auto" }}>
        {SELF_GATES.map((g, i) => (
          <div
            key={i}
            style={css({
              background: t.goodBg,
              border: `1px solid ${t.goodBorder}`,
              borderLeft: `3px solid ${t.goodLeft}`,
              borderRadius: 6,
              padding: "6px 10px",
              fontSize: 11,
              color: t.text,
            })}
          >
            {g}
          </div>
        ))}
      </div>
    </div>
  );
}

const ADVERSARIAL_ITEMS = [
  "Cross-lane code review (O tests A+D, etc.)",
  "Severity matrix: Critical / High / Medium / Low",
  "Revert triggers: 1 Critical >2h or 2+ Criticals",
  "Sign-off: 2-of-3 lanes approve",
  "Architect + Evaluation agent sign-off",
  "No unresolved Fluent 2 High+ violations",
  "Bug filing template with regression flag",
];

function TileCompareRight({ t }: { t: any }) {
  return (
    <div style={BASE_CARD(t)}>
      <div style={{ fontSize: 13, fontWeight: 700, color: t.accent, marginBottom: 10 }}>CROSS-LANE ADVERSARIAL</div>
      <div style={{ fontSize: 11, color: t.textMid, marginBottom: 12 }}>Phase 2 -- Competitive Testing + Sign-Off</div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, overflow: "auto" }}>
        {ADVERSARIAL_ITEMS.map((g, i) => (
          <div
            key={i}
            style={css({
              background: t.dangerBg,
              border: `1px solid ${t.dangerBorder}`,
              borderLeft: `3px solid ${t.dangerLeft}`,
              borderRadius: 6,
              padding: "6px 10px",
              fontSize: 11,
              color: t.text,
            })}
          >
            {g}
          </div>
        ))}
      </div>
    </div>
  );
}

const STAT_DELTAS = [
  { label: "Lane O R1\u2192R4", from: "7.2", to: "8.4", delta: "+1.2" },
  { label: "Lane A R1\u2192R4", from: "7.5", to: "8.5", delta: "+1.0" },
  { label: "Lane D R1\u2192R4", from: "8.1", to: "8.9", delta: "+0.8" },
  { label: "Avg Composite",     from: "7.6", to: "8.6", delta: "+1.0" },
  { label: "Critical Bugs",     from: "3",   to: "1",   delta: "-2" },
  { label: "Fluent 2 Score",    from: "78",  to: "92",  delta: "+14" },
];

function TileStatBlock({ t }: { t: any }) {
  return (
    <div style={BASE_CARD(t)}>
      <div style={{ fontSize: 11, fontWeight: 600, color: t.textMid, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
        Period Deltas
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5, overflow: "auto" }}>
        {STAT_DELTAS.map((s, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11 }}>
            <span style={{ color: t.textSubtle, flex: 1 }}>{s.label}</span>
            <span style={{ color: t.textSubtle, width: 36, textAlign: "right" }}>{s.from}</span>
            <span style={{ color: t.textSubtle, margin: "0 4px" }}>{"\u2192"}</span>
            <span style={{ color: t.text, width: 36, fontWeight: 600 }}>{s.to}</span>
            <span
              style={{
                color: s.delta.startsWith("+") ? "#10b981" : "#ef4444",
                fontWeight: 700,
                width: 40,
                textAlign: "right",
              }}
            >
              {s.delta}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  RENDER TILE -- maps tile.type to the correct component            */
/* ------------------------------------------------------------------ */

function RenderTile({ tile, t, template }: { tile: TileDef; t: any; template: TemplateDef }) {
  switch (tile.type) {
    case "hero":           return <TileHero t={t} />;
    case "accent-header":  return <TileAccentHeader t={t} template={template} />;
    case "kpi":            return <TileKPI t={t} kpi={getKpiForTile(template.id, tile.id)} />;
    case "bar-chart":      return <TileBarChart t={t} templateId={template.id} />;
    case "pie-chart":      return <TilePieChart t={t} />;
    case "line-chart":     return <TileLineChart t={t} />;
    case "radar-chart":    return <TileRadarChart t={t} />;
    case "stacked-bar":    return <TileStackedBar t={t} />;
    case "table":          return <TileTable t={t} />;
    case "fact-sheet":     return <TileFactSheet t={t} />;
    case "pipeline":       return <TilePipeline t={t} />;
    case "status-grid":    return <TileStatusGrid t={t} />;
    case "overview-cards": return <TileOverviewCards t={t} />;
    case "meta-info":      return <TileMetaInfo t={t} />;
    case "emphasis":       return <TileEmphasis t={t} />;
    case "compare-left":   return <TileCompareLeft t={t} />;
    case "compare-right":  return <TileCompareRight t={t} />;
    case "stat-block":     return <TileStatBlock t={t} />;
    default:
      return (
        <div style={{ ...BASE_CARD(t), alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: t.textSubtle, fontSize: 11 }}>{tile.type}</span>
        </div>
      );
  }
}

/* ------------------------------------------------------------------ */
/*  LIVE TILE -- selection shell with hover + corner handles           */
/* ------------------------------------------------------------------ */

function LiveTile({
  tile, t, template, selected, onSelect,
}: {
  tile: TileDef; t: any; template: TemplateDef; selected: boolean; onSelect: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const highlight = selected || hovered;
  const handleStyle: React.CSSProperties = {
    position: "absolute",
    width: 7,
    height: 7,
    borderRadius: 2,
    background: t.accent,
    border: `1px solid ${t.bg}`,
  };
  return (
    <div
      style={css({
        gridColumn: `${tile.col} / span ${tile.cs}`,
        gridRow: `${tile.row} / span ${tile.rs}`,
        position: "relative",
        outline: highlight ? `2px solid ${t.accent}` : "2px solid transparent",
        outlineOffset: -1,
        borderRadius: 10,
        cursor: "pointer",
        transition: "outline 0.15s",
      })}
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <RenderTile tile={tile} t={t} template={template} />
      {highlight && (
        <>
          <div style={{ ...handleStyle, top: -3, left: -3 }} />
          <div style={{ ...handleStyle, top: -3, right: -3 }} />
          <div style={{ ...handleStyle, bottom: -3, left: -3 }} />
          <div style={{ ...handleStyle, bottom: -3, right: -3 }} />
        </>
      )}
      {highlight && (
        <div
          style={css({
            position: "absolute",
            top: 4,
            right: 6,
            fontSize: 8,
            fontWeight: 700,
            color: t.accent,
            background: t.bg,
            border: `1px solid ${t.border}`,
            borderRadius: 4,
            padding: "1px 5px",
            letterSpacing: 0.5,
            textTransform: "uppercase",
          })}
        >
          {tile.type}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  JSON VIEW -- syntax-highlighted JSON panel                        */
/* ------------------------------------------------------------------ */

function JsonView({ data, t }: { data: any; t: any }) {
  const raw = JSON.stringify(data, null, 2);
  const colorize = (line: string): { __html: string } => {
    let html = line
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    html = html.replace(/"([^"]+)":/g, `<span style="color:${t.accentLight}">&quot;$1&quot;</span>:`);
    html = html.replace(/: "([^"]*)"/g, `: <span style="color:#34d399">&quot;$1&quot;</span>`);
    html = html.replace(/: (\d+\.?\d*)/g, `: <span style="color:#fbbf24">$1</span>`);
    html = html.replace(/: (true|false|null)/g, `: <span style="color:#f472b6">$1</span>`);
    return { __html: html };
  };
  return (
    <pre
      style={css({
        background: t.bg,
        color: t.textMid,
        fontSize: 10,
        fontFamily: "Consolas, monospace",
        margin: 0,
        padding: 12,
        overflow: "auto",
        height: "100%",
        boxSizing: "border-box",
        lineHeight: 1.6,
        whiteSpace: "pre-wrap",
        wordBreak: "break-all",
      })}
    >
      {raw.split("\n").map((line, i) => (
        <div key={i} style={{ display: "flex" }}>
          <span style={{ color: t.textSubtle, width: 32, textAlign: "right", marginRight: 8, userSelect: "none", flexShrink: 0 }}>{i + 1}</span>
          <span dangerouslySetInnerHTML={colorize(line)} />
        </div>
      ))}
    </pre>
  );
}

/* ------------------------------------------------------------------ */
/*  TEMPLATE THUMBNAIL -- for the template strip                      */
/* ------------------------------------------------------------------ */

function TemplateThumbnail({
  tmpl, t, active, onClick,
}: {
  tmpl: TemplateDef; t: any; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={css({
        background: active ? t.accent + "18" : t.card,
        border: `1px solid ${active ? t.accent : t.border}`,
        borderRadius: 8,
        padding: "8px 10px",
        cursor: "pointer",
        textAlign: "left",
        minWidth: 140,
        flexShrink: 0,
        outline: "none",
      })}
    >
      <div style={{ fontSize: 11, fontWeight: 700, color: active ? t.accent : t.text }}>{tmpl.name}</div>
      <div style={{ fontSize: 9, color: t.textSubtle, marginTop: 2 }}>{tmpl.desc}</div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  BUILD SLIDE JSON -- adaptive-slide/v1.0 schema export             */
/* ------------------------------------------------------------------ */

function getTileContent(tile: TileDef, templateId: string): Record<string, any> {
  switch (tile.type) {
    case "hero":
      return { heading: "DAYOUR Protocol", tagline: "da your protocol", subtitle: "CopilotHub 3-Lane Hackathon Execution Framework" };
    case "accent-header": {
      const tmpl = TEMPLATES.find((t) => t.id === templateId);
      return { title: tmpl?.slideTitle ?? "", subtitle: tmpl?.slideSubtitle ?? "", badge: "LIVE" };
    }
    case "kpi": {
      const kpi = getKpiForTile(templateId, tile.id);
      return { label: kpi.label, value: kpi.value, delta: kpi.delta, up: kpi.up };
    }
    case "bar-chart":
      return { data: templateId === "dispatch-pipeline" ? DISPATCH_DATA : SCORING_DATA };
    case "pie-chart":
      return { data: BACKLOG_PIE };
    case "line-chart":
      return { data: LANE_TREND, lines: ["laneO", "laneA", "laneD"] };
    case "radar-chart":
      return { data: RADAR_DATA };
    case "stacked-bar":
      return { data: BUGBASH_DATA, stacks: ["critical", "high", "medium"] };
    case "table":
      return { rows: BACKLOG_TABLE_ROWS };
    case "fact-sheet":
      return { facts: FACT_ROWS };
    case "pipeline":
      return { phases: PIPELINE_PHASES };
    case "status-grid":
      return { items: STATUS_ITEMS };
    case "overview-cards":
      return { pillars: OVERVIEW_PILLARS };
    case "meta-info":
      return { schema: "adaptive-slide/v1.0", grid: "12x7", themes: Object.keys(THEMES).length };
    case "emphasis":
      return { title: "Fluent 2 Design Mandate", body: "All UI must use Microsoft Fluent 2 tokens.", weight: "20%" };
    case "compare-left":
      return { heading: "SELF-VALIDATION", phase: 1, gates: SELF_GATES };
    case "compare-right":
      return { heading: "CROSS-LANE ADVERSARIAL", phase: 2, items: ADVERSARIAL_ITEMS };
    case "stat-block":
      return { deltas: STAT_DELTAS };
    default:
      return {};
  }
}

function buildSlideJSON(template: TemplateDef, themeId: string): Record<string, any> {
  return {
    "$schema": "adaptive-slide/v1.0",
    id: template.id,
    title: template.slideTitle,
    subtitle: template.slideSubtitle,
    theme: themeId,
    grid: { columns: 12, rows: 7 },
    tiles: template.tiles.map((tile) => ({
      id: tile.id,
      type: tile.type,
      position: { col: tile.col, row: tile.row, colSpan: tile.cs, rowSpan: tile.rs },
      content: getTileContent(tile, template.id),
    })),
  };
}

/* ------------------------------------------------------------------ */
/*  ROOT APP                                                          */
/* ------------------------------------------------------------------ */

export function DayourProtocolSlides() {
  return <DayourProtocolSlidesInner />;
}

export default function DayourProtocolSlidesInner() {
  const [themeId, setThemeId] = useState("midnight-sapphire");
  const [templateIdx, setTemplateIdx] = useState(0);
  const [selectedTile, setSelectedTile] = useState<string | null>(null);
  const [showJson, setShowJson] = useState(false);

  const t = THEMES[themeId];
  const template = TEMPLATES[templateIdx];
  const slideJson = buildSlideJSON(template, themeId);

  return (
    <div
      style={css({
        width: "100vw",
        height: "100vh",
        background: t.bg,
        color: t.text,
        fontFamily: "'Segoe UI Variable', 'Segoe UI', system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      })}
    >
      {/* TOP BAR */}
      <div
        style={css({
          height: 48,
          background: t.card,
          borderBottom: `1px solid ${t.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          flexShrink: 0,
        })}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: t.accent }}>DAYOUR Protocol</span>
          <span style={{ fontSize: 10, color: t.textSubtle, letterSpacing: 0.6 }}>
            {template.name} ({templateIdx + 1}/{TEMPLATES.length})
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Theme switcher */}
          <select
            value={themeId}
            onChange={(e) => setThemeId(e.target.value)}
            style={css({
              background: t.bg,
              color: t.text,
              border: `1px solid ${t.border}`,
              borderRadius: 6,
              padding: "4px 8px",
              fontSize: 11,
              outline: "none",
              cursor: "pointer",
            })}
          >
            {Object.entries(THEMES).map(([id, th]) => (
              <option key={id} value={id}>{th.name}</option>
            ))}
          </select>
          {/* JSON toggle */}
          <button
            onClick={() => setShowJson(!showJson)}
            style={css({
              background: showJson ? t.accent : t.bg,
              color: showJson ? t.bg : t.text,
              border: `1px solid ${t.border}`,
              borderRadius: 6,
              padding: "4px 10px",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              outline: "none",
            })}
          >
            {showJson ? "Canvas" : "JSON"}
          </button>
          {/* Slide nav */}
          <button
            disabled={templateIdx === 0}
            onClick={() => { setTemplateIdx(templateIdx - 1); setSelectedTile(null); }}
            style={css({
              background: t.bg,
              color: templateIdx === 0 ? t.textSubtle : t.text,
              border: `1px solid ${t.border}`,
              borderRadius: 6,
              padding: "4px 10px",
              fontSize: 13,
              cursor: templateIdx === 0 ? "default" : "pointer",
              outline: "none",
            })}
          >
            {"\u2190"}
          </button>
          <button
            disabled={templateIdx === TEMPLATES.length - 1}
            onClick={() => { setTemplateIdx(templateIdx + 1); setSelectedTile(null); }}
            style={css({
              background: t.bg,
              color: templateIdx === TEMPLATES.length - 1 ? t.textSubtle : t.text,
              border: `1px solid ${t.border}`,
              borderRadius: 6,
              padding: "4px 10px",
              fontSize: 13,
              cursor: templateIdx === TEMPLATES.length - 1 ? "default" : "pointer",
              outline: "none",
            })}
          >
            {"\u2192"}
          </button>
        </div>
      </div>

      {/* MAIN AREA */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* CANVAS / JSON */}
        <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
          {showJson ? (
            <div
              style={css({
                background: t.card,
                border: `1px solid ${t.border}`,
                borderRadius: 10,
                height: "100%",
                overflow: "hidden",
              })}
            >
              <JsonView data={slideJson} t={t} />
            </div>
          ) : (
            <div
              style={css({
                display: "grid",
                gridTemplateColumns: "repeat(12, 1fr)",
                gridTemplateRows: "repeat(7, 1fr)",
                gap: 8,
                height: "100%",
              })}
            >
              {template.tiles.map((tile) => (
                <LiveTile
                  key={tile.id}
                  tile={tile}
                  t={t}
                  template={template}
                  selected={selectedTile === tile.id}
                  onSelect={() => setSelectedTile(selectedTile === tile.id ? null : tile.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* TEMPLATE STRIP */}
        <div
          style={css({
            height: 64,
            background: t.card,
            borderTop: `1px solid ${t.border}`,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "0 16px",
            overflowX: "auto",
            flexShrink: 0,
          })}
        >
          {TEMPLATES.map((tmpl, i) => (
            <TemplateThumbnail
              key={tmpl.id}
              tmpl={tmpl}
              t={t}
              active={i === templateIdx}
              onClick={() => { setTemplateIdx(i); setSelectedTile(null); }}
            />
          ))}
          {/* Swatches */}
          <div style={{ marginLeft: "auto", display: "flex", gap: 4, alignItems: "center", flexShrink: 0 }}>
            {t.swatches.map((c: string, i: number) => (
              <div
                key={i}
                style={{ width: 14, height: 14, borderRadius: 3, background: c, border: `1px solid ${t.border}` }}
                title={c}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
