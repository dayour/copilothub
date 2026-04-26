import { useMemo, useState, type CSSProperties } from 'react';
import {
  AlertTriangle,
  Car,
  CheckCircle,
  Clock,
  DollarSign,
  Package,
  Plus,
  Wrench,
} from 'lucide-react';

type WorkOrderStatus = 'pending' | 'in-progress' | 'completed' | 'waiting';

type WorkOrder = {
  id: string;
  vehicle: string;
  customer: string;
  issue: string;
  bay: string;
  eta: string;
  status: WorkOrderStatus;
  total: number;
};

type Part = {
  id: string;
  name: string;
  stock: number;
  capacity: number;
  location: string;
  reorderAt: number;
};

type ServiceHistory = {
  id: string;
  date: string;
  vehicle: string;
  service: string;
  advisor: string;
};

type IconType = typeof Wrench;

type StatusConfig = {
  label: string;
  color: string;
  Icon: IconType;
};

const statusConfig: Record<WorkOrderStatus, StatusConfig> = {
  pending: {
    label: 'Pending',
    color: 'var(--color-status-warning)',
    Icon: Clock,
  },
  'in-progress': {
    label: 'In Progress',
    color: 'var(--color-status-info)',
    Icon: Wrench,
  },
  completed: {
    label: 'Completed',
    color: 'var(--color-status-success)',
    Icon: CheckCircle,
  },
  waiting: {
    label: 'Waiting for Parts',
    color: '#d19a66',
    Icon: AlertTriangle,
  },
};

const summaryCardBaseStyle: CSSProperties = {
  boxShadow:
    '0 20px 35px rgba(0, 0, 0, 0.35), 0 6px 10px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
  transform: 'perspective(900px) rotateX(1.5deg)',
};

const volumetricPanelStyle: CSSProperties = {
  boxShadow:
    '0 25px 45px rgba(0, 0, 0, 0.4), 0 8px 16px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
  transform: 'perspective(900px) rotateX(1deg)',
};

const volumetricCardStyle: CSSProperties = {
  boxShadow:
    '0 18px 30px rgba(0, 0, 0, 0.35), 0 6px 12px rgba(0, 0, 0, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
  transform: 'perspective(900px) rotateX(1.2deg)',
};

