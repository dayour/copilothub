import { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Brain,
  Database,
  Layers,
  Package,
  Sliders,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

type Mode = 'Performance' | 'Inventory' | 'Brand Mix' | 'Anomaly' | 'What-If';
type TimePeriod = 'This Week' | 'Last Week' | 'MTD' | 'QTD' | 'Custom';
type SortKey = 'revenue' | 'target' | 'variance' | 'str';

type KpiStatus = 'good' | 'watch' | 'risk';

type KpiCardData = {
  id: string;
  label: string;
  short: string;
  value: string;
  delta: string;
  status: KpiStatus;
  trend: number[];
};

type StorePerformance = {
  id: string;
  name: string;
  region: string;
  revenue: number;
  target: number;
  variance: number;
  str: number;
};

type InventoryCategory = {
  id: string;
  name: string;
  stock: number;
  woc: number;
  reorderLevel: number;
  allocation: string;
  alert: string;
};

type BrandMix = {
  id: string;
  name: string;
  marginContribution: number;
  mix: number;
  trend: number;
  peer: string;
  trendHistory: number[];
};

type Anomaly = {
  id: string;
  title: string;
  severity: 'High' | 'Medium' | 'Low';
  change: string;
  cause: string;
  action: string;
};

const KPI_CARDS: KpiCardData[] = [
  {
    id: 'str',
    label: 'Sell-Through Rate',
    short: 'STR',
    value: '62.4%',
    delta: '+2.3%',
    status: 'good',
    trend: [0.56, 0.57, 0.58, 0.6, 0.59, 0.61, 0.6, 0.62, 0.63, 0.62, 0.63, 0.624],
  },
  {
    id: 'gmroi',
    label: 'GMROI',
    short: 'GMROI',
    value: '3.1',
    delta: '+0.4',
    status: 'good',
    trend: [2.5, 2.6, 2.65, 2.7, 2.8, 2.85, 2.9, 3.0, 3.05, 3.02, 3.08, 3.1],
  },
  {
    id: 'woc',
    label: 'Weeks of Cover',
    short: 'WoC',
    value: '6.1',
    delta: '-0.7',
    status: 'watch',
    trend: [7.4, 7.2, 7.0, 6.9, 6.8, 6.6, 6.5, 6.4, 6.3, 6.25, 6.2, 6.1],
  },
  {
    id: 'turn',
    label: 'Stock Turn',
    short: 'Stock Turn',
    value: '6.2',
    delta: '+0.5',
    status: 'good',
    trend: [5.2, 5.3, 5.4, 5.6, 5.7, 5.8, 5.9, 6.0, 6.1, 6.05, 6.15, 6.2],
  },
  {
    id: 'otb',
    label: 'Open-to-Buy',
    short: 'OTB',
    value: '$3.8M',
    delta: '-$0.6M',
    status: 'risk',
    trend: [4.6, 4.5, 4.4, 4.2, 4.1, 4.0, 3.9, 3.8, 3.7, 3.8, 3.75, 3.8],
  },
];

const STORE_PERFORMANCE: StorePerformance[] = [
  { id: 's1', name: 'Chicago Loop', region: 'Midwest', revenue: 1.24, target: 1.15, variance: 0.078, str: 0.66 },
  { id: 's2', name: 'Dallas Galleria', region: 'South', revenue: 1.12, target: 1.08, variance: 0.037, str: 0.64 },
  { id: 's3', name: 'Seattle Northgate', region: 'West', revenue: 0.98, target: 1.05, variance: -0.067, str: 0.59 },
  { id: 's4', name: 'Miami Brickell', region: 'South', revenue: 1.18, target: 1.1, variance: 0.073, str: 0.65 },
  { id: 's5', name: 'Boston Seaport', region: 'Northeast', revenue: 1.04, target: 1.06, variance: -0.019, str: 0.61 },
  { id: 's6', name: 'Denver Union', region: 'Mountain', revenue: 0.92, target: 0.98, variance: -0.061, str: 0.58 },
  { id: 's7', name: 'LA Century', region: 'West', revenue: 1.32, target: 1.22, variance: 0.082, str: 0.68 },
  { id: 's8', name: 'Atlanta Midtown', region: 'South', revenue: 1.06, target: 1.04, variance: 0.019, str: 0.63 },
];

const INVENTORY_CATEGORIES: InventoryCategory[] = [
  {
    id: 'cat1',
    name: 'Denim',
    stock: 18400,
    woc: 7.1,
    reorderLevel: 5.5,
    allocation: 'Shift 6% to West cluster',
    alert: 'Excess cover in Midwest',
  },
  {
    id: 'cat2',
    name: 'Outerwear',
    stock: 12350,
    woc: 4.2,
    reorderLevel: 5.0,
    allocation: 'Pull-forward holiday buy',
    alert: 'Reorder window in 2 weeks',
  },
  {
    id: 'cat3',
    name: 'Athleisure',
    stock: 16580,
    woc: 6.4,
    reorderLevel: 4.8,
    allocation: 'Hold current allocation',
    alert: 'Healthy cover',
  },
  {
    id: 'cat4',
    name: 'Accessories',
    stock: 9200,
    woc: 3.6,
    reorderLevel: 4.5,
    allocation: 'Increase 8% in South',
    alert: 'Urgent replenishment',
  },
];

const BRAND_MIX: BrandMix[] = [
  {
    id: 'b1',
    name: 'Lumen',
    marginContribution: 28.6,
    mix: 18.2,
    trend: 2.1,
    peer: 'Above peer by 1.4 pts',
    trendHistory: [15.2, 15.5, 16.0, 16.4, 16.8, 17.2, 17.6, 17.9, 18.1, 18.0, 18.2, 18.2],
  },
  {
    id: 'b2',
    name: 'Northline',
    marginContribution: 24.3,
    mix: 16.9,
    trend: 1.2,
    peer: 'In-line with peer',
    trendHistory: [15.1, 15.4, 15.6, 15.8, 16.1, 16.4, 16.5, 16.7, 16.8, 16.9, 16.9, 16.9],
  },
  {
    id: 'b3',
    name: 'Everfield',
    marginContribution: 19.7,
    mix: 14.8,
    trend: -0.8,
    peer: 'Below peer by 0.9 pts',
    trendHistory: [16.2, 16.0, 15.8, 15.6, 15.4, 15.2, 15.0, 14.9, 14.9, 14.8, 14.7, 14.8],
  },
  {
    id: 'b4',
    name: 'Arcadia',
    marginContribution: 14.5,
    mix: 12.6,
    trend: 0.4,
    peer: 'Above peer by 0.5 pts',
    trendHistory: [12.0, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.6, 12.6, 12.6, 12.6, 12.6],
  },
  {
    id: 'b5',
    name: 'Studio Eight',
    marginContribution: 7.9,
    mix: 9.8,
    trend: -1.1,
    peer: 'Below peer by 1.8 pts',
    trendHistory: [11.8, 11.4, 11.0, 10.7, 10.5, 10.2, 10.0, 9.9, 9.8, 9.8, 9.7, 9.8],
  },
  {
    id: 'b6',
    name: 'Harborline',
    marginContribution: 5.6,
    mix: 7.7,
    trend: 0.6,
    peer: 'In-line with peer',
    trendHistory: [7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.7, 7.7, 7.7, 7.7, 7.7],
  },
];

const ANOMALIES: Anomaly[] = [
  {
    id: 'a1',
    title: 'STR drop in West cluster',
    severity: 'High',
    change: '-6.2 pts',
    cause: 'Delayed outerwear sell-through after warm front',
    action: 'Advance markdown in key SKUs and reallocate knitwear',
  },
  {
    id: 'a2',
    title: 'GMROI surge in South',
    severity: 'Medium',
    change: '+0.7',
    cause: 'Higher-margin accessories mix in top 20 stores',
    action: 'Expand accessory endcaps in top 50 stores',
  },
  {
    id: 'a3',
    title: 'Stock turn dip in Midwest',
    severity: 'Medium',
    change: '-0.4',
    cause: 'Denim replenishment pacing behind forecast',
    action: 'Fast-track replenishment from DC-2',
  },
  {
    id: 'a4',
    title: 'OTB compression in Northeast',
    severity: 'Low',
    change: '-$0.3M',
    cause: 'Pre-booked holiday commitments',
    action: 'Delay discretionary buy to week 8',
  },
];

const ANALYSIS_MODES: { id: Mode; description: string; Icon: typeof Activity }[] = [
  { id: 'Performance', description: 'Store comparisons and KPI variance', Icon: BarChart3 },
  { id: 'Inventory', description: 'Weeks of cover and replenishment', Icon: Package },
  { id: 'Brand Mix', description: 'Margin mix and peer splits', Icon: Layers },
  { id: 'Anomaly', description: 'Flagged KPI shifts and drivers', Icon: AlertTriangle },
  { id: 'What-If', description: 'Scenario sliders and projections', Icon: Sliders },
];

const TIME_PERIODS: TimePeriod[] = ['This Week', 'Last Week', 'MTD', 'QTD', 'Custom'];

const STATUS_STYLES: Record<KpiStatus, { color: string; chip: string }> = {
  good: {
    color: 'var(--color-status-success)',
    chip: 'bg-[var(--color-status-success)]/15 text-[var(--color-status-success)]',
  },
  watch: {
    color: 'var(--color-status-warning)',
    chip: 'bg-[var(--color-status-warning)]/15 text-[var(--color-status-warning)]',
  },
  risk: {
    color: 'var(--color-status-error)',
    chip: 'bg-[var(--color-status-error)]/15 text-[var(--color-status-error)]',
  },
};

const VARIANCE_TONE = (variance: number) => {
  if (variance >= 0.05) return 'bg-[var(--color-status-success)]/12';
  if (variance >= -0.02) return 'bg-[var(--color-status-warning)]/12';
  return 'bg-[var(--color-status-error)]/12';
};

const SEVERITY_STYLE: Record<Anomaly['severity'], string> = {
  High: 'bg-[var(--color-status-error)]/20 text-[var(--color-status-error)]',
  Medium: 'bg-[var(--color-status-warning)]/20 text-[var(--color-status-warning)]',
  Low: 'bg-[var(--color-status-info)]/20 text-[var(--color-status-info)]',
};

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = 24 - ((value - min) / range) * 22;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg viewBox="0 0 100 24" className="h-6 w-full">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="100" cy={24 - ((data[data.length - 1] - min) / range) * 22} r="2.5" fill={color} />
    </svg>
  );
}

