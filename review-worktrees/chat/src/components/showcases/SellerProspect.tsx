import { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRightLeft,
  BarChart3,
  Bot,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  Clock,
  DollarSign,
  Globe,
  ListChecks,
  Mail,
  MessageSquare,
  PhoneCall,
  Scale,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react';

type Stage = 'Prospect' | 'Qualified' | 'Proposal' | 'Negotiation' | 'Closed';
type Channel = 'internal' | 'external';
type HealthStatus = 'good' | 'warn' | 'bad';

type Topic = {
  id:
    | 'lead-qualification'
    | 'opportunity-lookup'
    | 'pipeline-summary'
    | 'deal-health'
    | 'meeting-scheduler'
    | 'prospect-chat'
    | 'competitive-intel'
    | 'escalation';
  label: string;
  description: string;
  Icon: typeof Activity;
};

type Lead = {
  id: string;
  company: string;
  contact: string;
  title: string;
  budget: number;
  authority: number;
  need: number;
  timeline: number;
};

type Opportunity = {
  id: string;
  account: string;
  name: string;
  stage: Stage;
  amount: number;
  closeDate: string;
  owner: string;
  nextStep: string;
  engagementScore: number;
  decisionMakerAccess: 'High' | 'Medium' | 'Low';
  competitiveThreat: 'Low' | 'Medium' | 'High';
  timelineRisk: 'Low' | 'Medium' | 'High';
  activity: Array<{
    id: string;
    type: 'call' | 'email' | 'stage' | 'meeting' | 'note';
    label: string;
    time: string;
  }>;
};

type Competitor = {
  id: string;
  name: string;
  features: string;
  pricing: string;
  strengths: string;
  weaknesses: string;
};

type ActivityItem = {
  id: string;
  type: 'call' | 'email' | 'stage' | 'meeting' | 'note';
  description: string;
  owner: string;
  time: string;
};

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 0,
});

const topics: Topic[] = [
  {
    id: 'lead-qualification',
    label: 'Lead Qualification',
    description: 'BANT scoring and routing for SDR and AE coverage.',
    Icon: ListChecks,
  },
  {
    id: 'opportunity-lookup',
    label: 'Opportunity Lookup',
    description: 'Salesforce opportunity context, ownership, and next steps.',
    Icon: Search,
  },
  {
    id: 'pipeline-summary',
    label: 'Pipeline Summary',
    description: 'Stage distribution, values, and conversion coverage.',
    Icon: BarChart3,
  },
  {
    id: 'deal-health',
    label: 'Deal Health',
    description: 'Engagement, risk signals, and competitive pressure.',
    Icon: Activity,
  },
  {
    id: 'meeting-scheduler',
    label: 'Meeting Scheduler',
    description: 'Teams-ready scheduling with attendee alignment.',
    Icon: Calendar,
  },
  {
    id: 'prospect-chat',
    label: 'Prospect Chat',
    description: 'External web chat responses with pricing boundaries.',
    Icon: MessageSquare,
  },
  {
    id: 'competitive-intel',
    label: 'Competitive Intel',
    description: 'Internal-only comparison matrix and deal positioning.',
    Icon: Scale,
  },
  {
    id: 'escalation',
    label: 'Escalation',
    description: 'Escalation paths for executive coverage and approvals.',
    Icon: AlertTriangle,
  },
];

const leads: Lead[] = [
  {
    id: 'lead-1',
    company: 'Eaton Logistics',
    contact: 'Tara Melvin',
    title: 'VP, Infrastructure',
    budget: 22,
    authority: 20,
    need: 24,
    timeline: 18,
  },
  {
    id: 'lead-2',
    company: 'Northwind Mobility',
    contact: 'Isaac Gutierrez',
    title: 'Director, Procurement',
    budget: 16,
    authority: 15,
    need: 20,
    timeline: 14,
  },
  {
    id: 'lead-3',
    company: 'Helix Retail Group',
    contact: 'Maia Patel',
    title: 'Head of Digital',
    budget: 12,
    authority: 10,
    need: 14,
    timeline: 12,
  },
];

