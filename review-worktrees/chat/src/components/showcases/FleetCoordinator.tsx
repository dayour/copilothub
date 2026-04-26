import { useState, useEffect, useRef, type CSSProperties } from 'react';
import {
  Truck,
  AlertTriangle,
  Clock,
  Calendar,
  Shield,
  FileText,
  MapPin,
  Navigation,
  Wrench,
  Search,
  Bell,
  Activity,
  Plus,
  Fuel,
  Info,
  Car,
  Users,
  Flag,
  RefreshCw,
  Camera,
  Filter,
} from 'lucide-react';

// ===== TYPES =====

type Topic = 'scheduling' | 'maintenance' | 'compliance' | 'incidents' | 'routes';
type VehicleStatus = 'active' | 'maintenance' | 'idle';
type AlertSeverity = 'Critical' | 'Warning' | 'Info';
type AlertStatus = 'pending' | 'scheduled' | 'deferred' | 'completed';
type ComplianceStatus = 'current' | 'expiring' | 'expired';
type IncidentType = 'Accident' | 'Breakdown' | 'Theft' | 'Damage';
type IncidentSeverity = 'Low' | 'Medium' | 'High' | 'Critical';
type IncidentStatus = 'open' | 'investigating' | 'resolved';
type TrafficCondition = 'clear' | 'moderate' | 'heavy';

interface Vehicle {
  id: string;
  model: string;
  year: number;
  driver: string;
  status: VehicleStatus;
  mileage: number;
  location: string;
  utilization: number;
  plate: string;
}

interface ScheduleEntry {
  vehicleId: string;
  day: string;
  route: string;
  driver: string;
}

interface MaintenanceAlert {
  id: string;
  vehicleId: string;
  type: string;
  severity: AlertSeverity;
  dueDate: string;
  mileageTrigger: number;
  currentMileage: number;
  status: AlertStatus;
}

interface ComplianceRecord {
  vehicleId: string;
  inspection: ComplianceStatus;
  registration: ComplianceStatus;
  insurance: ComplianceStatus;
  driverLicense: ComplianceStatus;
}

interface Incident {
  id: string;
  type: IncidentType;
  severity: IncidentSeverity;
  vehicleId: string;
  driver: string;
  location: string;
  timestamp: string;
  status: IncidentStatus;
  description: string;
}

interface Waypoint {
  id: string;
  name: string;
  eta: string;
  stopType: 'depot' | 'stop' | 'fuel' | 'destination';
}

interface RouteData {
  vehicleId: string;
  origin: string;
  destination: string;
  waypoints: Waypoint[];
  distance: string;
  estimatedTime: string;
  trafficCondition: TrafficCondition;
  fuelStops: string[];
}

interface IncidentFormState {
  type: IncidentType;
  severity: IncidentSeverity;
  vehicleId: string;
  location: string;
  description: string;
}

// ===== SEED DATA =====

const VEHICLES: Vehicle[] = [
  { id: 'VH-001', model: 'Ford Transit', year: 2022, driver: 'James Okafor', status: 'active', mileage: 45823, location: 'Route 7-North', utilization: 87, plate: 'FLT-7821' },
  { id: 'VH-002', model: 'Chevy Express', year: 2021, driver: 'Maria Santos', status: 'active', mileage: 62104, location: 'Route 12-East', utilization: 92, plate: 'FLT-4432' },
  { id: 'VH-003', model: 'Mercedes Sprinter', year: 2023, driver: 'David Kim', status: 'maintenance', mileage: 31250, location: 'Service Bay 1', utilization: 0, plate: 'FLT-9003' },
  { id: 'VH-004', model: 'Ford F-250', year: 2020, driver: 'Priya Sharma', status: 'active', mileage: 78430, location: 'Highway 44', utilization: 74, plate: 'FLT-2215' },
  { id: 'VH-005', model: 'Ram ProMaster', year: 2022, driver: 'Carlos Reyes', status: 'idle', mileage: 19850, location: 'Central Depot', utilization: 0, plate: 'FLT-6610' },
  { id: 'VH-006', model: 'Isuzu NPR', year: 2019, driver: 'Amber Chen', status: 'active', mileage: 95600, location: 'Route 3-South', utilization: 68, plate: 'FLT-3387' },
  { id: 'VH-007', model: 'Ford Transit', year: 2023, driver: 'Tyler Brooks', status: 'active', mileage: 12340, location: 'Route 8-West', utilization: 95, plate: 'FLT-1124' },
  { id: 'VH-008', model: 'GMC Savana', year: 2021, driver: 'Nina Patel', status: 'maintenance', mileage: 53780, location: 'Service Bay 2', utilization: 0, plate: 'FLT-8856' },
  { id: 'VH-009', model: 'Ram 1500', year: 2022, driver: 'Omar Saleh', status: 'active', mileage: 34120, location: 'Route 15-North', utilization: 81, plate: 'FLT-5512' },
  { id: 'VH-010', model: 'Ford E-350', year: 2020, driver: 'Lisa Wang', status: 'idle', mileage: 67890, location: 'Central Depot', utilization: 0, plate: 'FLT-7743' },
  { id: 'VH-011', model: 'Chevy Silverado', year: 2023, driver: 'Marcus Hill', status: 'active', mileage: 8920, location: 'Route 6-Central', utilization: 78, plate: 'FLT-2298' },
  { id: 'VH-012', model: 'Dodge Durango', year: 2021, driver: 'Sofia Torres', status: 'active', mileage: 43670, location: 'Route 2-East', utilization: 88, plate: 'FLT-9931' },
];

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const WEEK_DAY_LABELS = ['Mon 7', 'Tue 8', 'Wed 9', 'Thu 10', 'Fri 11', 'Sat 12', 'Sun 13'];

