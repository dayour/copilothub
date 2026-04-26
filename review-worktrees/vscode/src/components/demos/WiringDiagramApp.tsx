import {
  useCallback,
  useMemo,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
  type SVGProps,
} from 'react';
import {
  Battery,
  Cable,
  Circle,
  Cog,
  Grid3x3,
  Minus,
  MousePointer,
  Plus,
  ToggleLeft,
  Trash2,
  Wifi,
  Zap,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

type WireColor = 'power' | 'ground' | 'signal' | 'data';

interface Port {
  id: string;
  kind: 'input' | 'output';
  /** Relative position within component bounds (0-1 fraction) */
  rx: number;
  ry: number;
  wireColor: WireColor;
}

interface ComponentDef {
  type: string;
  label: string;
  Icon: React.FC<SVGProps<SVGSVGElement> & { size?: number | string }>;
  width: number;
  height: number;
  ports: Port[];
  defaultValue: string;
  iconColor: string;
}

interface PlacedComponent {
  id: string;
  type: string;
  x: number;
  y: number;
  label: string;
  value: string;
}

interface Wire {
  id: string;
  fromComponent: string;
  fromPort: string;
  toComponent: string;
  toPort: string;
  color: WireColor;
}

type Mode = 'select' | 'wire';

interface State {
  components: PlacedComponent[];
  wires: Wire[];
  selectedId: string | null;
  selectedWireId: string | null;
  mode: Mode;
  zoom: number;
  showGrid: boolean;
  pendingWire: { componentId: string; portId: string } | null;
  nextId: number;
}

type Action =
  | { type: 'ADD_COMPONENT'; compType: string; x: number; y: number }
  | { type: 'MOVE_COMPONENT'; id: string; x: number; y: number }
  | { type: 'SELECT'; id: string | null }
  | { type: 'SELECT_WIRE'; id: string | null }
  | { type: 'DELETE_SELECTED' }
  | { type: 'CLEAR_ALL' }
  | { type: 'SET_MODE'; mode: Mode }
  | { type: 'ZOOM'; delta: number }
  | { type: 'TOGGLE_GRID' }
  | { type: 'START_WIRE'; componentId: string; portId: string }
  | { type: 'FINISH_WIRE'; componentId: string; portId: string }
  | { type: 'CANCEL_WIRE' }
  | { type: 'UPDATE_VALUE'; id: string; value: string }
  | { type: 'UPDATE_LABEL'; id: string; label: string };

/* -------------------------------------------------------------------------- */
/*  Constants                                                                  */
/* -------------------------------------------------------------------------- */

const WIRE_COLORS: Record<WireColor, string> = {
  power: '#e53935',
  ground: '#263238',
  signal: '#1e88e5',
  data: '#43a047',
};

const COMPONENT_DEFS: Record<string, ComponentDef> = {
  battery: {
    type: 'battery',
    label: 'Battery',
    Icon: Battery,
    width: 90,
    height: 60,
    ports: [
      { id: 'out', kind: 'output', rx: 1, ry: 0.5, wireColor: 'power' },
    ],
    defaultValue: '9V',
    iconColor: 'var(--color-status-warning)',
  },
  resistor: {
    type: 'resistor',
    label: 'Resistor',
    Icon: Zap,
    width: 80,
    height: 50,
    ports: [
      { id: 'in', kind: 'input', rx: 0, ry: 0.5, wireColor: 'signal' },
      { id: 'out', kind: 'output', rx: 1, ry: 0.5, wireColor: 'signal' },
    ],
    defaultValue: '220\u03A9',
    iconColor: 'var(--color-status-info)',
  },
  led: {
    type: 'led',
    label: 'LED',
    Icon: Zap,
    width: 70,
    height: 50,
    ports: [
      { id: 'in', kind: 'input', rx: 0, ry: 0.5, wireColor: 'power' },
      { id: 'out', kind: 'output', rx: 1, ry: 0.5, wireColor: 'ground' },
    ],
    defaultValue: 'Red',
    iconColor: '#f44747',
  },
  switch: {
    type: 'switch',
    label: 'Switch',
    Icon: ToggleLeft,
    width: 80,
    height: 50,
    ports: [
      { id: 'in', kind: 'input', rx: 0, ry: 0.5, wireColor: 'power' },
      { id: 'out', kind: 'output', rx: 1, ry: 0.5, wireColor: 'power' },
    ],
    defaultValue: 'SPST',
    iconColor: 'var(--color-status-success)',
  },
  motor: {
    type: 'motor',
    label: 'Motor',
    Icon: Cog,
    width: 80,
    height: 60,
    ports: [
      { id: 'in', kind: 'input', rx: 0, ry: 0.3, wireColor: 'power' },
      { id: 'gnd', kind: 'input', rx: 0, ry: 0.7, wireColor: 'ground' },
    ],
    defaultValue: '5V DC',
    iconColor: 'var(--color-accent-primary)',
  },
  sensor: {
    type: 'sensor',
    label: 'Sensor',
    Icon: Wifi,
    width: 80,
    height: 55,
    ports: [
      { id: 'vcc', kind: 'input', rx: 0, ry: 0.3, wireColor: 'power' },
      { id: 'gnd', kind: 'input', rx: 0, ry: 0.7, wireColor: 'ground' },
      { id: 'data', kind: 'output', rx: 1, ry: 0.5, wireColor: 'data' },
    ],
    defaultValue: 'Temp',
    iconColor: '#ce93d8',
  },
  controller: {
    type: 'controller',
    label: 'Controller',
    Icon: Cog,
    width: 100,
    height: 70,
    ports: [
      { id: 'vcc', kind: 'input', rx: 0, ry: 0.2, wireColor: 'power' },
      { id: 'gnd', kind: 'input', rx: 0, ry: 0.8, wireColor: 'ground' },
      { id: 'din', kind: 'input', rx: 0, ry: 0.5, wireColor: 'data' },
      { id: 'dout', kind: 'output', rx: 1, ry: 0.5, wireColor: 'data' },
    ],
    defaultValue: 'MCU',
    iconColor: '#4fc3f7',
  },
  ground: {
    type: 'ground',
    label: 'Ground',
    Icon: Circle,
    width: 60,
    height: 50,
    ports: [
      { id: 'in', kind: 'input', rx: 0.5, ry: 0, wireColor: 'ground' },
    ],
    defaultValue: 'GND',
    iconColor: 'var(--color-text-muted)',
  },
  junction: {
    type: 'junction',
    label: 'Junction',
    Icon: Cable,
    width: 50,
    height: 50,
    ports: [
      { id: 'a', kind: 'input', rx: 0, ry: 0.5, wireColor: 'signal' },
      { id: 'b', kind: 'output', rx: 1, ry: 0.5, wireColor: 'signal' },
      { id: 'c', kind: 'output', rx: 0.5, ry: 1, wireColor: 'signal' },
    ],
    defaultValue: 'Node',
    iconColor: 'var(--color-text-secondary)',
  },
};

const PALETTE_ORDER = [
  'battery',
  'resistor',
  'led',
  'switch',
  'motor',
  'sensor',
  'controller',
  'ground',
  'junction',
] as const;

/* -------------------------------------------------------------------------- */
/*  Seed circuit: battery -> switch -> LED -> ground                           */
/* -------------------------------------------------------------------------- */

function seedState(): State {
  const components: PlacedComponent[] = [
    { id: 'c1', type: 'battery', x: 80, y: 200, label: 'Battery', value: '9V' },
    { id: 'c2', type: 'switch', x: 250, y: 200, label: 'Switch', value: 'SPST' },
    { id: 'c3', type: 'led', x: 420, y: 200, label: 'LED', value: 'Red' },
    { id: 'c4', type: 'ground', x: 570, y: 200, label: 'Ground', value: 'GND' },
  ];
  const wires: Wire[] = [
    { id: 'w1', fromComponent: 'c1', fromPort: 'out', toComponent: 'c2', toPort: 'in', color: 'power' },
    { id: 'w2', fromComponent: 'c2', fromPort: 'out', toComponent: 'c3', toPort: 'in', color: 'power' },
    { id: 'w3', fromComponent: 'c3', fromPort: 'out', toComponent: 'c4', toPort: 'in', color: 'ground' },
  ];
  return {
    components,
    wires,
    selectedId: null,
    selectedWireId: null,
    mode: 'select',
    zoom: 1,
    showGrid: true,
    pendingWire: null,
    nextId: 5,
  };
}

/* -------------------------------------------------------------------------- */
/*  Reducer                                                                    */
/* -------------------------------------------------------------------------- */

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ADD_COMPONENT': {
      const def = COMPONENT_DEFS[action.compType];
      if (!def) return state;
      const id = `c${state.nextId}`;
      const comp: PlacedComponent = {
        id,
        type: action.compType,
        x: action.x,
        y: action.y,
        label: def.label,
        value: def.defaultValue,
      };
      return {
        ...state,
        components: [...state.components, comp],
        selectedId: id,
        selectedWireId: null,
        nextId: state.nextId + 1,
      };
    }

    case 'MOVE_COMPONENT':
      return {
        ...state,
        components: state.components.map((c) =>
          c.id === action.id ? { ...c, x: action.x, y: action.y } : c,
        ),
      };

    case 'SELECT':
      return { ...state, selectedId: action.id, selectedWireId: null };

    case 'SELECT_WIRE':
      return { ...state, selectedWireId: action.id, selectedId: null };

    case 'DELETE_SELECTED': {
      if (state.selectedWireId) {
        return {
          ...state,
          wires: state.wires.filter((w) => w.id !== state.selectedWireId),
          selectedWireId: null,
        };
      }
      if (state.selectedId) {
        return {
          ...state,
          components: state.components.filter((c) => c.id !== state.selectedId),
          wires: state.wires.filter(
            (w) => w.fromComponent !== state.selectedId && w.toComponent !== state.selectedId,
          ),
          selectedId: null,
        };
      }
      return state;
    }

    case 'CLEAR_ALL':
      return { ...seedState(), components: [], wires: [], nextId: state.nextId };

    case 'SET_MODE':
      return { ...state, mode: action.mode, pendingWire: null };

    case 'ZOOM': {
      const next = Math.max(0.25, Math.min(3, state.zoom + action.delta));
      return { ...state, zoom: next };
    }

    case 'TOGGLE_GRID':
      return { ...state, showGrid: !state.showGrid };

    case 'START_WIRE':
      return { ...state, pendingWire: { componentId: action.componentId, portId: action.portId } };

    case 'FINISH_WIRE': {
      if (!state.pendingWire) return state;
      if (
        state.pendingWire.componentId === action.componentId &&
        state.pendingWire.portId === action.portId
      )
        return { ...state, pendingWire: null };

      // Determine wire color from the source port
      const srcComp = state.components.find((c) => c.id === state.pendingWire!.componentId);
      const srcDef = srcComp ? COMPONENT_DEFS[srcComp.type] : undefined;
      const srcPort = srcDef?.ports.find((p) => p.id === state.pendingWire!.portId);
      const wireColor: WireColor = srcPort?.wireColor ?? 'signal';

      const wire: Wire = {
        id: `w${state.nextId}`,
        fromComponent: state.pendingWire.componentId,
        fromPort: state.pendingWire.portId,
        toComponent: action.componentId,
        toPort: action.portId,
        color: wireColor,
      };
      return {
        ...state,
        wires: [...state.wires, wire],
        pendingWire: null,
        nextId: state.nextId + 1,
      };
    }

    case 'CANCEL_WIRE':
      return { ...state, pendingWire: null };

    case 'UPDATE_VALUE':
      return {
        ...state,
        components: state.components.map((c) =>
          c.id === action.id ? { ...c, value: action.value } : c,
        ),
      };

    case 'UPDATE_LABEL':
      return {
        ...state,
        components: state.components.map((c) =>
          c.id === action.id ? { ...c, label: action.label } : c,
        ),
      };

    default:
      return state;
  }
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function portAbsolutePos(
  comp: PlacedComponent,
  port: Port,
): { x: number; y: number } {
  const def = COMPONENT_DEFS[comp.type];
  if (!def) return { x: comp.x, y: comp.y };
  return {
    x: comp.x + port.rx * def.width,
    y: comp.y + port.ry * def.height,
  };
}