export function MechanicApp() {
  const [workOrders] = useState<WorkOrder[]>([
    {
      id: 'WO-1182',
      vehicle: '2018 Ford F-150',
      customer: 'Jordan Miles',
      issue: 'Brake squeal and steering wheel vibration',
      bay: 'Bay 2',
      eta: '10:30 AM',
      status: 'pending',
      total: 420,
    },
    {
      id: 'WO-1183',
      vehicle: '2021 Tesla Model 3',
      customer: 'Arielle Gomez',
      issue: 'HVAC blower noise at low speed',
      bay: 'Bay 1',
      eta: '1:00 PM',
      status: 'in-progress',
      total: 280,
    },
    {
      id: 'WO-1184',
      vehicle: '2016 Toyota Camry',
      customer: 'Marcus Lee',
      issue: 'Oil leak inspection and reseal quote',
      bay: 'Bay 3',
      eta: '2:30 PM',
      status: 'waiting',
      total: 510,
    },
    {
      id: 'WO-1185',
      vehicle: '2020 Jeep Wrangler',
      customer: 'Nina Patel',
      issue: 'Alignment and tire rotation',
      bay: 'Detail',
      eta: 'Completed',
      status: 'completed',
      total: 180,
    },
    {
      id: 'WO-1186',
      vehicle: '2019 BMW X5',
      customer: 'Elliot Park',
      issue: 'Battery drain diagnostics',
      bay: 'Bay 4',
      eta: '3:45 PM',
      status: 'in-progress',
      total: 640,
    },
    {
      id: 'WO-1187',
      vehicle: '2017 Honda Accord',
      customer: 'Sophia Tran',
      issue: 'Check engine light and misfire',
      bay: 'Bay 5',
      eta: '4:30 PM',
      status: 'pending',
      total: 360,
    },
  ]);

  const [parts] = useState<Part[]>([
    {
      id: 'PT-240',
      name: 'Ceramic Brake Pads',
      stock: 6,
      capacity: 30,
      location: 'Aisle 2',
      reorderAt: 8,
    },
    {
      id: 'PT-322',
      name: '5W-30 Synthetic Oil',
      stock: 18,
      capacity: 40,
      location: 'Fluid Rack',
      reorderAt: 12,
    },
    {
      id: 'PT-118',
      name: 'Cabin Air Filters',
      stock: 9,
      capacity: 24,
      location: 'Aisle 1',
      reorderAt: 10,
    },
    {
      id: 'PT-450',
      name: 'Ignition Coils',
      stock: 4,
      capacity: 16,
      location: 'Electronics',
      reorderAt: 6,
    },
    {
      id: 'PT-278',
      name: 'Battery Chargers',
      stock: 3,
      capacity: 10,
      location: 'Tool Wall',
      reorderAt: 4,
    },
    {
      id: 'PT-512',
      name: 'Wiper Blades',
      stock: 22,
      capacity: 30,
      location: 'Aisle 4',
      reorderAt: 12,
    },
    {
      id: 'PT-205',
      name: 'Coolant 50/50',
      stock: 7,
      capacity: 20,
      location: 'Fluid Rack',
      reorderAt: 9,
    },
    {
      id: 'PT-614',
      name: 'Alignment Shims',
      stock: 11,
      capacity: 30,
      location: 'Hardware',
      reorderAt: 10,
    },
  ]);

  const [serviceHistory] = useState<ServiceHistory[]>([
    {
      id: 'SH-901',
      date: 'Sep 18, 2024',
      vehicle: '2022 Audi Q5',
      service: '60K service, brake fluid exchange',
      advisor: 'Riley Cooper',
    },
    {
      id: 'SH-902',
      date: 'Sep 16, 2024',
      vehicle: '2015 Subaru Outback',
      service: 'Transmission fluid and filter',
      advisor: 'Jules Carter',
    },
    {
      id: 'SH-903',
      date: 'Sep 14, 2024',
      vehicle: '2018 Mercedes C300',
      service: 'Cooling system pressure test',
      advisor: 'Dana Brooks',
    },
    {
      id: 'SH-904',
      date: 'Sep 12, 2024',
      vehicle: '2020 Nissan Rogue',
      service: 'Front strut replacement',
      advisor: 'Morgan Lee',
    },
  ]);

  const [intakeForm, setIntakeForm] = useState({
    make: 'Chevrolet',
    model: 'Silverado 1500',
    year: '2022',
    vin: '1GC4YVE78MF123456',
    customer: 'Daniela Cruz',
    issue: 'Intermittent stall at idle and rough start in the morning.',
  });

  const summaryStats = useMemo(() => {
    const activeOrders = workOrders.filter((order) => order.status !== 'completed').length;
    const vehiclesInBay = workOrders.filter((order) => order.bay !== 'Detail').length;
    const partsLowStock = parts.filter((part) => part.stock <= part.reorderAt).length;
    const revenue = workOrders
      .filter((order) => order.status === 'completed')
      .reduce((total, order) => total + order.total, 0);

    return {
      activeOrders,
      vehiclesInBay,
      partsLowStock,
      revenue,
    };
  }, [parts, workOrders]);

  const summaryCards = [
    {
      id: 'active',
      label: 'Active Work Orders',
      value: summaryStats.activeOrders.toString(),
      Icon: Wrench,
      accent: 'var(--color-accent-primary)',
    },
    {
      id: 'bay',
      label: 'Vehicles in Bay',
      value: summaryStats.vehiclesInBay.toString(),
      Icon: Car,
      accent: 'var(--color-status-info)',
    },
    {
      id: 'parts',
      label: 'Parts Low Stock',
      value: summaryStats.partsLowStock.toString(),
      Icon: Package,
      accent: 'var(--color-status-warning)',
    },
    {
      id: 'revenue',
      label: "Today's Revenue",
      value: new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(summaryStats.revenue || 0),
      Icon: DollarSign,
      accent: 'var(--color-status-success)',
    },
  ];

  return (
    <div className="flex h-full w-full flex-col gap-6 overflow-auto bg-[var(--color-surface-primary)] p-6 text-[var(--color-text-primary)]">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
            Mechanic Operations
          </p>
          <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">
            Volumetric Shop Dashboard
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Live work orders, parts readiness, and intake flow across today&apos;s service bays.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] shadow-[0_12px_20px_rgba(0,0,0,0.25)] transition-colors hover:bg-[var(--color-surface-hover)]"
        >
          <Plus className="h-4 w-4" />
          New Work Order
        </button>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map(({ id, label, value, Icon, accent }) => (
          <div
            key={id}
            className="relative overflow-hidden rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] p-4"
            style={summaryCardBaseStyle}
          >
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'linear-gradient(140deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 45%, rgba(0,0,0,0.2) 100%)',
              }}
            />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--color-text-primary)]">
                  {value}
                </p>
              </div>
              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl"
                style={{
                  background: 'var(--color-surface-tertiary)',
                  boxShadow:
                    'inset 0 1px 0 rgba(255,255,255,0.1), 0 10px 18px rgba(0,0,0,0.25)',
                  border: '1px solid var(--color-border-default)',
                }}
              >
                <Icon className="h-5 w-5" style={{ color: accent }} />
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <div
            className="relative overflow-hidden rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] p-5"
            style={volumetricPanelStyle}
          >
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.03) 40%, rgba(0,0,0,0.25) 100%)',
              }}
            />
            <div className="relative flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                  Active Work Orders
                </h2>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  Track vehicle status with volumetric depth and progress cues.
                </p>
              </div>
              <span className="rounded-full border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] px-3 py-1 text-xs text-[var(--color-text-secondary)] shadow-[0_8px_16px_rgba(0,0,0,0.3)]">
                {workOrders.length} orders today
              </span>
            </div>

            <div className="relative mt-5 grid gap-4 md:grid-cols-2">
              {workOrders.map((order) => {
                const status = statusConfig[order.status];
                const StatusIcon = status.Icon;

                return (
                  <div
                    key={order.id}
                    className="relative overflow-hidden rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] p-4"
                    style={volumetricCardStyle}
                  >
                    <div
                      className="pointer-events-none absolute inset-0"
                      style={{
                        background:
                          'linear-gradient(150deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.02) 50%, rgba(0,0,0,0.35) 100%)',
                      }}
                    />
                    <div className="relative flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                          {order.id}
                        </p>
                        <h3 className="mt-1 text-base font-semibold text-[var(--color-text-primary)]">
                          {order.vehicle}
                        </h3>
                        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                          {order.customer}
                        </p>
                      </div>
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium"
                        style={{
                          borderColor: status.color,
                          color: status.color,
                          background: 'var(--color-surface-primary)',
                          boxShadow:
                            'inset 0 1px 0 rgba(255,255,255,0.12), 0 6px 14px rgba(0,0,0,0.3)',
                        }}
                      >
                        <StatusIcon className="h-3.5 w-3.5" />
                        {status.label}
                      </span>
                    </div>

                    <p className="relative mt-3 text-sm text-[var(--color-text-secondary)]">
                      {order.issue}
                    </p>

                    <div className="relative mt-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-primary)] px-2 py-1 text-xs text-[var(--color-text-secondary)] shadow-[0_8px_14px_rgba(0,0,0,0.25)]">
                          {order.bay}
                        </span>
                        <span className="text-xs text-[var(--color-text-muted)]">ETA {order.eta}</span>
                      </div>
                      <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                        ${order.total.toLocaleString('en-US')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div
            className="relative overflow-hidden rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] p-5"
            style={volumetricPanelStyle}
          >
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'linear-gradient(140deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.03) 40%, rgba(0,0,0,0.3) 100%)',
              }}
            />
            <div className="relative flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                  Service History
                </h2>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  Completed services with volumetric timeline nodes.
                </p>
              </div>
              <span className="rounded-full border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] px-3 py-1 text-xs text-[var(--color-text-secondary)] shadow-[0_8px_16px_rgba(0,0,0,0.3)]">
                Last 7 days
              </span>
            </div>

            <div className="relative mt-6">
              <div className="absolute left-4 top-0 h-full w-px bg-[var(--color-border-strong)]" />
              <ul className="space-y-6">
                {serviceHistory.map((entry) => (
                  <li key={entry.id} className="relative pl-12">
                    <div
                      className="absolute left-2 top-1.5 h-4 w-4 rounded-full"
                      style={{
                        background:
                          'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.6), rgba(0,0,0,0.4))',
                        border: '1px solid var(--color-border-default)',
                        boxShadow:
                          '0 8px 14px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.35)',
                      }}
                    />
                    <div
                      className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] p-4"
                      style={volumetricCardStyle}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                            {entry.date}
                          </p>
                          <h3 className="mt-1 text-sm font-semibold text-[var(--color-text-primary)]">
                            {entry.vehicle}
                          </h3>
                        </div>
                        <span className="text-xs text-[var(--color-text-secondary)]">
                          Advisor: {entry.advisor}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                        {entry.service}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div
            className="relative overflow-hidden rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] p-5"
            style={volumetricPanelStyle}
          >
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'linear-gradient(150deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 45%, rgba(0,0,0,0.35) 100%)',
              }}
            />
            <div className="relative flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                  Vehicle Intake
                </h2>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  Capture new arrivals with quick entry fields.
                </p>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] px-3 py-2 text-xs font-semibold text-[var(--color-text-primary)] shadow-[0_8px_14px_rgba(0,0,0,0.3)] transition-colors hover:bg-[var(--color-surface-hover)]"
              >
                <Plus className="h-3.5 w-3.5" />
                New Intake
              </button>
            </div>

            <form className="relative mt-5 grid gap-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
                  Make
                  <input
                    value={intakeForm.make}
                    onChange={(event) =>
                      setIntakeForm((prev) => ({ ...prev, make: event.currentTarget.value }))
                    }
                    className="h-9 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] px-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-focus)]"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
                  Model
                  <input
                    value={intakeForm.model}
                    onChange={(event) =>
                      setIntakeForm((prev) => ({ ...prev, model: event.currentTarget.value }))
                    }
                    className="h-9 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] px-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-focus)]"
                  />
                </label>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
                  Year
                  <input
                    value={intakeForm.year}
                    onChange={(event) =>
                      setIntakeForm((prev) => ({ ...prev, year: event.currentTarget.value }))
                    }
                    className="h-9 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] px-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-focus)]"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
                  VIN
                  <input
                    value={intakeForm.vin}
                    onChange={(event) =>
                      setIntakeForm((prev) => ({ ...prev, vin: event.currentTarget.value }))
                    }
                    className="h-9 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] px-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-focus)]"
                  />
                </label>
              </div>
              <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
                Customer Name
                <input
                  value={intakeForm.customer}
                  onChange={(event) =>
                    setIntakeForm((prev) => ({ ...prev, customer: event.currentTarget.value }))
                  }
                  className="h-9 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] px-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-focus)]"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
                Issue Description
                <textarea
                  value={intakeForm.issue}
                  onChange={(event) =>
                    setIntakeForm((prev) => ({ ...prev, issue: event.currentTarget.value }))
                  }
                  rows={3}
                  className="rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-focus)]"
                />
              </label>
              <button
                type="button"
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-accent-primary)] px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_20px_rgba(0,0,0,0.3)] transition-colors hover:bg-[var(--color-accent-hover)]"
              >
                <Plus className="h-4 w-4" />
                Add Intake Record
              </button>
            </form>
          </div>

          <div
            className="relative overflow-hidden rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] p-5"
            style={volumetricPanelStyle}
          >
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'linear-gradient(150deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.03) 45%, rgba(0,0,0,0.4) 100%)',
              }}
            />
            <div className="relative flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                  Parts Inventory
                </h2>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  Monitor stock levels with volumetric extrusion bars.
                </p>
              </div>
              <Package className="h-5 w-5 text-[var(--color-text-secondary)]" />
            </div>

            <div className="relative mt-5 grid gap-4 sm:grid-cols-2">
              {parts.map((part) => {
                const ratio = Math.min(part.stock / part.capacity, 1);
                const isLow = part.stock <= part.reorderAt;
                const barColor = isLow ? statusConfig.waiting.color : 'var(--color-status-success)';

                return (
                  <div
                    key={part.id}
                    className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] p-3"
                    style={volumetricCardStyle}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                          {part.id}
                        </p>
                        <h3 className="mt-1 text-sm font-semibold text-[var(--color-text-primary)]">
                          {part.name}
                        </h3>
                      </div>
                      <span className="text-xs text-[var(--color-text-secondary)]">
                        {part.location}
                      </span>
                    </div>
                    <div className="mt-3">
                      <div
                        className="relative h-3 w-full overflow-hidden rounded-full"
                        style={{
                          background: 'var(--color-surface-primary)',
                          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.45)',
                          border: '1px solid var(--color-border-default)',
                        }}
                      >
                        <div
                          className="absolute inset-0"
                          style={{
                            background:
                              'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(0,0,0,0.2))',
                          }}
                        />
                        <div
                          className="relative h-full rounded-full"
                          style={{
                            width: `${ratio * 100}%`,
                            background: `linear-gradient(180deg, ${barColor}, rgba(0,0,0,0.2))`,
                            boxShadow:
                              '0 6px 10px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.2)',
                          }}
                        />
                        <div
                          className="absolute right-1 top-0 h-full w-1 rounded-full"
                          style={{
                            background: 'rgba(255,255,255,0.25)',
                            filter: 'blur(1px)',
                          }}
                        />
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                        <span>
                          {part.stock} / {part.capacity} units
                        </span>
                        <span className={isLow ? 'text-[var(--color-status-warning)]' : ''}>
                          {isLow ? 'Reorder soon' : 'Healthy stock'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