const SCHEDULE: ScheduleEntry[] = [
  { vehicleId: 'VH-001', day: 'Mon', route: 'Route 7-N', driver: 'J. Okafor' },
  { vehicleId: 'VH-002', day: 'Mon', route: 'Route 12-E', driver: 'M. Santos' },
  { vehicleId: 'VH-004', day: 'Mon', route: 'Hwy 44', driver: 'P. Sharma' },
  { vehicleId: 'VH-007', day: 'Mon', route: 'Route 8-W', driver: 'T. Brooks' },
  { vehicleId: 'VH-009', day: 'Mon', route: 'Route 15-N', driver: 'O. Saleh' },
  { vehicleId: 'VH-011', day: 'Mon', route: 'Route 6-C', driver: 'M. Hill' },
  { vehicleId: 'VH-012', day: 'Mon', route: 'Route 2-E', driver: 'S. Torres' },
  { vehicleId: 'VH-001', day: 'Tue', route: 'Route 7-N', driver: 'J. Okafor' },
  { vehicleId: 'VH-002', day: 'Tue', route: 'Route 12-E', driver: 'M. Santos' },
  { vehicleId: 'VH-006', day: 'Tue', route: 'Route 3-S', driver: 'A. Chen' },
  { vehicleId: 'VH-007', day: 'Tue', route: 'Route 8-W', driver: 'T. Brooks' },
  { vehicleId: 'VH-009', day: 'Tue', route: 'Route 15-N', driver: 'O. Saleh' },
  { vehicleId: 'VH-012', day: 'Tue', route: 'Route 2-E', driver: 'S. Torres' },
  { vehicleId: 'VH-001', day: 'Wed', route: 'Route 7-N', driver: 'J. Okafor' },
  { vehicleId: 'VH-004', day: 'Wed', route: 'Hwy 44', driver: 'P. Sharma' },
  { vehicleId: 'VH-006', day: 'Wed', route: 'Route 3-S', driver: 'A. Chen' },
  { vehicleId: 'VH-009', day: 'Wed', route: 'Route 15-N', driver: 'O. Saleh' },
  { vehicleId: 'VH-011', day: 'Wed', route: 'Route 6-C', driver: 'M. Hill' },
  { vehicleId: 'VH-012', day: 'Wed', route: 'Route 2-E', driver: 'S. Torres' },
  { vehicleId: 'VH-002', day: 'Thu', route: 'Route 12-E', driver: 'M. Santos' },
  { vehicleId: 'VH-004', day: 'Thu', route: 'Hwy 44', driver: 'P. Sharma' },
  { vehicleId: 'VH-006', day: 'Thu', route: 'Route 3-S', driver: 'A. Chen' },
  { vehicleId: 'VH-007', day: 'Thu', route: 'Route 8-W', driver: 'T. Brooks' },
  { vehicleId: 'VH-011', day: 'Thu', route: 'Route 6-C', driver: 'M. Hill' },
  { vehicleId: 'VH-012', day: 'Thu', route: 'Route 2-E', driver: 'S. Torres' },
  { vehicleId: 'VH-001', day: 'Fri', route: 'Route 7-N', driver: 'J. Okafor' },
  { vehicleId: 'VH-002', day: 'Fri', route: 'Route 12-E', driver: 'M. Santos' },
  { vehicleId: 'VH-004', day: 'Fri', route: 'Hwy 44', driver: 'P. Sharma' },
  { vehicleId: 'VH-007', day: 'Fri', route: 'Route 8-W', driver: 'T. Brooks' },
  { vehicleId: 'VH-009', day: 'Fri', route: 'Route 15-N', driver: 'O. Saleh' },
  { vehicleId: 'VH-009', day: 'Sat', route: 'Route 15-N', driver: 'O. Saleh' },
  { vehicleId: 'VH-012', day: 'Sat', route: 'Route 2-E', driver: 'S. Torres' },
];

const INITIAL_ALERTS: MaintenanceAlert[] = [
  { id: 'MA-001', vehicleId: 'VH-003', type: 'Engine Service', severity: 'Critical', dueDate: 'Oct 15, 2024', mileageTrigger: 32000, currentMileage: 31250, status: 'pending' },
  { id: 'MA-002', vehicleId: 'VH-006', type: 'Brake Inspection', severity: 'Warning', dueDate: 'Oct 28, 2024', mileageTrigger: 96000, currentMileage: 95600, status: 'pending' },
  { id: 'MA-003', vehicleId: 'VH-008', type: 'Transmission Fluid', severity: 'Critical', dueDate: 'Oct 10, 2024', mileageTrigger: 54000, currentMileage: 53780, status: 'scheduled' },
  { id: 'MA-004', vehicleId: 'VH-010', type: 'Tire Rotation', severity: 'Warning', dueDate: 'Nov 5, 2024', mileageTrigger: 68000, currentMileage: 67890, status: 'pending' },
  { id: 'MA-005', vehicleId: 'VH-004', type: 'Oil Change', severity: 'Info', dueDate: 'Nov 20, 2024', mileageTrigger: 79000, currentMileage: 78430, status: 'pending' },
];

const COMPLIANCE: ComplianceRecord[] = [
  { vehicleId: 'VH-001', inspection: 'current', registration: 'current', insurance: 'current', driverLicense: 'current' },
  { vehicleId: 'VH-002', inspection: 'current', registration: 'expiring', insurance: 'current', driverLicense: 'current' },
  { vehicleId: 'VH-003', inspection: 'expiring', registration: 'current', insurance: 'current', driverLicense: 'current' },
  { vehicleId: 'VH-004', inspection: 'current', registration: 'current', insurance: 'expired', driverLicense: 'current' },
  { vehicleId: 'VH-005', inspection: 'current', registration: 'current', insurance: 'current', driverLicense: 'expiring' },
  { vehicleId: 'VH-006', inspection: 'current', registration: 'current', insurance: 'current', driverLicense: 'current' },
  { vehicleId: 'VH-007', inspection: 'current', registration: 'current', insurance: 'current', driverLicense: 'current' },
  { vehicleId: 'VH-008', inspection: 'expiring', registration: 'current', insurance: 'current', driverLicense: 'current' },
  { vehicleId: 'VH-009', inspection: 'current', registration: 'current', insurance: 'current', driverLicense: 'current' },
  { vehicleId: 'VH-010', inspection: 'current', registration: 'current', insurance: 'current', driverLicense: 'current' },
  { vehicleId: 'VH-011', inspection: 'current', registration: 'current', insurance: 'current', driverLicense: 'current' },
  { vehicleId: 'VH-012', inspection: 'current', registration: 'current', insurance: 'current', driverLicense: 'current' },
];

const INITIAL_INCIDENTS: Incident[] = [
  {
    id: 'INC-2847',
    type: 'Accident',
    severity: 'High',
    vehicleId: 'VH-004',
    driver: 'Priya Sharma',
    location: 'Downtown Blvd & 5th Ave',
    timestamp: 'Oct 8, 2024 14:23',
    status: 'open',
    description: 'Minor rear-end collision at intersection. No injuries reported. Damage to rear bumper and tow hitch.',
  },
  {
    id: 'INC-2848',
    type: 'Breakdown',
    severity: 'Medium',
    vehicleId: 'VH-006',
    driver: 'Amber Chen',
    location: 'I-44 Mile Marker 127',
    timestamp: 'Oct 9, 2024 09:15',
    status: 'investigating',
    description: 'Engine overheating warning triggered. Vehicle pulled to shoulder. Roadside assistance dispatched.',
  },
];

