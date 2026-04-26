import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import {
  AlertTriangle,
  Car,
  CheckCircle,
  ChevronRight,
  Clock,
  CloudUpload,
  Eye,
  FileText,
  Flame,
  Globe,
  Hash,
  Home,
  Image,
  Layers,
  MapPin,
  MessageSquare,
  Monitor,
  Scale,
  Search,
  Shield,
  ShieldAlert,
  Timer,
  Upload,
  User,
  Users,
  Zap,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type LineOfBusiness = 'Auto' | 'Property' | 'Casualty';
type Channel = 'Web Portal' | 'Teams';

type WorkflowStage =
  | 'new-claim'
  | 'policy-lookup'
  | 'fnol-intake'
  | 'document-upload'
  | 'assignment'
  | 'status'
  | 'compliance';

type ClaimStatus =
  | 'Reported'
  | 'Acknowledged'
  | 'Investigated'
  | 'Resolved'
  | 'Paid';

type DocumentStatus = 'uploaded' | 'processing' | 'extracted' | 'failed';
type DocumentType = 'Police Report' | 'Estimate' | 'Photos' | 'Medical Records' | 'Invoice';

interface SampleClaim {
  id: string;
  claimNumber: string;
  lob: LineOfBusiness;
  policyholder: string;
  policyNumber: string;
  dateOfLoss: string;
  location: string;
  status: ClaimStatus;
  fraudScore: number;
  description: string;
  assignedTo: string;
  state: 'CA' | 'TX' | 'FL';
  coverageType: string;
  policyLimit: number;
  deductible: number;
  policyStatus: 'Active' | 'Lapsed';
  effectiveDate: string;
  expirationDate: string;
  reserveAmount: number;
}

interface ClaimDocument {
  id: string;
  name: string;
  type: DocumentType;
  status: DocumentStatus;
  uploadDate: string;
  ocrExtracted: boolean;
  size: string;
}

interface Adjuster {
  id: string;
  name: string;
  activeLoad: number;
  capacity: number;
  specialization: LineOfBusiness;
  complexityRange: string;
}

interface FraudIndicator {
  id: string;
  label: string;
  severity: 'high' | 'medium' | 'low';
  detail: string;
}

interface StateRule {
  state: string;
  ackDeadlineDays: number;
  paymentDeadlineDays: number;
  fraudReportRequired: boolean;
  specialNotes: string;
}

interface StageConfig {
  id: WorkflowStage;
  label: string;
  icon: typeof Shield;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WORKFLOW_STAGES: StageConfig[] = [
  { id: 'new-claim', label: 'New Claim', icon: FileText },
  { id: 'policy-lookup', label: 'Policy Lookup', icon: Search },
  { id: 'fnol-intake', label: 'FNOL Intake', icon: Layers },
  { id: 'document-upload', label: 'Document Upload', icon: Upload },
  { id: 'assignment', label: 'Assignment', icon: Users },
  { id: 'status', label: 'Status', icon: Clock },
  { id: 'compliance', label: 'Compliance', icon: Shield },
];

const CLAIM_MILESTONES: ClaimStatus[] = [
  'Reported',
  'Acknowledged',
  'Investigated',
  'Resolved',
  'Paid',
];

const SAMPLE_CLAIMS: SampleClaim[] = [
  {
    id: 'clm-1',
    claimNumber: 'CLM-2024-087431',
    lob: 'Auto',
    policyholder: 'Margaret Chen',
    policyNumber: 'POL-AUTO-4829173',
    dateOfLoss: '2024-11-15',
    location: 'Los Angeles, CA',
    status: 'Investigated',
    fraudScore: 22,
    description:
      'Three-vehicle collision at intersection of Wilshire Blvd and Fairfax Ave. Insured was rear-ended, pushed into vehicle ahead. Police report filed. Two passengers with minor injuries.',
    assignedTo: 'David Nguyen',
    state: 'CA',
    coverageType: 'Comprehensive + Collision',
    policyLimit: 250000,
    deductible: 1000,
    policyStatus: 'Active',
    effectiveDate: '2024-01-15',
    expirationDate: '2025-01-15',
    reserveAmount: 47500,
  },
  {
    id: 'clm-2',
    claimNumber: 'CLM-2024-091856',
    lob: 'Property',
    policyholder: 'Robert & Lisa Hernandez',
    policyNumber: 'POL-PROP-7291045',
    dateOfLoss: '2024-11-22',
    location: 'Houston, TX',
    status: 'Acknowledged',
    fraudScore: 8,
    description:
      'Severe hailstorm caused roof damage, broken skylights, and siding impact across north-facing exterior. Interior water intrusion in master bedroom and attic. Emergency tarp placed by restoration company.',
    assignedTo: 'Sarah Mitchell',
    state: 'TX',
    coverageType: 'HO-3 Special Form',
    policyLimit: 485000,
    deductible: 5000,
    policyStatus: 'Active',
    effectiveDate: '2024-06-01',
    expirationDate: '2025-06-01',
    reserveAmount: 62000,
  },
  {
    id: 'clm-3',
    claimNumber: 'CLM-2024-094210',
    lob: 'Casualty',
    policyholder: 'Pinnacle Construction LLC',
    policyNumber: 'POL-CAS-3048276',
    dateOfLoss: '2024-12-01',
    location: 'Miami, FL',
    status: 'Reported',
    fraudScore: 61,
    description:
      'Worker fell from scaffolding at commercial construction site. Third-party liability claim filed by injured subcontractor. OSHA investigation pending. Medical expenses estimated at $180K. Prior similar incident in 2023.',
    assignedTo: 'Unassigned',
    state: 'FL',
    coverageType: 'Commercial General Liability',
    policyLimit: 1000000,
    deductible: 10000,
    policyStatus: 'Active',
    effectiveDate: '2024-03-01',
    expirationDate: '2025-03-01',
    reserveAmount: 225000,
  },
];

const CLAIM_DOCUMENTS: Record<string, ClaimDocument[]> = {
  'clm-1': [
    { id: 'doc-1', name: 'LAPD_Incident_Report_2024-87431.pdf', type: 'Police Report', status: 'extracted', uploadDate: '2024-11-16', ocrExtracted: true, size: '2.4 MB' },
    { id: 'doc-2', name: 'AutoBody_Estimate_Chen.pdf', type: 'Estimate', status: 'extracted', uploadDate: '2024-11-18', ocrExtracted: true, size: '1.8 MB' },
    { id: 'doc-3', name: 'Scene_Photos_Wilshire.zip', type: 'Photos', status: 'uploaded', uploadDate: '2024-11-16', ocrExtracted: false, size: '48.2 MB' },
  ],
  'clm-2': [
    { id: 'doc-4', name: 'Roof_Inspection_Report.pdf', type: 'Estimate', status: 'extracted', uploadDate: '2024-11-23', ocrExtracted: true, size: '5.1 MB' },
    { id: 'doc-5', name: 'Hail_Damage_Photos.zip', type: 'Photos', status: 'processing', uploadDate: '2024-11-23', ocrExtracted: false, size: '124.6 MB' },
    { id: 'doc-6', name: 'Emergency_Tarp_Invoice.pdf', type: 'Invoice', status: 'extracted', uploadDate: '2024-11-24', ocrExtracted: true, size: '340 KB' },
  ],
  'clm-3': [
    { id: 'doc-7', name: 'Incident_Report_Pinnacle.pdf', type: 'Police Report', status: 'uploaded', uploadDate: '2024-12-02', ocrExtracted: false, size: '1.2 MB' },
    { id: 'doc-8', name: 'Medical_Records_Subcontractor.pdf', type: 'Medical Records', status: 'processing', uploadDate: '2024-12-03', ocrExtracted: false, size: '8.7 MB' },
  ],
};

const ADJUSTERS: Adjuster[] = [
  { id: 'adj-1', name: 'David Nguyen', activeLoad: 18, capacity: 25, specialization: 'Auto', complexityRange: 'Low-High' },
  { id: 'adj-2', name: 'Sarah Mitchell', activeLoad: 12, capacity: 20, specialization: 'Property', complexityRange: 'Medium-High' },
  { id: 'adj-3', name: 'James Rodriguez', activeLoad: 22, capacity: 25, specialization: 'Auto', complexityRange: 'Low-Medium' },
  { id: 'adj-4', name: 'Karen Williams', activeLoad: 8, capacity: 15, specialization: 'Casualty', complexityRange: 'High-Complex' },
  { id: 'adj-5', name: 'Michael Torres', activeLoad: 15, capacity: 20, specialization: 'Property', complexityRange: 'Low-Medium' },
];

const FRAUD_INDICATORS: Record<string, FraudIndicator[]> = {
  'clm-1': [
    { id: 'fi-1', label: 'Consistent timeline', severity: 'low', detail: 'Reported within 24h of loss date' },
    { id: 'fi-2', label: 'Police report on file', severity: 'low', detail: 'Official LAPD report corroborates statement' },
  ],
  'clm-2': [
    { id: 'fi-3', label: 'Weather event verified', severity: 'low', detail: 'NWS confirms severe hailstorm in area on date of loss' },
  ],
  'clm-3': [
    { id: 'fi-4', label: 'Prior similar claim', severity: 'high', detail: 'Same policyholder had scaffolding incident in 2023' },
    { id: 'fi-5', label: 'High medical estimate', severity: 'medium', detail: '$180K estimate exceeds 90th percentile for injury type' },
    { id: 'fi-6', label: 'Delayed reporting', severity: 'medium', detail: 'Claim filed 48h+ after incident date' },
    { id: 'fi-7', label: 'OSHA investigation', severity: 'high', detail: 'Active federal investigation may indicate safety violations' },
  ],
};

const STATE_RULES: StateRule[] = [
  { state: 'CA', ackDeadlineDays: 15, paymentDeadlineDays: 30, fraudReportRequired: true, specialNotes: 'CA Ins Code 790.03 — unfair claims settlement practices. Must provide written ack within 15 calendar days.' },
  { state: 'TX', ackDeadlineDays: 15, paymentDeadlineDays: 5, fraudReportRequired: true, specialNotes: 'TX Ins Code 542 — Prompt Payment of Claims. Payment within 5 business days of agreement on amount.' },
  { state: 'FL', ackDeadlineDays: 14, paymentDeadlineDays: 20, fraudReportRequired: true, specialNotes: 'FL Stat 627.426 — Claims must be acknowledged within 14 days. Anti-fraud affidavit may be required for CGL claims.' },
];

// ---------------------------------------------------------------------------
// Style Tokens
// ---------------------------------------------------------------------------

const panelStyle: CSSProperties = {
  boxShadow:
    '0 20px 35px rgba(0, 0, 0, 0.35), 0 6px 10px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
};

const cardStyle: CSSProperties = {
  boxShadow:
    '0 12px 22px rgba(0, 0, 0, 0.3), 0 4px 8px rgba(0, 0, 0, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
};

const inputClass =
  'h-8 rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] px-2.5 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-focus)] transition-colors';

const labelClass = 'flex flex-col gap-1 text-[10px] uppercase tracking-[0.15em] text-[var(--color-text-muted)]';

const badgeClass =
  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function fraudScoreColor(score: number): string {
  if (score <= 25) return 'var(--color-status-success)';
  if (score <= 50) return 'var(--color-status-warning)';
  if (score <= 75) return '#e87d3e';
  return 'var(--color-status-error)';
}

function fraudScoreLabel(score: number): string {
  if (score <= 25) return 'LOW';
  if (score <= 50) return 'MODERATE';
  if (score <= 75) return 'ELEVATED';
  return 'CRITICAL';
}

function statusColor(status: ClaimStatus): string {
  switch (status) {
    case 'Reported': return 'var(--color-status-info)';
    case 'Acknowledged': return 'var(--color-accent-primary)';
    case 'Investigated': return 'var(--color-status-warning)';
    case 'Resolved': return 'var(--color-status-success)';
    case 'Paid': return '#4ec9b0';
    default: return 'var(--color-text-muted)';
  }
}

function docStatusColor(status: DocumentStatus): string {
  switch (status) {
    case 'uploaded': return 'var(--color-status-info)';
    case 'processing': return 'var(--color-status-warning)';
    case 'extracted': return 'var(--color-status-success)';
    case 'failed': return 'var(--color-status-error)';
  }
}

function docTypeIcon(type: DocumentType): typeof FileText {
  switch (type) {
    case 'Police Report': return FileText;
    case 'Estimate': return Scale;
    case 'Photos': return Image;
    case 'Medical Records': return ShieldAlert;
    case 'Invoice': return Hash;
  }
}

function daysSince(dateStr: string): number {
  const d = new Date(dateStr);
  const now = new Date('2024-12-10');
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function severityColor(severity: 'high' | 'medium' | 'low'): string {
  switch (severity) {
    case 'high': return 'var(--color-status-error)';
    case 'medium': return 'var(--color-status-warning)';
    case 'low': return 'var(--color-status-success)';
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionHeader({ title, subtitle, right }: { title: string; subtitle: string; right?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</h2>
        <p className="mt-0.5 text-[11px] text-[var(--color-text-secondary)]">{subtitle}</p>
      </div>
      {right}
    </div>
  );
}

function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] p-4 ${className}`}
      style={panelStyle}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(140deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.01) 45%, rgba(0,0,0,0.15) 100%)',
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}

function Badge({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span
      className={badgeClass}
      style={{ borderColor: color, color }}
    >
      {children}
    </span>
  );
}

function ProgressBar({ value, max, color, height = 6 }: { value: number; max: number; color: string; height?: number }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div
      className="relative w-full overflow-hidden rounded-full"
      style={{
        height,
        background: 'var(--color-surface-primary)',
        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.4)',
        border: '1px solid var(--color-border-subtle)',
      }}
    >
      <div
        className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
        style={{
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${color}, ${color}cc)`,
          boxShadow: `0 0 8px ${color}44`,
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stage: New Claim
// ---------------------------------------------------------------------------

function NewClaimStage() {
  const [form, setForm] = useState({
    firstName: 'Margaret',
    lastName: 'Chen',
    phone: '(310) 555-4821',
    email: 'mchen@email.com',
    policyNumber: 'POL-AUTO-4829173',
    incidentDate: '2024-11-15',
    incidentTime: '14:35',
    location: 'Wilshire Blvd & Fairfax Ave, Los Angeles, CA',
    description: 'Three-vehicle collision at intersection. Insured was rear-ended.',
  });

  function handleChange(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [field]: e.target.value }));
  }

  return (
    <div className="flex flex-col gap-4">
      <Panel>
        <SectionHeader
          title="Policyholder Information"
          subtitle="Enter insured party details for new claim intake"
        />
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className={labelClass}>
            First Name
            <input className={inputClass} value={form.firstName} onChange={handleChange('firstName')} />
          </label>
          <label className={labelClass}>
            Last Name
            <input className={inputClass} value={form.lastName} onChange={handleChange('lastName')} />
          </label>
          <label className={labelClass}>
            Phone
            <input className={inputClass} value={form.phone} onChange={handleChange('phone')} />
          </label>
          <label className={labelClass}>
            Email
            <input className={inputClass} value={form.email} onChange={handleChange('email')} />
          </label>
          <label className={`${labelClass} col-span-2`}>
            Policy Number
            <input className={inputClass} value={form.policyNumber} onChange={handleChange('policyNumber')} />
          </label>
        </div>
      </Panel>
      <Panel>
        <SectionHeader
          title="Incident Details"
          subtitle="Capture date, time, location, and initial description of loss"
        />
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className={labelClass}>
            Date of Loss
            <input type="date" className={inputClass} value={form.incidentDate} onChange={handleChange('incidentDate')} />
          </label>
          <label className={labelClass}>
            Time of Incident
            <input type="time" className={inputClass} value={form.incidentTime} onChange={handleChange('incidentTime')} />
          </label>
          <label className={`${labelClass} col-span-2`}>
            Location
            <input className={inputClass} value={form.location} onChange={handleChange('location')} />
          </label>
          <label className={`${labelClass} col-span-2`}>
            Description
            <textarea
              rows={3}
              className="rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] px-2.5 py-2 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-focus)]"
              value={form.description}
              onChange={handleChange('description')}
            />
          </label>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-accent-primary)] px-3 py-1.5 text-xs font-semibold text-white shadow-[0_8px_16px_rgba(0,0,0,0.3)] transition-colors hover:bg-[var(--color-accent-hover)]"
          >
            <Zap className="h-3 w-3" />
            Submit FNOL
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)]"
          >
            Save Draft
          </button>
        </div>
      </Panel>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stage: Policy Lookup
