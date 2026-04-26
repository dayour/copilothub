import { useMemo, useState, type CSSProperties } from 'react';
import {
  Download,
  Eye,
  Film,
  Grid,
  Image,
  Layers,
  Link,
  List,
  Maximize,
  Palette,
  Pause,
  Play,
  Search,
  Sparkles,
  Tag,
  Trash2,
  Upload,
  Video,
  Volume2,
  Clock,
} from 'lucide-react';

type AssetType = 'video' | 'image' | 'animation' | 'logo';

type Asset = {
  id: string;
  name: string;
  type: AssetType;
  dimensions: string;
  size: string;
  created: string;
  format: string;
  tags: string[];
  duration?: string;
  frames?: number;
  colorSpace?: string;
};

type AssetFilter = 'all' | AssetType;

const volumetricCardStyle: CSSProperties = {
  boxShadow:
    '0 22px 32px rgba(0, 0, 0, 0.35), 0 10px 16px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
  transform: 'perspective(900px) rotateX(1.2deg)',
};

const volumetricPanelStyle: CSSProperties = {
  boxShadow:
    '0 28px 45px rgba(0, 0, 0, 0.4), 0 12px 20px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
  transform: 'perspective(900px) rotateX(1deg)',
};

const thumbnailGradients: Record<AssetType, string> = {
  video:
    'linear-gradient(135deg, var(--color-accent-primary) 0%, var(--color-surface-tertiary) 60%, rgba(15, 20, 44, 0.95) 100%)',
  image:
    'linear-gradient(135deg, var(--color-status-success) 0%, var(--color-surface-tertiary) 55%, rgba(8, 40, 28, 0.9) 100%)',
  animation:
    'linear-gradient(135deg, var(--color-status-warning) 0%, var(--color-accent-primary) 55%, rgba(60, 20, 12, 0.9) 100%)',
  logo:
    'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0) 100%)',
};

const logoCheckerStyle: CSSProperties = {
  backgroundImage:
    'linear-gradient(45deg, rgba(255,255,255,0.08) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.08) 75%, rgba(255,255,255,0.08)), linear-gradient(45deg, rgba(255,255,255,0.08) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.08) 75%, rgba(255,255,255,0.08))',
  backgroundSize: '24px 24px',
  backgroundPosition: '0 0, 12px 12px',
};

const typeAccent: Record<AssetType, string> = {
  video: 'var(--color-accent-primary)',
  image: 'var(--color-status-success)',
  animation: 'var(--color-status-warning)',
  logo: 'var(--color-enterprise-blue-light)',
};

const typeLabel: Record<AssetType, string> = {
  video: 'Video',
  image: 'Image',
  animation: 'Animation',
  logo: 'Logo',
};