const ROUTE_DATA: RouteData = {
  vehicleId: 'VH-001',
  origin: 'Central Depot, 1240 Industrial Blvd',
  destination: 'Northfield Distribution Center, 7800 Commerce Park',
  waypoints: [
    { id: 'WP-1', name: 'East Side Transfer Hub', eta: '08:45 AM', stopType: 'stop' },
    { id: 'WP-2', name: 'Riverside Gas Station', eta: '09:30 AM', stopType: 'fuel' },
    { id: 'WP-3', name: 'Metro Sorting Facility', eta: '10:15 AM', stopType: 'stop' },
    { id: 'WP-4', name: 'Northfield Distribution Center', eta: '11:20 AM', stopType: 'destination' },
  ],
  distance: '87.4 mi',
  estimatedTime: '3h 45m',
  trafficCondition: 'moderate',
  fuelStops: ['Riverside Gas Station (MP 34)', 'Shell on Commerce Way (MP 72)'],
};

const TICKER_EVENTS: string[] = [
  'VH-001 departed Central Depot at 07:02 AM',
  'VH-007 completed delivery checkpoint on Route 8-West',
  'MA-003 (VH-008 Transmission Fluid) scheduled for Oct 10',
  'INC-2848 roadside assist dispatched to I-44 MM-127',
  'VH-002 crossing Route 12 intersection — ETA 09:45 AM',
  'VH-011 fuel level at 28% — fuel stop recommended',
  'Compliance alert: VH-004 insurance expires in 12 days',
  'VH-012 completed Route 2-East morning run',
  'Fleet utilization at 78% — above weekly target',
  'VH-005 available for dispatch from Central Depot',
];

// ===== VEHICLE COLOR PALETTE =====

const VEHICLE_COLORS: Record<string, string> = {
  'VH-001': '#4ec9b0',
  'VH-002': '#569cd6',
  'VH-004': '#dcdcaa',
  'VH-006': '#ce9178',
  'VH-007': '#9cdcfe',
  'VH-009': '#c586c0',
  'VH-011': '#4fc1ff',
  'VH-012': '#b5cea8',
};

// ===== SHARED STYLES =====

const cardStyle: CSSProperties = {
  boxShadow: '0 12px 24px rgba(0,0,0,0.3), 0 4px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.07)',
};

const panelStyle: CSSProperties = {
  boxShadow: '0 20px 36px rgba(0,0,0,0.35), 0 6px 12px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.08)',
};

// ===== SUB-COMPONENTS =====