const opportunities: Opportunity[] = [
  {
    id: 'opp-1',
    account: 'Orbit Analytics',
    name: 'Orbit Data Platform Expansion',
    stage: 'Prospect',
    amount: 650000,
    closeDate: '2025-06-18',
    owner: 'Nora Hill',
    nextStep: 'Confirm data residency and executive sponsor.',
    engagementScore: 52,
    decisionMakerAccess: 'Medium',
    competitiveThreat: 'Medium',
    timelineRisk: 'High',
    activity: [
      { id: 'opp-1-a', type: 'call', label: 'Intro call with data team', time: '2d ago' },
      { id: 'opp-1-b', type: 'note', label: 'Need multi-region compliance', time: '1d ago' },
    ],
  },
  {
    id: 'opp-2',
    account: 'Helios Manufacturing',
    name: 'Helios Cloud Modernization',
    stage: 'Qualified',
    amount: 1200000,
    closeDate: '2025-05-29',
    owner: 'Amir Khan',
    nextStep: 'Schedule technical workshop with cloud architects.',
    engagementScore: 68,
    decisionMakerAccess: 'High',
    competitiveThreat: 'Low',
    timelineRisk: 'Medium',
    activity: [
      { id: 'opp-2-a', type: 'meeting', label: 'Discovery session completed', time: '3d ago' },
      { id: 'opp-2-b', type: 'email', label: 'Sent security posture deck', time: '1d ago' },
    ],
  },
  {
    id: 'opp-3',
    account: 'Nova Financial',
    name: 'Nova AI Suite Rollout',
    stage: 'Proposal',
    amount: 2400000,
    closeDate: '2025-07-12',
    owner: 'Selena Ortiz',
    nextStep: 'Finalize ROI model and pricing tiers.',
    engagementScore: 74,
    decisionMakerAccess: 'Medium',
    competitiveThreat: 'High',
    timelineRisk: 'Medium',
    activity: [
      { id: 'opp-3-a', type: 'stage', label: 'Moved to proposal stage', time: '5d ago' },
      { id: 'opp-3-b', type: 'email', label: 'Shared AI governance addendum', time: '2d ago' },
    ],
  },
  {
    id: 'opp-4',
    account: 'Atlas Security',
    name: 'Atlas Security Refresh',
    stage: 'Negotiation',
    amount: 3100000,
    closeDate: '2025-04-30',
    owner: 'Priya Desai',
    nextStep: 'Align on final procurement approval.',
    engagementScore: 82,
    decisionMakerAccess: 'High',
    competitiveThreat: 'Medium',
    timelineRisk: 'Low',
    activity: [
      { id: 'opp-4-a', type: 'call', label: 'Pricing review with procurement', time: '1d ago' },
      { id: 'opp-4-b', type: 'meeting', label: 'Exec sponsor sync', time: '3d ago' },
    ],
  },
  {
    id: 'opp-5',
    account: 'Pioneer Health',
    name: 'Pioneer Unified Data Stack',
    stage: 'Qualified',
    amount: 1850000,
    closeDate: '2025-08-05',
    owner: 'Jonas Park',
    nextStep: 'Confirm integration with EMR partner.',
    engagementScore: 61,
    decisionMakerAccess: 'Medium',
    competitiveThreat: 'Low',
    timelineRisk: 'Medium',
    activity: [
      { id: 'opp-5-a', type: 'note', label: 'Budget confirmed by finance', time: '4d ago' },
      { id: 'opp-5-b', type: 'email', label: 'Sent integration checklist', time: '2d ago' },
    ],
  },
  {
    id: 'opp-6',
    account: 'Zenith Global',
    name: 'Zenith Enterprise Agreement',
    stage: 'Closed',
    amount: 5600000,
    closeDate: '2025-03-28',
    owner: 'Morgan Lee',
    nextStep: 'Launch adoption workshop series.',
    engagementScore: 92,
    decisionMakerAccess: 'High',
    competitiveThreat: 'Low',
    timelineRisk: 'Low',
    activity: [
      { id: 'opp-6-a', type: 'stage', label: 'Closed won and signed', time: '2w ago' },
      { id: 'opp-6-b', type: 'meeting', label: 'Kickoff planning session', time: '5d ago' },
    ],
  },
];

const competitors: Competitor[] = [
  {
    id: 'comp-1',
    name: 'ApexCloud',
    features: 'Hybrid AI, unified data fabric',
    pricing: 'Premium enterprise bundles',
    strengths: 'Strong analytics stack, global data centers',
    weaknesses: 'Limited automation and slower deployment cycles',
  },
  {
    id: 'comp-2',
    name: 'SignalForge',
    features: 'Automated lead scoring, sales insights',
    pricing: 'Mid-tier per user',
    strengths: 'Fast time to value, simple UI',
    weaknesses: 'Fewer compliance certifications',
  },
  {
    id: 'comp-3',
    name: 'MomentumAI',
    features: 'Predictive forecasting, AI assistants',
    pricing: 'Usage-based pricing',
    strengths: 'Advanced predictive models',
    weaknesses: 'Higher implementation overhead',
  },
  {
    id: 'comp-4',
    name: 'Vertex CRM+',
    features: 'CRM-native sales workflows',
    pricing: 'Bundle with CRM license',
    strengths: 'CRM familiarity for sellers',
    weaknesses: 'Limited multi-channel orchestration',
  },
];

const crmActivity: ActivityItem[] = [
  {
    id: 'crm-1',
    type: 'call',
    description: 'Call logged with Atlas Security CFO',
    owner: 'Priya Desai',
    time: '45m ago',
  },
  {
    id: 'crm-2',
    type: 'email',
    description: 'Proposal sent to Nova Financial procurement',
    owner: 'Selena Ortiz',
    time: '2h ago',
  },
  {
    id: 'crm-3',
    type: 'stage',
    description: 'Helios Cloud Modernization moved to Qualified',
    owner: 'Amir Khan',
    time: '6h ago',
  },
  {
    id: 'crm-4',
    type: 'meeting',
    description: 'Executive sponsor sync scheduled for Orbit',
    owner: 'Nora Hill',
    time: '1d ago',
  },
  {
    id: 'crm-5',
    type: 'note',
    description: 'Budget confirmed for Pioneer Health',
    owner: 'Jonas Park',
    time: '2d ago',
  },
];