function formatCurrency(value: number) {
  return `$${value.toFixed(2)}M`;
}

function formatPercent(value: number, digits = 1) {
  return `${(value * 100).toFixed(digits)}%`;
}

export function ClothingPowerAnalysis() {
  const [mode, setMode] = useState<Mode>('Performance');
  const [period, setPeriod] = useState<TimePeriod>('MTD');
  const [sortKey, setSortKey] = useState<SortKey>('revenue');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [discount, setDiscount] = useState(12);
  const [markdownWeeks, setMarkdownWeeks] = useState(3);
  const [allocationShift, setAllocationShift] = useState(8);

  const sortedStores = useMemo(() => {
    const sorted = [...STORE_PERFORMANCE].sort((a, b) => {
      const valueA = a[sortKey];
      const valueB = b[sortKey];
      const delta = typeof valueA === 'number' && typeof valueB === 'number' ? valueA - valueB : 0;
      return sortDir === 'asc' ? delta : -delta;
    });
    return sorted;
  }, [sortKey, sortDir]);

  const projected = useMemo(() => {
    const baseStr = 0.624;
    const baseGmroi = 3.1;
    const strImpact = discount * 0.003 - markdownWeeks * 0.008 + allocationShift * 0.0015;
    const gmroiImpact = discount * -0.02 + markdownWeeks * 0.05 + allocationShift * 0.008;
    return {
      str: Math.max(0.52, Math.min(0.74, baseStr + strImpact)),
      gmroi: Math.max(2.4, Math.min(3.8, baseGmroi + gmroiImpact)),
    };
  }, [discount, markdownWeeks, allocationShift]);

  const toggleSort = (nextKey: SortKey) => {
    if (nextKey === sortKey) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(nextKey);
    setSortDir('desc');
  };

  return (
    <div className="flex h-full w-full flex-col gap-4 overflow-hidden rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-primary)] p-6">
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-accent-primary)]/15 text-[var(--color-accent-primary)]">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div className="flex flex-col gap-2">
              <div>
                <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">
                  Clothing Power Analysis
                </h1>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Copilot Studio deep reasoning analytics agent for a global clothing retailer with 200+ stores.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-[var(--color-text-muted)]">
                <span className="rounded-full border border-[var(--color-border-default)] px-3 py-1">
                  Dataverse: SalesTransactions, ProductCatalog, StoreMaster, InventorySnapshots
                </span>
                <span className="rounded-full border border-[var(--color-border-default)] px-3 py-1">
                  Reasoning: decomposition, comparative, predictive, anomaly detection
                </span>
                <span className="rounded-full border border-[var(--color-border-default)] px-3 py-1">
                  Power Automate flows for semantic-model queries
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] p-3 text-xs text-[var(--color-text-secondary)]">
            <div className="flex items-center gap-2 text-[var(--color-text-primary)]">
              <Brain className="h-4 w-4 text-[var(--color-accent-primary)]" />
              Context variables passed across topics
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-md bg-[var(--color-surface-tertiary)] px-2 py-1">{`{timeWindow}`}</span>
              <span className="rounded-md bg-[var(--color-surface-tertiary)] px-2 py-1">{`{storeCluster}`}</span>
              <span className="rounded-md bg-[var(--color-surface-tertiary)] px-2 py-1">{`{seasonalIndex}`}</span>
              <span className="rounded-md bg-[var(--color-surface-tertiary)] px-2 py-1">{`{pricingElasticity}`}</span>
            </div>
          </div>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-5">
        {KPI_CARDS.map((kpi) => {
          const styles = STATUS_STYLES[kpi.status];
          return (
            <div
              key={kpi.id}
              className="flex flex-col gap-3 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                  {kpi.short}
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${styles.chip}`}>
                  {kpi.delta}
                </span>
              </div>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <div className="text-xl font-semibold text-[var(--color-text-primary)]">{kpi.value}</div>
                  <div className="text-xs text-[var(--color-text-secondary)]">{kpi.label}</div>
                </div>
                <Sparkline data={kpi.trend} color={styles.color} />
              </div>
            </div>
          );
        })}
      </section>

      <section className="grid flex-1 gap-4 overflow-hidden lg:grid-cols-[220px_minmax(0,1fr)_260px]">
        <aside className="flex h-full flex-col gap-4 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
            Analysis Mode
          </div>
          <div className="flex flex-col gap-2">
            {ANALYSIS_MODES.map(({ id, description, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setMode(id)}
                className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                  mode === id
                    ? 'border-[var(--color-accent-primary)] bg-[var(--color-accent-primary)]/15 text-[var(--color-text-primary)]'
                    : 'border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'
                }`}
              >
                <Icon className="h-4 w-4" />
                <div>
                  <div className="font-semibold">{id}</div>
                  <div className="text-xs text-[var(--color-text-muted)]">{description}</div>
                </div>
              </button>
            ))}
          </div>
          <div className="mt-auto rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] p-3 text-xs text-[var(--color-text-secondary)]">
            <div className="flex items-center gap-2 text-[var(--color-text-primary)]">
              <Database className="h-4 w-4 text-[var(--color-accent-primary)]" />
              Semantic model execution
            </div>
            <p className="mt-2 leading-relaxed">
              Power Automate flows invoke the semantic model, returning curated measures for each analysis mode.
            </p>
          </div>
        </aside>

        <main className="flex h-full flex-col gap-4 overflow-hidden rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{mode}</h2>
              <p className="text-sm text-[var(--color-text-secondary)]">
                {mode === 'Performance' && 'Store comparisons with KPI variance and heat-mapped STR.'}
                {mode === 'Inventory' && 'Category-level cover, alerts, and allocation recommendations.'}
                {mode === 'Brand Mix' && 'Margin contribution and mix dynamics across key brands.'}
                {mode === 'Anomaly' && 'Flagged KPI shifts with diagnostic context.'}
                {mode === 'What-If' && 'Scenario sliders with projected STR and GMROI.'}
              </p>
            </div>
            <div className="rounded-full border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] px-3 py-1 text-xs text-[var(--color-text-muted)]">
              12-week trend window
            </div>
          </div>

          {mode === 'Performance' && (
            <div className="flex h-full flex-col overflow-hidden rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)]">
              <div className="grid grid-cols-[1.4fr_repeat(4,1fr)] gap-2 border-b border-[var(--color-border-default)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                <div>Store</div>
                <button type="button" onClick={() => toggleSort('revenue')} className="text-left">
                  Revenue
                </button>
                <button type="button" onClick={() => toggleSort('target')} className="text-left">
                  Target
                </button>
                <button type="button" onClick={() => toggleSort('variance')} className="text-left">
                  Variance
                </button>
                <button type="button" onClick={() => toggleSort('str')} className="text-left">
                  STR
                </button>
              </div>
              <div className="flex-1 overflow-auto">
                {sortedStores.map((store) => (
                  <div
                    key={store.id}
                    className={`grid grid-cols-[1.4fr_repeat(4,1fr)] gap-2 border-b border-[var(--color-border-default)] px-4 py-3 text-sm text-[var(--color-text-secondary)] ${VARIANCE_TONE(
                      store.variance,
                    )}`}
                  >
                    <div className="flex flex-col">
                      <span className="font-semibold text-[var(--color-text-primary)]">{store.name}</span>
                      <span className="text-xs text-[var(--color-text-muted)]">{store.region}</span>
                    </div>
                    <div className="text-[var(--color-text-primary)]">{formatCurrency(store.revenue)}</div>
                    <div>{formatCurrency(store.target)}</div>
                    <div
                      className={`font-semibold ${
                        store.variance >= 0 ? 'text-[var(--color-status-success)]' : 'text-[var(--color-status-error)]'
                      }`}
                    >
                      {(store.variance * 100).toFixed(1)}%
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[var(--color-text-primary)]">
                        {formatPercent(store.str)}
                      </span>
                      {store.str >= 0.64 ? (
                        <TrendingUp className="h-4 w-4 text-[var(--color-status-success)]" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-[var(--color-status-warning)]" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {mode === 'Inventory' && (
            <div className="grid gap-4 lg:grid-cols-2">
              {INVENTORY_CATEGORIES.map((category) => {
                const coverPct = Math.min(100, Math.max(0, (category.woc / 8) * 100));
                const isAlert = category.woc < category.reorderLevel;
                return (
                  <div
                    key={category.id}
                    className="flex flex-col gap-4 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold text-[var(--color-text-primary)]">{category.name}</div>
                        <div className="text-xs text-[var(--color-text-muted)]">
                          Stock position: {category.stock.toLocaleString()} units
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                          isAlert
                            ? 'bg-[var(--color-status-error)]/15 text-[var(--color-status-error)]'
                            : 'bg-[var(--color-status-success)]/15 text-[var(--color-status-success)]'
                        }`}
                      >
                        {category.alert}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                        <span>Weeks of Cover</span>
                        <span className="text-[var(--color-text-primary)]">{category.woc.toFixed(1)}</span>
                      </div>
                      <div className="mt-2 h-2 w-full rounded-full bg-[var(--color-surface-secondary)]">
                        <div
                          className={`h-2 rounded-full ${
                            isAlert ? 'bg-[var(--color-status-error)]' : 'bg-[var(--color-status-info)]'
                          }`}
                          style={{ width: `${coverPct}%` }}
                        />
                      </div>
                      <div className="mt-2 text-xs text-[var(--color-text-muted)]">
                        Reorder threshold: {category.reorderLevel.toFixed(1)} WoC
                      </div>
                    </div>
                    <div className="rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] p-3 text-xs text-[var(--color-text-secondary)]">
                      Allocation recommendation: <span className="text-[var(--color-text-primary)]">{category.allocation}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {mode === 'Brand Mix' && (
            <div className="grid gap-4 lg:grid-cols-2">
              {BRAND_MIX.map((brand) => {
                const trendUp = brand.trend >= 0;
                return (
                  <div
                    key={brand.id}
                    className="flex flex-col gap-3 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-[var(--color-text-primary)]">{brand.name}</div>
                      <div className="flex items-center gap-2 text-xs">
                        {trendUp ? (
                          <TrendingUp className="h-4 w-4 text-[var(--color-status-success)]" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-[var(--color-status-error)]" />
                        )}
                        <span className={trendUp ? 'text-[var(--color-status-success)]' : 'text-[var(--color-status-error)]'}>
                          {brand.trend > 0 ? '+' : ''}
                          {brand.trend.toFixed(1)} pts
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-[var(--color-text-muted)]">Margin contribution</div>
                        <div className="text-lg font-semibold text-[var(--color-text-primary)]">
                          {brand.marginContribution.toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-[var(--color-text-muted)]">Mix</div>
                        <div className="text-lg font-semibold text-[var(--color-text-primary)]">
                          {brand.mix.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    <div className="rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] p-3 text-xs text-[var(--color-text-secondary)]">
                      {brand.peer}
                    </div>
                    <Sparkline data={brand.trendHistory} color="var(--color-accent-primary)" />
                  </div>
                );
              })}
            </div>
          )}

          {mode === 'Anomaly' && (
            <div className="flex flex-col gap-4">
              {ANOMALIES.map((anomaly) => (
                <div
                  key={anomaly.id}
                  className="flex flex-col gap-3 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-[var(--color-text-primary)]">{anomaly.title}</div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`rounded-full px-2 py-1 font-semibold ${SEVERITY_STYLE[anomaly.severity]}`}>
                        {anomaly.severity}
                      </span>
                      <span className="text-[var(--color-text-secondary)]">{anomaly.change}</span>
                    </div>
                  </div>
                  <div className="grid gap-2 text-xs text-[var(--color-text-secondary)]">
                    <div>
                      Cause: <span className="text-[var(--color-text-primary)]">{anomaly.cause}</span>
                    </div>
                    <div>
                      Recommended action: <span className="text-[var(--color-text-primary)]">{anomaly.action}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {mode === 'What-If' && (
            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="flex flex-col gap-4 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] p-4">
                <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                  <span>Discount percentage</span>
                  <span className="text-[var(--color-text-primary)]">{discount}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={30}
                  value={discount}
                  onChange={(event) => setDiscount(Number(event.currentTarget.value))}
                  className="w-full accent-[var(--color-accent-primary)]"
                />
                <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                  <span>Markdown timing (weeks)</span>
                  <span className="text-[var(--color-text-primary)]">{markdownWeeks} weeks</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={8}
                  value={markdownWeeks}
                  onChange={(event) => setMarkdownWeeks(Number(event.currentTarget.value))}
                  className="w-full accent-[var(--color-accent-primary)]"
                />
                <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                  <span>Allocation shift</span>
                  <span className="text-[var(--color-text-primary)]">{allocationShift}%</span>
                </div>
                <input
                  type="range"
                  min={-10}
                  max={15}
                  value={allocationShift}
                  onChange={(event) => setAllocationShift(Number(event.currentTarget.value))}
                  className="w-full accent-[var(--color-accent-primary)]"
                />
              </div>
              <div className="flex flex-col gap-4 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
                  <Activity className="h-4 w-4 text-[var(--color-accent-primary)]" />
                  Projected impact
                </div>
                <div className="grid gap-3">
                  <div className="rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] p-3">
                    <div className="text-xs text-[var(--color-text-muted)]">Projected STR</div>
                    <div className="text-lg font-semibold text-[var(--color-text-primary)]">
                      {formatPercent(projected.str)}
                    </div>
                  </div>
                  <div className="rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] p-3">
                    <div className="text-xs text-[var(--color-text-muted)]">Projected GMROI</div>
                    <div className="text-lg font-semibold text-[var(--color-text-primary)]">
                      {projected.gmroi.toFixed(2)}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-[var(--color-text-secondary)]">
                  Scenario assumes elasticity derived from 12-week markdown response and inventory depth.
                </div>
              </div>
            </div>
          )}
        </main>

        <aside className="flex h-full flex-col gap-4 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
            <Brain className="h-4 w-4 text-[var(--color-accent-primary)]" />
            Reasoning trace
          </div>
          <div className="flex flex-col gap-4">
            {[
              {
                title: 'Step 1: Query sales',
                detail: 'Power Automate flow calls SalesTransactions with period context.',
              },
              {
                title: 'Step 2: Compare peer',
                detail: 'Join StoreMaster and ProductCatalog to build peer baselines.',
              },
              {
                title: 'Step 3: Diagnose',
                detail: 'Decompose variance into price, mix, and inventory drivers.',
              },
              {
                title: 'Step 4: Recommend',
                detail: 'Select allocation and markdown actions with projected impact.',
              },
            ].map((step, index) => (
              <div key={step.title} className="flex gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] text-xs font-semibold text-[var(--color-text-primary)]">
                  {index + 1}
                </div>
                <div>
                  <div className="text-sm font-semibold text-[var(--color-text-primary)]">{step.title}</div>
                  <div className="text-xs text-[var(--color-text-secondary)]">{step.detail}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-auto rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] p-3 text-xs text-[var(--color-text-secondary)]">
            Topic chaining passes context variables across nodes to preserve store cluster, time window, and inventory
            constraints.
          </div>
        </aside>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] px-4 py-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          Time Period
        </div>
        <div className="flex flex-wrap gap-2">
          {TIME_PERIODS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setPeriod(option)}
              className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors ${
                period === option
                  ? 'border-[var(--color-accent-primary)] bg-[var(--color-accent-primary)]/15 text-[var(--color-text-primary)]'
                  : 'border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </footer>
    </div>
  );
}