function SchedulingView() {
  const scheduleMap = new Map<string, Map<string, ScheduleEntry>>();
  for (const entry of SCHEDULE) {
    if (!scheduleMap.has(entry.vehicleId)) scheduleMap.set(entry.vehicleId, new Map());
    scheduleMap.get(entry.vehicleId)!.set(entry.day, entry);
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Vehicle Scheduling</h2>
          <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">
            Week of Oct 7 – 13, 2024 · {new Set(SCHEDULE.map(s => s.vehicleId)).size} vehicles assigned
          </p>
        </div>
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] px-3 py-2 text-xs font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-hover)]"
        >
          <Plus className="h-3.5 w-3.5" />
          Assign Vehicle
        </button>
      </div>

      <div
        className="overflow-hidden rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)]"
        style={panelStyle}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border-default)' }}>
                <th className="w-32 px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Vehicle
                </th>
                {WEEK_DAY_LABELS.map((label) => (
                  <th
                    key={label}
                    className="px-2 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]"
                  >
                    {label}
                  </th>
                ))}
                <th className="w-20 px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Util
                </th>
              </tr>
            </thead>
            <tbody>
              {VEHICLES.map((vehicle, rowIdx) => {
                const rowMap = scheduleMap.get(vehicle.id);
                const assignedCount = rowMap ? rowMap.size : 0;
                const utilPct =
                  vehicle.status === 'maintenance'
                    ? 0
                    : vehicle.status === 'idle'
                      ? 0
                      : Math.round((assignedCount / 5) * 100);
                const accentColor = VEHICLE_COLORS[vehicle.id] ?? 'var(--color-text-muted)';

                return (
                  <tr
                    key={vehicle.id}
                    style={{
                      borderBottom:
                        rowIdx < VEHICLES.length - 1
                          ? '1px solid var(--color-border-subtle)'
                          : 'none',
                    }}
                  >
                    <td className="px-4 py-2.5">
                      <p className="text-xs font-semibold text-[var(--color-text-primary)]">{vehicle.id}</p>
                      <p className="text-[10px] text-[var(--color-text-muted)]">{vehicle.model}</p>
                    </td>

                    {WEEK_DAYS.map((day) => {
                      const entry = rowMap?.get(day);
                      return (
                        <td key={day} className="px-2 py-2">
                          {entry !== undefined ? (
                            <div
                              className="rounded-md px-2 py-1 text-[10px] leading-tight"
                              style={{
                                background: `${accentColor}1a`,
                                border: `1px solid ${accentColor}44`,
                                color: accentColor,
                              }}
                            >
                              <p className="truncate font-medium">{entry.route}</p>
                              <p className="truncate opacity-70">{entry.driver}</p>
                            </div>
                          ) : vehicle.status === 'maintenance' ? (
                            <div
                              className="rounded-md px-2 py-1 text-[10px]"
                              style={{
                                background: 'rgba(220,220,170,0.08)',
                                border: '1px solid rgba(220,220,170,0.2)',
                                color: 'var(--color-status-warning)',
                              }}
                            >
                              <p className="font-medium">Maint.</p>
                            </div>
                          ) : (
                            <span className="text-xs text-[var(--color-border-strong)]">—</span>
                          )}
                        </td>
                      );
                    })}

                    <td className="px-3 py-2">
                      <span
                        className="block text-xs font-semibold"
                        style={{
                          color:
                            utilPct >= 80
                              ? 'var(--color-status-success)'
                              : utilPct >= 40
                                ? 'var(--color-status-info)'
                                : 'var(--color-status-warning)',
                        }}
                      >
                        {utilPct}%
                      </span>
                      <div className="mt-1 h-1.5 w-full rounded-full bg-[var(--color-surface-primary)]">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${utilPct}%`,
                            background:
                              utilPct >= 80
                                ? 'var(--color-status-success)'
                                : utilPct >= 40
                                  ? 'var(--color-status-info)'
                                  : 'var(--color-status-warning)',
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ----

interface MaintenanceViewProps {
  alerts: MaintenanceAlert[];
  onAction: (id: string, status: AlertStatus) => void;
}

function MaintenanceView({ alerts, onAction }: MaintenanceViewProps) {
  const severityCfg: Record<AlertSeverity, { color: string; bg: string; Icon: typeof AlertTriangle }> = {
    Critical: { color: 'var(--color-status-error)', bg: 'rgba(244,71,71,0.1)', Icon: AlertTriangle },
    Warning: { color: 'var(--color-status-warning)', bg: 'rgba(220,220,170,0.1)', Icon: AlertTriangle },
    Info: { color: 'var(--color-status-info)', bg: 'rgba(86,156,214,0.1)', Icon: Info },
  };

  const statusLabels: Record<AlertStatus, string> = {
    pending: 'Pending',
    scheduled: 'Scheduled',
    deferred: 'Deferred',
    completed: 'Completed',
  };

  const pendingCount = alerts.filter((a) => a.status === 'pending').length;

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Maintenance Alerts</h2>
          <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">
            {pendingCount} pending · sorted by severity
          </p>
        </div>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] px-3 py-2 text-xs text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)]"
        >
          <Filter className="h-3.5 w-3.5" />
          Filter
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {alerts.map((alert) => {
          const cfg = severityCfg[alert.severity];
          const AlertIcon = cfg.Icon;
          const vehicle = VEHICLES.find((v) => v.id === alert.vehicleId);
          const mileageLeft = alert.mileageTrigger - alert.currentMileage;
          const mileagePct = Math.min((alert.currentMileage / alert.mileageTrigger) * 100, 100);

          return (
            <div
              key={alert.id}
              className="overflow-hidden rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)]"
              style={cardStyle}
            >
              <div className="flex items-stretch">
                <div className="w-1 flex-shrink-0" style={{ background: cfg.color }} />
                <div className="flex-1 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg"
                        style={{ background: cfg.bg }}
                      >
                        <AlertIcon className="h-5 w-5" style={{ color: cfg.color }} />
                      </div>
                      <div>
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                            {alert.type}
                          </span>
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                            style={{
                              background: cfg.bg,
                              color: cfg.color,
                              border: `1px solid ${cfg.color}44`,
                            }}
                          >
                            {alert.severity}
                          </span>
                          <span className="rounded-full border border-[var(--color-border-default)] px-2 py-0.5 text-[10px] text-[var(--color-text-muted)]">
                            {statusLabels[alert.status]}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--color-text-secondary)]">
                          <span className="flex items-center gap-1">
                            <Truck className="h-3 w-3" />
                            {alert.vehicleId} · {vehicle?.model ?? 'Unknown'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Due {alert.dueDate}
                          </span>
                          <span className="flex items-center gap-1">
                            <Activity className="h-3 w-3" />
                            {mileageLeft.toLocaleString()} mi remaining
                          </span>
                        </div>
                      </div>
                    </div>

                    {alert.status === 'pending' && (
                      <div className="flex flex-shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onAction(alert.id, 'scheduled')}
                          className="rounded-lg border border-[var(--color-accent-primary)] bg-[rgba(0,120,212,0.1)] px-3 py-1.5 text-xs font-medium text-[var(--color-accent-primary)] transition-colors hover:bg-[rgba(0,120,212,0.2)]"
                        >
                          Schedule
                        </button>
                        <button
                          type="button"
                          onClick={() => onAction(alert.id, 'deferred')}
                          className="rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)]"
                        >
                          Defer
                        </button>
                        <button
                          type="button"
                          onClick={() => onAction(alert.id, 'completed')}
                          className="rounded-lg border border-[var(--color-status-success)] bg-[rgba(78,201,176,0.1)] px-3 py-1.5 text-xs font-medium text-[var(--color-status-success)] transition-colors hover:bg-[rgba(78,201,176,0.2)]"
                        >
                          Complete
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex items-center gap-3">
                    <span className="w-20 flex-shrink-0 text-[11px] text-[var(--color-text-muted)]">Mileage</span>
                    <div className="h-1.5 flex-1 rounded-full bg-[var(--color-surface-primary)]">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${mileagePct}%`, background: cfg.color }}
                      />
                    </div>
                    <span className="w-36 flex-shrink-0 text-right text-[11px] text-[var(--color-text-muted)]">
                      {alert.currentMileage.toLocaleString()} / {alert.mileageTrigger.toLocaleString()} mi
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ----

const COMPLIANCE_COLUMNS: { key: keyof Omit<ComplianceRecord, 'vehicleId'>; label: string }[] = [
  { key: 'inspection', label: 'Inspection' },
  { key: 'registration', label: 'Registration' },
  { key: 'insurance', label: 'Insurance' },
  { key: 'driverLicense', label: 'Driver License' },
];

const COMPLIANCE_STATUS_CFG: Record<ComplianceStatus, { label: string; color: string }> = {
  current: { label: 'Current', color: 'var(--color-status-success)' },
  expiring: { label: 'Expiring', color: 'var(--color-status-warning)' },
  expired: { label: 'Expired', color: 'var(--color-status-error)' },
};

function ComplianceView() {
  const [selected, setSelected] = useState<string[]>([]);

  const totalIssues = COMPLIANCE.flatMap((c) =>
    COMPLIANCE_COLUMNS.map((col) => c[col.key]),
  ).filter((s) => s !== 'current').length;

  const toggleOne = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const toggleAll = () =>
    setSelected((prev) => (prev.length === VEHICLES.length ? [] : VEHICLES.map((v) => v.id)));

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Compliance Checks</h2>
          <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">
            {totalIssues} items require attention across the fleet
          </p>
        </div>
        {selected.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] px-3 py-2">
            <span className="text-xs text-[var(--color-text-secondary)]">{selected.length} selected</span>
            <button
              type="button"
              className="text-xs font-medium text-[var(--color-accent-primary)] hover:underline"
            >
              Renew All
            </button>
            <button
              type="button"
              onClick={() => setSelected([])}
              className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      <div className="mb-3 flex items-center gap-5">
        {Object.entries(COMPLIANCE_STATUS_CFG).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: cfg.color, boxShadow: `0 0 5px ${cfg.color}88` }}
            />
            {cfg.label}
          </div>
        ))}
      </div>

      <div
        className="overflow-hidden rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)]"
        style={panelStyle}
      >
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border-default)' }}>
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={selected.length === VEHICLES.length}
                  onChange={toggleAll}
                  className="h-3.5 w-3.5 accent-[var(--color-accent-primary)]"
                />
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                Vehicle
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                Driver
              </th>
              {COMPLIANCE_COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMPLIANCE.map((record, rowIdx) => {
              const vehicle = VEHICLES.find((v) => v.id === record.vehicleId)!;
              const isSelected = selected.includes(record.vehicleId);
              return (
                <tr
                  key={record.vehicleId}
                  style={{
                    borderBottom:
                      rowIdx < COMPLIANCE.length - 1 ? '1px solid var(--color-border-subtle)' : 'none',
                    background: isSelected ? 'var(--color-surface-hover)' : 'transparent',
                  }}
                >
                  <td className="px-4 py-2.5">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleOne(record.vehicleId)}
                      className="h-3.5 w-3.5 accent-[var(--color-accent-primary)]"
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <p className="text-xs font-semibold text-[var(--color-text-primary)]">{record.vehicleId}</p>
                    <p className="text-[10px] text-[var(--color-text-muted)]">
                      {vehicle.model} {vehicle.year}
                    </p>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-[var(--color-text-secondary)]">{vehicle.driver}</td>
                  {COMPLIANCE_COLUMNS.map((col) => {
                    const status = record[col.key];
                    const cfg = COMPLIANCE_STATUS_CFG[status];
                    return (
                      <td key={col.key} className="px-4 py-2.5 text-center">
                        <span
                          className="inline-block h-3 w-3 rounded-full"
                          style={{
                            background: cfg.color,
                            boxShadow: `0 0 6px ${cfg.color}88`,
                          }}
                          title={`${col.label}: ${cfg.label}`}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ----

interface IncidentsViewProps {
  incidents: Incident[];
  form: IncidentFormState;
  setForm: (updater: (prev: IncidentFormState) => IncidentFormState) => void;
  onSubmit: () => void;
  nextId: string;
}

const INCIDENT_TYPE_COLORS: Record<IncidentType, string> = {
  Accident: 'var(--color-status-error)',
  Breakdown: 'var(--color-status-warning)',
  Theft: '#c586c0',
  Damage: 'var(--color-status-info)',
};

const INCIDENT_SEVERITY_COLORS: Record<IncidentSeverity, string> = {
  Low: 'var(--color-status-info)',
  Medium: 'var(--color-status-warning)',
  High: 'var(--color-status-error)',
  Critical: '#c586c0',
};

const INCIDENT_STATUS_COLORS: Record<IncidentStatus, string> = {
  open: 'var(--color-status-error)',
  investigating: 'var(--color-status-warning)',
  resolved: 'var(--color-status-success)',
};

function IncidentsView({ incidents, form, setForm, onSubmit, nextId }: IncidentsViewProps) {
  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Incident Reporting</h2>
          <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">
            {incidents.filter((i) => i.status !== 'resolved').length} active incidents
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
        {/* Incidents list */}
        <div className="flex flex-col gap-3">
          {incidents.map((incident) => {
            const vehicle = VEHICLES.find((v) => v.id === incident.vehicleId);
            const typeColor = INCIDENT_TYPE_COLORS[incident.type];
            const sevColor = INCIDENT_SEVERITY_COLORS[incident.severity];
            const statusColor = INCIDENT_STATUS_COLORS[incident.status];
            return (
              <div
                key={incident.id}
                className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] p-4"
                style={cardStyle}
              >
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[var(--color-text-primary)]">{incident.id}</span>
                  <span
                    className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                    style={{ background: `${typeColor}22`, color: typeColor, border: `1px solid ${typeColor}44` }}
                  >
                    {incident.type}
                  </span>
                  <span
                    className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                    style={{ background: `${sevColor}22`, color: sevColor, border: `1px solid ${sevColor}44` }}
                  >
                    {incident.severity}
                  </span>
                  <span
                    className="rounded px-1.5 py-0.5 text-[10px] font-semibold capitalize"
                    style={{
                      background: `${statusColor}22`,
                      color: statusColor,
                      border: `1px solid ${statusColor}44`,
                    }}
                  >
                    {incident.status}
                  </span>
                </div>
                <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-text-secondary)]">
                  <span>
                    {incident.vehicleId} · {vehicle?.model ?? 'Unknown'}
                  </span>
                  <span>Driver: {incident.driver}</span>
                  <span>{incident.timestamp}</span>
                </div>
                <div className="mb-2 flex items-start gap-1 text-xs text-[var(--color-text-secondary)]">
                  <MapPin className="mt-0.5 h-3 w-3 flex-shrink-0" />
                  <span>{incident.location}</span>
                </div>
                <p className="text-xs leading-relaxed text-[var(--color-text-secondary)]">{incident.description}</p>
              </div>
            );
          })}
        </div>

        {/* New incident form */}
        <div
          className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] p-4"
          style={cardStyle}
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">New Incident Report</h3>
            <span className="font-mono text-[10px] text-[var(--color-text-muted)]">{nextId}</span>
          </div>

          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] uppercase tracking-wider text-[var(--color-text-muted)]">
                Incident Type
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {(['Accident', 'Breakdown', 'Theft', 'Damage'] as IncidentType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, type: t }))}
                    className="rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors"
                    style={{
                      background: form.type === t ? `${INCIDENT_TYPE_COLORS[t]}22` : 'var(--color-surface-tertiary)',
                      borderColor: form.type === t ? INCIDENT_TYPE_COLORS[t] : 'var(--color-border-default)',
                      color: form.type === t ? INCIDENT_TYPE_COLORS[t] : 'var(--color-text-secondary)',
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] uppercase tracking-wider text-[var(--color-text-muted)]">Severity</span>
              <div className="grid grid-cols-4 gap-1">
                {(['Low', 'Medium', 'High', 'Critical'] as IncidentSeverity[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, severity: s }))}
                    className="rounded-lg border py-1.5 text-[10px] font-medium transition-colors"
                    style={{
                      background:
                        form.severity === s
                          ? `${INCIDENT_SEVERITY_COLORS[s]}22`
                          : 'var(--color-surface-tertiary)',
                      borderColor:
                        form.severity === s ? INCIDENT_SEVERITY_COLORS[s] : 'var(--color-border-default)',
                      color: form.severity === s ? INCIDENT_SEVERITY_COLORS[s] : 'var(--color-text-secondary)',
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] uppercase tracking-wider text-[var(--color-text-muted)]">Vehicle</span>
              <select
                value={form.vehicleId}
                onChange={(e) => setForm((f) => ({ ...f, vehicleId: e.target.value }))}
                className="h-8 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] px-2 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-focus)]"
              >
                <option value="">Select vehicle...</option>
                {VEHICLES.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.id} · {v.model} ({v.driver})
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] uppercase tracking-wider text-[var(--color-text-muted)]">Location</span>
              <input
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                placeholder="Street address or GPS coordinates..."
                className="h-8 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] px-3 text-xs text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-border-focus)]"
              />
            </label>

            <div className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] py-3.5 text-xs text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)]">
              <Camera className="h-4 w-4" />
              Attach photo evidence
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] uppercase tracking-wider text-[var(--color-text-muted)]">
                Driver Statement
              </span>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                placeholder="Describe the incident in detail..."
                className="resize-none rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] px-3 py-2 text-xs text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-border-focus)]"
              />
            </label>

            <button
              type="button"
              onClick={onSubmit}
              className="mt-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition-colors"
              style={{
                background: 'var(--color-accent-primary)',
                boxShadow: '0 4px 16px rgba(0,120,212,0.35)',
              }}
            >
              <FileText className="h-4 w-4" />
              Submit Incident Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ----