function bezierPath(x1: number, y1: number, x2: number, y2: number): string {
  const dx = Math.abs(x2 - x1) * 0.5;
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
}

/* -------------------------------------------------------------------------- */
/*  Styles                                                                     */
/* -------------------------------------------------------------------------- */

const panelStyle: CSSProperties = {
  background: 'var(--color-surface-secondary)',
  borderRight: '1px solid var(--color-surface-elevated)',
  boxShadow:
    '4px 0 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)',
};

const rightPanelStyle: CSSProperties = {
  background: 'var(--color-surface-secondary)',
  borderLeft: '1px solid var(--color-surface-elevated)',
  boxShadow:
    '-4px 0 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)',
};

const toolbarBtnBase: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 34,
  height: 34,
  borderRadius: 6,
  border: '1px solid var(--color-surface-elevated)',
  background: 'var(--color-surface-tertiary)',
  color: 'var(--color-text-secondary)',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  boxShadow: '0 2px 6px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.05)',
};

const toolbarBtnActive: CSSProperties = {
  ...toolbarBtnBase,
  background: 'var(--color-accent-primary)',
  color: '#fff',
  borderColor: 'var(--color-accent-hover)',
  boxShadow: '0 2px 10px rgba(0,120,212,0.4), inset 0 1px 0 rgba(255,255,255,0.12)',
};