export function MediaAssetStudio() {
  const [assets] = useState<Asset[]>([
    {
      id: 'asset-video-1',
      name: 'Product Demo',
      type: 'video',
      dimensions: '1920 x 1080',
      size: '148 MB',
      created: 'Feb 12, 2025',
      format: 'MP4',
      tags: ['product', 'launch', 'demo'],
      duration: '2:34',
    },
    {
      id: 'asset-video-2',
      name: 'Onboarding Tutorial',
      type: 'video',
      dimensions: '3840 x 2160',
      size: '620 MB',
      created: 'Jan 29, 2025',
      format: 'MOV',
      tags: ['training', 'guide', 'enterprise'],
      duration: '6:10',
    },
    {
      id: 'asset-video-3',
      name: 'Brand Intro',
      type: 'video',
      dimensions: '2560 x 1440',
      size: '210 MB',
      created: 'Dec 18, 2024',
      format: 'MP4',
      tags: ['brand', 'title', 'cinematic'],
      duration: '1:12',
    },
    {
      id: 'asset-image-1',
      name: 'Hero Banner',
      type: 'image',
      dimensions: '4096 x 2304',
      size: '12.2 MB',
      created: 'Mar 2, 2025',
      format: 'PNG',
      tags: ['hero', 'campaign', 'landing'],
      colorSpace: 'Display P3',
    },
    {
      id: 'asset-image-2',
      name: 'Feature Screenshot',
      type: 'image',
      dimensions: '2880 x 1800',
      size: '6.7 MB',
      created: 'Feb 22, 2025',
      format: 'PNG',
      tags: ['product', 'ui', 'feature'],
      colorSpace: 'sRGB',
    },
    {
      id: 'asset-image-3',
      name: 'Team Photo',
      type: 'image',
      dimensions: '3000 x 2000',
      size: '4.8 MB',
      created: 'Nov 14, 2024',
      format: 'JPG',
      tags: ['people', 'culture', 'press'],
      colorSpace: 'sRGB',
    },
    {
      id: 'asset-image-4',
      name: 'Icon Set',
      type: 'image',
      dimensions: '2048 x 2048',
      size: '2.4 MB',
      created: 'Oct 6, 2024',
      format: 'PNG',
      tags: ['icons', 'ui', 'system'],
      colorSpace: 'Display P3',
    },
    {
      id: 'asset-animation-1',
      name: 'Loading Spinner',
      type: 'animation',
      dimensions: '512 x 512',
      size: '420 KB',
      created: 'Feb 5, 2025',
      format: 'Lottie',
      tags: ['loading', 'micro', 'system'],
      frames: 120,
      duration: '2.0s',
    },
    {
      id: 'asset-animation-2',
      name: 'Transition Effect',
      type: 'animation',
      dimensions: '1920 x 1080',
      size: '1.4 MB',
      created: 'Jan 9, 2025',
      format: 'JSON',
      tags: ['transition', 'layout', 'motion'],
      frames: 240,
      duration: '4.0s',
    },
    {
      id: 'asset-animation-3',
      name: 'Particle Burst',
      type: 'animation',
      dimensions: '1280 x 720',
      size: '980 KB',
      created: 'Dec 2, 2024',
      format: 'MP4',
      tags: ['particles', 'celebration', 'motion'],
      frames: 180,
      duration: '3.0s',
    },
    {
      id: 'asset-logo-1',
      name: 'CopilotBrowser Logo',
      type: 'logo',
      dimensions: '2048 x 2048',
      size: '380 KB',
      created: 'Sep 14, 2024',
      format: 'SVG',
      tags: ['brand', 'logo', 'copilotbrowser'],
    },
    {
      id: 'asset-logo-2',
      name: 'CopilotHub Logo',
      type: 'logo',
      dimensions: '2048 x 2048',
      size: '410 KB',
      created: 'Sep 10, 2024',
      format: 'SVG',
      tags: ['brand', 'logo', 'copilothub'],
    },
  ]);

  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [filter, setFilter] = useState<AssetFilter>('all');
  const [query, setQuery] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(36);
  const [volume, setVolume] = useState(70);
  const [zoom, setZoom] = useState(100);
  const [loopEnabled, setLoopEnabled] = useState(true);
  const [speed, setSpeed] = useState(1);

  const filteredAssets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return assets.filter((asset) => {
      const matchesFilter = filter === 'all' || asset.type === filter;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        asset.name.toLowerCase().includes(normalizedQuery) ||
        asset.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery));
      return matchesFilter && matchesQuery;
    });
  }, [assets, filter, query]);

  const viewOptions = [
    { id: 'grid', label: 'Grid', Icon: Grid },
    { id: 'list', label: 'List', Icon: List },
  ] as const;

  const filters = [
    { id: 'all', label: 'All', Icon: Layers },
    { id: 'video', label: 'Video', Icon: Video },
    { id: 'image', label: 'Image', Icon: Image },
    { id: 'animation', label: 'Animation', Icon: Sparkles },
    { id: 'logo', label: 'Logo', Icon: Palette },
  ] as const;

  const activeAsset = selectedAsset ?? filteredAssets[0] ?? null;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[var(--color-surface-primary)] text-[var(--color-text-primary)]">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] px-6 py-4">
        <div className="flex flex-1 items-center gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
              CopilotBrowser
            </p>
            <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">
              Media Asset Studio
            </h1>
          </div>
          <div className="ml-auto hidden items-center gap-2 rounded-full border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] px-3 py-2 text-xs text-[var(--color-text-secondary)] md:flex">
            <Film className="h-4 w-4 text-[var(--color-text-secondary)]" />
            {assets.length} assets in CopilotHub library
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center rounded-full border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] p-1">
            {viewOptions.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setView(id)}
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  view === id
                    ? 'bg-[var(--color-surface-active)] text-[var(--color-text-primary)]'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {filters.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  filter === id
                    ? 'border-[var(--color-accent-primary)] bg-[var(--color-surface-active)] text-[var(--color-text-primary)]'
                    : 'border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
          <div className="relative flex items-center">
            <Search className="pointer-events-none absolute left-3 h-4 w-4 text-[var(--color-text-muted)]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search assets, tags"
              className="h-9 w-56 rounded-full border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] pl-9 pr-3 text-xs text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent-primary)]"
            />
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] px-4 py-2 text-xs font-semibold text-[var(--color-text-primary)] shadow-[0_10px_18px_rgba(0,0,0,0.25)] transition-colors hover:bg-[var(--color-surface-hover)]"
          >
            <Upload className="h-4 w-4" />
            Upload Asset
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 gap-6 overflow-hidden p-6">
        <section className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Showing {filteredAssets.length} items
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Updated 3 minutes ago
            </div>
          </div>

          {view === 'grid' ? (
            <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-auto pr-2 md:grid-cols-2 xl:grid-cols-3">
              {filteredAssets.map((asset) => {
                const isSelected = asset.id === activeAsset?.id;
                return (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => setSelectedAsset(asset)}
                    className={`group relative overflow-hidden rounded-2xl border bg-[var(--color-surface-secondary)] text-left transition-transform duration-200 hover:-translate-y-1 ${
                      isSelected
                        ? 'border-[var(--color-accent-primary)]'
                        : 'border-[var(--color-border-default)]'
                    }`}
                    style={volumetricCardStyle}
                  >
                    <div
                      className="relative h-40 overflow-hidden"
                      style={asset.type === 'logo' ? logoCheckerStyle : undefined}
                    >
                      <div
                        className="absolute inset-0"
                        style={{
                          background: thumbnailGradients[asset.type],
                          opacity: asset.type === 'logo' ? 0.6 : 1,
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/40" />
                      <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/40 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-white">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: typeAccent[asset.type] }}
                        />
                        {typeLabel[asset.type]}
                      </div>
                      {asset.type === 'video' && (
                        <>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/50 text-white">
                              <Play className="h-6 w-6" />
                            </div>
                          </div>
                          <div className="absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
                            {asset.duration}
                          </div>
                        </>
                      )}
                      {asset.type === 'image' && (
                        <div className="absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
                          {asset.dimensions}
                        </div>
                      )}
                      {asset.type === 'animation' && (
                        <div className="absolute bottom-3 right-3 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
                          <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-70" />
                            <span className="relative inline-flex h-2 w-2 animate-pulse rounded-full bg-white" />
                          </span>
                          Looping
                        </div>
                      )}
                      {asset.type === 'logo' && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-white shadow-[0_12px_20px_rgba(0,0,0,0.35)]">
                            <Palette className="h-7 w-7" />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="relative z-10 flex flex-col gap-2 p-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                          {asset.name}
                        </h3>
                        <span className="rounded-full border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">
                          {asset.format}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                        <span className="inline-flex items-center gap-1">
                          <Layers className="h-3.5 w-3.5" />
                          {asset.dimensions}
                        </span>
                        <span>{asset.size}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {asset.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-[var(--color-text-muted)]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto pr-2">
              {filteredAssets.map((asset) => {
                const isSelected = asset.id === activeAsset?.id;
                return (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => setSelectedAsset(asset)}
                    className={`group flex items-center gap-4 rounded-2xl border bg-[var(--color-surface-secondary)] p-3 text-left transition-transform duration-200 hover:-translate-y-0.5 ${
                      isSelected
                        ? 'border-[var(--color-accent-primary)]'
                        : 'border-[var(--color-border-default)]'
                    }`}
                    style={volumetricCardStyle}
                  >
                    <div
                      className="relative h-16 w-24 overflow-hidden rounded-xl"
                      style={asset.type === 'logo' ? logoCheckerStyle : undefined}
                    >
                      <div
                        className="absolute inset-0"
                        style={{
                          background: thumbnailGradients[asset.type],
                          opacity: asset.type === 'logo' ? 0.6 : 1,
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/40" />
                      {asset.type === 'video' && (
                        <div className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white">
                          {asset.duration}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                          {asset.name}
                        </p>
                        <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                          {typeLabel[asset.type]} • {asset.dimensions} • {asset.size}
                        </p>
                      </div>
                      <span className="rounded-full border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">
                        {asset.format}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <aside
          className="relative w-[360px] shrink-0 transition-transform duration-300"
          style={{
            transform: activeAsset ? 'translateX(0)' : 'translateX(120%)',
            pointerEvents: activeAsset ? 'auto' : 'none',
          }}
        >
          <div
            className="flex h-full flex-col gap-4 rounded-3xl border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] p-5"
            style={volumetricPanelStyle}
          >
            {activeAsset ? (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                      Asset Details
                    </p>
                    <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                      {activeAsset.name}
                    </h2>
                    <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                      {typeLabel[activeAsset.type]} • {activeAsset.format}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedAsset(null)}
                    className="rounded-full border border-[var(--color-border-default)] px-3 py-1 text-xs text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)]"
                  >
                    Close
                  </button>
                </div>

                <div
                  className="relative h-44 overflow-hidden rounded-2xl border border-[var(--color-border-default)]"
                  style={activeAsset.type === 'logo' ? logoCheckerStyle : undefined}
                >
                  <div
                    className="absolute inset-0"
                    style={{
                      background: thumbnailGradients[activeAsset.type],
                      opacity: activeAsset.type === 'logo' ? 0.6 : 1,
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/40" />
                  <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/40 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-white">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: typeAccent[activeAsset.type] }}
                    />
                    {typeLabel[activeAsset.type]}
                  </div>
                  {activeAsset.type === 'video' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black/60 text-white">
                        <Play className="h-7 w-7" />
                      </div>
                    </div>
                  )}
                  {activeAsset.type === 'logo' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-white shadow-[0_16px_24px_rgba(0,0,0,0.35)]">
                        <Palette className="h-8 w-8" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs text-[var(--color-text-secondary)]">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                      Name
                    </p>
                    <p className="mt-1 text-sm text-[var(--color-text-primary)]">
                      {activeAsset.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                      Type
                    </p>
                    <p className="mt-1 text-sm text-[var(--color-text-primary)]">
                      {typeLabel[activeAsset.type]}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                      Dimensions
                    </p>
                    <p className="mt-1 text-sm text-[var(--color-text-primary)]">
                      {activeAsset.dimensions}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                      Size
                    </p>
                    <p className="mt-1 text-sm text-[var(--color-text-primary)]">
                      {activeAsset.size}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                      Created
                    </p>
                    <p className="mt-1 text-sm text-[var(--color-text-primary)]">
                      {activeAsset.created}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                      Format
                    </p>
                    <p className="mt-1 text-sm text-[var(--color-text-primary)]">
                      {activeAsset.format}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                      Tags
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {activeAsset.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-[var(--color-text-secondary)]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {activeAsset.type === 'video' && (
                  <div className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] p-4">
                    <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                      <span className="inline-flex items-center gap-2">
                        <Video className="h-4 w-4" />
                        Playback Controls
                      </span>
                      <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                        {activeAsset.duration}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setIsPlaying((prev) => !prev)}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-hover)]"
                      >
                        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </button>
                      <div className="flex-1">
                        <input
                          type="range"
                          value={progress}
                          onChange={(event) => setProgress(Number(event.target.value))}
                          className="w-full accent-[var(--color-accent-primary)]"
                        />
                        <div className="mt-1 flex justify-between text-[10px] text-[var(--color-text-muted)]">
                          <span>0:00</span>
                          <span>{activeAsset.duration}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <Volume2 className="h-4 w-4 text-[var(--color-text-secondary)]" />
                      <input
                        type="range"
                        value={volume}
                        onChange={(event) => setVolume(Number(event.target.value))}
                        className="flex-1 accent-[var(--color-accent-primary)]"
                      />
                      <button
                        type="button"
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-hover)]"
                      >
                        <Maximize className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}

                {activeAsset.type === 'image' && (
                  <div className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] p-4">
                    <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                      <span className="inline-flex items-center gap-2">
                        <Image className="h-4 w-4" />
                        Zoom Controls
                      </span>
                      <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                        {activeAsset.colorSpace ?? 'sRGB'}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setZoom((value) => Math.max(25, value - 10))}
                        className="rounded-full border border-[var(--color-border-default)] px-3 py-1 text-xs text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)]"
                      >
                        -
                      </button>
                      <input
                        type="range"
                        value={zoom}
                        onChange={(event) => setZoom(Number(event.target.value))}
                        min={25}
                        max={200}
                        className="flex-1 accent-[var(--color-accent-primary)]"
                      />
                      <button
                        type="button"
                        onClick={() => setZoom((value) => Math.min(200, value + 10))}
                        className="rounded-full border border-[var(--color-border-default)] px-3 py-1 text-xs text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)]"
                      >
                        +
                      </button>
                      <span className="text-xs font-semibold text-[var(--color-text-primary)]">
                        {zoom}%
                      </span>
                    </div>
                  </div>
                )}

                {activeAsset.type === 'animation' && (
                  <div className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] p-4">
                    <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                      <span className="inline-flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        Motion Settings
                      </span>
                      <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                        {activeAsset.frames} frames
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                      <span>Duration</span>
                      <span className="text-[var(--color-text-primary)]">
                        {activeAsset.duration}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs text-[var(--color-text-secondary)]">
                        Loop
                      </span>
                      <button
                        type="button"
                        onClick={() => setLoopEnabled((prev) => !prev)}
                        className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                          loopEnabled
                            ? 'border-[var(--color-status-success)] bg-[var(--color-status-success)]/20 text-[var(--color-status-success)]'
                            : 'border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'
                        }`}
                      >
                        {loopEnabled ? 'Enabled' : 'Disabled'}
                      </button>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <span className="text-xs text-[var(--color-text-secondary)]">
                        Speed
                      </span>
                      <input
                        type="range"
                        value={speed}
                        onChange={(event) => setSpeed(Number(event.target.value))}
                        min={0.5}
                        max={2}
                        step={0.1}
                        className="flex-1 accent-[var(--color-accent-primary)]"
                      />
                      <span className="text-xs font-semibold text-[var(--color-text-primary)]">
                        {speed.toFixed(1)}x
                      </span>
                    </div>
                  </div>
                )}

                <div className="mt-auto grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] px-3 py-2 text-xs font-semibold text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-hover)]"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] px-3 py-2 text-xs font-semibold text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-hover)]"
                  >
                    <Link className="h-4 w-4" />
                    Copy Link
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] px-3 py-2 text-xs font-semibold text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-hover)]"
                  >
                    <Tag className="h-4 w-4" />
                    Edit Tags
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--color-status-error)]/40 bg-[var(--color-status-error)]/10 px-3 py-2 text-xs font-semibold text-[var(--color-status-error)] transition-colors hover:bg-[var(--color-status-error)]/20"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] text-[var(--color-text-secondary)]">
                  <Eye className="h-7 w-7" />
                </div>
                <p className="mt-4 text-sm text-[var(--color-text-primary)]">
                  Select an asset to view details.
                </p>
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                  Preview metadata, playback controls, and tags.
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