interface RoutesViewProps {
  route: RouteData;
  setRoute: (updater: (prev: RouteData) => RouteData) => void;
}

const TRAFFIC_CFG: Record<TrafficCondition, { label: string; color: string }> = {
  clear: { label: 'Clear', color: 'var(--color-status-success)' },
  moderate: { label: 'Moderate', color: 'var(--color-status-warning)' },
  heavy: { label: 'Heavy', color: 'var(--color-status-error)' },
};

const WAYPOINT_COLORS: Record<Waypoint['stopType'], string> = {
  depot: 'var(--color-accent-primary)',
  stop: 'var(--color-status-info)',
  fuel: 'var(--color-status-warning)',
  destination: 'var(--color-status-success)',
};

function RoutesView({ route, setRoute }: RoutesViewProps) {
  const traffic = TRAFFIC_CFG[route.trafficCondition];

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Route Guidance</h2>
          <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">Active route · {route.vehicleId}</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={route.vehicleId}
            onChange={(e) => setRoute((r) => ({ ...r, vehicleId: e.target.value }))}
            className="h-8 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] px-2.5 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-focus)]"
          >
            {VEHICLES.filter((v) => v.status === 'active').map((v) => (
              <option key={v.id} value={v.id}>
                {v.id} · {v.driver}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] px-3 py-1.5 text-xs text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-hover)]"
          >
            <Navigation className="h-3.5 w-3.5" />
            Recalculate
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_300px]">
        <div className="flex flex-col gap-4">
          {/* Origin / Destination */}
          <div
            className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] p-4"
            style={cardStyle}
          >
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full"
                  style={{ background: 'var(--color-accent-primary)' }}
                >
                  <MapPin className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="mb-0.5 text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">Origin</p>
                  <input
                    value={route.origin}
                    onChange={(e) => setRoute((r) => ({ ...r, origin: e.target.value }))}
                    className="w-full border-b border-[var(--color-border-subtle)] bg-transparent pb-0.5 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-focus)]"
                  />
                </div>
              </div>
              <div className="ml-3.5 border-l-2 border-dashed border-[var(--color-border-default)] pl-4 text-[10px] text-[var(--color-text-muted)]">
                {route.distance} · {route.estimatedTime} estimated
              </div>
              <div className="flex items-center gap-3">
                <div
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full"
                  style={{ background: 'var(--color-status-success)' }}
                >
                  <Flag className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="mb-0.5 text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
                    Destination
                  </p>
                  <input
                    value={route.destination}
                    onChange={(e) => setRoute((r) => ({ ...r, destination: e.target.value }))}
                    className="w-full border-b border-[var(--color-border-subtle)] bg-transparent pb-0.5 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-focus)]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Waypoints */}
          <div
            className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] p-4"
            style={cardStyle}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Waypoints</h3>
              <button
                type="button"
                className="flex items-center gap-1 text-xs font-medium text-[var(--color-accent-primary)] hover:underline"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Stop
              </button>
            </div>
            <div className="relative">
              <div className="absolute bottom-3 left-3.5 top-3 w-0.5 bg-[var(--color-border-default)]" />
              <div className="flex flex-col gap-3">
                <div className="relative flex items-center gap-3 pl-8">
                  <div
                    className="absolute left-2.5 h-2.5 w-2.5 rounded-full border-2"
                    style={{
                      borderColor: 'var(--color-accent-primary)',
                      background: 'var(--color-surface-primary)',
                    }}
                  />
                  <div className="flex-1 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] px-3 py-2">
                    <p className="text-xs font-medium text-[var(--color-text-primary)]">Central Depot</p>
                    <p className="text-[10px] text-[var(--color-text-muted)]">Departure: 07:00 AM</p>
                  </div>
                </div>
                {route.waypoints.map((wp) => (
                  <div key={wp.id} className="relative flex items-center gap-3 pl-8">
                    <div
                      className="absolute left-2.5 h-2.5 w-2.5 rounded-full border-2"
                      style={{
                        borderColor: WAYPOINT_COLORS[wp.stopType],
                        background: 'var(--color-surface-primary)',
                      }}
                    />
                    <div className="flex flex-1 items-center justify-between rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] px-3 py-2">
                      <div>
                        <p className="text-xs font-medium text-[var(--color-text-primary)]">{wp.name}</p>
                        <p className="text-[10px] capitalize text-[var(--color-text-muted)]">
                          {wp.stopType} · ETA {wp.eta}
                        </p>
                      </div>
                      <span
                        className="rounded px-1.5 py-0.5 text-[10px] capitalize"
                        style={{
                          background: `${WAYPOINT_COLORS[wp.stopType]}22`,
                          color: WAYPOINT_COLORS[wp.stopType],
                          border: `1px solid ${WAYPOINT_COLORS[wp.stopType]}44`,
                        }}
                      >
                        {wp.stopType}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right summary */}
        <div className="flex flex-col gap-4">
          <div
            className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] p-4"
            style={cardStyle}
          >
            <h3 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">Route Summary</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Distance', value: route.distance, Icon: Activity },
                { label: 'Est. Time', value: route.estimatedTime, Icon: Clock },
              ].map(({ label, value, Icon }) => (
                <div
                  key={label}
                  className="rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] p-3"
                >
                  <Icon className="mb-1.5 h-4 w-4 text-[var(--color-text-muted)]" />
                  <p className="text-base font-bold text-[var(--color-text-primary)]">{value}</p>
                  <p className="text-[10px] text-[var(--color-text-muted)]">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div
            className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] p-4"
            style={cardStyle}
          >
            <h3 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">Traffic Conditions</h3>
            <div className="mb-3 flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{
                  background: `${traffic.color}22`,
                  border: `1px solid ${traffic.color}44`,
                }}
              >
                <Activity className="h-5 w-5" style={{ color: traffic.color }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: traffic.color }}>
                  {traffic.label} Traffic
                </p>
                <p className="text-[11px] text-[var(--color-text-muted)]">Updated 2 min ago</p>
              </div>
            </div>
            <div className="flex gap-1">
              {(['clear', 'moderate', 'heavy'] as TrafficCondition[]).map((cond) => (
                <button
                  key={cond}
                  type="button"
                  onClick={() => setRoute((r) => ({ ...r, trafficCondition: cond }))}
                  className="flex-1 rounded-lg border py-1.5 text-[10px] font-medium capitalize transition-colors"
                  style={{
                    background:
                      route.trafficCondition === cond
                        ? `${TRAFFIC_CFG[cond].color}22`
                        : 'var(--color-surface-tertiary)',
                    borderColor:
                      route.trafficCondition === cond
                        ? TRAFFIC_CFG[cond].color
                        : 'var(--color-border-default)',
                    color:
                      route.trafficCondition === cond
                        ? TRAFFIC_CFG[cond].color
                        : 'var(--color-text-muted)',
                  }}
                >
                  {cond}
                </button>
              ))}
            </div>
          </div>

          <div
            className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] p-4"
            style={cardStyle}
          >
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
              <Fuel className="h-4 w-4 text-[var(--color-status-warning)]" />
              Fuel Stop Recommendations
            </h3>
            <div className="flex flex-col gap-2">
              {route.fuelStops.map((stop, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] px-3 py-2"
                >
                  <Fuel className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[var(--color-status-warning)]" />
                  <span className="text-xs text-[var(--color-text-secondary)]">{stop}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== MAIN EXPORT =====

const TOPIC_NAV: { id: Topic; label: string; Icon: typeof Truck }[] = [
  { id: 'scheduling', label: 'Vehicle Scheduling', Icon: Calendar },
  { id: 'maintenance', label: 'Maintenance Alerts', Icon: Wrench },
  { id: 'compliance', label: 'Compliance Checks', Icon: Shield },
  { id: 'incidents', label: 'Incident Reporting', Icon: Flag },
  { id: 'routes', label: 'Route Guidance', Icon: Navigation },
];

export function FleetCoordinator() {
  const [activeTopic, setActiveTopic] = useState<Topic>('scheduling');
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [alerts, setAlerts] = useState<MaintenanceAlert[]>(INITIAL_ALERTS);
  const [incidents, setIncidents] = useState<Incident[]>(INITIAL_INCIDENTS);
  const [incidentForm, setIncidentForm] = useState<IncidentFormState>({
    type: 'Breakdown',
    severity: 'Medium',
    vehicleId: '',
    location: '',
    description: '',
  });
  const [route, setRoute] = useState<RouteData>(ROUTE_DATA);

  const tickerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);

  // Status ticker animation
  useEffect(() => {
    const el = tickerRef.current;
    if (!el) return;
    let offset = 0;
    const halfWidth = el.scrollWidth / 2;
    const step = () => {
      offset += 0.4;
      if (offset >= halfWidth) offset = 0;
      el.style.transform = `translateX(-${offset}px)`;
      animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  const filteredVehicles = vehicleSearch.trim()
    ? VEHICLES.filter(
        (v) =>
          v.id.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
          v.driver.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
          v.model.toLowerCase().includes(vehicleSearch.toLowerCase()),
      )
    : VEHICLES;

  const activeCount = VEHICLES.filter((v) => v.status === 'active').length;
  const maintenanceCount = VEHICLES.filter((v) => v.status === 'maintenance').length;
  const pendingAlertCount = alerts.filter((a) => a.status === 'pending').length;

  const totalChecks = COMPLIANCE.length * COMPLIANCE_COLUMNS.length;
  const issueCount = COMPLIANCE.flatMap((c) => COMPLIANCE_COLUMNS.map((col) => c[col.key])).filter(
    (s) => s !== 'current',
  ).length;
  const complianceRate = Math.round(((totalChecks - issueCount) / totalChecks) * 100);

  const kpis = [
    { label: 'Total Vehicles', value: '12', Icon: Truck, accent: 'var(--color-accent-primary)' },
    { label: 'Active Today', value: String(activeCount), Icon: Activity, accent: 'var(--color-status-success)' },
    { label: 'In Maintenance', value: String(maintenanceCount), Icon: Wrench, accent: 'var(--color-status-warning)' },
    { label: 'Compliance Rate', value: `${complianceRate}%`, Icon: Shield, accent: 'var(--color-status-info)' },
  ];

  const statusDotColor: Record<VehicleStatus, string> = {
    active: 'var(--color-status-success)',
    maintenance: 'var(--color-status-warning)',
    idle: 'var(--color-status-info)',
  };

  const handleAlertAction = (id: string, status: AlertStatus) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
  };

  const nextIncidentId = `INC-${2849 + incidents.length}`;

  const handleIncidentSubmit = () => {
    if (!incidentForm.vehicleId || !incidentForm.location.trim()) return;
    const newIncident: Incident = {
      id: nextIncidentId,
      type: incidentForm.type,
      severity: incidentForm.severity,
      vehicleId: incidentForm.vehicleId,
      driver: VEHICLES.find((v) => v.id === incidentForm.vehicleId)?.driver ?? 'Unknown',
      location: incidentForm.location,
      timestamp: new Date().toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      status: 'open',
      description: incidentForm.description,
    };
    setIncidents((prev) => [newIncident, ...prev]);
    setIncidentForm({ type: 'Breakdown', severity: 'Medium', vehicleId: '', location: '', description: '' });
  };

  return (
    <div
      className="flex h-full flex-col bg-[var(--color-surface-primary)] text-[var(--color-text-primary)]"
      style={{ fontFamily: 'var(--font-family-sans)' }}
    >
      {/* ── TOP BAR ── */}
      <header
        className="flex flex-shrink-0 items-center justify-between gap-4 px-5 py-3"
        style={{
          background: 'var(--color-surface-secondary)',
          borderBottom: '1px solid var(--color-border-default)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
            style={{ background: 'var(--color-accent-primary)', boxShadow: '0 4px 12px rgba(0,120,212,0.45)' }}
          >
            <Truck className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold leading-tight text-[var(--color-text-primary)]">
              Fleet Coordinator
            </h1>
            <p className="text-[10px] text-[var(--color-text-muted)]">
              Copilot Studio · Transportation Operations
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] px-3 py-1.5 text-xs">
            <Car className="h-3.5 w-3.5 text-[var(--color-accent-primary)]" />
            <span className="text-[var(--color-text-muted)]">Fleet:</span>
            <span className="font-semibold text-[var(--color-text-primary)]">12 Vehicles</span>
          </div>

          <button
            type="button"
            onClick={() => setActiveTopic('maintenance')}
            className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors"
            style={{
              borderColor: 'var(--color-status-error)',
              background: 'rgba(244,71,71,0.1)',
              color: 'var(--color-status-error)',
            }}
          >
            <Bell className="h-3.5 w-3.5" />
            {pendingAlertCount} Alerts
          </button>

          <div className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] px-3 py-1.5 text-xs">
            <span
              className="h-2 w-2 rounded-full"
              style={{
                background: 'var(--color-status-success)',
                boxShadow: '0 0 6px var(--color-status-success)',
              }}
            />
            <span className="text-[var(--color-text-secondary)]">{activeCount} Active</span>
          </div>

          <button
            type="button"
            className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </header>

      {/* ── BODY ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <aside
          className="flex flex-shrink-0 flex-col overflow-hidden"
          style={{
            width: 220,
            borderRight: '1px solid var(--color-border-default)',
            background: 'var(--color-surface-secondary)',
          }}
        >
          <div className="overflow-y-auto p-3">
            <p className="mb-2 px-2 text-[10px] uppercase tracking-widest text-[var(--color-text-muted)]">
              Topics
            </p>
            <nav className="flex flex-col gap-0.5">
              {TOPIC_NAV.map(({ id, label, Icon }) => {
                const badge =
                  id === 'maintenance' && pendingAlertCount > 0
                    ? pendingAlertCount
                    : id === 'incidents' && incidents.filter((i) => i.status !== 'resolved').length > 0
                      ? incidents.filter((i) => i.status !== 'resolved').length
                      : 0;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveTopic(id)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors"
                    style={{
                      background: activeTopic === id ? 'var(--color-surface-hover)' : 'transparent',
                      color: activeTopic === id ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                      borderLeft: activeTopic === id ? '2px solid var(--color-accent-primary)' : '2px solid transparent',
                    }}
                  >
                    <Icon
                      className="h-4 w-4 flex-shrink-0"
                      style={{ color: activeTopic === id ? 'var(--color-accent-primary)' : 'inherit' }}
                    />
                    <span className="flex-1 truncate text-xs">{label}</span>
                    {badge > 0 && (
                      <span
                        className="rounded-full px-1.5 text-[10px] font-bold"
                        style={{
                          background:
                            id === 'maintenance' ? 'var(--color-status-error)' : 'var(--color-status-warning)',
                          color: id === 'maintenance' ? 'white' : 'var(--color-text-inverse)',
                        }}
                      >
                        {badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="my-3" style={{ height: 1, background: 'var(--color-border-default)' }} />

            <p className="mb-2 px-2 text-[10px] uppercase tracking-widest text-[var(--color-text-muted)]">
              Vehicles
            </p>
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input
                value={vehicleSearch}
                onChange={(e) => setVehicleSearch(e.target.value)}
                placeholder="Search..."
                className="h-8 w-full rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] pl-8 pr-3 text-xs text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-border-focus)]"
              />
            </div>
            <div className="flex max-h-56 flex-col gap-0.5 overflow-y-auto">
              {filteredVehicles.map((v) => (
                <div
                  key={v.id}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 transition-colors hover:bg-[var(--color-surface-hover)]"
                >
                  <span
                    className="h-2 w-2 flex-shrink-0 rounded-full"
                    style={{ background: statusDotColor[v.status] }}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-medium text-[var(--color-text-primary)]">{v.id}</p>
                    <p className="truncate text-[10px] text-[var(--color-text-muted)]">{v.driver}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-5">
          {activeTopic === 'scheduling' && <SchedulingView />}
          {activeTopic === 'maintenance' && (
            <MaintenanceView alerts={alerts} onAction={handleAlertAction} />
          )}
          {activeTopic === 'compliance' && <ComplianceView />}
          {activeTopic === 'incidents' && (
            <IncidentsView
              incidents={incidents}
              form={incidentForm}
              setForm={setIncidentForm}
              onSubmit={handleIncidentSubmit}
              nextId={nextIncidentId}
            />
          )}
          {activeTopic === 'routes' && <RoutesView route={route} setRoute={setRoute} />}
        </main>

        {/* Right KPI panel */}
        <aside
          className="flex-shrink-0 overflow-y-auto p-4"
          style={{
            width: 196,
            borderLeft: '1px solid var(--color-border-default)',
            background: 'var(--color-surface-secondary)',
          }}
        >
          <p className="mb-3 text-[10px] uppercase tracking-widest text-[var(--color-text-muted)]">Fleet KPIs</p>
          <div className="flex flex-col gap-3">
            {kpis.map(({ label, value, Icon, accent }) => (
              <div
                key={label}
                className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] p-3"
                style={cardStyle}
              >
                <div className="mb-1.5 flex items-center justify-between">
                  <Icon className="h-4 w-4" style={{ color: accent }} />
                  <span className="text-xl font-bold text-[var(--color-text-primary)]">{value}</span>
                </div>
                <p className="text-[11px] text-[var(--color-text-muted)]">{label}</p>
                <div className="mt-2 h-px rounded-full" style={{ background: accent, opacity: 0.4 }} />
              </div>
            ))}
          </div>

          <div className="mt-5">
            <p className="mb-2 text-[10px] uppercase tracking-widest text-[var(--color-text-muted)]">Channels</p>
            <div className="flex flex-col gap-1.5">
              {['Teams', 'Mobile Web'].map((ch) => (
                <div
                  key={ch}
                  className="flex items-center gap-2 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] px-2.5 py-1.5 text-xs text-[var(--color-text-secondary)]"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-status-success)]" />
                  {ch}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <p className="mb-2 text-[10px] uppercase tracking-widest text-[var(--color-text-muted)]">User Roles</p>
            <div className="flex flex-col gap-1.5">
              {['Fleet Managers', 'Drivers', 'Logistics Coord.'].map((role) => (
                <div key={role} className="flex items-center gap-1.5">
                  <Users className="h-3 w-3 flex-shrink-0 text-[var(--color-text-muted)]" />
                  <p className="text-[11px] text-[var(--color-text-secondary)]">{role}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* ── BOTTOM TICKER ── */}
      <footer
        className="flex flex-shrink-0 items-center gap-3 overflow-hidden px-4"
        style={{
          height: 32,
          borderTop: '1px solid var(--color-border-default)',
          background: 'var(--color-surface-secondary)',
        }}
      >
        <div
          className="flex flex-shrink-0 items-center gap-1.5 border-r pr-3"
          style={{ borderColor: 'var(--color-border-default)' }}
        >
          <span
            className="h-2 w-2 rounded-full bg-[var(--color-status-success)]"
            style={{ boxShadow: '0 0 5px var(--color-status-success)' }}
          />
          <span className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)]">Live</span>
        </div>
        <div className="min-w-0 flex-1 overflow-hidden">
          <div ref={tickerRef} className="flex gap-10 whitespace-nowrap" style={{ willChange: 'transform' }}>
            {[...TICKER_EVENTS, ...TICKER_EVENTS].map((event, i) => (
              <span key={i} className="flex-shrink-0 text-xs text-[var(--color-text-secondary)]">
                <span className="mr-1.5 text-[var(--color-text-muted)]">·</span>
                {event}
              </span>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