// ---------------------------------------------------------------------------

function PolicyLookupStage({ claim }: { claim: SampleClaim }) {
  return (
    <div className="flex flex-col gap-4">
      <Panel>
        <SectionHeader
          title="Policy Details"
          subtitle={`Policy ${claim.policyNumber} retrieved from Guidewire PolicyCenter`}
          right={
            <Badge color={claim.policyStatus === 'Active' ? 'var(--color-status-success)' : 'var(--color-status-error)'}>
              {claim.policyStatus}
            </Badge>
          }
        />
        <div className="mt-4 grid grid-cols-2 gap-y-3 gap-x-6">
          {[
            ['Policyholder', claim.policyholder],
            ['Policy Number', claim.policyNumber],
            ['Coverage Type', claim.coverageType],
            ['Line of Business', claim.lob],
            ['Effective Date', claim.effectiveDate],
            ['Expiration Date', claim.expirationDate],
            ['Policy Limit', formatCurrency(claim.policyLimit)],
            ['Deductible', formatCurrency(claim.deductible)],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-[10px] uppercase tracking-[0.15em] text-[var(--color-text-muted)]">{label}</p>
              <p className="mt-0.5 text-xs font-medium text-[var(--color-text-primary)]">{value}</p>
            </div>
          ))}
        </div>
      </Panel>
      <Panel>
        <SectionHeader
          title="Coverage Analysis"
          subtitle="Active coverages and sub-limits applicable to this claim"
        />
        <div className="mt-3 space-y-2">
          {[
            { name: 'Bodily Injury Liability', limit: '$100K/$300K', status: 'active' },
            { name: 'Property Damage Liability', limit: '$100K', status: 'active' },
            { name: 'Collision', limit: formatCurrency(claim.policyLimit), status: 'active' },
            { name: 'Uninsured Motorist', limit: '$100K/$300K', status: 'active' },
          ].map((cov) => (
            <div
              key={cov.name}
              className="flex items-center justify-between rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-tertiary)] px-3 py-2"
              style={cardStyle}
            >
              <div className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3" style={{ color: 'var(--color-status-success)' }} />
                <span className="text-xs text-[var(--color-text-primary)]">{cov.name}</span>
              </div>
              <span className="text-xs font-medium text-[var(--color-text-secondary)]">{cov.limit}</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stage: FNOL Intake (Line-Specific)
// ---------------------------------------------------------------------------

function FnolIntakeStage({ claim }: { claim: SampleClaim }) {
  return (
    <div className="flex flex-col gap-4">
      {claim.lob === 'Auto' && <AutoFnolForm />}
      {claim.lob === 'Property' && <PropertyFnolForm />}
      {claim.lob === 'Casualty' && <CasualtyFnolForm />}
    </div>
  );
}

function AutoFnolForm() {
  return (
    <>
      <Panel>
        <SectionHeader title="Vehicle Information" subtitle="Primary insured vehicle details" />
        <div className="mt-3 grid grid-cols-2 gap-3">
          {[
            ['Year / Make / Model', '2022 Toyota RAV4'],
            ['VIN', '2T3P1RFV0NC123456'],
            ['Color', 'Silver Metallic'],
            ['Mileage', '34,291'],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-[10px] uppercase tracking-[0.15em] text-[var(--color-text-muted)]">{label}</p>
              <p className="mt-0.5 text-xs text-[var(--color-text-primary)]">{value}</p>
            </div>
          ))}
        </div>
      </Panel>
      <Panel>
        <SectionHeader title="Damage Assessment" subtitle="Initial damage classification from FNOL intake" />
        <div className="mt-3 space-y-2">
          {[
            { area: 'Rear Bumper', severity: 'Moderate', est: '$3,200' },
            { area: 'Trunk Lid', severity: 'Severe', est: '$4,800' },
            { area: 'Rear Quarter Panel (L)', severity: 'Minor', est: '$1,100' },
            { area: 'Tail Light Assembly (L)', severity: 'Replacement', est: '$650' },
          ].map((d) => (
            <div key={d.area} className="flex items-center justify-between rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-surface-tertiary)] px-3 py-1.5">
              <span className="text-xs text-[var(--color-text-primary)]">{d.area}</span>
              <div className="flex items-center gap-3">
                <Badge color={d.severity === 'Severe' ? 'var(--color-status-error)' : d.severity === 'Moderate' ? 'var(--color-status-warning)' : 'var(--color-status-info)'}>
                  {d.severity}
                </Badge>
                <span className="text-xs font-medium text-[var(--color-text-secondary)]">{d.est}</span>
              </div>
            </div>
          ))}
        </div>
      </Panel>
      <Panel>
        <SectionHeader title="Police Report" subtitle="Law enforcement documentation" />
        <div className="mt-3 grid grid-cols-2 gap-3">
          {[
            ['Report Number', 'LAPD-2024-IR-087431'],
            ['Responding Officer', 'Ofc. J. Martinez'],
            ['Citation Issued', 'Yes — Rear vehicle'],
            ['Parties Involved', '3 vehicles, 5 occupants'],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-[10px] uppercase tracking-[0.15em] text-[var(--color-text-muted)]">{label}</p>
              <p className="mt-0.5 text-xs text-[var(--color-text-primary)]">{value}</p>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}

function PropertyFnolForm() {
  return (
    <>
      <Panel>
        <SectionHeader title="Structure Information" subtitle="Insured property details" />
        <div className="mt-3 grid grid-cols-2 gap-3">
          {[
            ['Property Type', 'Single Family Residence'],
            ['Year Built', '2008'],
            ['Square Footage', '2,840 sqft'],
            ['Roof Type', 'Composition Shingle'],
            ['Stories', '2'],
            ['Construction', 'Frame'],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-[10px] uppercase tracking-[0.15em] text-[var(--color-text-muted)]">{label}</p>
              <p className="mt-0.5 text-xs text-[var(--color-text-primary)]">{value}</p>
            </div>
          ))}
        </div>
      </Panel>
      <Panel>
        <SectionHeader title="Peril & Damage Assessment" subtitle="Storm damage classification" />
        <div className="mt-3 space-y-2">
          {[
            { area: 'Roof — North Slope', peril: 'Hail', extent: 'Extensive' },
            { area: 'Skylights (x2)', peril: 'Hail', extent: 'Total Loss' },
            { area: 'North Siding', peril: 'Hail', extent: 'Moderate' },
            { area: 'Master Bedroom Ceiling', peril: 'Water Intrusion', extent: 'Moderate' },
            { area: 'Attic Insulation', peril: 'Water Intrusion', extent: 'Partial' },
          ].map((d) => (
            <div key={d.area} className="flex items-center justify-between rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-surface-tertiary)] px-3 py-1.5">
              <span className="text-xs text-[var(--color-text-primary)]">{d.area}</span>
              <div className="flex items-center gap-3">
                <Badge color="var(--color-status-info)">{d.peril}</Badge>
                <Badge color={d.extent === 'Total Loss' || d.extent === 'Extensive' ? 'var(--color-status-error)' : 'var(--color-status-warning)'}>
                  {d.extent}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}

function CasualtyFnolForm() {
  return (
    <>
      <Panel>
        <SectionHeader title="Incident Details" subtitle="Commercial liability event information" />
        <div className="mt-3 grid grid-cols-2 gap-3">
          {[
            ['Incident Type', 'Bodily Injury — Workplace'],
            ['Location', 'Commercial Construction Site'],
            ['Claimant', 'Third-party Subcontractor'],
            ['Injury Type', 'Fall from Height — Scaffolding'],
            ['Medical Facility', 'Jackson Memorial Hospital'],
            ['OSHA Status', 'Investigation Pending'],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-[10px] uppercase tracking-[0.15em] text-[var(--color-text-muted)]">{label}</p>
              <p className="mt-0.5 text-xs text-[var(--color-text-primary)]">{value}</p>
            </div>
          ))}
        </div>
      </Panel>
      <Panel>
        <SectionHeader title="Liability Assessment" subtitle="Preliminary liability and exposure analysis" />
        <div className="mt-3 space-y-2">
          {[
            { factor: 'Site Safety Compliance', finding: 'Under Review', risk: 'high' as const },
            { factor: 'Prior Similar Incidents', finding: '1 in 2023', risk: 'high' as const },
            { factor: 'Subcontractor Agreement', finding: 'Indemnification Clause Present', risk: 'medium' as const },
            { factor: 'Workers Comp Filing', finding: 'Separate WC claim filed', risk: 'medium' as const },
          ].map((item) => (
            <div key={item.factor} className="flex items-center justify-between rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-surface-tertiary)] px-3 py-1.5">
              <span className="text-xs text-[var(--color-text-primary)]">{item.factor}</span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-[var(--color-text-secondary)]">{item.finding}</span>
                <Badge color={severityColor(item.risk)}>
                  {item.risk.toUpperCase()}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}

// ---------------------------------------------------------------------------
// Stage: Document Upload
// ---------------------------------------------------------------------------

function DocumentUploadStage({ claim }: { claim: SampleClaim }) {
  const docs = CLAIM_DOCUMENTS[claim.id] ?? [];
  return (
    <div className="flex flex-col gap-4">
      <Panel>
        <SectionHeader
          title="Claim Documents"
          subtitle={`${docs.length} document(s) uploaded for ${claim.claimNumber}`}
          right={
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] px-2.5 py-1.5 text-[11px] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)]"
            >
              <CloudUpload className="h-3 w-3" />
              Upload
            </button>
          }
        />
        <div className="mt-3 space-y-2">
          {docs.map((doc) => {
            const TypeIcon = docTypeIcon(doc.type);
            return (
              <div
                key={doc.id}
                className="flex items-center justify-between rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-tertiary)] px-3 py-2"
                style={cardStyle}
              >
                <div className="flex items-center gap-2.5">
                  <TypeIcon className="h-4 w-4 shrink-0" style={{ color: docStatusColor(doc.status) }} />
                  <div>
                    <p className="text-xs font-medium text-[var(--color-text-primary)]">{doc.name}</p>
                    <p className="text-[10px] text-[var(--color-text-muted)]">
                      {doc.size} -- {doc.uploadDate}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge color={docStatusColor(doc.status)}>
                    {doc.status === 'extracted' ? 'OCR Complete' : doc.status === 'processing' ? 'Processing' : doc.status === 'uploaded' ? 'Pending OCR' : 'Failed'}
                  </Badge>
                  {doc.ocrExtracted && (
                    <span className="flex items-center gap-1 text-[10px] text-[var(--color-status-success)]">
                      <Eye className="h-3 w-3" />
                      Extracted
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
      <Panel>
        <SectionHeader title="OCR Extraction Summary" subtitle="Automated data extraction from uploaded documents" />
        <div className="mt-3 grid grid-cols-3 gap-3 text-center">
          {[
            { label: 'Fields Extracted', value: docs.filter((d) => d.ocrExtracted).length * 12, color: 'var(--color-status-success)' },
            { label: 'Confidence Avg', value: '94.2%', color: 'var(--color-accent-primary)' },
            { label: 'Manual Review', value: 2, color: 'var(--color-status-warning)' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-tertiary)] p-2.5" style={cardStyle}>
              <p className="text-lg font-semibold" style={{ color: stat.color }}>{stat.value}</p>
              <p className="text-[10px] text-[var(--color-text-muted)]">{stat.label}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stage: Assignment
// ---------------------------------------------------------------------------

function AssignmentStage({ claim }: { claim: SampleClaim }) {
  const [autoAssign, setAutoAssign] = useState(true);
  const complexityScore = claim.lob === 'Casualty' ? 8.2 : claim.lob === 'Property' ? 5.4 : 3.8;

  return (
    <div className="flex flex-col gap-4">
      <Panel>
        <SectionHeader
          title="Assignment Rules Engine"
          subtitle="Auto-routing based on LOB, complexity, and adjuster capacity"
          right={
            <button
              type="button"
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-colors ${
                autoAssign
                  ? 'bg-[var(--color-accent-primary)] text-white'
                  : 'border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] text-[var(--color-text-secondary)]'
              }`}
              onClick={() => setAutoAssign(!autoAssign)}
            >
              <Zap className="h-3 w-3" />
              Auto-Assign {autoAssign ? 'ON' : 'OFF'}
            </button>
          }
        />
        <div className="mt-3 flex items-center gap-4">
          <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-tertiary)] px-3 py-2 text-center" style={cardStyle}>
            <p className="text-[10px] uppercase tracking-[0.15em] text-[var(--color-text-muted)]">Complexity</p>
            <p className="mt-0.5 text-lg font-bold" style={{ color: complexityScore >= 7 ? 'var(--color-status-error)' : complexityScore >= 4 ? 'var(--color-status-warning)' : 'var(--color-status-success)' }}>
              {complexityScore}/10
            </p>
          </div>
          <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-tertiary)] px-3 py-2 text-center" style={cardStyle}>
            <p className="text-[10px] uppercase tracking-[0.15em] text-[var(--color-text-muted)]">Assigned To</p>
            <p className="mt-0.5 text-xs font-medium text-[var(--color-text-primary)]">{claim.assignedTo}</p>
          </div>
          <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-tertiary)] px-3 py-2 text-center" style={cardStyle}>
            <p className="text-[10px] uppercase tracking-[0.15em] text-[var(--color-text-muted)]">Decision</p>
            <p className="mt-0.5 text-xs font-medium text-[var(--color-accent-primary)]">
              {complexityScore >= 7 ? 'Human Required' : 'Agent Routed'}
            </p>
          </div>
        </div>
      </Panel>
      <Panel>
        <SectionHeader title="Adjuster Workload" subtitle="Current capacity across claims team" />
        <div className="mt-3 space-y-2.5">
          {ADJUSTERS.map((adj) => {
            const pct = (adj.activeLoad / adj.capacity) * 100;
            const barColor = pct > 85 ? 'var(--color-status-error)' : pct > 65 ? 'var(--color-status-warning)' : 'var(--color-status-success)';
            return (
              <div key={adj.id} className="flex items-center gap-3">
                <div className="w-28 shrink-0">
                  <p className="text-xs text-[var(--color-text-primary)]">{adj.name}</p>
                  <p className="text-[10px] text-[var(--color-text-muted)]">{adj.specialization} -- {adj.complexityRange}</p>
                </div>
                <div className="flex-1">
                  <ProgressBar value={adj.activeLoad} max={adj.capacity} color={barColor} />
                </div>
                <span className="w-14 text-right text-[10px] text-[var(--color-text-secondary)]">
                  {adj.activeLoad}/{adj.capacity}
                </span>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stage: Status (Timeline)
// ---------------------------------------------------------------------------

function StatusStage({ claim }: { claim: SampleClaim }) {
  const currentIndex = CLAIM_MILESTONES.indexOf(claim.status);

  return (
    <Panel>
      <SectionHeader
        title="Claim Timeline"
        subtitle={`${claim.claimNumber} -- current status: ${claim.status}`}
        right={
          <Badge color={statusColor(claim.status)}>{claim.status}</Badge>
        }
      />
      <div className="mt-5">
        <div className="relative flex items-start justify-between">
          {/* Connecting line */}
          <div
            className="absolute left-0 right-0 top-3"
            style={{ height: 2, background: 'var(--color-border-default)' }}
          />
          <div
            className="absolute left-0 top-3"
            style={{
              height: 2,
              width: `${(currentIndex / (CLAIM_MILESTONES.length - 1)) * 100}%`,
              background: 'var(--color-accent-primary)',
              boxShadow: '0 0 8px var(--color-accent-primary)',
              transition: 'width 0.3s',
            }}
          />
          {CLAIM_MILESTONES.map((milestone, idx) => {
            const isPast = idx <= currentIndex;
            const isCurrent = idx === currentIndex;
            return (
              <div key={milestone} className="relative z-10 flex flex-col items-center" style={{ width: `${100 / CLAIM_MILESTONES.length}%` }}>
                <div
                  className="flex h-6 w-6 items-center justify-center rounded-full border-2"
                  style={{
                    borderColor: isPast ? 'var(--color-accent-primary)' : 'var(--color-border-default)',
                    background: isCurrent ? 'var(--color-accent-primary)' : isPast ? 'var(--color-surface-secondary)' : 'var(--color-surface-tertiary)',
                    boxShadow: isCurrent ? '0 0 12px var(--color-accent-primary)' : 'none',
                  }}
                >
                  {isPast && !isCurrent && <CheckCircle className="h-3 w-3" style={{ color: 'var(--color-accent-primary)' }} />}
                  {isCurrent && <div className="h-2 w-2 rounded-full bg-white" />}
                </div>
                <p className={`mt-2 text-[10px] font-medium ${isCurrent ? 'text-[var(--color-accent-primary)]' : isPast ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-muted)]'}`}>
                  {milestone}
                </p>
                {isPast && (
                  <p className="text-[9px] text-[var(--color-text-muted)]">
                    {idx === 0 ? claim.dateOfLoss : `Day +${idx * 3}`}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-6 grid grid-cols-3 gap-3">
        {[
          { label: 'Reserve Amount', value: formatCurrency(claim.reserveAmount), color: 'var(--color-status-warning)' },
          { label: 'Days Open', value: daysSince(claim.dateOfLoss), color: 'var(--color-status-info)' },
          { label: 'Handler', value: claim.assignedTo, color: 'var(--color-text-primary)' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-tertiary)] p-2.5 text-center" style={cardStyle}>
            <p className="text-[10px] uppercase tracking-[0.15em] text-[var(--color-text-muted)]">{stat.label}</p>
            <p className="mt-1 text-sm font-semibold" style={{ color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// Stage: Compliance
// ---------------------------------------------------------------------------

function ComplianceStage({ claim }: { claim: SampleClaim }) {
  const rule = STATE_RULES.find((r) => r.state === claim.state);
  const daysOpen = daysSince(claim.dateOfLoss);

  if (!rule) return null;

  const ackRemaining = Math.max(rule.ackDeadlineDays - daysOpen, 0);
  const payRemaining = Math.max(rule.paymentDeadlineDays - daysOpen, 0);
  const ackExpired = daysOpen > rule.ackDeadlineDays;
  const payExpired = daysOpen > rule.paymentDeadlineDays;

  return (
    <div className="flex flex-col gap-4">
      <Panel>
        <SectionHeader
          title={`${claim.state} State Compliance Dashboard`}
          subtitle={rule.specialNotes}
        />
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div
            className="rounded-lg border p-3 text-center"
            style={{
              borderColor: ackExpired ? 'var(--color-status-error)' : 'var(--color-border-subtle)',
              background: ackExpired ? 'rgba(244,71,71,0.08)' : 'var(--color-surface-tertiary)',
              ...cardStyle,
            }}
          >
            <Timer className="mx-auto h-5 w-5" style={{ color: ackExpired ? 'var(--color-status-error)' : 'var(--color-status-success)' }} />
            <p className="mt-1 text-[10px] uppercase tracking-[0.15em] text-[var(--color-text-muted)]">Acknowledgment SLA</p>
            <p className="mt-1 text-lg font-bold" style={{ color: ackExpired ? 'var(--color-status-error)' : 'var(--color-status-success)' }}>
              {ackExpired ? 'OVERDUE' : `${ackRemaining}d`}
            </p>
            <p className="text-[10px] text-[var(--color-text-muted)]">{rule.ackDeadlineDays}-day deadline</p>
          </div>
          <div
            className="rounded-lg border p-3 text-center"
            style={{
              borderColor: payExpired ? 'var(--color-status-error)' : 'var(--color-border-subtle)',
              background: payExpired ? 'rgba(244,71,71,0.08)' : 'var(--color-surface-tertiary)',
              ...cardStyle,
            }}
          >
            <Timer className="mx-auto h-5 w-5" style={{ color: payExpired ? 'var(--color-status-error)' : 'var(--color-status-info)' }} />
            <p className="mt-1 text-[10px] uppercase tracking-[0.15em] text-[var(--color-text-muted)]">Payment SLA</p>
            <p className="mt-1 text-lg font-bold" style={{ color: payExpired ? 'var(--color-status-error)' : 'var(--color-status-info)' }}>
              {payExpired ? 'OVERDUE' : `${payRemaining}d`}
            </p>
            <p className="text-[10px] text-[var(--color-text-muted)]">{rule.paymentDeadlineDays}-day deadline</p>
          </div>
        </div>
      </Panel>
      <Panel>
        <SectionHeader title="Jurisdiction Rules" subtitle="State-by-state compliance requirements" />
        <div className="mt-3 space-y-2">
          {STATE_RULES.map((sr) => (
            <div
              key={sr.state}
              className="flex items-center justify-between rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-tertiary)] px-3 py-2"
              style={cardStyle}
            >
              <div className="flex items-center gap-2">
                <MapPin className="h-3 w-3 text-[var(--color-text-muted)]" />
                <span className="text-xs font-semibold text-[var(--color-text-primary)]">{sr.state}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-[var(--color-text-secondary)]">Ack: {sr.ackDeadlineDays}d</span>
                <span className="text-[10px] text-[var(--color-text-secondary)]">Pay: {sr.paymentDeadlineDays}d</span>
                {sr.fraudReportRequired && (
                  <Badge color="var(--color-status-warning)">Fraud Report Req</Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Fraud Panel (Right Sidebar)
// ---------------------------------------------------------------------------

function FraudPanel({ claim }: { claim: SampleClaim }) {
  const indicators = FRAUD_INDICATORS[claim.id] ?? [];
  const score = claim.fraudScore;
  const color = fraudScoreColor(score);
  const label = fraudScoreLabel(score);

  const circumference = 2 * Math.PI * 38;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col gap-3">
      {/* Score Ring */}
      <Panel>
        <p className="text-[10px] uppercase tracking-[0.15em] text-[var(--color-text-muted)]">Fraud Score</p>
        <div className="mt-2 flex flex-col items-center">
          <svg width="96" height="96" viewBox="0 0 96 96">
            <circle
              cx="48" cy="48" r="38"
              fill="none"
              stroke="var(--color-surface-primary)"
              strokeWidth="6"
            />
            <circle
              cx="48" cy="48" r="38"
              fill="none"
              stroke={color}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              transform="rotate(-90 48 48)"
              style={{ transition: 'stroke-dashoffset 0.5s', filter: `drop-shadow(0 0 4px ${color})` }}
            />
            <text
              x="48" y="44"
              textAnchor="middle"
              fill={color}
              fontSize="22"
              fontWeight="700"
              fontFamily="var(--font-family-sans)"
            >
              {score}
            </text>
            <text
              x="48" y="58"
              textAnchor="middle"
              fill="var(--color-text-muted)"
              fontSize="8"
              fontFamily="var(--font-family-sans)"
              letterSpacing="0.1em"
            >
              {label}
            </text>
          </svg>
        </div>
      </Panel>

      {/* Evidence Correlation */}
      <Panel>
        <p className="text-[10px] uppercase tracking-[0.15em] text-[var(--color-text-muted)]">Evidence Correlation</p>
        <div className="mt-2 space-y-1.5">
          {indicators.map((ind) => (
            <div key={ind.id} className="flex items-start gap-2 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-surface-tertiary)] p-2">
              <div
                className="mt-0.5 h-2 w-2 shrink-0 rounded-full"
                style={{ background: severityColor(ind.severity), boxShadow: `0 0 6px ${severityColor(ind.severity)}` }}
              />
              <div>
                <p className="text-[11px] font-medium text-[var(--color-text-primary)]">{ind.label}</p>
                <p className="text-[10px] text-[var(--color-text-muted)]">{ind.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Escalation Triggers */}
      <Panel>
        <p className="text-[10px] uppercase tracking-[0.15em] text-[var(--color-text-muted)]">Escalation Triggers</p>
        <div className="mt-2 space-y-1.5">
          {score >= 50 && (
            <div className="flex items-center gap-2 rounded-md border border-[var(--color-status-error)] bg-[rgba(244,71,71,0.06)] p-2">
              <AlertTriangle className="h-3 w-3 shrink-0" style={{ color: 'var(--color-status-error)' }} />
              <p className="text-[10px] text-[var(--color-status-error)]">SIU referral recommended — fraud score above threshold</p>
            </div>
          )}
          {claim.reserveAmount > 100000 && (
            <div className="flex items-center gap-2 rounded-md border border-[var(--color-status-warning)] bg-[rgba(220,220,170,0.06)] p-2">
              <Flame className="h-3 w-3 shrink-0" style={{ color: 'var(--color-status-warning)' }} />
              <p className="text-[10px] text-[var(--color-status-warning)]">Large loss review — reserve exceeds $100K authority</p>
            </div>
          )}
          {claim.lob === 'Casualty' && (
            <div className="flex items-center gap-2 rounded-md border border-[var(--color-status-info)] bg-[rgba(86,156,214,0.06)] p-2">
              <Scale className="h-3 w-3 shrink-0" style={{ color: 'var(--color-status-info)' }} />
              <p className="text-[10px] text-[var(--color-status-info)]">Legal counsel assignment — BI/liability claim type</p>
            </div>
          )}
          {score < 50 && claim.reserveAmount <= 100000 && claim.lob !== 'Casualty' && (
            <p className="text-[10px] text-[var(--color-text-muted)] italic">No escalation triggers active</p>
          )}
        </div>
      </Panel>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Export
// ---------------------------------------------------------------------------

export function InsuranceClaimsAssistant() {
  const [activeStage, setActiveStage] = useState<WorkflowStage>('new-claim');
  const [selectedClaimId, setSelectedClaimId] = useState('clm-1');
  const [lob, setLob] = useState<LineOfBusiness>('Auto');
  const [channel, setChannel] = useState<Channel>('Web Portal');
  const [claimSearch, setClaimSearch] = useState('CLM-2024-087431');

  const selectedClaim = useMemo(
    () => SAMPLE_CLAIMS.find((c) => c.id === selectedClaimId) ?? SAMPLE_CLAIMS[0],
    [selectedClaimId],
  );

  const rule = STATE_RULES.find((r) => r.state === selectedClaim.state);
  const daysOpen = daysSince(selectedClaim.dateOfLoss);

  function renderStageContent(): ReactNode {
    switch (activeStage) {
      case 'new-claim':
        return <NewClaimStage />;
      case 'policy-lookup':
        return <PolicyLookupStage claim={selectedClaim} />;
      case 'fnol-intake':
        return <FnolIntakeStage claim={selectedClaim} />;
      case 'document-upload':
        return <DocumentUploadStage claim={selectedClaim} />;
      case 'assignment':
        return <AssignmentStage claim={selectedClaim} />;
      case 'status':
        return <StatusStage claim={selectedClaim} />;
      case 'compliance':
        return <ComplianceStage claim={selectedClaim} />;
    }
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[var(--color-surface-primary)] text-[var(--color-text-primary)]">
      {/* ----------------------------------------------------------------- */}
      {/* Top Bar                                                          */}
      {/* ----------------------------------------------------------------- */}
      <header className="flex h-11 shrink-0 items-center gap-4 border-b border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] px-4">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-[var(--color-accent-primary)]" />
          <span className="text-xs font-semibold text-[var(--color-text-primary)]">
            Insurance Claims Assistant
          </span>
          <span className="rounded-sm bg-[var(--color-enterprise-blue)] px-1.5 py-0.5 text-[9px] font-bold text-white">
            P&amp;C
          </span>
        </div>

        <div className="mx-2 h-4 w-px bg-[var(--color-border-default)]" />

        {/* Claim number search */}
        <div className="flex items-center gap-1.5 rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] px-2 py-1">
          <Hash className="h-3 w-3 text-[var(--color-text-muted)]" />
          <input
            className="w-36 bg-transparent text-[11px] text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)]"
            placeholder="Claim number..."
            value={claimSearch}
            onChange={(e) => setClaimSearch(e.target.value)}
          />
        </div>

        {/* LOB Selector */}
        <div className="flex items-center gap-1">
          {(['Auto', 'Property', 'Casualty'] as const).map((l) => (
            <button
              key={l}
              type="button"
              className={`rounded-md px-2.5 py-1 text-[10px] font-medium transition-colors ${
                lob === l
                  ? 'bg-[var(--color-accent-primary)] text-white'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'
              }`}
              onClick={() => {
                setLob(l);
                const match = SAMPLE_CLAIMS.find((c) => c.lob === l);
                if (match) {
                  setSelectedClaimId(match.id);
                  setClaimSearch(match.claimNumber);
                }
              }}
            >
              {l === 'Auto' && <Car className="mr-1 inline h-3 w-3" />}
              {l === 'Property' && <Home className="mr-1 inline h-3 w-3" />}
              {l === 'Casualty' && <Scale className="mr-1 inline h-3 w-3" />}
              {l}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Channel indicator */}
        <div className="flex items-center gap-1">
          {(['Web Portal', 'Teams'] as const).map((ch) => (
            <button
              key={ch}
              type="button"
              className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] transition-colors ${
                channel === ch
                  ? 'border border-[var(--color-border-focus)] bg-[var(--color-surface-tertiary)] text-[var(--color-accent-primary)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
              }`}
              onClick={() => setChannel(ch)}
            >
              {ch === 'Web Portal' ? <Globe className="h-3 w-3" /> : <MessageSquare className="h-3 w-3" />}
              {ch}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <Monitor className="h-3 w-3 text-[var(--color-text-muted)]" />
          <span className="text-[10px] text-[var(--color-text-muted)]">
            500K+ annual claims
          </span>
        </div>
      </header>

      {/* ----------------------------------------------------------------- */}
      {/* Body: Sidebar + Main + Right Panel                               */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Workflow Stages */}
        <nav className="flex w-48 shrink-0 flex-col border-r border-[var(--color-border-default)] bg-[var(--color-surface-secondary)]">
          <div className="px-3 pt-3 pb-2">
            <p className="text-[9px] uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Workflow</p>
          </div>
          <div className="flex flex-1 flex-col gap-0.5 px-2">
            {WORKFLOW_STAGES.map((stage) => {
              const StageIcon = stage.icon;
              const isActive = activeStage === stage.id;
              return (
                <button
                  key={stage.id}
                  type="button"
                  className={`flex items-center gap-2 rounded-md px-2.5 py-2 text-left text-[11px] transition-colors ${
                    isActive
                      ? 'bg-[var(--color-surface-hover)] text-[var(--color-accent-primary)] font-medium'
                      : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-tertiary)] hover:text-[var(--color-text-primary)]'
                  }`}
                  onClick={() => setActiveStage(stage.id)}
                >
                  <StageIcon className="h-3.5 w-3.5 shrink-0" />
                  {stage.label}
                  {isActive && <ChevronRight className="ml-auto h-3 w-3" />}
                </button>
              );
            })}
          </div>

          {/* Claim Selector */}
          <div className="border-t border-[var(--color-border-default)] px-2 py-2">
            <p className="mb-1.5 px-1 text-[9px] uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
              Active Claims
            </p>
            {SAMPLE_CLAIMS.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors ${
                  selectedClaimId === c.id
                    ? 'bg-[var(--color-surface-hover)] text-[var(--color-text-primary)]'
                    : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-tertiary)]'
                }`}
                onClick={() => {
                  setSelectedClaimId(c.id);
                  setLob(c.lob);
                  setClaimSearch(c.claimNumber);
                }}
              >
                <div
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: statusColor(c.status) }}
                />
                <div className="min-w-0">
                  <p className="truncate text-[10px] font-medium">{c.claimNumber}</p>
                  <p className="truncate text-[9px] text-[var(--color-text-muted)]">{c.lob} -- {c.policyholder.split(' ')[0]}</p>
                </div>
              </button>
            ))}
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4">
          {renderStageContent()}
        </main>

        {/* Right Panel - Fraud & Escalation */}
        <aside className="w-56 shrink-0 overflow-y-auto border-l border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] p-3">
          <FraudPanel claim={selectedClaim} />
        </aside>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Bottom Status Bar                                                */}
      {/* ----------------------------------------------------------------- */}
      <footer className="flex h-7 shrink-0 items-center gap-4 border-t border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] px-4 text-[10px]">
        <div className="flex items-center gap-1.5">
          <Timer className="h-3 w-3 text-[var(--color-status-info)]" />
          <span className="text-[var(--color-text-secondary)]">
            Ack SLA: {rule ? `${Math.max(rule.ackDeadlineDays - daysOpen, 0)}d remaining` : 'N/A'}
          </span>
        </div>
        <div className="h-3 w-px bg-[var(--color-border-default)]" />
        <div className="flex items-center gap-1.5">
          <ChevronRight className="h-3 w-3 text-[var(--color-status-warning)]" />
          <span className="text-[var(--color-text-secondary)]">
            Next: {activeStage === 'compliance' ? 'Review Complete' : WORKFLOW_STAGES[WORKFLOW_STAGES.findIndex((s) => s.id === activeStage) + 1]?.label ?? 'Done'}
          </span>
        </div>
        <div className="h-3 w-px bg-[var(--color-border-default)]" />
        <div className="flex items-center gap-1.5">
          <User className="h-3 w-3 text-[var(--color-text-muted)]" />
          <span className="text-[var(--color-text-secondary)]">
            Handler: {selectedClaim.assignedTo}
          </span>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5">
          <div
            className="h-2 w-2 rounded-full"
            style={{
              background: selectedClaim.fraudScore >= 50 ? 'var(--color-status-error)' : 'var(--color-status-success)',
              boxShadow: `0 0 6px ${selectedClaim.fraudScore >= 50 ? 'var(--color-status-error)' : 'var(--color-status-success)'}`,
            }}
          />
          <span className="text-[var(--color-text-muted)]">
            Fraud: {selectedClaim.fraudScore}/100
          </span>
        </div>
        <span className="text-[var(--color-text-muted)]">
          {selectedClaim.state} jurisdiction
        </span>
      </footer>
    </div>
  );
}