const cardVolumetric: CSSProperties = {
  boxShadow:
    '0 8px 24px rgba(0,0,0,0.45), 0 2px 6px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)',
  transform: 'perspective(800px) rotateX(1deg)',
};

const paletteItemStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid var(--color-surface-elevated)',
  background:
    'linear-gradient(180deg, var(--color-surface-tertiary) 0%, var(--color-surface-secondary) 100%)',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  boxShadow:
    '0 4px 12px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.06)',
  transform: 'perspective(600px) rotateX(1deg)',
};

/* -------------------------------------------------------------------------- */
/*  Sub-components                                                             */
/* -------------------------------------------------------------------------- */

function PortCircle({
  cx,
  cy,
  port,
  isActive,
  onClick,
}: {
  cx: number;
  cy: number;
  port: Port;
  isActive: boolean;
  onClick: () => void;
}) {
  const fill = WIRE_COLORS[port.wireColor];
  return (
    <g>
      {/* Hit area */}
      <circle
        cx={cx}
        cy={cy}
        r={10}
        fill="transparent"
        style={{ cursor: 'pointer' }}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      />
      {/* Visible port */}
      <circle
        cx={cx}
        cy={cy}
        r={isActive ? 7 : 5}
        fill={fill}
        stroke={isActive ? '#fff' : 'rgba(255,255,255,0.3)'}
        strokeWidth={isActive ? 2.5 : 1.5}
        style={{ cursor: 'pointer', transition: 'r 0.12s ease' }}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      />
      {/* Glow when active */}
      {isActive && (
        <circle cx={cx} cy={cy} r={12} fill="none" stroke={fill} strokeWidth={1} opacity={0.5} />
      )}
    </g>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main component                                                             */
/* -------------------------------------------------------------------------- */

export function WiringDiagramApp() {
  const [state, dispatch] = useReducer(reducer, undefined, seedState);
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<{
    id: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  /* ---- Coordinate helpers ---- */
  const svgPoint = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      const rect = svg.getBoundingClientRect();
      return {
        x: (clientX - rect.left) / state.zoom,
        y: (clientY - rect.top) / state.zoom,
      };
    },
    [state.zoom],
  );

  /* ---- Drag handlers ---- */
  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const pt = svgPoint(e.clientX, e.clientY);
      if (state.pendingWire) {
        setMousePos(pt);
      }
      if (drag) {
        dispatch({
          type: 'MOVE_COMPONENT',
          id: drag.id,
          x: Math.round((pt.x - drag.offsetX) / 10) * 10,
          y: Math.round((pt.y - drag.offsetY) / 10) * 10,
        });
      }
    },
    [drag, svgPoint, state.pendingWire],
  );

  const handleCanvasMouseUp = useCallback(() => {
    setDrag(null);
  }, []);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      // Only deselect if clicking the raw canvas background
      if (e.target === svgRef.current || (e.target as Element).classList.contains('canvas-bg')) {
        dispatch({ type: 'SELECT', id: null });
        dispatch({ type: 'SELECT_WIRE', id: null });
        if (state.pendingWire) dispatch({ type: 'CANCEL_WIRE' });
      }
    },
    [state.pendingWire],
  );

  /* ---- Port click handler ---- */
  const handlePortClick = useCallback(
    (compId: string, portId: string) => {
      if (state.mode !== 'wire') return;
      if (!state.pendingWire) {
        dispatch({ type: 'START_WIRE', componentId: compId, portId });
      } else {
        dispatch({ type: 'FINISH_WIRE', componentId: compId, portId });
      }
    },
    [state.mode, state.pendingWire],
  );

  /* ---- Derived data ---- */
  const selectedComp = useMemo(
    () => state.components.find((c) => c.id === state.selectedId) ?? null,
    [state.components, state.selectedId],
  );

  const selectedWire = useMemo(
    () => state.wires.find((w) => w.id === state.selectedWireId) ?? null,
    [state.wires, state.selectedWireId],
  );

  const connectionsForSelected = useMemo(() => {
    if (!state.selectedId) return [];
    return state.wires.filter(
      (w) => w.fromComponent === state.selectedId || w.toComponent === state.selectedId,
    );
  }, [state.wires, state.selectedId]);

  /* ---- Render ---- */
  return (
    <div
      className="flex h-full w-full overflow-hidden"
      style={{ background: 'var(--color-surface-primary)', color: 'var(--color-text-primary)' }}
    >
      {/* ================================================================ */}
      {/*  LEFT SIDEBAR  --  Component Palette                             */}
      {/* ================================================================ */}
      <aside
        className="flex w-56 flex-shrink-0 flex-col gap-1 overflow-y-auto p-3"
        style={panelStyle}
      >
        <h2
          className="mb-2 text-xs font-semibold uppercase tracking-widest"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Components
        </h2>
        {PALETTE_ORDER.map((key) => {
          const def = COMPONENT_DEFS[key];
          const IconComp = def.Icon;
          return (
            <button
              key={key}
              type="button"
              style={paletteItemStyle}
              onClick={() =>
                dispatch({
                  type: 'ADD_COMPONENT',
                  compType: key,
                  x: 200 + Math.random() * 200,
                  y: 100 + Math.random() * 250,
                })
              }
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  'var(--color-surface-hover)';
                (e.currentTarget as HTMLElement).style.transform =
                  'perspective(600px) rotateX(0deg) translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  'linear-gradient(180deg, var(--color-surface-tertiary) 0%, var(--color-surface-secondary) 100%)';
                (e.currentTarget as HTMLElement).style.transform =
                  'perspective(600px) rotateX(1deg)';
              }}
            >
              <span
                className="flex items-center justify-center rounded"
                style={{
                  width: 28,
                  height: 28,
                  background: 'var(--color-surface-primary)',
                  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.4)',
                }}
              >
                <IconComp size={16} style={{ color: def.iconColor }} />
              </span>
              <span className="text-xs" style={{ color: 'var(--color-text-primary)' }}>
                {def.label}
              </span>
            </button>
          );
        })}
      </aside>

      {/* ================================================================ */}
      {/*  CENTER  --  Toolbar + Canvas                                     */}
      {/* ================================================================ */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Toolbar */}
        <div
          className="flex items-center gap-2 border-b px-3 py-2"
          style={{
            borderColor: 'var(--color-surface-elevated)',
            background:
              'linear-gradient(180deg, var(--color-surface-tertiary) 0%, var(--color-surface-secondary) 100%)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
          }}
        >
          {/* Select / Wire mode */}
          <button
            type="button"
            style={state.mode === 'select' ? toolbarBtnActive : toolbarBtnBase}
            title="Select mode"
            onClick={() => dispatch({ type: 'SET_MODE', mode: 'select' })}
          >
            <MousePointer size={16} />
          </button>
          <button
            type="button"
            style={state.mode === 'wire' ? toolbarBtnActive : toolbarBtnBase}
            title="Wire mode"
            onClick={() => dispatch({ type: 'SET_MODE', mode: 'wire' })}
          >
            <Cable size={16} />
          </button>

          <div
            style={{
              width: 1,
              height: 20,
              background: 'var(--color-surface-elevated)',
              margin: '0 4px',
            }}
          />

          {/* Delete / Clear */}
          <button
            type="button"
            style={toolbarBtnBase}
            title="Delete selected"
            onClick={() => dispatch({ type: 'DELETE_SELECTED' })}
          >
            <Trash2 size={16} />
          </button>

          <div
            style={{
              width: 1,
              height: 20,
              background: 'var(--color-surface-elevated)',
              margin: '0 4px',
            }}
          />

          {/* Zoom */}
          <button
            type="button"
            style={toolbarBtnBase}
            title="Zoom in"
            onClick={() => dispatch({ type: 'ZOOM', delta: 0.15 })}
          >
            <Plus size={16} />
          </button>
          <span
            className="min-w-[3rem] text-center text-xs"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {Math.round(state.zoom * 100)}%
          </span>
          <button
            type="button"
            style={toolbarBtnBase}
            title="Zoom out"
            onClick={() => dispatch({ type: 'ZOOM', delta: -0.15 })}
          >
            <Minus size={16} />
          </button>

          <div
            style={{
              width: 1,
              height: 20,
              background: 'var(--color-surface-elevated)',
              margin: '0 4px',
            }}
          />

          {/* Grid */}
          <button
            type="button"
            style={state.showGrid ? toolbarBtnActive : toolbarBtnBase}
            title="Toggle grid"
            onClick={() => dispatch({ type: 'TOGGLE_GRID' })}
          >
            <Grid3x3 size={16} />
          </button>

          <div style={{ flex: 1 }} />

          {/* Clear all */}
          <button
            type="button"
            className="flex items-center gap-1 rounded px-3 py-1 text-xs"
            style={{
              background: 'rgba(244,71,71,0.15)',
              color: 'var(--color-status-error)',
              border: '1px solid rgba(244,71,71,0.3)',
              cursor: 'pointer',
            }}
            onClick={() => dispatch({ type: 'CLEAR_ALL' })}
          >
            <Trash2 size={12} />
            Clear All
          </button>

          {/* Wire mode indicator */}
          {state.pendingWire && (
            <span
              className="ml-2 rounded-full px-3 py-1 text-xs font-medium"
              style={{
                background: 'rgba(0,120,212,0.2)',
                color: 'var(--color-accent-primary)',
                border: '1px solid rgba(0,120,212,0.4)',
              }}
            >
              Click a target port...
            </span>
          )}
        </div>

        {/* SVG Canvas */}
        <div className="relative flex-1 overflow-hidden" style={{ background: 'var(--color-surface-primary)' }}>
          <svg
            ref={svgRef}
            className="h-full w-full"
            style={{ cursor: state.mode === 'wire' ? 'crosshair' : 'default' }}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onClick={handleCanvasClick}
          >
            <g transform={`scale(${state.zoom})`}>
              {/* Grid pattern */}
              {state.showGrid && (
                <>
                  <defs>
                    <pattern id="wdGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                      <circle cx="10" cy="10" r="0.8" fill="var(--color-surface-elevated)" />
                    </pattern>
                  </defs>
                  <rect
                    className="canvas-bg"
                    width="4000"
                    height="4000"
                    fill="url(#wdGrid)"
                  />
                </>
              )}

              {/* Wires */}
              {state.wires.map((wire) => {
                const fromComp = state.components.find((c) => c.id === wire.fromComponent);
                const toComp = state.components.find((c) => c.id === wire.toComponent);
                if (!fromComp || !toComp) return null;
                const fromDef = COMPONENT_DEFS[fromComp.type];
                const toDef = COMPONENT_DEFS[toComp.type];
                if (!fromDef || !toDef) return null;
                const fromPort = fromDef.ports.find((p) => p.id === wire.fromPort);
                const toPort = toDef.ports.find((p) => p.id === wire.toPort);
                if (!fromPort || !toPort) return null;
                const p1 = portAbsolutePos(fromComp, fromPort);
                const p2 = portAbsolutePos(toComp, toPort);
                const isSelected = wire.id === state.selectedWireId;
                return (
                  <g key={wire.id}>
                    {/* Shadow */}
                    <path
                      d={bezierPath(p1.x, p1.y, p2.x, p2.y)}
                      fill="none"
                      stroke="rgba(0,0,0,0.4)"
                      strokeWidth={isSelected ? 5 : 3.5}
                      strokeLinecap="round"
                      transform="translate(1,2)"
                    />
                    {/* Wire */}
                    <path
                      d={bezierPath(p1.x, p1.y, p2.x, p2.y)}
                      fill="none"
                      stroke={WIRE_COLORS[wire.color]}
                      strokeWidth={isSelected ? 3.5 : 2.5}
                      strokeLinecap="round"
                      style={{ cursor: 'pointer' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        dispatch({ type: 'SELECT_WIRE', id: wire.id });
                      }}
                    />
                    {/* Glow on selected */}
                    {isSelected && (
                      <path
                        d={bezierPath(p1.x, p1.y, p2.x, p2.y)}
                        fill="none"
                        stroke={WIRE_COLORS[wire.color]}
                        strokeWidth={8}
                        strokeLinecap="round"
                        opacity={0.2}
                      />
                    )}
                  </g>
                );
              })}

              {/* Pending wire preview */}
              {state.pendingWire && mousePos && (() => {
                const srcComp = state.components.find(
                  (c) => c.id === state.pendingWire!.componentId,
                );
                if (!srcComp) return null;
                const srcDef = COMPONENT_DEFS[srcComp.type];
                if (!srcDef) return null;
                const srcPort = srcDef.ports.find((p) => p.id === state.pendingWire!.portId);
                if (!srcPort) return null;
                const p1 = portAbsolutePos(srcComp, srcPort);
                return (
                  <path
                    d={bezierPath(p1.x, p1.y, mousePos.x, mousePos.y)}
                    fill="none"
                    stroke="var(--color-accent-primary)"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    strokeLinecap="round"
                    opacity={0.7}
                  />
                );
              })()}

              {/* Components */}
              {state.components.map((comp) => {
                const def = COMPONENT_DEFS[comp.type];
                if (!def) return null;
                const isSelected = comp.id === state.selectedId;
                const IconComp = def.Icon;

                return (
                  <g key={comp.id}>
                    {/* Drop shadow */}
                    <rect
                      x={comp.x + 2}
                      y={comp.y + 4}
                      width={def.width}
                      height={def.height}
                      rx={8}
                      fill="rgba(0,0,0,0.35)"
                      filter="url(#blur2)"
                    />
                    {/* Card body */}
                    <rect
                      x={comp.x}
                      y={comp.y}
                      width={def.width}
                      height={def.height}
                      rx={8}
                      fill="var(--color-surface-tertiary)"
                      stroke={isSelected ? 'var(--color-accent-primary)' : 'var(--color-surface-elevated)'}
                      strokeWidth={isSelected ? 2 : 1}
                      style={{ cursor: state.mode === 'select' ? 'grab' : 'default' }}
                      onMouseDown={(e) => {
                        if (state.mode !== 'select') return;
                        e.stopPropagation();
                        const pt = svgPoint(e.clientX, e.clientY);
                        dispatch({ type: 'SELECT', id: comp.id });
                        setDrag({
                          id: comp.id,
                          offsetX: pt.x - comp.x,
                          offsetY: pt.y - comp.y,
                        });
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        dispatch({ type: 'SELECT', id: comp.id });
                      }}
                    />
                    {/* Top highlight */}
                    <rect
                      x={comp.x + 1}
                      y={comp.y + 1}
                      width={def.width - 2}
                      height={Math.min(18, def.height * 0.3)}
                      rx={7}
                      fill="rgba(255,255,255,0.04)"
                      pointerEvents="none"
                    />

                    {/* Icon + label (foreignObject for HTML rendering) */}
                    <foreignObject
                      x={comp.x}
                      y={comp.y}
                      width={def.width}
                      height={def.height}
                      pointerEvents="none"
                    >
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 2,
                          pointerEvents: 'none',
                        }}
                      >
                        <IconComp
                          size={20}
                          style={{ color: def.iconColor, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}
                        />
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 600,
                            color: 'var(--color-text-primary)',
                            textShadow: '0 1px 2px rgba(0,0,0,0.6)',
                            lineHeight: 1,
                          }}
                        >
                          {comp.label}
                        </span>
                        <span
                          style={{
                            fontSize: 8,
                            color: 'var(--color-text-muted)',
                            lineHeight: 1,
                          }}
                        >
                          {comp.value}
                        </span>
                      </div>
                    </foreignObject>

                    {/* Ports */}
                    {def.ports.map((port) => {
                      const pos = portAbsolutePos(comp, port);
                      const isPending =
                        state.pendingWire?.componentId === comp.id &&
                        state.pendingWire?.portId === port.id;
                      return (
                        <PortCircle
                          key={port.id}
                          cx={pos.x}
                          cy={pos.y}
                          port={port}
                          isActive={isPending}
                          onClick={() => handlePortClick(comp.id, port.id)}
                        />
                      );
                    })}

                    {/* Selection ring */}
                    {isSelected && (
                      <rect
                        x={comp.x - 3}
                        y={comp.y - 3}
                        width={def.width + 6}
                        height={def.height + 6}
                        rx={10}
                        fill="none"
                        stroke="var(--color-accent-primary)"
                        strokeWidth={1.5}
                        strokeDasharray="4 3"
                        opacity={0.6}
                      />
                    )}
                  </g>
                );
              })}

              {/* SVG filters */}
              <defs>
                <filter id="blur2">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
                </filter>
              </defs>
            </g>
          </svg>

          {/* Status bar */}
          <div
            className="absolute bottom-0 left-0 right-0 flex items-center gap-4 border-t px-3 py-1"
            style={{
              borderColor: 'var(--color-surface-elevated)',
              background: 'var(--color-surface-secondary)',
              fontSize: 11,
              color: 'var(--color-text-muted)',
            }}
          >
            <span>
              {state.components.length} component{state.components.length !== 1 ? 's' : ''}
            </span>
            <span>
              {state.wires.length} wire{state.wires.length !== 1 ? 's' : ''}
            </span>
            <span style={{ flex: 1 }} />
            <span>Mode: {state.mode === 'wire' ? 'Wire' : 'Select'}</span>
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/*  RIGHT SIDEBAR  --  Properties Panel                              */}
      {/* ================================================================ */}
      <aside
        className="flex w-60 flex-shrink-0 flex-col overflow-y-auto p-3"
        style={rightPanelStyle}
      >
        <h2
          className="mb-3 text-xs font-semibold uppercase tracking-widest"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Properties
        </h2>

        {!selectedComp && !selectedWire && (
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Select a component or wire to view its properties.
          </p>
        )}

        {/* Component properties */}
        {selectedComp && (() => {
          const def = COMPONENT_DEFS[selectedComp.type];
          if (!def) return null;
          const IconComp = def.Icon;
          return (
            <div className="flex flex-col gap-3">
              {/* Header card */}
              <div
                className="flex items-center gap-3 rounded-lg p-3"
                style={{
                  ...cardVolumetric,
                  background:
                    'linear-gradient(135deg, var(--color-surface-tertiary) 0%, var(--color-surface-secondary) 100%)',
                  border: '1px solid var(--color-surface-elevated)',
                }}
              >
                <span
                  className="flex items-center justify-center rounded-md"
                  style={{
                    width: 36,
                    height: 36,
                    background: 'var(--color-surface-primary)',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.4)',
                  }}
                >
                  <IconComp size={20} style={{ color: def.iconColor }} />
                </span>
                <div>
                  <div
                    className="text-sm font-semibold"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {selectedComp.label}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {def.type} &middot; {selectedComp.id}
                  </div>
                </div>
              </div>

              {/* Editable fields */}
              <div className="flex flex-col gap-2">
                <label className="flex flex-col gap-1">
                  <span
                    className="text-xs font-medium"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    Label
                  </span>
                  <input
                    type="text"
                    value={selectedComp.label}
                    onChange={(e) =>
                      dispatch({
                        type: 'UPDATE_LABEL',
                        id: selectedComp.id,
                        label: e.target.value,
                      })
                    }
                    className="rounded px-2 py-1 text-xs outline-none"
                    style={{
                      background: 'var(--color-surface-primary)',
                      border: '1px solid var(--color-surface-elevated)',
                      color: 'var(--color-text-primary)',
                    }}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span
                    className="text-xs font-medium"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    Value
                  </span>
                  <input
                    type="text"
                    value={selectedComp.value}
                    onChange={(e) =>
                      dispatch({
                        type: 'UPDATE_VALUE',
                        id: selectedComp.id,
                        value: e.target.value,
                      })
                    }
                    className="rounded px-2 py-1 text-xs outline-none"
                    style={{
                      background: 'var(--color-surface-primary)',
                      border: '1px solid var(--color-surface-elevated)',
                      color: 'var(--color-text-primary)',
                    }}
                  />
                </label>
                <div className="flex flex-col gap-1">
                  <span
                    className="text-xs font-medium"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    Position
                  </span>
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    x: {selectedComp.x}, y: {selectedComp.y}
                  </span>
                </div>
              </div>

              {/* Ports */}
              <div className="flex flex-col gap-1">
                <span
                  className="text-xs font-medium"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Ports
                </span>
                {def.ports.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-2 rounded px-2 py-1 text-xs"
                    style={{
                      background: 'var(--color-surface-primary)',
                      border: '1px solid var(--color-surface-elevated)',
                    }}
                  >
                    <span
                      className="inline-block rounded-full"
                      style={{
                        width: 8,
                        height: 8,
                        background: WIRE_COLORS[p.wireColor],
                      }}
                    />
                    <span style={{ color: 'var(--color-text-primary)' }}>{p.id}</span>
                    <span style={{ color: 'var(--color-text-muted)' }}>({p.kind})</span>
                  </div>
                ))}
              </div>

              {/* Connections */}
              <div className="flex flex-col gap-1">
                <span
                  className="text-xs font-medium"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Connections ({connectionsForSelected.length})
                </span>
                {connectionsForSelected.length === 0 && (
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    No connections
                  </span>
                )}
                {connectionsForSelected.map((w) => {
                  const otherId =
                    w.fromComponent === selectedComp.id ? w.toComponent : w.fromComponent;
                  const other = state.components.find((c) => c.id === otherId);
                  return (
                    <div
                      key={w.id}
                      className="flex items-center gap-2 rounded px-2 py-1 text-xs"
                      style={{
                        background: 'var(--color-surface-primary)',
                        border: '1px solid var(--color-surface-elevated)',
                      }}
                    >
                      <span
                        className="inline-block rounded-full"
                        style={{
                          width: 8,
                          height: 8,
                          background: WIRE_COLORS[w.color],
                        }}
                      />
                      <span style={{ color: 'var(--color-text-primary)' }}>
                        {w.fromPort} &rarr; {other?.label ?? otherId}.{w.toPort}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Wire properties */}
        {selectedWire && (
          <div className="flex flex-col gap-3">
            <div
              className="flex items-center gap-3 rounded-lg p-3"
              style={{
                ...cardVolumetric,
                background:
                  'linear-gradient(135deg, var(--color-surface-tertiary) 0%, var(--color-surface-secondary) 100%)',
                border: '1px solid var(--color-surface-elevated)',
              }}
            >
              <span
                className="flex items-center justify-center rounded-md"
                style={{
                  width: 36,
                  height: 36,
                  background: WIRE_COLORS[selectedWire.color],
                  boxShadow: `0 4px 12px ${WIRE_COLORS[selectedWire.color]}44`,
                }}
              >
                <Cable size={20} style={{ color: '#fff' }} />
              </span>
              <div>
                <div
                  className="text-sm font-semibold"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  Wire
                </div>
                <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {selectedWire.color} &middot; {selectedWire.id}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-1 text-xs">
              <span style={{ color: 'var(--color-text-secondary)' }}>
                From:{' '}
                <span style={{ color: 'var(--color-text-primary)' }}>
                  {state.components.find((c) => c.id === selectedWire.fromComponent)?.label ??
                    selectedWire.fromComponent}
                  .{selectedWire.fromPort}
                </span>
              </span>
              <span style={{ color: 'var(--color-text-secondary)' }}>
                To:{' '}
                <span style={{ color: 'var(--color-text-primary)' }}>
                  {state.components.find((c) => c.id === selectedWire.toComponent)?.label ??
                    selectedWire.toComponent}
                  .{selectedWire.toPort}
                </span>
              </span>
            </div>
          </div>
        )}

        {/* Wire color legend */}
        <div className="mt-auto flex flex-col gap-1 pt-4">
          <span
            className="mb-1 text-xs font-semibold uppercase tracking-widest"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Wire Legend
          </span>
          {(Object.entries(WIRE_COLORS) as [WireColor, string][]).map(([label, color]) => (
            <div key={label} className="flex items-center gap-2 text-xs">
              <span
                className="inline-block rounded-full"
                style={{ width: 10, height: 10, background: color }}
              />
              <span style={{ color: 'var(--color-text-secondary)', textTransform: 'capitalize' }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
