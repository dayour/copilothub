import { useState, useEffect, type CSSProperties } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Search,
  Bell,
  ChevronRight,
  KeyRound,
  Monitor,
  HardDrive,
  FileText,
  BookOpen,
  CheckCircle,
  Clock,
  AlertCircle,
  Plus,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Paperclip,
  Laptop,
  Mouse,
  Lock,
  Smartphone,
  Wifi,
  Shield,
  Timer,
  Headphones,
  Package,
  ShieldCheck,
  Send,
  UserCheck,
  Circle,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TopicId = 'account' | 'software' | 'hardware' | 'incident' | 'kb';
type TicketStatus = 'new' | 'in-progress' | 'waiting' | 'resolved';
type Priority = 'low' | 'medium' | 'high' | 'critical';
type AccountSubTab = 'password' | 'mfa' | 'vpn';
type PasswordStep = 1 | 2 | 3;
type PwMethod = 'email' | 'sms' | 'app';

interface Ticket {
  id: string;
  title: string;
  category: string;
  priority: Priority;
  status: TicketStatus;
  submitter: string;
  updated: string;
}

interface KBArticle {
  id: string;
  title: string;
  category: string;
  relevance: number;
  preview: string;
  steps: string[];
  helpful: number;
  notHelpful: number;
}

interface SoftwareItem {
  id: string;
  name: string;
  version: string;
  vendor: string;
  licenseStatus: 'licensed' | 'trial' | 'expired';
  category: string;
  description: string;
}

interface HardwareItem {
  id: string;
  name: string;
  category: string;
  specs: string;
  price: number;
  leadDays: number;
  inStock: boolean;
}

// ---------------------------------------------------------------------------
// Seed Data
// ---------------------------------------------------------------------------

const TICKETS: Ticket[] = [
  {
    id: 'INC-4821',
    title: 'Cannot access SharePoint after MFA enrollment',
    category: 'Account/Access',
    priority: 'high',
    status: 'in-progress',
    submitter: 'Morgan Chen',
    updated: '45m ago',
  },
  {
    id: 'INC-4820',
    title: 'Outlook keeps crashing on Windows 11',
    category: 'Software Support',
    priority: 'medium',
    status: 'new',
    submitter: 'Alex Rivera',
    updated: '3h ago',
  },
  {
    id: 'INC-4818',
    title: 'VPN disconnects every 15 minutes',
    category: 'Account/Access',
    priority: 'high',
    status: 'waiting',
    submitter: 'Jordan Park',
    updated: '1h ago',
  },
  {
    id: 'INC-4815',
    title: 'Request for additional 27-inch monitor',
    category: 'Hardware Request',
    priority: 'low',
    status: 'in-progress',
    submitter: 'Riley Scott',
    updated: '4h ago',
  },
  {
    id: 'INC-4810',
    title: 'Adobe Acrobat license expired',
    category: 'Software Support',
    priority: 'medium',
    status: 'resolved',
    submitter: 'Sam Torres',
    updated: '6h ago',
  },
];

const KB_ARTICLES: KBArticle[] = [
  {
    id: 'KB-1042',
    title: 'How to Reset Your Active Directory Password',
    category: 'Account/Access',
    relevance: 98,
    preview:
      'Step-by-step guide for resetting your AD password through the self-service portal or contacting IT support.',
    steps: [
      'Navigate to https://passwordreset.microsoft.com and sign in with your work email.',
      'Select "I forgot my password" and verify your identity via MFA.',
      'Choose your reset method: email link, SMS code, or authenticator app.',
      'Create a new password meeting complexity requirements (min 12 chars, uppercase, number, symbol).',
      'Wait 5-10 minutes for AD sync to propagate changes across all connected systems.',
      'Log in to your workstation and all services with the new password.',
    ],
    helpful: 142,
    notHelpful: 8,
  },
  {
    id: 'KB-1038',
    title: 'Setting Up Microsoft Authenticator for MFA',
    category: 'Account/Access',
    relevance: 94,
    preview:
      'Configure multi-factor authentication using the Microsoft Authenticator app on iOS or Android.',
    steps: [
      'Download Microsoft Authenticator from the App Store or Google Play.',
      'On your desktop, go to https://aka.ms/mfasetup and sign in.',
      'Click "Add method" and select "Authenticator app".',
      'Open the Authenticator app, tap the plus icon, and select "Work or school account".',
      'Scan the QR code displayed on your desktop screen.',
      'Enter the 6-digit code from the app to complete verification.',
    ],
    helpful: 210,
    notHelpful: 12,
  },
  {
    id: 'KB-1029',
    title: 'Connecting to GlobalProtect VPN',
    category: 'Network',
    relevance: 87,
    preview:
      'Install and configure GlobalProtect VPN client to access internal corporate resources remotely.',
    steps: [
      'Download the GlobalProtect installer from the IT portal at https://it.company.com/vpn.',
      'Run the installer and accept the license agreement.',
      'When prompted, enter the gateway address: vpn.company.com',
      'Sign in with your AD credentials and approve the MFA push notification.',
      'Verify the VPN icon in the system tray shows "Connected".',
      'Contact IT if you receive a "Gateway certificate not trusted" error.',
    ],
    helpful: 98,
    notHelpful: 21,
  },
  {
    id: 'KB-1021',
    title: 'Troubleshooting Microsoft Office Crashes',
    category: 'Software Support',
    relevance: 79,
    preview:
      'Diagnose and resolve frequent Microsoft Office application crashes on Windows 10/11.',
    steps: [
      'Run Office repair: Control Panel > Programs > Microsoft 365 > Change > Quick Repair.',
      'If Quick Repair fails, run Online Repair (requires internet connection).',
      'Check for conflicting add-ins: open app in Safe Mode (hold Ctrl while launching).',
      'Clear the Office cache at %localappdata%\\Microsoft\\Office\\16.0\\OfficeFileCache',
      'Ensure Windows and Office are fully updated via Windows Update.',
      'If issue persists, create an INC ticket for a remote diagnostics session.',
    ],
    helpful: 76,
    notHelpful: 14,
  },
  {
    id: 'KB-1018',
    title: 'Requesting Hardware Through the IT Portal',
    category: 'Hardware',
    relevance: 72,
    preview:
      'How to submit, track, and receive approval for hardware requests via the IT Service Portal.',
    steps: [
      'Log in to the IT portal at https://it.company.com/portal.',
      'Navigate to "Hardware Requests" and browse the approved catalog.',
      'Select your item and fill in the business justification form.',
      'Your manager will receive an approval email within 1 business day.',
      'Once approved, IT will process the order — standard lead time is 5-10 business days.',
      'You will receive a confirmation email when your equipment is ready for pickup.',
    ],
    helpful: 55,
    notHelpful: 6,
  },
];