const conversionRates: Record<Stage, number> = {
  Prospect: 0.24,
  Qualified: 0.41,
  Proposal: 0.58,
  Negotiation: 0.72,
  Closed: 0.91,
};

const availableSlots = [
  { day: 'Mon', date: 'Apr 8', slots: ['9:00 AM', '11:30 AM', '3:00 PM'] },
  { day: 'Tue', date: 'Apr 9', slots: ['10:00 AM', '1:00 PM', '4:30 PM'] },
  { day: 'Wed', date: 'Apr 10', slots: ['9:30 AM', '2:00 PM'] },
  { day: 'Thu', date: 'Apr 11', slots: ['11:00 AM', '2:30 PM', '5:00 PM'] },
  { day: 'Fri', date: 'Apr 12', slots: ['9:00 AM', '12:00 PM'] },
];

const attendees = [
  { id: 'att-1', name: 'Priya Desai', role: 'Account Executive' },
  { id: 'att-2', name: 'Amir Khan', role: 'Sales Engineer' },
  { id: 'att-3', name: 'Lana Brooks', role: 'Customer Success' },
  { id: 'att-4', name: 'Jordan Price', role: 'Solutions Architect' },
];

const agendaTemplate = [
  'Current state and priorities',
  'Solution fit and demo highlights',
  'Security, compliance, and integration',
  'Commercials and next steps',
];

const prospectChat = [
  { id: 'pc-1', role: 'assistant', content: 'Welcome to Contoso Tech. How can I help you today?' },
  { id: 'pc-2', role: 'user', content: 'Do you integrate with Salesforce and Power Automate?' },
  { id: 'pc-3', role: 'assistant', content: 'Yes. We provide a native Salesforce connector and Power Automate flows for lead sync.' },
  { id: 'pc-4', role: 'user', content: 'What does pricing look like for 2000 sellers?' },
  {
    id: 'pc-5',
    role: 'assistant',
    content:
      'I can share standard enterprise tiers, and your account team can tailor discounts or bundles based on needs.',
  },
  { id: 'pc-6', role: 'user', content: 'Can I see a product overview?' },
  {
    id: 'pc-7',
    role: 'assistant',
    content:
      'Absolutely. Here is a product library link and a short explainer on lead qualification workflows.',
  },
];

const funnelStages: Array<{ stage: Stage; width: number }> = [
  { stage: 'Prospect', width: 100 },
  { stage: 'Qualified', width: 78 },
  { stage: 'Proposal', width: 62 },
  { stage: 'Negotiation', width: 46 },
  { stage: 'Closed', width: 30 },
];

function statusClasses(status: HealthStatus): { badge: string; dot: string } {
  switch (status) {
    case 'good':
      return {
        badge: 'bg-[var(--color-status-success)]/15 text-[var(--color-status-success)]',
        dot: 'bg-[var(--color-status-success)]',
      };
    case 'warn':
      return {
        badge: 'bg-[var(--color-status-warning)]/20 text-[var(--color-status-warning)]',
        dot: 'bg-[var(--color-status-warning)]',
      };
    case 'bad':
    default:
      return {
        badge: 'bg-[var(--color-status-error)]/15 text-[var(--color-status-error)]',
        dot: 'bg-[var(--color-status-error)]',
      };
  }
}

function stageBadge(stage: Stage): string {
  switch (stage) {
    case 'Prospect':
      return 'bg-[var(--color-enterprise-blue)]/20 text-[var(--color-enterprise-blue-light)]';
    case 'Qualified':
      return 'bg-[var(--color-status-info)]/20 text-[var(--color-status-info)]';
    case 'Proposal':
      return 'bg-[var(--color-status-warning)]/20 text-[var(--color-status-warning)]';
    case 'Negotiation':
      return 'bg-[var(--color-status-success)]/20 text-[var(--color-status-success)]';
    case 'Closed':
    default:
      return 'bg-[var(--color-status-success)]/25 text-[var(--color-status-success)]';
  }
}

function activityIcon(type: ActivityItem['type']) {
  switch (type) {
    case 'call':
      return PhoneCall;
    case 'email':
      return Mail;
    case 'meeting':
      return CalendarCheck;
    case 'stage':
      return ArrowRightLeft;
    case 'note':
    default:
      return Sparkles;
  }
}

