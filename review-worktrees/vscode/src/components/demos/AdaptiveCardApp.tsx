// ---------------------------------------------------------------------------
// AdaptiveCardApp.tsx — Visual Adaptive Card builder/generator for CopilotHub
// Split layout: Element palette + Canvas (left 55%) | Live Preview + JSON (right 45%)
// ---------------------------------------------------------------------------

import { useState, useCallback, useRef } from 'react';
import {
  Type,
  Image as LucideImage,
  Columns,
  Box,
  Zap,
  List,
  TextCursorInput,
  Hash,
  ToggleRight,
  ListChecks,
  Send,
  ExternalLink,
  Copy,
  Check,
  FileJson,
  LayoutTemplate,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  Code2,
  Plus,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ElementType =
  | 'TextBlock'
  | 'Image'
  | 'ColumnSet'
  | 'Container'
  | 'ActionSet'
  | 'FactSet'
  | 'Input.Text'
  | 'Input.Number'
  | 'Input.Toggle'
  | 'Input.ChoiceSet'
  | 'Action.Submit'
  | 'Action.OpenUrl';

interface FactItem { title: string; value: string; }
interface ChoiceItem { title: string; value: string; }

interface ElementProps {
  text?: string;
  size?: string;
  weight?: string;
  color?: string;
  wrap?: boolean;
  isSubtle?: boolean;
  separator?: boolean;
  spacing?: string;
  url?: string;
  altText?: string;
  imageSize?: string;
  horizontalAlignment?: string;
  style?: string;
  facts?: FactItem[];
  id?: string;
  label?: string;
  placeholder?: string;
  isMultiline?: boolean;
  min?: number;
  max?: number;
  title?: string;
  choices?: ChoiceItem[];
  isMultiSelect?: boolean;
  actionTitle?: string;
  actionUrl?: string;
}

interface CardElement {
  id: string;
  type: ElementType;
  props: ElementProps;
  expanded: boolean;
}

type IconComponent = React.ComponentType<{ size?: number; strokeWidth?: number; color?: string }>;

interface PaletteItem {
  type: ElementType;
  label: string;
  icon: IconComponent;
  accentColor: string;
  description: string;
  defaultProps: ElementProps;
}

interface Template {
  id: string;
  name: string;
  icon: IconComponent;
  elements: Array<Omit<CardElement, 'expanded'>>;
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function genId(): string {
  return `el-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function escapeHTML(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function highlightJSONToHTML(json: string): string {
  let result = '';
  let i = 0;
  const n = json.length;
  while (i < n) {
    const ch = json[i];
    if (ch === '"') {
      let str = '"';
      i++;
      while (i < n) {
        if (json[i] === '\\') {
          str += json[i] + (json[i + 1] ?? '');
          i += 2;
        } else if (json[i] === '"') {
          str += '"';
          i++;
          break;
        } else {
          str += json[i];
          i++;
        }
      }
      let j = i;
      while (j < n && ' \t\r\n'.includes(json[j])) j++;
      const isKey = json[j] === ':';
      result += isKey
        ? `<span style="color:#9cdcfe">${escapeHTML(str)}</span>`
        : `<span style="color:#ce9178">${escapeHTML(str)}</span>`;
    } else if (ch === '-' || (ch >= '0' && ch <= '9')) {
      let num = '';
      while (i < n && '-+.eE0123456789'.includes(json[i])) {
        num += json[i];
        i++;
      }
      result += `<span style="color:#b5cea8">${num}</span>`;
    } else if (json.startsWith('true', i)) {
      result += `<span style="color:#569cd6">true</span>`;
      i += 4;
    } else if (json.startsWith('false', i)) {
      result += `<span style="color:#569cd6">false</span>`;
      i += 5;
    } else if (json.startsWith('null', i)) {
      result += `<span style="color:#569cd6">null</span>`;
      i += 4;
    } else if (ch === '{' || ch === '}' || ch === '[' || ch === ']') {
      result += `<span style="color:#ffd700">${ch}</span>`;
      i++;
    } else if (ch === ',') {
      result += `<span style="color:#808080">,</span>`;
      i++;
    } else if (ch === ':') {
      result += `<span style="color:#808080">:</span>`;
      i++;
    } else {
      result += ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : ch === '&' ? '&amp;' : ch;
      i++;
    }
  }
  return result;
}

function elementToJSON(el: CardElement): Record<string, unknown> | null {
  const p = el.props;
  const omitDef = <T,>(v: T | undefined, d: T): T | undefined =>
    v === d || v === undefined ? undefined : v;

  switch (el.type) {
    case 'TextBlock': {
      const obj: Record<string, unknown> = { type: 'TextBlock', text: p.text ?? '' };
      const sz = omitDef(p.size, 'Default'); if (sz) obj.size = sz;
      const wt = omitDef(p.weight, 'Default'); if (wt) obj.weight = wt;
      const cl = omitDef(p.color, 'Default'); if (cl) obj.color = cl;
      if (p.wrap) obj.wrap = true;
      if (p.isSubtle) obj.isSubtle = true;
      if (p.separator) obj.separator = true;
      const sp = omitDef(p.spacing, 'Default'); if (sp) obj.spacing = sp;
      return obj;
    }
    case 'Image': {
      const obj: Record<string, unknown> = { type: 'Image', url: p.url ?? '' };
      if (p.altText) obj.altText = p.altText;
      const sz = omitDef(p.imageSize, 'Auto'); if (sz) obj.size = sz;
      const ha = omitDef(p.horizontalAlignment, 'Left'); if (ha) obj.horizontalAlignment = ha;
      if (p.separator) obj.separator = true;
      return obj;
    }
    case 'ColumnSet':
      return {
        type: 'ColumnSet',
        columns: [
          { type: 'Column', width: 'stretch', items: [] },
          { type: 'Column', width: 'stretch', items: [] },
        ],
      };
    case 'Container': {
      const obj: Record<string, unknown> = { type: 'Container', items: [] };
      const st = omitDef(p.style, 'Default'); if (st) obj.style = st;
      return obj;
    }
    case 'ActionSet':
      return { type: 'ActionSet', actions: [] };
    case 'FactSet':
      return {
        type: 'FactSet',
        facts: (p.facts ?? []).map(f => ({ title: f.title, value: f.value })),
      };
    case 'Input.Text': {
      const obj: Record<string, unknown> = { type: 'Input.Text', id: p.id ?? 'textInput' };
      if (p.label) obj.label = p.label;
      if (p.placeholder) obj.placeholder = p.placeholder;
      if (p.isMultiline) obj.isMultiline = true;
      return obj;
    }
    case 'Input.Number': {
      const obj: Record<string, unknown> = { type: 'Input.Number', id: p.id ?? 'numberInput' };
      if (p.label) obj.label = p.label;
      if (p.placeholder) obj.placeholder = p.placeholder;
      if (p.min !== undefined) obj.min = p.min;
      if (p.max !== undefined) obj.max = p.max;
      return obj;
    }
    case 'Input.Toggle':
      return { type: 'Input.Toggle', id: p.id ?? 'toggle', title: p.title ?? 'Enable' };
    case 'Input.ChoiceSet':
      return {
        type: 'Input.ChoiceSet',
        id: p.id ?? 'choice',
        label: p.label ?? 'Choose',
        style: p.isMultiSelect ? 'expanded' : 'compact',
        isMultiSelect: p.isMultiSelect ?? false,
        choices: (p.choices ?? []).map(c => ({ title: c.title, value: c.value })),
      };
    case 'Action.Submit':
      return { type: 'Action.Submit', title: p.actionTitle ?? 'Submit' };
    case 'Action.OpenUrl':
      return { type: 'Action.OpenUrl', title: p.actionTitle ?? 'Open', url: p.actionUrl ?? '' };
    default:
      return null;
  }
}

function generateCardJSON(elements: CardElement[]): Record<string, unknown> {
  const body: unknown[] = [];
  const actions: unknown[] = [];
  for (const el of elements) {
    const json = elementToJSON(el);
    if (!json) continue;
    if (el.type === 'Action.Submit' || el.type === 'Action.OpenUrl') actions.push(json);
    else body.push(json);
  }
  const card: Record<string, unknown> = {
    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
    type: 'AdaptiveCard',
    version: '1.5',
    body,
  };
  if (actions.length > 0) card.actions = actions;
  return card;
}

// ---------------------------------------------------------------------------
// Constants — Palette Items
// ---------------------------------------------------------------------------

const PALETTE_ITEMS: PaletteItem[] = [
  {
    type: 'TextBlock', label: 'TextBlock', icon: Type,
    accentColor: '#569cd6', description: 'Styled text content',
    defaultProps: { text: 'Your text here', size: 'Default', weight: 'Default', color: 'Default', wrap: true },
  },
  {
    type: 'Image', label: 'Image', icon: LucideImage,
    accentColor: '#4ec9b0', description: 'Display an image',
    defaultProps: { url: 'https://adaptivecards.io/content/cats/1.png', altText: 'Image', imageSize: 'Auto', horizontalAlignment: 'Left' },
  },
  {
    type: 'ColumnSet', label: 'ColumnSet', icon: Columns,
    accentColor: '#c586c0', description: 'Multi-column layout',
    defaultProps: {},
  },
  {
    type: 'Container', label: 'Container', icon: Box,
    accentColor: '#9cdcfe', description: 'Group elements',
    defaultProps: { style: 'Default' },
  },
  {
    type: 'ActionSet', label: 'ActionSet', icon: Zap,
    accentColor: '#dcdcaa', description: 'Inline action group',
    defaultProps: {},
  },
  {
    type: 'FactSet', label: 'FactSet', icon: List,
    accentColor: '#4ec9b0', description: 'Key-value pairs',
    defaultProps: { facts: [{ title: 'Label', value: 'Value' }, { title: 'Status', value: 'Active' }] },
  },
  {
    type: 'Input.Text', label: 'Input.Text', icon: TextCursorInput,
    accentColor: '#ce9178', description: 'Text input field',
    defaultProps: { id: 'textInput', label: 'Text Input', placeholder: 'Enter text...' },
  },
  {
    type: 'Input.Number', label: 'Input.Number', icon: Hash,
    accentColor: '#b5cea8', description: 'Numeric input',
    defaultProps: { id: 'numberInput', label: 'Number', placeholder: '0' },
  },
  {
    type: 'Input.Toggle', label: 'Input.Toggle', icon: ToggleRight,
    accentColor: '#0078d4', description: 'Toggle switch',
    defaultProps: { id: 'toggle', title: 'Enable option' },
  },
  {
    type: 'Input.ChoiceSet', label: 'Input.ChoiceSet', icon: ListChecks,
    accentColor: '#f97316', description: 'Choice selection',
    defaultProps: { id: 'choice', label: 'Select option', choices: [{ title: 'Option A', value: 'a' }, { title: 'Option B', value: 'b' }] },
  },
  {
    type: 'Action.Submit', label: 'Action.Submit', icon: Send,
    accentColor: '#0078d4', description: 'Submit button',
    defaultProps: { actionTitle: 'Submit' },
  },
  {
    type: 'Action.OpenUrl', label: 'Action.OpenUrl', icon: ExternalLink,
    accentColor: '#569cd6', description: 'Open URL action',
    defaultProps: { actionTitle: 'Learn More', actionUrl: 'https://adaptivecards.io' },
  },
];

// ---------------------------------------------------------------------------
// Constants — Templates
// ---------------------------------------------------------------------------

const TEMPLATES: Template[] = [
  {
    id: 'welcome',
    name: 'Welcome Card',
    icon: Sparkles,
    elements: [
      { id: 'w1', type: 'TextBlock', props: { text: 'Welcome to CopilotHub', size: 'ExtraLarge', weight: 'Bolder', color: 'Accent', wrap: true } },
      { id: 'w2', type: 'TextBlock', props: { text: 'Your AI-powered workspace is ready. Explore features and kick off your first automation.', wrap: true, isSubtle: true } },
      { id: 'w3', type: 'Action.OpenUrl', props: { actionTitle: 'Get Started', actionUrl: 'https://adaptivecards.io' } },
    ],
  },
  {
    id: 'approval',
    name: 'Approval Request',
    icon: Check,
    elements: [
      { id: 'a1', type: 'TextBlock', props: { text: 'Approval Required', size: 'Large', weight: 'Bolder' } },
      { id: 'a2', type: 'TextBlock', props: { text: 'A new request has been submitted and requires your review before proceeding.', wrap: true, isSubtle: true } },
      { id: 'a3', type: 'FactSet', props: { facts: [{ title: 'Requested by', value: 'John Smith' }, { title: 'Date', value: '2025-01-15' }, { title: 'Priority', value: 'High' }, { title: 'Category', value: 'Infrastructure' }] } },
      { id: 'a4', type: 'Action.Submit', props: { actionTitle: 'Approve' } },
      { id: 'a5', type: 'Action.Submit', props: { actionTitle: 'Reject' } },
    ],
  },
  {
    id: 'status',
    name: 'Status Update',
    icon: Zap,
    elements: [
      { id: 's1', type: 'TextBlock', props: { text: 'Deployment Status', size: 'Large', weight: 'Bolder' } },
      { id: 's2', type: 'TextBlock', props: { text: 'SUCCESS', weight: 'Bolder', color: 'Good' } },
      { id: 's3', type: 'FactSet', props: { facts: [{ title: 'Environment', value: 'Production' }, { title: 'Version', value: 'v2.4.1' }, { title: 'Duration', value: '3m 42s' }] } },
      { id: 's4', type: 'TextBlock', props: { text: 'All health checks passed. Traffic is routing normally.', wrap: true, isSubtle: true, separator: true } },
      { id: 's5', type: 'Action.OpenUrl', props: { actionTitle: 'View Logs', actionUrl: 'https://portal.azure.com' } },
    ],
  },
  {
    id: 'survey',
    name: 'Survey Form',
    icon: ListChecks,
    elements: [
      { id: 'q1', type: 'TextBlock', props: { text: 'Quick Survey', size: 'Large', weight: 'Bolder' } },
      { id: 'q2', type: 'TextBlock', props: { text: 'Help us improve by answering a few questions.', wrap: true, isSubtle: true } },
      { id: 'q3', type: 'Input.Text', props: { id: 'feedback', label: 'Your feedback', placeholder: 'Share your thoughts...', isMultiline: true } },
      { id: 'q4', type: 'Input.ChoiceSet', props: { id: 'rating', label: 'Overall rating', choices: [{ title: 'Excellent', value: '5' }, { title: 'Good', value: '4' }, { title: 'Average', value: '3' }, { title: 'Poor', value: '2' }] } },
      { id: 'q5', type: 'Input.Toggle', props: { id: 'newsletter', title: 'Subscribe to newsletter' } },
      { id: 'q6', type: 'Action.Submit', props: { actionTitle: 'Submit Survey' } },
    ],
  },
  {
    id: 'hero',
    name: 'Hero Image Card',
    icon: LucideImage,
    elements: [
      { id: 'h1', type: 'Image', props: { url: 'https://adaptivecards.io/content/cats/1.png', imageSize: 'Stretch', altText: 'Hero image' } },
      { id: 'h2', type: 'TextBlock', props: { text: 'Featured Announcement', size: 'ExtraLarge', weight: 'Bolder', spacing: 'Medium' } },
      { id: 'h3', type: 'TextBlock', props: { text: 'Discover the latest updates and features designed to supercharge your productivity.', wrap: true, isSubtle: true } },
      { id: 'h4', type: 'Action.OpenUrl', props: { actionTitle: 'Read More', actionUrl: 'https://adaptivecards.io' } },
    ],
  },
];

// ---------------------------------------------------------------------------
// Sub-component: PaletteTile
// ---------------------------------------------------------------------------

interface PaletteTileProps {
  item: PaletteItem;
  onAdd: (item: PaletteItem) => void;
}

function PaletteTile({ item, onAdd }: PaletteTileProps) {
  const [hovered, setHovered] = useState(false);
  const Icon = item.icon;

  return (
    <button
      onClick={() => onAdd(item)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={item.description}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '7px 9px',
        borderRadius: 6,
        border: `1px solid ${hovered ? 'var(--color-border-strong)' : 'var(--color-border-default)'}`,
        background: hovered
          ? 'linear-gradient(145deg, rgba(255,255,255,0.06) 0%, var(--color-surface-elevated) 100%)'
          : 'linear-gradient(145deg, rgba(255,255,255,0.025) 0%, var(--color-surface-tertiary) 100%)',
        boxShadow: hovered
          ? '0 4px 12px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.08)'
          : '0 2px 4px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05), inset 0 -1px 0 rgba(0,0,0,0.15)',
        transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
        transition: 'all 0.14s ease',
        cursor: 'pointer',
        textAlign: 'left',
        marginBottom: 4,
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 5,
          background: `${item.accentColor}22`,
          border: `1px solid ${item.accentColor}44`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.1), 0 1px 3px rgba(0,0,0,0.3)`,
        }}
      >
        <Icon size={13} color={item.accentColor} strokeWidth={2} />
      </div>
      <div style={{ overflow: 'hidden', minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {item.label}
        </div>
        <div style={{ fontSize: 10, color: 'var(--color-text-muted)', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {item.description}
        </div>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: CanvasElementCard
// ---------------------------------------------------------------------------

interface CanvasElementCardProps {
  element: CardElement;
  index: number;
  total: number;
  onUpdate: (id: string, props: ElementProps) => void;
  onDelete: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
}

function CanvasElementCard({
  element, index, total, onUpdate, onDelete, onToggleExpand, onMoveUp, onMoveDown,
}: CanvasElementCardProps) {
  const [hovered, setHovered] = useState(false);
  const palette = PALETTE_ITEMS.find(p => p.type === element.type);
  const Icon = palette?.icon ?? Box;
  const accent = palette?.accentColor ?? '#808080';
  const p = element.props;

  // Shared styles
  const fieldBase: React.CSSProperties = {
    width: '100%',
    background: 'var(--color-surface-primary)',
    color: 'var(--color-text-primary)',
    border: '1px solid var(--color-border-default)',
    borderRadius: 4,
    padding: '5px 8px',
    fontSize: 12,
    fontFamily: 'var(--font-family-sans)',
    outline: 'none',
    boxSizing: 'border-box',
  };
  const labelCss: React.CSSProperties = {
    display: 'block',
    fontSize: 10,
    color: 'var(--color-text-secondary)',
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    fontWeight: 600,
  };

  const wrap = (node: React.ReactNode) => (
    <div style={{ marginBottom: 9 }}>{node}</div>
  );

  const textField = (key: keyof ElementProps, label: string, multiline = false) => wrap(
    <>
      <label style={labelCss}>{label}</label>
      {multiline ? (
        <textarea
          value={typeof p[key] === 'string' ? (p[key] as string) : ''}
          onChange={e => onUpdate(element.id, { ...p, [key]: e.target.value })}
          rows={3}
          style={{ ...fieldBase, resize: 'vertical' }}
        />
      ) : (
        <input
          type="text"
          value={typeof p[key] === 'string' ? (p[key] as string) : ''}
          onChange={e => onUpdate(element.id, { ...p, [key]: e.target.value })}
          style={fieldBase}
        />
      )}
    </>
  );

  const selectField = (key: keyof ElementProps, label: string, options: string[]) => {
    const raw = p[key];
    const val = typeof raw === 'string' ? raw : (options[0] ?? '');
    return wrap(
      <>
        <label style={labelCss}>{label}</label>
        <select
          value={val}
          onChange={e => onUpdate(element.id, { ...p, [key]: e.target.value })}
          style={{ ...fieldBase, background: 'var(--color-surface-tertiary)' }}
        >
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </>
    );
  };

  const checkField = (key: keyof ElementProps, label: string) => wrap(
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
      <input
        type="checkbox"
        checked={typeof p[key] === 'boolean' ? (p[key] as boolean) : false}
        onChange={e => onUpdate(element.id, { ...p, [key]: e.target.checked })}
        style={{ accentColor: 'var(--color-accent-primary)', width: 13, height: 13 }}
      />
      <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{label}</span>
    </label>
  );

  const numberField = (key: 'min' | 'max', label: string) => wrap(
    <>
      <label style={labelCss}>{label}</label>
      <input
        type="number"
        value={typeof p[key] === 'number' ? (p[key] as number) : ''}
        onChange={e => {
          const v = e.target.value === '' ? undefined : Number(e.target.value);
          onUpdate(element.id, { ...p, [key]: v });
        }}
        style={fieldBase}
      />
    </>
  );

  const grid2 = (a: React.ReactNode, b: React.ReactNode) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>{a}{b}</div>
  );

  const placeholder = (msg: string) => (
    <div style={{ padding: '8px 10px', background: 'var(--color-surface-primary)', borderRadius: 4, border: '1px dashed var(--color-border-default)', fontSize: 11, color: 'var(--color-text-muted)', textAlign: 'center' }}>
      {msg}
    </div>
  );

  const renderProps = () => {
    switch (element.type) {
      case 'TextBlock':
        return (
          <>
            {textField('text', 'Text', true)}
            {grid2(
              selectField('size', 'Size', ['Small', 'Default', 'Medium', 'Large', 'ExtraLarge']),
              selectField('weight', 'Weight', ['Default', 'Lighter', 'Bolder']),
            )}
            {grid2(
              selectField('color', 'Color', ['Default', 'Dark', 'Light', 'Accent', 'Good', 'Warning', 'Attention']),
              selectField('spacing', 'Spacing', ['None', 'Small', 'Default', 'Medium', 'Large', 'ExtraLarge', 'Padding']),
            )}
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {checkField('wrap', 'Wrap')}
              {checkField('isSubtle', 'Subtle')}
              {checkField('separator', 'Separator')}
            </div>
          </>
        );
      case 'Image':
        return (
          <>
            {textField('url', 'Image URL')}
            {textField('altText', 'Alt Text')}
            {grid2(
              selectField('imageSize', 'Size', ['Auto', 'Stretch', 'Small', 'Medium', 'Large']),
              selectField('horizontalAlignment', 'Alignment', ['Left', 'Center', 'Right']),
            )}
            <div style={{ display: 'flex', gap: 16 }}>
              {checkField('separator', 'Separator')}
            </div>
          </>
        );
      case 'Container':
        return (
          <>
            {selectField('style', 'Style', ['Default', 'Emphasis', 'Good', 'Attention', 'Warning', 'Accent'])}
            {placeholder('Container body — add child elements via JSON')}
          </>
        );
      case 'ColumnSet':
        return placeholder('Generates a 2-column layout. Edit columns in JSON.');
      case 'ActionSet':
        return placeholder('Add Action.Submit / Action.OpenUrl elements below.');
      case 'FactSet': {
        const facts = p.facts ?? [];
        return (
          <>
            <label style={labelCss}>Facts</label>
            {facts.map((fact, fi) => (
              <div key={fi} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 5, marginBottom: 5, alignItems: 'center' }}>
                <input
                  type="text"
                  value={fact.title}
                  placeholder="Label"
                  onChange={e => {
                    const next = facts.map((f, i) => i === fi ? { ...f, title: e.target.value } : f);
                    onUpdate(element.id, { ...p, facts: next });
                  }}
                  style={fieldBase}
                />
                <input
                  type="text"
                  value={fact.value}
                  placeholder="Value"
                  onChange={e => {
                    const next = facts.map((f, i) => i === fi ? { ...f, value: e.target.value } : f);
                    onUpdate(element.id, { ...p, facts: next });
                  }}
                  style={fieldBase}
                />
                <button
                  onClick={() => onUpdate(element.id, { ...p, facts: facts.filter((_, i) => i !== fi) })}
                  style={{ background: 'none', border: 'none', color: 'var(--color-status-error)', cursor: 'pointer', padding: 3, borderRadius: 3, display: 'flex' }}
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
            <button
              onClick={() => onUpdate(element.id, { ...p, facts: [...facts, { title: '', value: '' }] })}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 8px', background: 'none', border: '1px dashed var(--color-border-default)', borderRadius: 4, color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: 11 }}
            >
              <Plus size={11} /> Add Fact
            </button>
          </>
        );
      }
      case 'Input.Text':
        return (
          <>
            {grid2(textField('id', 'Field ID'), textField('label', 'Label'))}
            {textField('placeholder', 'Placeholder')}
            {checkField('isMultiline', 'Multiline')}
          </>
        );
      case 'Input.Number':
        return (
          <>
            {grid2(textField('id', 'Field ID'), textField('label', 'Label'))}
            {textField('placeholder', 'Placeholder')}
            {grid2(numberField('min', 'Min'), numberField('max', 'Max'))}
          </>
        );
      case 'Input.Toggle':
        return (
          <>
            {grid2(textField('id', 'Field ID'), textField('title', 'Title'))}
          </>
        );
      case 'Input.ChoiceSet': {
        const choices = p.choices ?? [];
        return (
          <>
            {grid2(textField('id', 'Field ID'), textField('label', 'Label'))}
            {checkField('isMultiSelect', 'Multi-select')}
            <label style={labelCss}>Choices</label>
            {choices.map((choice, ci) => (
              <div key={ci} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 5, marginBottom: 5, alignItems: 'center' }}>
                <input
                  type="text"
                  value={choice.title}
                  placeholder="Display"
                  onChange={e => {
                    const next = choices.map((c, i) => i === ci ? { ...c, title: e.target.value } : c);
                    onUpdate(element.id, { ...p, choices: next });
                  }}
                  style={fieldBase}
                />
                <input
                  type="text"
                  value={choice.value}
                  placeholder="Value"
                  onChange={e => {
                    const next = choices.map((c, i) => i === ci ? { ...c, value: e.target.value } : c);
                    onUpdate(element.id, { ...p, choices: next });
                  }}
                  style={fieldBase}
                />
                <button
                  onClick={() => onUpdate(element.id, { ...p, choices: choices.filter((_, i) => i !== ci) })}
                  style={{ background: 'none', border: 'none', color: 'var(--color-status-error)', cursor: 'pointer', padding: 3, borderRadius: 3, display: 'flex' }}
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
            <button
              onClick={() => onUpdate(element.id, { ...p, choices: [...choices, { title: '', value: '' }] })}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 8px', background: 'none', border: '1px dashed var(--color-border-default)', borderRadius: 4, color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: 11 }}
            >
              <Plus size={11} /> Add Choice
            </button>
          </>
        );
      }
      case 'Action.Submit':
        return textField('actionTitle', 'Button Label');
      case 'Action.OpenUrl':
        return (
          <>
            {textField('actionTitle', 'Button Label')}
            {textField('actionUrl', 'URL')}
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--color-surface-secondary)',
        border: `1px solid ${hovered ? 'var(--color-border-strong)' : 'var(--color-border-default)'}`,
        borderLeft: `3px solid ${accent}`,
        borderRadius: 6,
        marginBottom: 8,
        boxShadow: hovered
          ? '0 4px 14px rgba(0,0,0,0.38), 0 2px 4px rgba(0,0,0,0.2)'
          : '0 2px 6px rgba(0,0,0,0.25), 0 1px 2px rgba(0,0,0,0.15)',
        transition: 'all 0.15s ease',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 9px', cursor: 'pointer', userSelect: 'none' }}
        onClick={() => onToggleExpand(element.id)}
      >
        <div style={{ width: 22, height: 22, borderRadius: 4, background: `${accent}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={12} color={accent} strokeWidth={2} />
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {element.type}
        </span>
        <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontFamily: 'var(--font-family-mono)', flexShrink: 0 }}>
          {element.id.slice(-5)}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
          {index > 0 && (
            <button
              onClick={e => { e.stopPropagation(); onMoveUp(element.id); }}
              title="Move up"
              style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: 3, borderRadius: 3, display: 'flex', alignItems: 'center' }}
            >
              <ArrowUp size={11} />
            </button>
          )}
          {index < total - 1 && (
            <button
              onClick={e => { e.stopPropagation(); onMoveDown(element.id); }}
              title="Move down"
              style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: 3, borderRadius: 3, display: 'flex', alignItems: 'center' }}
            >
              <ArrowDown size={11} />
            </button>
          )}
          <button
            onClick={e => { e.stopPropagation(); onDelete(element.id); }}
            title="Delete element"
            style={{ background: 'none', border: 'none', color: 'var(--color-status-error)', cursor: 'pointer', padding: 3, borderRadius: 3, display: 'flex', alignItems: 'center' }}
          >
            <Trash2 size={11} />
          </button>
          <div style={{ color: 'var(--color-text-muted)', marginLeft: 2, display: 'flex', alignItems: 'center' }}>
            {element.expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </div>
        </div>
      </div>

      {/* Properties editor */}
      {element.expanded && (
        <div style={{ padding: '0 10px 10px', borderTop: '1px solid var(--color-border-subtle)' }}>
          <div style={{ paddingTop: 10 }}>
            {renderProps()}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: renderPreviewElement + TeamsPreviewCard
// ---------------------------------------------------------------------------

const SPACING_PX: Record<string, string> = {
  None: '0px', Small: '4px', Default: '8px', Medium: '12px',
  Large: '16px', ExtraLarge: '24px', Padding: '16px',
};

const TEXT_SIZE_PX: Record<string, string> = {
  Small: '11px', Default: '14px', Medium: '16px', Large: '20px', ExtraLarge: '28px',
};

const TEXT_WEIGHT: Record<string, React.CSSProperties['fontWeight']> = {
  Default: 400, Lighter: 300, Bolder: 700,
};

const TEXT_COLOR: Record<string, string> = {
  Default: '#e8e8e8', Dark: '#a0a0a0', Light: '#ffffff',
  Accent: '#6264a7', Good: '#4ec9b0', Warning: '#f7b731', Attention: '#f44747',
};

const IMAGE_SIZE: Record<string, string | undefined> = {
  Auto: undefined, Stretch: '100%', Small: '64px', Medium: '128px', Large: '256px',
};

const ALIGN_JUSTIFY: Record<string, string> = {
  Left: 'flex-start', Center: 'center', Right: 'flex-end',
};

function renderPreviewElement(el: CardElement, idx: number): React.ReactNode {
  const p = el.props;
  const mt = idx === 0 ? '0px' : SPACING_PX[p.spacing ?? 'Default'];
  const sep = p.separator && idx > 0
    ? <div style={{ height: 1, background: 'rgba(255,255,255,0.12)', margin: '6px 0' }} />
    : null;

  switch (el.type) {
    case 'TextBlock':
      return (
        <div key={el.id} style={{ marginTop: mt }}>
          {sep}
          <p style={{
            margin: 0,
            fontSize: TEXT_SIZE_PX[p.size ?? 'Default'],
            fontWeight: TEXT_WEIGHT[p.weight ?? 'Default'],
            color: TEXT_COLOR[p.color ?? 'Default'],
            opacity: p.isSubtle ? 0.65 : 1,
            whiteSpace: p.wrap ? 'pre-wrap' : 'nowrap',
            overflow: p.wrap ? 'visible' : 'hidden',
            textOverflow: p.wrap ? 'clip' : 'ellipsis',
            lineHeight: 1.45,
            wordBreak: 'break-word',
          }}>
            {p.text || '\u00a0'}
          </p>
        </div>
      );

    case 'Image':
      return (
        <div key={el.id} style={{ marginTop: mt, display: 'flex', justifyContent: ALIGN_JUSTIFY[p.horizontalAlignment ?? 'Left'] }}>
          {sep}
          {p.url ? (
            <img
              src={p.url}
              alt={p.altText ?? ''}
              style={{ width: IMAGE_SIZE[p.imageSize ?? 'Auto'], maxWidth: '100%', borderRadius: 4, display: 'block' }}
            />
          ) : (
            <div style={{ width: 80, height: 56, background: 'rgba(255,255,255,0.07)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
              No URL
            </div>
          )}
        </div>
      );

    case 'ColumnSet':
      return (
        <div key={el.id} style={{ marginTop: mt, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[1, 2].map(n => (
            <div key={n} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 4, padding: 8, minHeight: 40, border: '1px dashed rgba(255,255,255,0.14)', fontSize: 11, color: 'rgba(255,255,255,0.28)', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              Column {n}
            </div>
          ))}
        </div>
      );

    case 'Container':
      return (
        <div key={el.id} style={{ marginTop: mt, padding: '8px 10px', background: p.style === 'Emphasis' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)', borderRadius: 4, border: '1px solid rgba(255,255,255,0.1)', fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center', minHeight: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          Container ({p.style ?? 'Default'})
        </div>
      );

    case 'ActionSet':
      return (
        <div key={el.id} style={{ marginTop: mt, padding: '6px 8px', background: 'rgba(255,255,255,0.04)', borderRadius: 4, border: '1px dashed rgba(255,255,255,0.14)', fontSize: 11, color: 'rgba(255,255,255,0.28)', textAlign: 'center' }}>
          ActionSet (inline actions)
        </div>
      );

    case 'FactSet': {
      const facts = p.facts ?? [];
      return (
        <div key={el.id} style={{ marginTop: mt }}>
          {sep}
          {facts.map((f, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, padding: '4px 0', borderBottom: i < facts.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 600, minWidth: 90, flexShrink: 0 }}>{f.title}</span>
              <span style={{ fontSize: 12, color: '#e8e8e8' }}>{f.value}</span>
            </div>
          ))}
        </div>
      );
    }

    case 'Input.Text':
      return (
        <div key={el.id} style={{ marginTop: mt }}>
          {p.label && <label style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 4, fontWeight: 500 }}>{p.label}</label>}
          <div style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 4, padding: p.isMultiline ? '6px 8px' : '5px 8px', fontSize: 12, color: 'rgba(255,255,255,0.32)', minHeight: p.isMultiline ? 60 : 'auto' }}>
            {p.placeholder ?? 'Enter text...'}
          </div>
        </div>
      );

    case 'Input.Number':
      return (
        <div key={el.id} style={{ marginTop: mt }}>
          {p.label && <label style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 4, fontWeight: 500 }}>{p.label}</label>}
          <div style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 4, padding: '5px 8px', fontSize: 12, color: 'rgba(255,255,255,0.32)' }}>
            {p.placeholder ?? '0'}
          </div>
        </div>
      );

    case 'Input.Toggle':
      return (
        <div key={el.id} style={{ marginTop: mt, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 18, background: 'rgba(255,255,255,0.15)', borderRadius: 9, position: 'relative', flexShrink: 0 }}>
            <div style={{ width: 14, height: 14, background: 'rgba(255,255,255,0.4)', borderRadius: '50%', position: 'absolute', top: 2, left: 2 }} />
          </div>
          <span style={{ fontSize: 13, color: '#e8e8e8' }}>{p.title ?? 'Toggle'}</span>
        </div>
      );

    case 'Input.ChoiceSet': {
      const choices = p.choices ?? [];
      return (
        <div key={el.id} style={{ marginTop: mt }}>
          {p.label && <label style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 6, fontWeight: 500 }}>{p.label}</label>}
          {choices.map((c, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
              <div style={{ width: 14, height: 14, borderRadius: p.isMultiSelect ? 3 : '50%', border: '1.5px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: '#e8e8e8' }}>{c.title}</span>
            </div>
          ))}
        </div>
      );
    }

    case 'Action.Submit':
      return (
        <div key={el.id} style={{ marginTop: idx === 0 ? '0px' : '8px' }}>
          <button style={{ padding: '7px 18px', background: '#6264a7', border: 'none', borderRadius: 4, color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }}>
            {p.actionTitle ?? 'Submit'}
          </button>
        </div>
      );

    case 'Action.OpenUrl':
      return (
        <div key={el.id} style={{ marginTop: idx === 0 ? '0px' : '8px' }}>
          <button style={{ padding: '7px 18px', background: 'transparent', border: '1.5px solid rgba(255,255,255,0.28)', borderRadius: 4, color: '#e8e8e8', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            {p.actionTitle ?? 'Open'}
          </button>
        </div>
      );

    default:
      return null;
  }
}

function TeamsPreviewCard({ elements }: { elements: CardElement[] }) {
  const bodyEls = elements.filter(e => e.type !== 'Action.Submit' && e.type !== 'Action.OpenUrl');
  const actionEls = elements.filter(e => e.type === 'Action.Submit' || e.type === 'Action.OpenUrl');

  if (elements.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.2)', gap: 12 }}>
        <LayoutTemplate size={40} strokeWidth={1} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>No elements yet</div>
          <div style={{ fontSize: 11, opacity: 0.7 }}>Add elements from the palette or load a template</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      {/* Teams-like card surface */}
      <div style={{
        background: '#292929',
        borderRadius: 8,
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.35)',
        padding: 16,
        maxWidth: 420,
        margin: '0 auto',
      }}>
        {bodyEls.map((el, i) => renderPreviewElement(el, i))}
        {actionEls.length > 0 && (
          <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 12 }}>
            {actionEls.map((el, i) => renderPreviewElement(el, i))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function AdaptiveCardApp() {
  const [elements, setElements] = useState<CardElement[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState<'preview' | 'json'>('preview');
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addElement = useCallback((item: PaletteItem) => {
    setElements(prev => [
      ...prev,
      { id: genId(), type: item.type, props: { ...item.defaultProps }, expanded: false },
    ]);
  }, []);

  const updateElement = useCallback((id: string, props: ElementProps) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, props } : el));
  }, []);

  const deleteElement = useCallback((id: string) => {
    setElements(prev => prev.filter(el => el.id !== id));
  }, []);

  const toggleExpand = useCallback((id: string) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, expanded: !el.expanded } : el));
  }, []);

  const moveUp = useCallback((id: string) => {
    setElements(prev => {
      const idx = prev.findIndex(el => el.id === id);
      if (idx <= 0) return prev;
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  }, []);

  const moveDown = useCallback((id: string) => {
    setElements(prev => {
      const idx = prev.findIndex(el => el.id === id);
      if (idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
      return next;
    });
  }, []);

  const loadTemplate = useCallback((tpl: Template) => {
    setActiveTemplate(tpl.id);
    setElements(tpl.elements.map(el => ({ ...el, expanded: false })));
  }, []);

  const handleExport = useCallback(() => {
    const json = JSON.stringify(generateCardJSON(elements), null, 2);
    navigator.clipboard.writeText(json).catch(() => {
      // Clipboard write failed silently — user can copy from JSON panel
    });
    setCopied(true);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), 2000);
  }, [elements]);

  const cardJSON = generateCardJSON(elements);
  const jsonStr = JSON.stringify(cardJSON, null, 2);
  const highlightedJSON = highlightJSONToHTML(jsonStr);

  // Shared style tokens
  const panelHead: React.CSSProperties = {
    padding: '9px 12px',
    borderBottom: '1px solid var(--color-border-subtle)',
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    flexShrink: 0,
    background: 'var(--color-surface-secondary)',
  };
  const sectionLabel: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 700,
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--color-surface-primary)', fontFamily: 'var(--font-family-sans)', overflow: 'hidden', fontSize: 13 }}>

      {/* ================================================================== */}
      {/* TEMPLATE GALLERY BAR                                                */}
      {/* ================================================================== */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        padding: '7px 12px',
        background: 'var(--color-surface-secondary)',
        borderBottom: '1px solid var(--color-border-default)',
        flexShrink: 0,
        overflowX: 'auto',
        boxShadow: '0 1px 6px rgba(0,0,0,0.25)',
      }}>
        {/* Label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginRight: 6, flexShrink: 0 }}>
          <LayoutTemplate size={13} color="var(--color-text-muted)" />
          <span style={{ ...sectionLabel, whiteSpace: 'nowrap' }}>Templates</span>
        </div>

        {/* Template buttons */}
        {TEMPLATES.map(tpl => {
          const TplIcon = tpl.icon;
          const active = activeTemplate === tpl.id;
          return (
            <button
              key={tpl.id}
              onClick={() => loadTemplate(tpl)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 11px',
                borderRadius: 5,
                border: `1px solid ${active ? 'var(--color-accent-primary)' : 'var(--color-border-default)'}`,
                background: active
                  ? 'rgba(0,120,212,0.14)'
                  : 'var(--color-surface-tertiary)',
                color: active ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: active ? 600 : 400,
                whiteSpace: 'nowrap',
                flexShrink: 0,
                transition: 'all 0.12s ease',
                boxShadow: active
                  ? '0 0 0 1px rgba(0,120,212,0.35), 0 2px 6px rgba(0,0,0,0.2)'
                  : '0 1px 3px rgba(0,0,0,0.2)',
              }}
            >
              <TplIcon size={12} strokeWidth={2} />
              {tpl.name}
            </button>
          );
        })}

        <div style={{ flex: 1 }} />

        {/* Export button */}
        <button
          onClick={handleExport}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 13px',
            borderRadius: 5,
            border: '1px solid var(--color-border-strong)',
            background: copied
              ? 'rgba(78,201,176,0.14)'
              : 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, var(--color-surface-elevated) 100%)',
            color: copied ? 'var(--color-status-success)' : 'var(--color-text-primary)',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 500,
            flexShrink: 0,
            transition: 'all 0.15s ease',
            boxShadow: '0 2px 6px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? 'Copied!' : 'Export JSON'}
        </button>
      </div>

      {/* ================================================================== */}
      {/* MAIN SPLIT LAYOUT                                                   */}
      {/* ================================================================== */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ============================================================== */}
        {/* LEFT PANEL — 55% (Palette sidebar + Canvas)                     */}
        {/* ============================================================== */}
        <div style={{ width: '55%', display: 'flex', borderRight: '1px solid var(--color-border-default)', overflow: 'hidden' }}>

          {/* -- Palette Sidebar -- */}
          <div style={{ width: 196, flexShrink: 0, background: 'var(--color-surface-secondary)', borderRight: '1px solid var(--color-border-default)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={panelHead}>
              <FileJson size={13} color="var(--color-text-muted)" />
              <span style={sectionLabel}>Elements</span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 7px' }}>
              {PALETTE_ITEMS.map(item => (
                <PaletteTile key={item.type} item={item} onAdd={addElement} />
              ))}
            </div>
          </div>

          {/* -- Canvas -- */}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'var(--color-surface-primary)' }}>
            <div style={{ ...panelHead, background: 'var(--color-surface-primary)' }}>
              <Columns size={13} color="var(--color-text-muted)" />
              <span style={sectionLabel}>Canvas</span>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--color-text-muted)', background: 'var(--color-surface-elevated)', borderRadius: 10, padding: '1px 7px' }}>
                {elements.length} {elements.length === 1 ? 'element' : 'elements'}
              </span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 10 }}>
              {elements.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 220, color: 'var(--color-text-muted)', gap: 10, border: '2px dashed var(--color-border-subtle)', borderRadius: 8, marginTop: 4 }}>
                  <Sparkles size={30} strokeWidth={1.2} />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>Click any palette item to add</div>
                    <div style={{ fontSize: 11, opacity: 0.7, marginTop: 3 }}>Or load a template from the bar above</div>
                  </div>
                </div>
              ) : (
                elements.map((el, i) => (
                  <CanvasElementCard
                    key={el.id}
                    element={el}
                    index={i}
                    total={elements.length}
                    onUpdate={updateElement}
                    onDelete={deleteElement}
                    onToggleExpand={toggleExpand}
                    onMoveUp={moveUp}
                    onMoveDown={moveDown}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* RIGHT PANEL — 45% (Preview + JSON)                              */}
        {/* ============================================================== */}
        <div style={{ width: '45%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Tab bar */}
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--color-surface-secondary)', borderBottom: '1px solid var(--color-border-default)', flexShrink: 0 }}>
            {(['preview', 'json'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setRightTab(tab)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '9px 16px',
                  background: 'none',
                  border: 'none',
                  borderBottom: `2px solid ${rightTab === tab ? 'var(--color-accent-primary)' : 'transparent'}`,
                  color: rightTab === tab ? 'var(--color-accent-primary)' : 'var(--color-text-muted)',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: rightTab === tab ? 600 : 400,
                  transition: 'all 0.12s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab === 'preview' ? <Eye size={13} /> : <Code2 size={13} />}
                {tab === 'preview' ? 'Live Preview' : 'JSON Schema'}
              </button>
            ))}
            {/* JSON line count badge */}
            {rightTab === 'json' && (
              <span style={{ marginLeft: 'auto', marginRight: 12, fontSize: 10, color: 'var(--color-text-muted)', fontFamily: 'var(--font-family-mono)', background: 'var(--color-surface-elevated)', borderRadius: 10, padding: '1px 7px' }}>
                {jsonStr.split('\n').length} lines
              </span>
            )}
          </div>

          {/* Preview panel */}
          {rightTab === 'preview' && (
            <div style={{ flex: 1, overflow: 'auto', background: 'linear-gradient(150deg, #1a1a2e 0%, #16213e 55%, #0f3460 100%)' }}>
              <TeamsPreviewCard elements={elements} />
            </div>
          )}

          {/* JSON panel */}
          {rightTab === 'json' && (
            <div style={{ flex: 1, overflow: 'auto', background: '#1e1e1e' }}>
              <pre
                style={{
                  margin: 0,
                  padding: 16,
                  fontSize: 12,
                  lineHeight: 1.65,
                  fontFamily: 'var(--font-family-mono)',
                  whiteSpace: 'pre',
                  tabSize: 2,
                  color: '#d4d4d4',
                }}
                dangerouslySetInnerHTML={{ __html: highlightedJSON }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