const SOFTWARE_ITEMS: SoftwareItem[] = [
  {
    id: 'SW-001',
    name: 'Microsoft 365',
    version: '16.0.18',
    vendor: 'Microsoft',
    licenseStatus: 'licensed',
    category: 'Productivity',
    description: 'Full Office suite with Teams, Outlook, Word, Excel, PowerPoint',
  },
  {
    id: 'SW-002',
    name: 'Adobe Acrobat Pro',
    version: '23.006',
    vendor: 'Adobe',
    licenseStatus: 'trial',
    category: 'Document Management',
    description: 'PDF creation, editing, signing, and form management',
  },
  {
    id: 'SW-003',
    name: 'Zoom Meetings',
    version: '5.17.2',
    vendor: 'Zoom',
    licenseStatus: 'licensed',
    category: 'Communication',
    description: 'Video conferencing and webinar platform with recording',
  },
  {
    id: 'SW-004',
    name: 'Cisco AnyConnect',
    version: '4.10.08',
    vendor: 'Cisco',
    licenseStatus: 'expired',
    category: 'Network',
    description: 'VPN client for secure remote corporate network access',
  },
];

const HARDWARE_ITEMS: HardwareItem[] = [
  {
    id: 'HW-001',
    name: 'Dell XPS 15 Laptop',
    category: 'Laptop',
    specs: 'Intel Core i7-13700H, 32 GB RAM, 512 GB SSD, 15.6-inch OLED',
    price: 1899,
    leadDays: 7,
    inStock: true,
  },
  {
    id: 'HW-002',
    name: 'LG 27-inch 4K Monitor',
    category: 'Monitor',
    specs: '27-inch IPS, 3840x2160, 60 Hz, USB-C 90 W PD, HDR400',
    price: 549,
    leadDays: 3,
    inStock: true,
  },
  {
    id: 'HW-003',
    name: 'Logitech MX Master 3S',
    category: 'Peripheral',
    specs: 'Bluetooth / USB, 8000 DPI, Quiet-click, Rechargeable',
    price: 99,
    leadDays: 2,
    inStock: false,
  },
];

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TOPIC_NAV: { id: TopicId; label: string; Icon: LucideIcon; count: number }[] = [
  { id: 'account', label: 'Account & Access', Icon: KeyRound, count: 8 },
  { id: 'software', label: 'Software Support', Icon: Monitor, count: 5 },
  { id: 'hardware', label: 'Hardware Requests', Icon: HardDrive, count: 3 },
  { id: 'incident', label: 'Log Incident', Icon: FileText, count: 0 },
  { id: 'kb', label: 'KB Search', Icon: BookOpen, count: 0 },
];

const TICKET_STATUS_CONFIG: Record<TicketStatus, { label: string; color: string }> = {
  new: { label: 'New', color: 'var(--color-status-info)' },
  'in-progress': { label: 'In Progress', color: 'var(--color-accent-primary)' },
  waiting: { label: 'Waiting', color: 'var(--color-status-warning)' },
  resolved: { label: 'Resolved', color: 'var(--color-status-success)' },
};

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string }> = {
  low: { label: 'Low', color: 'var(--color-text-muted)' },
  medium: { label: 'Medium', color: 'var(--color-status-warning)' },
  high: { label: 'High', color: 'var(--color-status-error)' },
  critical: { label: 'Critical', color: '#ff1744' },
};

const LICENSE_CONFIG: Record<
  SoftwareItem['licenseStatus'],
  { label: string; color: string }
> = {
  licensed: { label: 'Licensed', color: 'var(--color-status-success)' },
  trial: { label: 'Trial', color: 'var(--color-status-warning)' },
  expired: { label: 'Expired', color: 'var(--color-status-error)' },
};

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Laptop,
  Monitor,
  Peripheral: Mouse,
};

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------

const cardStyle: CSSProperties = {
  boxShadow:
    '0 8px 16px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.06)',
};

const panelStyle: CSSProperties = {
  boxShadow:
    '0 16px 28px rgba(0,0,0,0.35), 0 4px 8px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.05)',
};

const inputClass =
  'rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--color-border-focus)]';

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

let ticketCounter = 4822;
function nextTicketId(): string {
  return `INC-${ticketCounter++}`;
}

// ---------------------------------------------------------------------------
// Account & Access topic
// ---------------------------------------------------------------------------