export function SellerProspect() {
  const [channel, setChannel] = useState<Channel>('internal');
  const [selectedTopic, setSelectedTopic] = useState<Topic['id']>('lead-qualification');
  const [selectedLeadId, setSelectedLeadId] = useState<string>(leads[0]?.id ?? '');
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string>(opportunities[0]?.id ?? '');
  const [selectedSlot, setSelectedSlot] = useState<string>(availableSlots[0]?.slots[0] ?? '');
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([
    attendees[0]?.id ?? '',
    attendees[1]?.id ?? '',
  ]);

  const selectedLead = leads.find((lead) => lead.id === selectedLeadId) ?? leads[0];
  const selectedOpportunity =
    opportunities.find((opportunity) => opportunity.id === selectedOpportunityId) ?? opportunities[0];

  const pipelineStats = useMemo(() => {
    const initial: Record<Stage, { count: number; value: number }> = {
      Prospect: { count: 0, value: 0 },
      Qualified: { count: 0, value: 0 },
      Proposal: { count: 0, value: 0 },
      Negotiation: { count: 0, value: 0 },
      Closed: { count: 0, value: 0 },
    };
    for (const opp of opportunities) {
      initial[opp.stage].count += 1;
      initial[opp.stage].value += opp.amount;
    }
    return initial;
  }, []);

  const openPipelineValue = useMemo(
    () => opportunities.filter((opp) => opp.stage !== 'Closed').reduce((sum, opp) => sum + opp.amount, 0),
    [],
  );

  const bantTotal =
    (selectedLead?.budget ?? 0) +
    (selectedLead?.authority ?? 0) +
    (selectedLead?.need ?? 0) +
    (selectedLead?.timeline ?? 0);

  const bantVerdict: { label: string; status: HealthStatus } =
    bantTotal >= 75
      ? { label: 'Qualified', status: 'good' }
      : bantTotal >= 55
        ? { label: 'Nurture', status: 'warn' }
        : { label: 'Disqualify', status: 'bad' };

  const healthMetrics: Array<{ id: string; label: string; value: string; status: HealthStatus }> = [
    {
      id: 'engagement',
      label: 'Engagement Score',
      value: `${selectedOpportunity?.engagementScore ?? 0}%`,
      status:
        (selectedOpportunity?.engagementScore ?? 0) >= 75
          ? 'good'
          : (selectedOpportunity?.engagementScore ?? 0) >= 55
            ? 'warn'
            : 'bad',
    },
    {
      id: 'decision',
      label: 'Decision-Maker Access',
      value: selectedOpportunity?.decisionMakerAccess ?? 'Medium',
      status:
        selectedOpportunity?.decisionMakerAccess === 'High'
          ? 'good'
          : selectedOpportunity?.decisionMakerAccess === 'Medium'
            ? 'warn'
            : 'bad',
    },
    {
      id: 'competitive',
      label: 'Competitive Threat',
      value: selectedOpportunity?.competitiveThreat ?? 'Medium',
      status:
        selectedOpportunity?.competitiveThreat === 'Low'
          ? 'good'
          : selectedOpportunity?.competitiveThreat === 'Medium'
            ? 'warn'
            : 'bad',
    },
    {
      id: 'timeline',
      label: 'Timeline Risk',
      value: selectedOpportunity?.timelineRisk ?? 'Medium',
      status:
        selectedOpportunity?.timelineRisk === 'Low'
          ? 'good'
          : selectedOpportunity?.timelineRisk === 'Medium'
            ? 'warn'
            : 'bad',
    },
  ];

  const channelLabel = channel === 'internal' ? 'Internal Teams Preview' : 'External Web Preview';

  const renderTopicContent = () => {
    switch (selectedTopic) {
      case 'lead-qualification': {
        const bantSections = [
          {
            id: 'budget',
            label: 'Budget',
            value: selectedLead?.budget ?? 0,
            Icon: DollarSign,
            hint: 'Allocated budget and procurement readiness.',
          },
          {
            id: 'authority',
            label: 'Authority',
            value: selectedLead?.authority ?? 0,
            Icon: UserCheck,
            hint: 'Decision-maker access and sponsorship.',
          },
          {
            id: 'need',
            label: 'Need',
            value: selectedLead?.need ?? 0,
            Icon: Sparkles,
            hint: 'Pain intensity and solution fit.',
          },
          {
            id: 'timeline',
            label: 'Timeline',
            value: selectedLead?.timeline ?? 0,
            Icon: Clock,
            hint: 'Implementation window and urgency.',
          },
        ];

        const verdictStyle = statusClasses(bantVerdict.status);

        return (
          <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
            <div className="flex flex-col gap-3">
              <div className="text-xs font-semibold text-text-secondary">Active leads</div>
              {leads.map((lead) => {
                const total = lead.budget + lead.authority + lead.need + lead.timeline;
                return (
                  <button
                    key={lead.id}
                    type="button"
                    onClick={() => setSelectedLeadId(lead.id)}
                    className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                      lead.id === selectedLeadId
                        ? 'border-[var(--color-accent-primary)] bg-[var(--color-accent-primary)]/10'
                        : 'border-border-default bg-surface-tertiary hover:bg-surface-hover'
                    }`}
                  >
                    <div className="text-sm font-semibold text-text-primary">{lead.company}</div>
                    <div className="text-xs text-text-secondary">
                      {lead.contact} · {lead.title}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-text-secondary">
                      <span>BANT Score</span>
                      <span className="font-semibold text-text-primary">{total}/100</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-surface-primary">
                      <div
                        className="h-1.5 rounded-full bg-[var(--color-accent-primary)]"
                        style={{ width: `${total}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-default bg-surface-tertiary p-4">
                <div>
                  <div className="text-sm font-semibold text-text-primary">BANT Qualification</div>
                  <div className="text-xs text-text-secondary">
                    {selectedLead?.company} · {selectedLead?.contact}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-3xl font-semibold text-text-primary">{bantTotal}</div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${verdictStyle.badge}`}>
                    {bantVerdict.label}
                  </span>
                </div>
                <div className="w-full">
                  <div className="flex items-center justify-between text-xs text-text-secondary">
                    <span>Score gauge</span>
                    <span>{bantTotal}/100</span>
                  </div>
                  <div className="mt-2 h-2 w-full rounded-full bg-surface-primary">
                    <div
                      className="h-2 rounded-full bg-[var(--color-accent-primary)]"
                      style={{ width: `${bantTotal}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {bantSections.map((section) => (
                  <div
                    key={section.id}
                    className="rounded-lg border border-border-default bg-surface-tertiary p-4"
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                      <section.Icon className="h-4 w-4 text-[var(--color-accent-primary)]" />
                      {section.label}
                    </div>
                    <div className="mt-1 text-xs text-text-secondary">{section.hint}</div>
                    <div className="mt-3 flex items-center justify-between text-xs text-text-secondary">
                      <span>Score</span>
                      <span className="font-semibold text-text-primary">{section.value}/25</span>
                    </div>
                    <div className="mt-2 h-2 w-full rounded-full bg-surface-primary">
                      <div
                        className="h-2 rounded-full bg-[var(--color-enterprise-blue-light)]"
                        style={{ width: `${(section.value / 25) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      }
      case 'opportunity-lookup': {
        return (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border-default bg-surface-tertiary p-3">
                <div>
                  <div className="text-sm font-semibold text-text-primary">Opportunity Detail</div>
                  <div className="text-xs text-text-secondary">Salesforce record summary</div>
                </div>
                <select
                  value={selectedOpportunityId}
                  onChange={(event) => setSelectedOpportunityId(event.target.value)}
                  className="rounded-md border border-border-default bg-surface-primary px-2 py-1 text-xs text-text-primary"
                >
                  {opportunities.map((opportunity) => (
                    <option key={opportunity.id} value={opportunity.id}>
                      {opportunity.account}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-lg border border-border-default bg-surface-tertiary p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs text-text-secondary">{selectedOpportunity?.account}</div>
                    <div className="text-base font-semibold text-text-primary">
                      {selectedOpportunity?.name}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-text-secondary">
                      <span className={`rounded-full px-2 py-0.5 font-semibold ${stageBadge(
                        selectedOpportunity?.stage ?? 'Prospect',
                      )}`}
                      >
                        {selectedOpportunity?.stage}
                      </span>
                      <span>{currencyFormatter.format(selectedOpportunity?.amount ?? 0)}</span>
                      <span>Close: {selectedOpportunity?.closeDate}</span>
                    </div>
                  </div>
                  <div className="text-right text-xs text-text-secondary">
                    <div>Owner</div>
                    <div className="text-sm font-semibold text-text-primary">
                      {selectedOpportunity?.owner}
                    </div>
                  </div>
                </div>
                <div className="mt-4 rounded-md border border-border-default bg-surface-primary p-3 text-xs text-text-secondary">
                  Next step: <span className="text-text-primary">{selectedOpportunity?.nextStep}</span>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border-default bg-surface-tertiary p-3">
              <div className="text-sm font-semibold text-text-primary">Activity timeline</div>
              <div className="mt-3 space-y-3">
                {selectedOpportunity?.activity.map((item) => (
                  <div key={item.id} className="flex items-start gap-2 text-xs text-text-secondary">
                    <div className="mt-0.5 h-2 w-2 rounded-full bg-[var(--color-accent-primary)]" />
                    <div>
                      <div className="text-text-primary">{item.label}</div>
                      <div>{item.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      }
      case 'pipeline-summary': {
        const stages: Stage[] = ['Prospect', 'Qualified', 'Proposal', 'Negotiation', 'Closed'];
        return (
          <div className="flex flex-col gap-4">
            <div className="rounded-lg border border-border-default bg-surface-tertiary p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-text-primary">Pipeline distribution</div>
                  <div className="text-xs text-text-secondary">Stage value, count, and conversions</div>
                </div>
                <div className="text-right text-xs text-text-secondary">
                  Total pipeline
                  <div className="text-sm font-semibold text-text-primary">
                    {currencyFormatter.format(openPipelineValue)}
                  </div>
                </div>
              </div>
              <div className="mt-4 overflow-auto">
                <div className="min-w-[640px] rounded-lg border border-border-default bg-surface-primary p-3">
                  <div className="grid grid-cols-6 gap-2 text-xs font-semibold text-text-secondary">
                    <div>Metric</div>
                    {stages.map((stage) => (
                      <div key={stage} className="text-center">
                        {stage}
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 grid grid-cols-6 gap-2 text-xs text-text-secondary">
                    <div>Deals</div>
                    {stages.map((stage) => (
                      <div key={`${stage}-count`} className="text-center text-text-primary">
                        {pipelineStats[stage].count}
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 grid grid-cols-6 gap-2 text-xs text-text-secondary">
                    <div>Value</div>
                    {stages.map((stage) => (
                      <div key={`${stage}-value`} className="text-center text-text-primary">
                        {currencyFormatter.format(pipelineStats[stage].value)}
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 grid grid-cols-6 gap-2 text-xs text-text-secondary">
                    <div>Conversion</div>
                    {stages.map((stage) => (
                      <div key={`${stage}-conv`} className="text-center text-text-primary">
                        {percentFormatter.format(conversionRates[stage])}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-border-default bg-surface-tertiary p-4">
                <div className="text-xs text-text-secondary">Prospect coverage</div>
                <div className="mt-2 text-xl font-semibold text-text-primary">32%</div>
                <div className="mt-2 text-xs text-text-secondary">Top-of-funnel velocity</div>
              </div>
              <div className="rounded-lg border border-border-default bg-surface-tertiary p-4">
                <div className="text-xs text-text-secondary">Qualified to proposal</div>
                <div className="mt-2 text-xl font-semibold text-text-primary">58%</div>
                <div className="mt-2 text-xs text-text-secondary">Conversion health</div>
              </div>
              <div className="rounded-lg border border-border-default bg-surface-tertiary p-4">
                <div className="text-xs text-text-secondary">Forecast confidence</div>
                <div className="mt-2 text-xl font-semibold text-text-primary">81%</div>
                <div className="mt-2 text-xs text-text-secondary">Based on last 30 days</div>
              </div>
            </div>
          </div>
        );
      }
      case 'deal-health': {
        return (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-default bg-surface-tertiary p-3">
              <div>
                <div className="text-sm font-semibold text-text-primary">Deal health card</div>
                <div className="text-xs text-text-secondary">
                  {selectedOpportunity?.account} · {selectedOpportunity?.name}
                </div>
              </div>
              <select
                value={selectedOpportunityId}
                onChange={(event) => setSelectedOpportunityId(event.target.value)}
                className="rounded-md border border-border-default bg-surface-primary px-2 py-1 text-xs text-text-primary"
              >
                {opportunities.map((opportunity) => (
                  <option key={opportunity.id} value={opportunity.id}>
                    {opportunity.account}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {healthMetrics.map((metric) => {
                const styles = statusClasses(metric.status);
                return (
                  <div
                    key={metric.id}
                    className="flex items-center justify-between rounded-lg border border-border-default bg-surface-tertiary p-4"
                  >
                    <div>
                      <div className="text-xs text-text-secondary">{metric.label}</div>
                      <div className="mt-1 text-sm font-semibold text-text-primary">{metric.value}</div>
                    </div>
                    <span className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${styles.badge}`}>
                      <span className={`h-2 w-2 rounded-full ${styles.dot}`} />
                      {metric.status === 'good' ? 'Healthy' : metric.status === 'warn' ? 'Watch' : 'At risk'}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="rounded-lg border border-border-default bg-surface-tertiary p-4 text-xs text-text-secondary">
              Recommended action: <span className="text-text-primary">Reinforce executive alignment and confirm timeline.</span>
            </div>
          </div>
        );
      }
      case 'meeting-scheduler': {
        return (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
            <div className="rounded-lg border border-border-default bg-surface-tertiary p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-text-primary">Available slots</div>
                  <div className="text-xs text-text-secondary">Synced with Teams calendars</div>
                </div>
                <button
                  type="button"
                  className="rounded-md bg-[var(--color-accent-primary)] px-3 py-1.5 text-xs font-semibold text-white"
                >
                  Schedule in Teams
                </button>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {availableSlots.map((day) => (
                  <div key={day.day} className="rounded-lg border border-border-default bg-surface-primary p-3">
                    <div className="text-xs font-semibold text-text-primary">
                      {day.day} · {day.date}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {day.slots.map((slot) => (
                        <button
                          key={`${day.day}-${slot}`}
                          type="button"
                          onClick={() => setSelectedSlot(`${day.day} ${slot}`)}
                          className={`rounded-full border px-3 py-1 text-xs ${
                            selectedSlot === `${day.day} ${slot}`
                              ? 'border-[var(--color-accent-primary)] bg-[var(--color-accent-primary)]/15 text-[var(--color-accent-primary)]'
                              : 'border-border-default text-text-secondary hover:bg-surface-hover'
                          }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="rounded-lg border border-border-default bg-surface-tertiary p-3">
                <div className="text-xs font-semibold text-text-secondary">Selected slot</div>
                <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-text-primary">
                  <CalendarCheck className="h-4 w-4 text-[var(--color-accent-primary)]" />
                  {selectedSlot || 'Pick a time'}
                </div>
              </div>
              <div className="rounded-lg border border-border-default bg-surface-tertiary p-3">
                <div className="text-xs font-semibold text-text-secondary">Attendees</div>
                <div className="mt-2 space-y-2">
                  {attendees.map((person) => {
                    const isSelected = selectedAttendees.includes(person.id);
                    return (
                      <button
                        key={person.id}
                        type="button"
                        onClick={() =>
                          setSelectedAttendees((prev) =>
                            prev.includes(person.id)
                              ? prev.filter((id) => id !== person.id)
                              : [...prev, person.id],
                          )
                        }
                        className={`flex w-full items-center justify-between rounded-md border px-2 py-1 text-xs ${
                          isSelected
                            ? 'border-[var(--color-accent-primary)] bg-[var(--color-accent-primary)]/10 text-text-primary'
                            : 'border-border-default text-text-secondary hover:bg-surface-hover'
                        }`}
                      >
                        <span>
                          {person.name} · {person.role}
                        </span>
                        {isSelected ? (
                          <CheckCircle2 className="h-4 w-4 text-[var(--color-accent-primary)]" />
                        ) : (
                          <XCircle className="h-4 w-4 text-text-muted" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="rounded-lg border border-border-default bg-surface-tertiary p-3">
                <div className="text-xs font-semibold text-text-secondary">Agenda template</div>
                <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs text-text-secondary">
                  {agendaTemplate.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        );
      }
      case 'prospect-chat': {
        return (
          <div className="flex flex-col gap-4">
            <div className="rounded-lg border border-border-default bg-surface-tertiary p-3 text-xs text-text-secondary">
              External chat preview uses public product library only. Pricing responses stay within approved tiers.
            </div>
            <div className="flex flex-col gap-3 rounded-lg border border-border-default bg-surface-primary p-4">
              {prospectChat.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] rounded-lg px-3 py-2 text-xs ${
                      message.role === 'user'
                        ? 'bg-[var(--color-enterprise-blue)]/20 text-[var(--color-enterprise-blue-light)]'
                        : 'bg-surface-tertiary text-text-primary'
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }
      case 'competitive-intel': {
        return (
          <div className="flex flex-col gap-4">
            <div className="rounded-lg border border-border-default bg-[var(--color-status-warning)]/10 px-3 py-2 text-xs text-[var(--color-status-warning)]">
              Internal-only competitive intel. Do not expose to external channels.
            </div>
            <div className="overflow-auto rounded-lg border border-border-default bg-surface-tertiary">
              <table className="min-w-[720px] w-full text-left text-xs">
                <thead className="bg-surface-primary text-text-secondary">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Competitor</th>
                    <th className="px-3 py-2 font-semibold">Features</th>
                    <th className="px-3 py-2 font-semibold">Pricing</th>
                    <th className="px-3 py-2 font-semibold">Strengths</th>
                    <th className="px-3 py-2 font-semibold">Weaknesses</th>
                  </tr>
                </thead>
                <tbody>
                  {competitors.map((competitor) => (
                    <tr key={competitor.id} className="border-t border-border-default text-text-primary">
                      <td className="px-3 py-2 font-semibold">{competitor.name}</td>
                      <td className="px-3 py-2 text-text-secondary">{competitor.features}</td>
                      <td className="px-3 py-2 text-text-secondary">{competitor.pricing}</td>
                      <td className="px-3 py-2 text-text-secondary">{competitor.strengths}</td>
                      <td className="px-3 py-2 text-text-secondary">{competitor.weaknesses}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      }
      case 'escalation': {
        return (
          <div className="flex flex-col gap-4">
            <div className="rounded-lg border border-border-default bg-surface-tertiary p-4">
              <div className="text-sm font-semibold text-text-primary">Escalation path</div>
              <div className="mt-2 text-xs text-text-secondary">
                When deal risk exceeds thresholds, route to executive coverage and legal review.
              </div>
              <div className="mt-3 space-y-2 text-xs text-text-secondary">
                <div className="flex items-center justify-between rounded-md border border-border-default bg-surface-primary px-3 py-2">
                  <span>Sales Director review</span>
                  <span className="text-text-primary">4h SLA</span>
                </div>
                <div className="flex items-center justify-between rounded-md border border-border-default bg-surface-primary px-3 py-2">
                  <span>Legal and procurement alignment</span>
                  <span className="text-text-primary">24h SLA</span>
                </div>
                <div className="flex items-center justify-between rounded-md border border-border-default bg-surface-primary px-3 py-2">
                  <span>Executive sponsor engagement</span>
                  <span className="text-text-primary">48h SLA</span>
                </div>
              </div>
            </div>
          </div>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div className="flex h-full w-full flex-col gap-3 rounded-lg border border-border-default bg-surface-primary p-4">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border-default bg-surface-secondary px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--color-enterprise-blue)]/20 text-[var(--color-enterprise-blue-light)]">
            <Bot className="h-6 w-6" />
          </div>
          <div>
            <div className="text-lg font-semibold text-text-primary">Seller Prospect Agent</div>
            <div className="text-xs text-text-secondary">
              Copilot Studio sales agent · 2000+ sellers · Salesforce + Power Automate
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
              <span className="rounded-full bg-surface-tertiary px-2 py-0.5 text-text-secondary">
                Public product library
              </span>
              <span className="rounded-full bg-[var(--color-enterprise-blue)]/20 px-2 py-0.5 text-[var(--color-enterprise-blue-light)]">
                Internal competitive intel only
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-full border border-border-default bg-surface-tertiary p-1 text-xs">
            <button
              type="button"
              onClick={() => setChannel('internal')}
              className={`flex items-center gap-1 rounded-full px-3 py-1 ${
                channel === 'internal'
                  ? 'bg-[var(--color-accent-primary)] text-white'
                  : 'text-text-secondary'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              Internal
            </button>
            <button
              type="button"
              onClick={() => setChannel('external')}
              className={`flex items-center gap-1 rounded-full px-3 py-1 ${
                channel === 'external'
                  ? 'bg-[var(--color-accent-primary)] text-white'
                  : 'text-text-secondary'
              }`}
            >
              <Globe className="h-3.5 w-3.5" />
              External
            </button>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border-default bg-surface-tertiary px-3 py-2">
            <TrendingUp className="h-4 w-4 text-[var(--color-status-info)]" />
            <div>
              <div className="text-[11px] text-text-secondary">Pipeline value</div>
              <div className="text-sm font-semibold text-text-primary">
                {currencyFormatter.format(openPipelineValue)}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[250px_minmax(0,1fr)_300px] gap-3">
        <aside className="flex h-full flex-col gap-4 rounded-lg border border-border-default bg-surface-secondary p-3">
          <div>
            <div className="text-xs font-semibold text-text-secondary">Topics</div>
            <div className="mt-2 flex flex-col gap-1">
              {topics.map((topic) => (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => setSelectedTopic(topic.id)}
                  className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors ${
                    selectedTopic === topic.id
                      ? 'bg-[var(--color-accent-primary)]/15 text-[var(--color-accent-primary)]'
                      : 'text-text-secondary hover:bg-surface-hover'
                  }`}
                >
                  <topic.Icon className="h-3.5 w-3.5" />
                  <span>{topic.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-2">
            <div className="text-xs font-semibold text-text-secondary">Deal stage funnel</div>
            <div className="mt-3 flex flex-col gap-2">
              {funnelStages.map((stage) => (
                <div key={stage.stage} className="flex items-center gap-2">
                  <span className="w-20 text-[11px] text-text-secondary">{stage.stage}</span>
                  <div className="h-2 flex-1 rounded-full bg-surface-tertiary">
                    <div
                      className="h-2 rounded-full bg-[var(--color-enterprise-blue-light)]"
                      style={{ width: `${stage.width}%` }}
                    />
                  </div>
                  <span className="w-10 text-right text-[11px] text-text-secondary">
                    {pipelineStats[stage.stage].count}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-text-secondary">
              <Target className="h-3.5 w-3.5 text-[var(--color-accent-primary)]" />
              {channelLabel}
            </div>
          </div>
        </aside>

        <main className="flex h-full flex-col gap-3 rounded-lg border border-border-default bg-surface-secondary p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-base font-semibold text-text-primary">
                {topics.find((topic) => topic.id === selectedTopic)?.label}
              </div>
              <div className="text-xs text-text-secondary">
                {topics.find((topic) => topic.id === selectedTopic)?.description}
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-border-default bg-surface-tertiary px-3 py-1 text-xs text-text-secondary">
              <Sparkles className="h-3.5 w-3.5 text-[var(--color-accent-primary)]" />
              Copilot Studio preview
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-auto pr-1">{renderTopicContent()}</div>
        </main>

        <aside className="flex h-full flex-col gap-3 rounded-lg border border-border-default bg-surface-secondary p-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-text-primary">Salesforce activity</div>
            <div className="text-xs text-text-secondary">Live sync</div>
          </div>
          <div className="flex flex-col gap-2">
            {crmActivity.map((activity) => {
              const Icon = activityIcon(activity.type);
              return (
                <div
                  key={activity.id}
                  className="rounded-lg border border-border-default bg-surface-tertiary p-3 text-xs text-text-secondary"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 text-[var(--color-accent-primary)]" />
                    <span className="text-text-primary">{activity.description}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span>{activity.owner}</span>
                    <span>{activity.time}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-auto rounded-lg border border-border-default bg-surface-tertiary p-3 text-xs text-text-secondary">
            Integration: Power Automate flow updating Salesforce records every 5 minutes.
          </div>
        </aside>
      </div>

      <footer className="rounded-lg border border-border-default bg-surface-secondary px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
            <TrendingUp className="h-4 w-4 text-[var(--color-accent-primary)]" />
            Quota attainment
          </div>
          <div className="text-xs text-text-secondary">Forecast indicator: 81% confidence</div>
        </div>
        <div className="mt-2 h-2 w-full rounded-full bg-surface-tertiary">
          <div className="h-2 rounded-full bg-[var(--color-accent-primary)]" style={{ width: '74%' }} />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-text-secondary">
          <span>{currencyFormatter.format(8900000)} of {currencyFormatter.format(12000000)}</span>
          <span>74% to quota</span>
        </div>
      </footer>
    </div>
  );
}