function AccountAccessTopic() {
  const [subTab, setSubTab] = useState<AccountSubTab>('password');
  const [pwStep, setPwStep] = useState<PasswordStep>(1);
  const [pwEmail, setPwEmail] = useState('');
  const [pwEmpId, setPwEmpId] = useState('');
  const [pwMethod, setPwMethod] = useState<PwMethod>('email');
  const [vpnForm, setVpnForm] = useState({
    name: '',
    email: '',
    manager: '',
    startDate: '',
    justification: '',
  });

  const subTabs: { id: AccountSubTab; label: string; Icon: LucideIcon }[] = [
    { id: 'password', label: 'Password Reset', Icon: Lock },
    { id: 'mfa', label: 'MFA Setup', Icon: Smartphone },
    { id: 'vpn', label: 'VPN Request', Icon: Wifi },
  ];

  const resetMethods: { id: PwMethod; label: string; desc: string; Icon: LucideIcon }[] = [
    { id: 'email', label: 'Email Link', desc: 'Send reset link to your recovery email', Icon: Send },
    { id: 'sms', label: 'SMS Code', desc: 'Receive a one-time code via text message', Icon: Smartphone },
    { id: 'app', label: 'Authenticator', desc: 'Approve via Microsoft Authenticator app', Icon: Shield },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Sub-tab bar */}
      <div className="flex gap-1.5 flex-wrap">
        {subTabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setSubTab(id)}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
            style={{
              background: subTab === id ? 'var(--color-accent-primary)' : 'var(--color-surface-tertiary)',
              color: subTab === id ? '#fff' : 'var(--color-text-secondary)',
              border: `1px solid ${subTab === id ? 'var(--color-accent-primary)' : 'var(--color-border-default)'}`,
            }}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Password Reset Wizard */}
      {subTab === 'password' && (
        <div
          className="relative overflow-hidden rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] p-6"
          style={panelStyle}
        >
          {/* Step indicators */}
          <div className="mb-6 flex items-center gap-2 flex-wrap">
            {([1, 2, 3] as const).map((step) => (
              <div key={step} className="flex items-center gap-2">
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold"
                  style={{
                    background: pwStep >= step ? 'var(--color-accent-primary)' : 'var(--color-surface-tertiary)',
                    color: pwStep >= step ? '#fff' : 'var(--color-text-muted)',
                    border: `1px solid ${pwStep >= step ? 'var(--color-accent-primary)' : 'var(--color-border-default)'}`,
                  }}
                >
                  {pwStep > step ? <CheckCircle className="h-4 w-4" /> : step}
                </div>
                <span className="text-xs text-[var(--color-text-secondary)]">
                  {step === 1 ? 'Verify Identity' : step === 2 ? 'Reset Method' : 'Confirmation'}
                </span>
                {step < 3 && (
                  <ChevronRight className="h-4 w-4 text-[var(--color-text-muted)]" />
                )}
              </div>
            ))}
          </div>

          {pwStep === 1 && (
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
                  Verify Your Identity
                </h3>
                <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">
                  Enter your work email and employee ID to proceed.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-[var(--color-text-muted)]">Work Email</label>
                  <input
                    type="email"
                    value={pwEmail}
                    onChange={(e) => setPwEmail(e.target.value)}
                    placeholder="you@company.com"
                    className={inputClass}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-[var(--color-text-muted)]">Employee ID</label>
                  <input
                    type="text"
                    value={pwEmpId}
                    onChange={(e) => setPwEmpId(e.target.value)}
                    placeholder="EMP-XXXXX"
                    className={inputClass}
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPwStep(2)}
                className="self-start rounded-lg px-5 py-2 text-sm font-medium text-white"
                style={{ background: 'var(--color-accent-primary)' }}
              >
                Verify Identity
              </button>
            </div>
          )}

          {pwStep === 2 && (
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
                  Choose Reset Method
                </h3>
                <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">
                  Select how you would like to receive your password reset.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {resetMethods.map(({ id, label, desc, Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setPwMethod(id)}
                    className="flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors"
                    style={{
                      borderColor:
                        pwMethod === id
                          ? 'var(--color-accent-primary)'
                          : 'var(--color-border-default)',
                      background:
                        pwMethod === id
                          ? 'rgba(0,120,212,0.1)'
                          : 'var(--color-surface-tertiary)',
                    }}
                  >
                    <Icon
                      className="h-5 w-5"
                      style={{
                        color:
                          pwMethod === id
                            ? 'var(--color-accent-primary)'
                            : 'var(--color-text-secondary)',
                      }}
                    />
                    <span className="text-sm font-medium text-[var(--color-text-primary)]">
                      {label}
                    </span>
                    <span className="text-xs text-[var(--color-text-muted)]">{desc}</span>
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setPwStep(1)}
                  className="rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] px-4 py-2 text-sm text-[var(--color-text-secondary)]"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setPwStep(3)}
                  className="rounded-lg px-5 py-2 text-sm font-medium text-white"
                  style={{ background: 'var(--color-accent-primary)' }}
                >
                  Send Reset
                </button>
              </div>
            </div>
          )}

          {pwStep === 3 && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-full"
                style={{
                  background: 'rgba(78,201,176,0.15)',
                  border: '2px solid var(--color-status-success)',
                }}
              >
                <CheckCircle
                  className="h-7 w-7"
                  style={{ color: 'var(--color-status-success)' }}
                />
              </div>
              <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
                Reset Initiated
              </h3>
              <p className="max-w-sm text-sm text-[var(--color-text-secondary)]">
                Your password reset has been sent via{' '}
                {pwMethod === 'email'
                  ? 'email link'
                  : pwMethod === 'sms'
                    ? 'SMS code'
                    : 'Microsoft Authenticator'}
                . Check your{' '}
                {pwMethod === 'app'
                  ? 'authenticator app'
                  : pwMethod === 'sms'
                    ? 'phone'
                    : 'inbox'}{' '}
                to complete the process.
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">
                Reference: {nextTicketId()} — Valid for 30 minutes
              </p>
              <button
                type="button"
                onClick={() => {
                  setPwStep(1);
                  setPwEmail('');
                  setPwEmpId('');
                }}
                className="rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] px-4 py-2 text-sm text-[var(--color-text-secondary)]"
              >
                Start Over
              </button>
            </div>
          )}
        </div>
      )}

      {/* MFA Setup Guide */}
      {subTab === 'mfa' && (
        <div
          className="relative overflow-hidden rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] p-6"
          style={panelStyle}
        >
          <h3 className="mb-1 text-base font-semibold text-[var(--color-text-primary)]">
            MFA Setup Guide
          </h3>
          <p className="mb-5 text-sm text-[var(--color-text-secondary)]">
            Set up multi-factor authentication using Microsoft Authenticator to secure your account.
          </p>
          <div className="flex flex-col gap-3">
            {KB_ARTICLES[1].steps.map((step, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-tertiary)] p-3"
                style={cardStyle}
              >
                <div
                  className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                  style={{ background: 'var(--color-accent-primary)', color: '#fff' }}
                >
                  {idx + 1}
                </div>
                <p className="text-sm text-[var(--color-text-secondary)]">{step}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 flex gap-3">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white"
              style={{ background: 'var(--color-accent-primary)' }}
            >
              <Smartphone className="h-4 w-4" />
              Open MFA Portal
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] px-4 py-2 text-sm text-[var(--color-text-secondary)]"
            >
              <BookOpen className="h-4 w-4" />
              View KB-1038
            </button>
          </div>
        </div>
      )}

      {/* VPN Request Form */}
      {subTab === 'vpn' && (
        <div
          className="relative overflow-hidden rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] p-6"
          style={panelStyle}
        >
          <h3 className="mb-1 text-base font-semibold text-[var(--color-text-primary)]">
            VPN Access Request
          </h3>
          <p className="mb-5 text-sm text-[var(--color-text-secondary)]">
            Submit a request for VPN access. Your manager will receive an approval notification.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[var(--color-text-muted)]">Full Name</label>
              <input
                type="text"
                value={vpnForm.name}
                onChange={(e) => setVpnForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Your full name"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[var(--color-text-muted)]">Work Email</label>
              <input
                type="email"
                value={vpnForm.email}
                onChange={(e) => setVpnForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="you@company.com"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[var(--color-text-muted)]">Manager Email</label>
              <input
                type="email"
                value={vpnForm.manager}
                onChange={(e) => setVpnForm((f) => ({ ...f, manager: e.target.value }))}
                placeholder="manager@company.com"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[var(--color-text-muted)]">Required Start Date</label>
              <input
                type="date"
                value={vpnForm.startDate}
                onChange={(e) => setVpnForm((f) => ({ ...f, startDate: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-xs text-[var(--color-text-muted)]">Business Justification</label>
              <textarea
                value={vpnForm.justification}
                onChange={(e) => setVpnForm((f) => ({ ...f, justification: e.target.value }))}
                placeholder="Describe why you need VPN access and which systems you will access..."
                rows={3}
                className={`${inputClass} resize-none`}
              />
            </div>
          </div>
          <button
            type="button"
            className="mt-5 inline-flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-medium text-white"
            style={{ background: 'var(--color-accent-primary)' }}
          >
            <Send className="h-4 w-4" />
            Submit VPN Request
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Software Support topic
// ---------------------------------------------------------------------------

function SoftwareSupportTopic() {
  const [search, setSearch] = useState('');

  const filtered = SOFTWARE_ITEMS.filter(
    (sw) =>
      sw.name.toLowerCase().includes(search.toLowerCase()) ||
      sw.category.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search software catalog..."
          className={`w-full rounded-xl py-2.5 pl-10 pr-4 ${inputClass}`}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {filtered.map((sw) => {
          const lc = LICENSE_CONFIG[sw.licenseStatus];
          return (
            <div
              key={sw.id}
              className="relative overflow-hidden rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] p-5"
              style={panelStyle}
            >
              <div className="flex items-start justify-between gap-3">
                <div
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
                  style={{
                    background: 'var(--color-surface-tertiary)',
                    border: '1px solid var(--color-border-default)',
                  }}
                >
                  <Package className="h-5 w-5 text-[var(--color-accent-primary)]" />
                </div>
                <span
                  className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium"
                  style={{
                    borderColor: lc.color,
                    color: lc.color,
                    background: 'var(--color-surface-primary)',
                  }}
                >
                  <ShieldCheck className="h-3 w-3" />
                  {lc.label}
                </span>
              </div>
              <h3 className="mt-3 text-sm font-semibold text-[var(--color-text-primary)]">
                {sw.name}
              </h3>
              <p className="text-xs text-[var(--color-text-muted)]">
                v{sw.version} — {sw.vendor}
              </p>
              <p className="mt-2 text-xs text-[var(--color-text-secondary)]">{sw.description}</p>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  className="flex-1 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-hover)]"
                >
                  Install
                </button>
                <button
                  type="button"
                  className="flex-1 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)]"
                >
                  Troubleshoot
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hardware Requests topic
// ---------------------------------------------------------------------------

function HardwareRequestsTopic() {
  const [selected, setSelected] = useState<string | null>(null);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [form, setForm] = useState({
    deliveryLocation: '',
    urgency: 'standard',
    justification: '',
  });

  const selectedItem = HARDWARE_ITEMS.find((h) => h.id === selected);

  if (submittedId && selectedItem) {
    return (
      <div className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-3">
          {HARDWARE_ITEMS.map((hw) => {
            const Icon = CATEGORY_ICONS[hw.category] ?? HardDrive;
            return (
              <div
                key={hw.id}
                className="relative overflow-hidden rounded-2xl border bg-[var(--color-surface-secondary)] p-5"
                style={{
                  ...panelStyle,
                  borderColor:
                    hw.id === selected
                      ? 'var(--color-accent-primary)'
                      : 'var(--color-border-default)',
                  opacity: hw.id === selected ? 1 : 0.5,
                }}
              >
                <div className="flex items-center justify-between">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-xl"
                    style={{
                      background: 'var(--color-surface-tertiary)',
                      border: '1px solid var(--color-border-default)',
                    }}
                  >
                    <Icon className="h-5 w-5 text-[var(--color-accent-primary)]" />
                  </div>
                </div>
                <h3 className="mt-3 text-sm font-semibold text-[var(--color-text-primary)]">
                  {hw.name}
                </h3>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">{hw.category}</p>
              </div>
            );
          })}
        </div>

        <div
          className="relative overflow-hidden rounded-2xl border bg-[var(--color-surface-secondary)] p-6"
          style={{ ...panelStyle, borderColor: 'var(--color-status-success)' }}
        >
          <div className="flex items-center gap-4">
            <div
              className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full"
              style={{
                background: 'rgba(78,201,176,0.15)',
                border: '2px solid var(--color-status-success)',
              }}
            >
              <CheckCircle className="h-6 w-6" style={{ color: 'var(--color-status-success)' }} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                Request Submitted
              </h3>
              <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
                Ticket {submittedId} — Manager notified for approval. Expected processing: 5-10
                business days.
              </p>
            </div>
          </div>

          {/* Approval tracker */}
          <div className="mt-6 flex items-start gap-0">
            {[
              { label: 'Submitted', done: true },
              { label: 'Manager Approval', done: false },
              { label: 'IT Processing', done: false },
              { label: 'Delivery', done: false },
            ].map((stage, idx, arr) => (
              <div key={stage.label} className="flex flex-1 items-start">
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-full"
                    style={{
                      background: stage.done
                        ? 'var(--color-status-success)'
                        : 'var(--color-surface-tertiary)',
                      border: `1px solid ${stage.done ? 'var(--color-status-success)' : 'var(--color-border-default)'}`,
                    }}
                  >
                    {stage.done ? (
                      <CheckCircle className="h-4 w-4 text-white" />
                    ) : (
                      <Circle
                        className="h-4 w-4"
                        style={{ color: 'var(--color-text-muted)' }}
                      />
                    )}
                  </div>
                  <span className="text-center text-xs leading-tight text-[var(--color-text-muted)]">
                    {stage.label}
                  </span>
                </div>
                {idx < arr.length - 1 && (
                  <div
                    className="mt-3.5 h-px flex-1"
                    style={{
                      background: stage.done
                        ? 'var(--color-status-success)'
                        : 'var(--color-border-default)',
                    }}
                  />
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              setSubmittedId(null);
              setSelected(null);
              setForm({ deliveryLocation: '', urgency: 'standard', justification: '' });
            }}
            className="mt-5 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] px-4 py-2 text-xs text-[var(--color-text-secondary)]"
          >
            New Request
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-3">
        {HARDWARE_ITEMS.map((hw) => {
          const Icon = CATEGORY_ICONS[hw.category] ?? HardDrive;
          return (
            <button
              key={hw.id}
              type="button"
              onClick={() => setSelected(hw.id === selected ? null : hw.id)}
              className="relative overflow-hidden rounded-2xl border bg-[var(--color-surface-secondary)] p-5 text-left transition-colors"
              style={{
                ...panelStyle,
                borderColor:
                  selected === hw.id
                    ? 'var(--color-accent-primary)'
                    : 'var(--color-border-default)',
              }}
            >
              <div className="flex items-center justify-between">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl"
                  style={{
                    background: 'var(--color-surface-tertiary)',
                    border: '1px solid var(--color-border-default)',
                  }}
                >
                  <Icon className="h-5 w-5 text-[var(--color-accent-primary)]" />
                </div>
                <span
                  className="rounded-full border px-2 py-0.5 text-xs font-medium"
                  style={{
                    borderColor: hw.inStock
                      ? 'var(--color-status-success)'
                      : 'var(--color-status-warning)',
                    color: hw.inStock
                      ? 'var(--color-status-success)'
                      : 'var(--color-status-warning)',
                    background: 'var(--color-surface-primary)',
                  }}
                >
                  {hw.inStock ? 'In Stock' : 'On Order'}
                </span>
              </div>
              <h3 className="mt-3 text-sm font-semibold text-[var(--color-text-primary)]">
                {hw.name}
              </h3>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">{hw.category}</p>
              <p className="mt-2 text-xs text-[var(--color-text-secondary)]">{hw.specs}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                  ${hw.price.toLocaleString()}
                </span>
                <span className="text-xs text-[var(--color-text-muted)]">{hw.leadDays}d lead</span>
              </div>
            </button>
          );
        })}
      </div>

      {selected && (
        <div
          className="relative overflow-hidden rounded-2xl border bg-[var(--color-surface-secondary)] p-6"
          style={{ ...panelStyle, borderColor: 'var(--color-accent-primary)' }}
        >
          <h3 className="mb-4 text-sm font-semibold text-[var(--color-text-primary)]">
            Request: {selectedItem?.name}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[var(--color-text-muted)]">Delivery Location</label>
              <input
                type="text"
                value={form.deliveryLocation}
                onChange={(e) => setForm((f) => ({ ...f, deliveryLocation: e.target.value }))}
                placeholder="Building / Floor / Desk"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[var(--color-text-muted)]">Urgency</label>
              <select
                value={form.urgency}
                onChange={(e) => setForm((f) => ({ ...f, urgency: e.target.value }))}
                className={inputClass}
              >
                <option value="standard">Standard (5-10 days)</option>
                <option value="urgent">Urgent (2-3 days)</option>
                <option value="critical">Critical (Next business day)</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-xs text-[var(--color-text-muted)]">Business Justification</label>
              <textarea
                value={form.justification}
                onChange={(e) => setForm((f) => ({ ...f, justification: e.target.value }))}
                placeholder="Describe the business need for this hardware..."
                rows={2}
                className={`${inputClass} resize-none`}
              />
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() => setSubmittedId(nextTicketId())}
              className="inline-flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-medium text-white"
              style={{ background: 'var(--color-accent-primary)' }}
            >
              <Send className="h-4 w-4" />
              Submit Request
            </button>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] px-4 py-2 text-sm text-[var(--color-text-secondary)]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Incident Logging topic
// ---------------------------------------------------------------------------

const CATEGORIES = [
  'Account/Access',
  'Software Support',
  'Hardware',
  'Network',
  'Email & Calendar',
  'Security',
];

function IncidentLoggingTopic() {
  const [ticketId] = useState(() => nextTicketId());
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    category: 'Account/Access',
    priority: 'medium' as Priority,
    description: '',
  });

  if (submittedId) {
    const pc = PRIORITY_CONFIG[form.priority];
    const responseEst =
      form.priority === 'critical'
        ? '15 min'
        : form.priority === 'high'
          ? '1 hour'
          : form.priority === 'medium'
            ? '4 hours'
            : '8 hours';

    return (
      <div
        className="flex flex-col items-center gap-5 rounded-2xl border bg-[var(--color-surface-secondary)] p-8 text-center"
        style={{ ...panelStyle, borderColor: 'var(--color-status-success)' }}
      >
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full"
          style={{
            background: 'rgba(78,201,176,0.15)',
            border: '2px solid var(--color-status-success)',
          }}
        >
          <CheckCircle className="h-8 w-8" style={{ color: 'var(--color-status-success)' }} />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
            Incident Logged
          </h3>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Your ticket has been created and assigned to the IT support team.
          </p>
        </div>
        <div
          className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] px-8 py-4"
          style={cardStyle}
        >
          <p className="text-xs uppercase tracking-widest text-[var(--color-text-muted)]">
            Ticket ID
          </p>
          <p className="mt-1 text-2xl font-bold text-[var(--color-accent-primary)]">
            {submittedId}
          </p>
          <p className="mt-1 text-xs" style={{ color: pc.color }}>
            {pc.label} priority — Est. response: {responseEst}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSubmittedId(null)}
          className="rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] px-5 py-2 text-sm text-[var(--color-text-secondary)]"
        >
          Log Another Incident
        </button>
      </div>
    );
  }

  const canSubmit = form.title.trim().length > 0 && form.description.trim().length > 0;

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] p-6"
      style={panelStyle}
    >
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
            Log New Incident
          </h3>
          <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">
            Describe your issue and we will route it to the right team.
          </p>
        </div>
        <div
          className="rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] px-3 py-2"
          style={cardStyle}
        >
          <p className="text-xs text-[var(--color-text-muted)]">Auto-ID</p>
          <p className="text-sm font-semibold text-[var(--color-accent-primary)]">{ticketId}</p>
        </div>
      </div>

      <div className="grid gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-[var(--color-text-muted)]">Issue Title</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Brief description of the issue"
            className={inputClass}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[var(--color-text-muted)]">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className={inputClass}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[var(--color-text-muted)]">Priority</label>
            <div className="grid grid-cols-4 gap-1">
              {(['low', 'medium', 'high', 'critical'] as Priority[]).map((p) => {
                const pc = PRIORITY_CONFIG[p];
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, priority: p }))}
                    className="rounded-lg border py-1.5 text-xs font-medium capitalize transition-colors"
                    style={{
                      borderColor:
                        form.priority === p ? pc.color : 'var(--color-border-default)',
                      color: form.priority === p ? pc.color : 'var(--color-text-muted)',
                      background:
                        form.priority === p
                          ? `${pc.color}18`
                          : 'var(--color-surface-tertiary)',
                    }}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-[var(--color-text-muted)]">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Describe the issue in detail — steps to reproduce, error messages, affected systems..."
            rows={4}
            className={`${inputClass} resize-none`}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-[var(--color-text-muted)]">Attachments</label>
          <div className="flex items-center gap-3 rounded-lg border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-tertiary)] px-4 py-3">
            <Paperclip className="h-4 w-4 text-[var(--color-text-muted)]" />
            <span className="flex-1 text-sm text-[var(--color-text-muted)]">
              Drag files here or click Browse — screenshots, logs accepted
            </span>
            <button
              type="button"
              className="rounded-lg border border-[var(--color-border-default)] px-3 py-1 text-xs text-[var(--color-text-secondary)]"
            >
              Browse
            </button>
          </div>
        </div>
      </div>

      <div className="mt-5 flex gap-3">
        <button
          type="button"
          onClick={() => {
            if (canSubmit) setSubmittedId(ticketId);
          }}
          className="inline-flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-medium text-white"
          style={{
            background: canSubmit ? 'var(--color-accent-primary)' : 'var(--color-surface-hover)',
            cursor: canSubmit ? 'pointer' : 'not-allowed',
          }}
        >
          <Send className="h-4 w-4" />
          Submit Incident
        </button>
        <button
          type="button"
          onClick={() =>
            setForm({ title: '', category: 'Account/Access', priority: 'medium', description: '' })
          }
          className="rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] px-4 py-2 text-sm text-[var(--color-text-secondary)]"
        >
          Clear
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// KB Search topic
// ---------------------------------------------------------------------------

function KBSearchTopic() {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<KBArticle>(KB_ARTICLES[0]);
  const [feedback, setFeedback] = useState<Record<string, 'up' | 'down' | null>>({});

  const filtered = query
    ? KB_ARTICLES.filter(
        (a) =>
          a.title.toLowerCase().includes(query.toLowerCase()) ||
          a.category.toLowerCase().includes(query.toLowerCase()),
      )
    : KB_ARTICLES;

  return (
    <div className="flex gap-5">
      {/* Article list */}
      <div className="flex w-72 flex-shrink-0 flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search knowledge base..."
            className={`w-full rounded-xl py-2.5 pl-10 pr-4 ${inputClass}`}
          />
        </div>
        <div className="flex flex-col gap-2">
          {filtered.map((article) => {
            const relevanceColor =
              article.relevance >= 90
                ? 'var(--color-status-success)'
                : article.relevance >= 75
                  ? 'var(--color-status-warning)'
                  : 'var(--color-text-muted)';
            return (
              <button
                key={article.id}
                type="button"
                onClick={() => setSelected(article)}
                className="flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition-colors"
                style={{
                  borderColor:
                    selected.id === article.id
                      ? 'var(--color-accent-primary)'
                      : 'var(--color-border-default)',
                  background:
                    selected.id === article.id
                      ? 'rgba(0,120,212,0.08)'
                      : 'var(--color-surface-secondary)',
                }}
              >
                <div className="flex w-full items-start justify-between gap-2">
                  <span className="text-xs font-medium leading-snug text-[var(--color-text-primary)]">
                    {article.title}
                  </span>
                  <span className="flex-shrink-0 text-xs font-semibold" style={{ color: relevanceColor }}>
                    {article.relevance}%
                  </span>
                </div>
                <div className="h-1 w-full rounded-full bg-[var(--color-surface-tertiary)]">
                  <div
                    className="h-1 rounded-full"
                    style={{ width: `${article.relevance}%`, background: relevanceColor }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-[var(--color-border-subtle)] px-2 py-0.5 text-xs text-[var(--color-text-muted)]">
                    {article.id}
                  </span>
                  <span className="text-xs text-[var(--color-text-muted)]">{article.category}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Article detail */}
      <div
        className="relative flex-1 overflow-hidden rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] p-6"
        style={panelStyle}
      >
        <p className="text-xs uppercase tracking-widest text-[var(--color-text-muted)]">
          {selected.id} — {selected.category}
        </p>
        <h3 className="mt-1 text-base font-semibold text-[var(--color-text-primary)]">
          {selected.title}
        </h3>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{selected.preview}</p>

        <div className="mt-5 flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            Step-by-Step Instructions
          </p>
          {selected.steps.map((step, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-tertiary)] p-3"
              style={cardStyle}
            >
              <div
                className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                style={{ background: 'var(--color-accent-primary)', color: '#fff' }}
              >
                {idx + 1}
              </div>
              <p className="text-sm text-[var(--color-text-secondary)]">{step}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-center gap-4">
          <p className="text-sm text-[var(--color-text-secondary)]">Was this article helpful?</p>
          <button
            type="button"
            onClick={() => setFeedback((f) => ({ ...f, [selected.id]: 'up' }))}
            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-colors"
            style={{
              borderColor:
                feedback[selected.id] === 'up'
                  ? 'var(--color-status-success)'
                  : 'var(--color-border-default)',
              color:
                feedback[selected.id] === 'up'
                  ? 'var(--color-status-success)'
                  : 'var(--color-text-secondary)',
              background:
                feedback[selected.id] === 'up'
                  ? 'rgba(78,201,176,0.1)'
                  : 'var(--color-surface-tertiary)',
            }}
          >
            <ThumbsUp className="h-3.5 w-3.5" />
            {selected.helpful + (feedback[selected.id] === 'up' ? 1 : 0)}
          </button>
          <button
            type="button"
            onClick={() => setFeedback((f) => ({ ...f, [selected.id]: 'down' }))}
            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-colors"
            style={{
              borderColor:
                feedback[selected.id] === 'down'
                  ? 'var(--color-status-error)'
                  : 'var(--color-border-default)',
              color:
                feedback[selected.id] === 'down'
                  ? 'var(--color-status-error)'
                  : 'var(--color-text-secondary)',
              background:
                feedback[selected.id] === 'down'
                  ? 'rgba(244,71,71,0.1)'
                  : 'var(--color-surface-tertiary)',
            }}
          >
            <ThumbsDown className="h-3.5 w-3.5" />
            {selected.notHelpful + (feedback[selected.id] === 'down' ? 1 : 0)}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

const TOPIC_LABELS: Record<TopicId, string> = {
  account: 'Account & Access',
  software: 'Software Support',
  hardware: 'Hardware Requests',
  incident: 'Log Incident',
  kb: 'KB Search',
};

export function ITHelpDesk() {
  const [activeTopic, setActiveTopic] = useState<TopicId>('account');
  const [kbSearch, setKbSearch] = useState('');
  const [slaSeconds, setSlaSeconds] = useState(847); // ~14 min response SLA
  const [resSeconds, setResSeconds] = useState(3612); // ~1 h resolution SLA

  useEffect(() => {
    const timer = setInterval(() => {
      setSlaSeconds((s) => Math.max(0, s - 1));
      setResSeconds((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const openTickets = TICKETS.filter((t) => t.status !== 'resolved').length;

  return (
    <div
      className="flex h-full flex-col overflow-hidden bg-[var(--color-surface-primary)] text-[var(--color-text-primary)]"
      style={{ fontFamily: 'var(--font-family-sans)' }}
    >
      {/* ------------------------------------------------------------------ */}
      {/* Top bar                                                             */}
      {/* ------------------------------------------------------------------ */}
      <header
        className="flex h-14 flex-shrink-0 items-center gap-4 border-b border-[var(--color-border-subtle)] px-5"
        style={{
          background: 'var(--color-surface-secondary)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}
      >
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{
              background: 'linear-gradient(135deg, #0078d4, #005a9e)',
              boxShadow: '0 4px 10px rgba(0,120,212,0.4)',
            }}
          >
            <Headphones className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">IT Help Desk</p>
            <p className="text-xs text-[var(--color-text-muted)]">L1 Support — Copilot Studio</p>
          </div>
        </div>

        {/* KB Search bar */}
        <div className="mx-4 flex flex-1 items-center gap-2 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] px-3 py-2">
          <Search className="h-4 w-4 flex-shrink-0 text-[var(--color-text-muted)]" />
          <input
            type="text"
            value={kbSearch}
            onChange={(e) => setKbSearch(e.target.value)}
            placeholder="Search KB articles, tickets, software..."
            className="flex-1 bg-transparent text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none"
          />
          <kbd className="rounded border border-[var(--color-border-default)] px-1.5 py-0.5 text-xs text-[var(--color-text-muted)]">
            Ctrl K
          </kbd>
        </div>

        {/* Notifications + user */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] transition-colors hover:bg-[var(--color-surface-hover)]"
          >
            <Bell className="h-4 w-4 text-[var(--color-text-secondary)]" />
            <span
              className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full text-xs font-semibold text-white"
              style={{ background: 'var(--color-status-error)' }}
            >
              3
            </span>
          </button>
          <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] px-3 py-1.5">
            <div
              className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold text-white"
              style={{ background: 'var(--color-accent-primary)' }}
            >
              JD
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-medium text-[var(--color-text-primary)]">Jane Doe</p>
              <p className="text-xs text-[var(--color-text-muted)]">All Employees</p>
            </div>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* Body                                                                */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left Sidebar */}
        <aside
          className="flex w-52 flex-shrink-0 flex-col border-r border-[var(--color-border-subtle)] py-4"
          style={{ background: 'var(--color-surface-secondary)' }}
        >
          <p className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            Topics
          </p>
          <nav className="flex flex-col gap-1 px-2">
            {TOPIC_NAV.map(({ id, label, Icon, count }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTopic(id)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors"
                style={{
                  background:
                    activeTopic === id ? 'rgba(0,120,212,0.15)' : 'transparent',
                  color:
                    activeTopic === id
                      ? 'var(--color-accent-primary)'
                      : 'var(--color-text-secondary)',
                  borderLeft:
                    activeTopic === id
                      ? '2px solid var(--color-accent-primary)'
                      : '2px solid transparent',
                }}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1 font-medium">{label}</span>
                {count > 0 && (
                  <span
                    className="rounded-full px-1.5 py-0.5 text-xs font-semibold"
                    style={{
                      background:
                        activeTopic === id
                          ? 'var(--color-accent-primary)'
                          : 'var(--color-surface-tertiary)',
                      color: activeTopic === id ? '#fff' : 'var(--color-text-muted)',
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Channel status */}
          <div className="mt-auto border-t border-[var(--color-border-subtle)] px-4 pt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              Channels
            </p>
            <div className="flex flex-col gap-2">
              {[
                { label: 'Microsoft Teams', active: true },
                { label: 'Web Chat', active: true },
              ].map(({ label, active }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs text-[var(--color-text-secondary)]">{label}</span>
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{
                      background: active
                        ? 'var(--color-status-success)'
                        : 'var(--color-status-error)',
                      boxShadow: active ? '0 0 5px var(--color-status-success)' : 'none',
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* ServiceNow / Jira integration status */}
          <div className="px-4 pt-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              Integrations
            </p>
            <div className="flex flex-col gap-2">
              {[
                { label: 'ServiceNow', connected: true },
                { label: 'Jira', connected: true },
              ].map(({ label, connected }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs text-[var(--color-text-secondary)]">{label}</span>
                  <span
                    className="text-xs font-medium"
                    style={{
                      color: connected
                        ? 'var(--color-status-success)'
                        : 'var(--color-status-error)',
                    }}
                  >
                    {connected ? 'Live' : 'Down'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto p-5">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
                {TOPIC_LABELS[activeTopic]}
              </h2>
              <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                IT Help Desk — ServiceNow and Jira integrated
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)]"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Sync
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-medium text-white"
                style={{ background: 'var(--color-accent-primary)' }}
              >
                <Plus className="h-3.5 w-3.5" />
                New Ticket
              </button>
            </div>
          </div>

          {activeTopic === 'account' && <AccountAccessTopic />}
          {activeTopic === 'software' && <SoftwareSupportTopic />}
          {activeTopic === 'hardware' && <HardwareRequestsTopic />}
          {activeTopic === 'incident' && <IncidentLoggingTopic />}
          {activeTopic === 'kb' && <KBSearchTopic />}
        </main>

        {/* ---------------------------------------------------------------- */}
        {/* Right panel — active ticket queue                                */}
        {/* ---------------------------------------------------------------- */}
        <aside
          className="flex w-72 flex-shrink-0 flex-col border-l border-[var(--color-border-subtle)]"
          style={{ background: 'var(--color-surface-secondary)' }}
        >
          <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] px-4 py-3">
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">Active Queue</p>
            <span
              className="rounded-full px-2 py-0.5 text-xs font-semibold text-white"
              style={{ background: 'var(--color-accent-primary)' }}
            >
              {openTickets}
            </span>
          </div>

          <div className="flex flex-1 flex-col gap-2 overflow-auto p-3">
            {TICKETS.map((ticket) => {
              const sc = TICKET_STATUS_CONFIG[ticket.status];
              const pc = PRIORITY_CONFIG[ticket.priority];
              return (
                <div
                  key={ticket.id}
                  className="relative overflow-hidden rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] p-3 transition-colors hover:bg-[var(--color-surface-hover)]"
                  style={cardStyle}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[var(--color-text-muted)]">
                      {ticket.id}
                    </span>
                    <span
                      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium"
                      style={{
                        borderColor: sc.color,
                        color: sc.color,
                        background: 'var(--color-surface-primary)',
                      }}
                    >
                      {ticket.status === 'new' && <Circle className="h-2.5 w-2.5" />}
                      {ticket.status === 'in-progress' && <Clock className="h-2.5 w-2.5" />}
                      {ticket.status === 'waiting' && <AlertCircle className="h-2.5 w-2.5" />}
                      {ticket.status === 'resolved' && <CheckCircle className="h-2.5 w-2.5" />}
                      {sc.label}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs font-medium leading-snug text-[var(--color-text-primary)]">
                    {ticket.title}
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">{ticket.submitter}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs font-medium" style={{ color: pc.color }}>
                      {pc.label}
                    </span>
                    <span className="text-xs text-[var(--color-text-muted)]">
                      {ticket.updated}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-[var(--color-border-subtle)] p-3">
            <button
              type="button"
              className="w-full rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] py-2 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)]"
            >
              View All Tickets
            </button>
          </div>
        </aside>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Bottom bar — SLA timers + agent availability                        */}
      {/* ------------------------------------------------------------------ */}
      <footer
        className="flex h-10 flex-shrink-0 items-center justify-between border-t border-[var(--color-border-subtle)] px-5"
        style={{ background: 'var(--color-surface-secondary)' }}
      >
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-1.5">
            <Timer
              className="h-3.5 w-3.5"
              style={{
                color:
                  slaSeconds < 300
                    ? 'var(--color-status-error)'
                    : 'var(--color-status-warning)',
              }}
            />
            <span className="text-xs text-[var(--color-text-muted)]">Response SLA:</span>
            <span
              className="text-xs font-semibold tabular-nums"
              style={{
                color:
                  slaSeconds < 300
                    ? 'var(--color-status-error)'
                    : 'var(--color-status-warning)',
              }}
            >
              {formatTime(slaSeconds)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
            <span className="text-xs text-[var(--color-text-muted)]">Resolution SLA:</span>
            <span className="text-xs font-semibold tabular-nums text-[var(--color-status-info)]">
              {formatTime(resSeconds)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-5">
          <div className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{
                background: 'var(--color-status-success)',
                boxShadow: '0 0 6px var(--color-status-success)',
              }}
            />
            <span className="text-xs text-[var(--color-text-secondary)]">Agent Online</span>
          </div>
          <div className="flex items-center gap-1.5">
            <UserCheck className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
            <span className="text-xs text-[var(--color-text-muted)]">3 agents available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Headphones className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
            <span className="text-xs text-[var(--color-text-muted)]">
              ServiceNow · Jira connected
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
