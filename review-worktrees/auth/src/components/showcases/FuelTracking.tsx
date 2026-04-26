import { Fragment, useMemo, useState, type CSSProperties } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BadgeDollarSign,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Droplet,
  Fuel,
  Gauge,
  GitCompareArrows,
  MapPin,
  Search,
  ShieldCheck,
  ShieldAlert,
  TriangleAlert,
  Users,
  XCircle,
} from 'lucide-react';

type TopicId =
  | 'fuel-summary'
  | 'vehicle-profile'
  | 'driver-ranking'
  | 'transaction-lookup'
  | 'anomaly-alert'
  | 'anomaly-investigation'
  | 'fuel-price-finder'
  | 'card-management';

type RuleType =
  | 'capacity overflow'
  | 'location mismatch'
  | 'frequency spike'
  | 'price outlier';

type Vehicle = {
  id: string;
  name: string;
  segment: string;
  mpgBaseline: number;
  costPerMile: number;
  mpgTrend: number[];
  fillHistory: {
    date: string;
    gallons: number;
    cost: number;
    station: string;
  }[];
};

type Driver = {
  id: string;
  name: string;
  vehicle: string;
  normalizedMpg: number;
  routeDifficulty: number;
  loadFactor: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  trend: 'up' | 'down' | 'flat';
};

type Transaction = {
  id: string;
  date: string;
  vehicle: string;
  driver: string;
  station: string;
  gallons: number;
  amount: number;
  cardLast4: string;
  location: string;
  odometer: number;
  status: 'approved' | 'review';
};

type AnomalyAlert = {
  id: string;
  ruleType: RuleType;
  confidence: number;
  vehicle: string;
  driver: string;
  evidence: string;
  recommendedAction: string;
  severity: 'high' | 'medium';
};

type FuelStation = {
  id: string;
  name: string;
  distance: number;
  price: number;
  savings: number;
};

type FuelCard = {
  id: string;
  driver: string;
  status: 'Active' | 'Suspended';
  lastUsed: string;
  limit: number;
};

type Role = 'Fleet Manager' | 'Driver' | 'Finance Analyst';

type Topic = {
  id: TopicId;
  label: string;
  description: string;
  Icon: typeof Fuel;
  hasAlert?: boolean;
};

const panelStyle: CSSProperties = {
  boxShadow:
    '0 20px 35px rgba(0, 0, 0, 0.35), 0 8px 16px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
};

const cardStyle: CSSProperties = {
  boxShadow:
    '0 16px 28px rgba(0, 0, 0, 0.3), 0 6px 12px rgba(0, 0, 0, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
};

const ruleTypeColors: Record<RuleType, string> = {
  'capacity overflow': 'var(--color-status-warning)',
  'location mismatch': 'var(--color-status-info)',
  'frequency spike': '#e07a5f',
  'price outlier': 'var(--color-status-danger)',
};

export function FuelTracking() {
  const [selectedTopic, setSelectedTopic] = useState<TopicId>('fuel-summary');
  const [vehicles] = useState<Vehicle[]>([
    {
      id: 'VH-201',
      name: 'Kenworth T680',
      segment: 'Long-haul',
      mpgBaseline: 6.4,
      costPerMile: 0.72,
      mpgTrend: [6.1, 6.4, 6.7, 6.5, 6.6, 6.8, 6.9, 7.1],
      fillHistory: [
        { date: 'Sep 18', gallons: 92, cost: 348, station: 'Pilot Travel Center' },
        { date: 'Sep 15', gallons: 88, cost: 332, station: 'Love\'s #214' },
        { date: 'Sep 12', gallons: 95, cost: 360, station: 'TA Express' },
        { date: 'Sep 08', gallons: 90, cost: 338, station: 'Shell Logistics Hub' },
      ],
    },
    {
      id: 'VH-202',
      name: 'Volvo VNL 760',
      segment: 'Long-haul',
      mpgBaseline: 6.1,
      costPerMile: 0.76,
      mpgTrend: [5.8, 6.0, 6.1, 6.2, 6.4, 6.3, 6.5, 6.6],
      fillHistory: [
        { date: 'Sep 19', gallons: 86, cost: 325, station: 'Chevron Freight' },
        { date: 'Sep 16', gallons: 90, cost: 342, station: 'TA Express' },
        { date: 'Sep 11', gallons: 88, cost: 334, station: 'Pilot Travel Center' },
      ],
    },
    {
      id: 'VH-303',
      name: 'Freightliner M2',
      segment: 'Regional',
      mpgBaseline: 7.8,
      costPerMile: 0.58,
      mpgTrend: [7.2, 7.5, 7.6, 7.8, 8.0, 7.9, 8.1, 8.2],
      fillHistory: [
        { date: 'Sep 20', gallons: 46, cost: 176, station: 'Shell Logistics Hub' },
        { date: 'Sep 17', gallons: 44, cost: 168, station: 'BP Connect' },
        { date: 'Sep 13', gallons: 45, cost: 171, station: 'Pilot Travel Center' },
      ],
    },
    {
      id: 'VH-304',
      name: 'Isuzu NPR',
      segment: 'Regional',
      mpgBaseline: 9.4,
      costPerMile: 0.41,
      mpgTrend: [9.0, 9.2, 9.3, 9.4, 9.6, 9.5, 9.7, 9.8],
      fillHistory: [
        { date: 'Sep 19', gallons: 28, cost: 104, station: 'BP Connect' },
        { date: 'Sep 16', gallons: 30, cost: 112, station: 'Shell Logistics Hub' },
        { date: 'Sep 12', gallons: 27, cost: 102, station: 'Texaco City Fuel' },
      ],
    },
    {
      id: 'VH-401',
      name: 'Ford Transit 350',
      segment: 'Last-mile',
      mpgBaseline: 14.2,
      costPerMile: 0.28,
      mpgTrend: [13.6, 13.9, 14.0, 14.4, 14.6, 14.5, 14.7, 14.9],
      fillHistory: [
        { date: 'Sep 20', gallons: 18, cost: 66, station: 'Texaco City Fuel' },
        { date: 'Sep 17', gallons: 19, cost: 70, station: 'Shell Logistics Hub' },
      ],
    },
    {
      id: 'VH-402',
      name: 'Mercedes Sprinter',
      segment: 'Last-mile',
      mpgBaseline: 15.0,
      costPerMile: 0.25,
      mpgTrend: [14.4, 14.6, 14.8, 15.1, 15.3, 15.2, 15.4, 15.6],
      fillHistory: [
        { date: 'Sep 18', gallons: 20, cost: 74, station: 'Shell Logistics Hub' },
        { date: 'Sep 15', gallons: 19, cost: 71, station: 'BP Connect' },
      ],
    },
    {
      id: 'VH-403',
      name: 'Ram ProMaster',
      segment: 'Last-mile',
      mpgBaseline: 13.8,
      costPerMile: 0.3,
      mpgTrend: [13.0, 13.4, 13.6, 13.7, 13.9, 13.8, 14.0, 14.2],
      fillHistory: [
        { date: 'Sep 18', gallons: 17, cost: 62, station: 'Texaco City Fuel' },
        { date: 'Sep 14', gallons: 18, cost: 66, station: 'Shell Logistics Hub' },
      ],
    },
    {
      id: 'VH-404',
      name: 'Hino 268',
      segment: 'Regional',
      mpgBaseline: 8.2,
      costPerMile: 0.49,
      mpgTrend: [7.9, 8.0, 8.1, 8.3, 8.4, 8.2, 8.5, 8.6],
      fillHistory: [
        { date: 'Sep 19', gallons: 40, cost: 151, station: 'BP Connect' },
        { date: 'Sep 15', gallons: 42, cost: 158, station: 'Shell Logistics Hub' },
      ],
    },
  ]);

  const [drivers] = useState<Driver[]>([
    {
      id: 'DR-12',
      name: 'Morgan Rivera',
      vehicle: 'Kenworth T680',
      normalizedMpg: 7.2,
      routeDifficulty: 1.12,
      loadFactor: 0.91,
      grade: 'A',
      trend: 'up',
    },
    {
      id: 'DR-19',
      name: 'Kai Bennett',
      vehicle: 'Freightliner M2',
      normalizedMpg: 8.4,
      routeDifficulty: 1.05,
      loadFactor: 0.86,
      grade: 'A',
      trend: 'up',
    },
    {
      id: 'DR-05',
      name: 'Aria Patel',
      vehicle: 'Mercedes Sprinter',
      normalizedMpg: 15.1,
      routeDifficulty: 0.98,
      loadFactor: 0.88,
      grade: 'B',
      trend: 'flat',
    },
    {
      id: 'DR-08',
      name: 'Logan Pierce',
      vehicle: 'Volvo VNL 760',
      normalizedMpg: 6.4,
      routeDifficulty: 1.18,
      loadFactor: 0.95,
      grade: 'B',
      trend: 'down',
    },
    {
      id: 'DR-22',
      name: 'Riley Park',
      vehicle: 'Isuzu NPR',
      normalizedMpg: 9.6,
      routeDifficulty: 1.02,
      loadFactor: 0.84,
      grade: 'A',
      trend: 'up',
    },
    {
      id: 'DR-14',
      name: 'Noah Davis',
      vehicle: 'Ram ProMaster',
      normalizedMpg: 13.4,
      routeDifficulty: 1.08,
      loadFactor: 0.9,
      grade: 'C',
      trend: 'down',
    },
  ]);

  const [transactions] = useState<Transaction[]>([
    {
      id: 'TX-901',
      date: 'Sep 20, 2024',
      vehicle: 'Kenworth T680',
      driver: 'Morgan Rivera',
      station: 'Pilot Travel Center',
      gallons: 92,
      amount: 348,
      cardLast4: '7781',
      location: 'Omaha, NE',
      odometer: 112380,
      status: 'approved',
    },
    {
      id: 'TX-902',
      date: 'Sep 20, 2024',
      vehicle: 'Freightliner M2',
      driver: 'Kai Bennett',
      station: 'Shell Logistics Hub',
      gallons: 46,
      amount: 176,
      cardLast4: '9923',
      location: 'Denver, CO',
      odometer: 68420,
      status: 'approved',
    },
    {
      id: 'TX-903',
      date: 'Sep 20, 2024',
      vehicle: 'Ford Transit 350',
      driver: 'Aria Patel',
      station: 'Texaco City Fuel',
      gallons: 18,
      amount: 66,
      cardLast4: '1150',
      location: 'Austin, TX',
      odometer: 41220,
      status: 'approved',
    },
    {
      id: 'TX-904',
      date: 'Sep 19, 2024',
      vehicle: 'Volvo VNL 760',
      driver: 'Logan Pierce',
      station: 'Chevron Freight',
      gallons: 86,
      amount: 325,
      cardLast4: '5527',
      location: 'Kansas City, MO',
      odometer: 97320,
      status: 'review',
    },
    {
      id: 'TX-905',
      date: 'Sep 19, 2024',
      vehicle: 'Isuzu NPR',
      driver: 'Riley Park',
      station: 'BP Connect',
      gallons: 28,
      amount: 104,
      cardLast4: '9923',
      location: 'San Antonio, TX',
      odometer: 50210,
      status: 'approved',
    },
    {
      id: 'TX-906',
      date: 'Sep 19, 2024',
      vehicle: 'Mercedes Sprinter',
      driver: 'Aria Patel',
      station: 'Shell Logistics Hub',
      gallons: 20,
      amount: 74,
      cardLast4: '1150',
      location: 'Dallas, TX',
      odometer: 39510,
      status: 'approved',
    },
    {
      id: 'TX-907',
      date: 'Sep 18, 2024',
      vehicle: 'Ram ProMaster',
      driver: 'Noah Davis',
      station: 'Texaco City Fuel',
      gallons: 17,
      amount: 62,
      cardLast4: '3310',
      location: 'Houston, TX',
      odometer: 46200,
      status: 'review',
    },
    {
      id: 'TX-908',
      date: 'Sep 18, 2024',
      vehicle: 'Kenworth T680',
      driver: 'Morgan Rivera',
      station: 'Shell Logistics Hub',
      gallons: 90,
      amount: 338,
      cardLast4: '7781',
      location: 'Wichita, KS',
      odometer: 111420,
      status: 'approved',
    },
    {
      id: 'TX-909',
      date: 'Sep 18, 2024',
      vehicle: 'Mercedes Sprinter',
      driver: 'Aria Patel',
      station: 'BP Connect',
      gallons: 19,
      amount: 71,
      cardLast4: '1150',
      location: 'Austin, TX',
      odometer: 38740,
      status: 'approved',
    },
    {
      id: 'TX-910',
      date: 'Sep 17, 2024',
      vehicle: 'Freightliner M2',
      driver: 'Kai Bennett',
      station: 'BP Connect',
      gallons: 44,
      amount: 168,
      cardLast4: '9923',
      location: 'Denver, CO',
      odometer: 67110,
      status: 'approved',
    },
    {
      id: 'TX-911',
      date: 'Sep 17, 2024',
      vehicle: 'Ford Transit 350',
      driver: 'Aria Patel',
      station: 'Shell Logistics Hub',
      gallons: 19,
      amount: 70,
      cardLast4: '1150',
      location: 'Austin, TX',
      odometer: 40110,
      status: 'approved',
    },
    {
      id: 'TX-912',
      date: 'Sep 16, 2024',
      vehicle: 'Volvo VNL 760',
      driver: 'Logan Pierce',
      station: 'TA Express',
      gallons: 90,
      amount: 342,
      cardLast4: '5527',
      location: 'Omaha, NE',
      odometer: 96400,
      status: 'approved',
    },
    {
      id: 'TX-913',
      date: 'Sep 16, 2024',
      vehicle: 'Ram ProMaster',
      driver: 'Noah Davis',
      station: 'Shell Logistics Hub',
      gallons: 18,
      amount: 66,
      cardLast4: '3310',
      location: 'Houston, TX',
      odometer: 45050,
      status: 'approved',
    },
    {
      id: 'TX-914',
      date: 'Sep 15, 2024',
      vehicle: 'Kenworth T680',
      driver: 'Morgan Rivera',
      station: 'Love\'s #214',
      gallons: 88,
      amount: 332,
      cardLast4: '7781',
      location: 'Denver, CO',
      odometer: 110620,
      status: 'approved',
    },
    {
      id: 'TX-915',
      date: 'Sep 15, 2024',
      vehicle: 'Mercedes Sprinter',
      driver: 'Aria Patel',
      station: 'BP Connect',
      gallons: 19,
      amount: 71,
      cardLast4: '1150',
      location: 'Dallas, TX',
      odometer: 37830,
      status: 'approved',
    },
  ]);

  const [anomalyAlerts] = useState<AnomalyAlert[]>([
    {
      id: 'AL-44',
      ruleType: 'capacity overflow',
      confidence: 0.92,
      vehicle: 'Volvo VNL 760',
      driver: 'Logan Pierce',
      evidence: 'Filled 18% above tank capacity in a single transaction.',
      recommendedAction: 'Hold payment and verify tank sensor calibration.',
      severity: 'high',
    },
    {
      id: 'AL-45',
      ruleType: 'location mismatch',
      confidence: 0.84,
      vehicle: 'Kenworth T680',
      driver: 'Morgan Rivera',
      evidence: 'Fuel purchase outside authorized corridor by 142 miles.',
      recommendedAction: 'Confirm reroute authorization with dispatch.',
      severity: 'medium',
    },
    {
      id: 'AL-46',
      ruleType: 'frequency spike',
      confidence: 0.8,
      vehicle: 'Ram ProMaster',
      driver: 'Noah Davis',
      evidence: '3 fill-ups recorded within a 9-hour window.',
      recommendedAction: 'Verify overlapping shift records.',
      severity: 'medium',
    },
    {
      id: 'AL-47',
      ruleType: 'price outlier',
      confidence: 0.88,
      vehicle: 'Mercedes Sprinter',
      driver: 'Aria Patel',
      evidence: 'Paid $0.48 above regional median price.',
      recommendedAction: 'Review preferred station list.',
      severity: 'high',
    },
  ]);

  const [fuelStations] = useState<FuelStation[]>([
    { id: 'ST-01', name: 'BP Connect - North Loop', distance: 2.4, price: 3.44, savings: 14 },
    { id: 'ST-02', name: 'Shell Logistics Hub', distance: 3.1, price: 3.49, savings: 10 },
    { id: 'ST-03', name: 'Texaco City Fuel', distance: 1.8, price: 3.38, savings: 21 },
    { id: 'ST-04', name: 'Pilot Travel Center', distance: 6.5, price: 3.62, savings: 0 },
    { id: 'ST-05', name: 'Love\'s #214', distance: 7.3, price: 3.55, savings: 7 },
  ]);

  const [fuelCards, setFuelCards] = useState<FuelCard[]>([
    { id: 'FC-4012', driver: 'Morgan Rivera', status: 'Active', lastUsed: 'Sep 20', limit: 500 },
    { id: 'FC-4287', driver: 'Aria Patel', status: 'Active', lastUsed: 'Sep 19', limit: 250 },
    { id: 'FC-4399', driver: 'Noah Davis', status: 'Suspended', lastUsed: 'Sep 18', limit: 200 },
  ]);

  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(vehicles[0].id);
  const [transactionSearch, setTransactionSearch] = useState('');
  const [expandedTransaction, setExpandedTransaction] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState<Role>('Fleet Manager');
  const [confirmAction, setConfirmAction] = useState<{
    cardId: string;
    action: 'Suspend' | 'Reactivate';
  } | null>(null);

  const topics: Topic[] = [
    {
      id: 'fuel-summary',
      label: 'Fuel Summary',
      description: 'Budget health and regional spend.',
      Icon: BarChart3,
    },
    {
      id: 'vehicle-profile',
      label: 'Vehicle Fuel Profile',
      description: 'Per-vehicle efficiency and cost.',
      Icon: Gauge,
    },
    {
      id: 'driver-ranking',
      label: 'Driver Efficiency Ranking',
      description: 'Normalized MPG by route/load.',
      Icon: Users,
    },
    {
      id: 'transaction-lookup',
      label: 'Transaction Lookup',
      description: 'Search fuel purchases and receipts.',
      Icon: Search,
    },
    {
      id: 'anomaly-alert',
      label: 'Anomaly Alert',
      description: 'Flagged transactions and rules.',
      Icon: TriangleAlert,
      hasAlert: true,
    },
    {
      id: 'anomaly-investigation',
      label: 'Anomaly Investigation',
      description: 'Evidence correlation workspace.',
      Icon: GitCompareArrows,
      hasAlert: true,
    },
    {
      id: 'fuel-price-finder',
      label: 'Fuel Price Finder',
      description: 'Route-optimized station list.',
      Icon: MapPin,
    },
    {
      id: 'card-management',
      label: 'Fuel Card Management',
      description: 'Suspend or reactivate cards.',
      Icon: CreditCard,
    },
  ];

  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === selectedVehicleId) ?? vehicles[0];
  const totalSpend = useMemo(
    () => transactions.reduce((total, entry) => total + entry.amount, 0),
    [transactions],
  );
  const anomalyCount = anomalyAlerts.length;
  const sortedStations = useMemo(
    () => fuelStations.slice().sort((a, b) => a.price - b.price),
    [fuelStations],
  );

  const filteredTransactions = transactions.filter((transaction) => {
    const query = transactionSearch.toLowerCase();
    if (!query) {
      return true;
    }
    return (
      transaction.vehicle.toLowerCase().includes(query) ||
      transaction.driver.toLowerCase().includes(query) ||
      transaction.station.toLowerCase().includes(query) ||
      transaction.id.toLowerCase().includes(query)
    );
  });

  const segmentSpend = [
    { segment: 'Long-haul', spend: 145200, budget: 155000, variance: -6.3 },
    { segment: 'Regional', spend: 78200, budget: 76000, variance: 2.9 },
    { segment: 'Last-mile', spend: 41200, budget: 45000, variance: -8.4 },
  ];

  const regionHeat = [
    { region: 'Pacific NW', value: 0.22 },
    { region: 'Southwest', value: 0.35 },
    { region: 'Midwest', value: 0.48 },
    { region: 'Great Plains', value: 0.58 },
    { region: 'Gulf Coast', value: 0.62 },
    { region: 'Southeast', value: 0.41 },
    { region: 'Mid-Atlantic', value: 0.53 },
    { region: 'Northeast', value: 0.45 },
    { region: 'Mountain', value: 0.33 },
    { region: 'Great Lakes', value: 0.5 },
    { region: 'Central', value: 0.38 },
    { region: 'Northern Plains', value: 0.28 },
  ];

  const anomalyTrend = [3, 2, 5, 4, 6, 5, 3, 4];

  const ruleDistribution = Object.entries(
    anomalyAlerts.reduce<Record<RuleType, number>>(
      (acc, alert) => {
        acc[alert.ruleType] += 1;
        return acc;
      },
      {
        'capacity overflow': 0,
        'location mismatch': 0,
        'frequency spike': 0,
        'price outlier': 0,
      },
    ),
  );

  const selectedAlert = anomalyAlerts[0];
  const canManageCards = currentRole === 'Fleet Manager' || currentRole === 'Finance Analyst';

  const handleConfirmAction = () => {
    if (!confirmAction) {
      return;
    }
    setFuelCards((prev) =>
      prev.map((card) => {
        if (card.id !== confirmAction.cardId) {
          return card;
        }
        return {
          ...card,
          status: confirmAction.action === 'Suspend' ? 'Suspended' : 'Active',
        };
      }),
    );
    setConfirmAction(null);
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[var(--color-surface-primary)] text-[var(--color-text-primary)]">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] px-6 py-4">
        <div>
          <p className="text-xs uppercase tracking-[0.26em] text-[var(--color-text-muted)]">
            Copilot Studio Agent
          </p>
          <h1 className="mt-1 text-2xl font-semibold">Fuel Tracking</h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Enterprise fleet fuel intelligence for managers, drivers, and finance analysts.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div
            className="flex items-center gap-3 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] px-4 py-2"
            style={cardStyle}
          >
            <BadgeDollarSign className="h-5 w-5 text-[var(--color-status-success)]" />
            <div>
              <p className="text-xs text-[var(--color-text-muted)]">Total Fleet Spend</p>
              <p className="text-lg font-semibold">
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                  maximumFractionDigits: 0,
                }).format(totalSpend)}
              </p>
            </div>
          </div>
          <div
            className="flex items-center gap-2 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] px-4 py-2"
            style={cardStyle}
          >
            <AlertTriangle className="h-5 w-5 text-[var(--color-status-warning)]" />
            <div>
              <p className="text-xs text-[var(--color-text-muted)]">Open Anomalies</p>
              <p className="text-lg font-semibold text-[var(--color-status-warning)]">
                {anomalyCount}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="flex w-64 flex-col gap-4 border-r border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] p-4">
          <div className="flex items-center justify-between rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] px-3 py-2 text-sm">
            <span className="text-[var(--color-text-secondary)]">Active Role</span>
            <span className="font-semibold text-[var(--color-text-primary)]">{currentRole}</span>
          </div>
          <div className="space-y-2">
            {topics.map((topic) => {
              const isActive = topic.id === selectedTopic;
              const TopicIcon = topic.Icon;
              return (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => setSelectedTopic(topic.id)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition ${
                    isActive
                      ? 'border-[var(--color-border-strong)] bg-[var(--color-surface-tertiary)]'
                      : 'border-transparent hover:bg-[var(--color-surface-hover)]'
                  }`}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-primary)]">
                    <TopicIcon className="h-4 w-4 text-[var(--color-text-secondary)]" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold">{topic.label}</span>
                      {topic.hasAlert ? (
                        <span className="rounded-full bg-[var(--color-status-danger)] px-2 py-0.5 text-[10px] font-semibold text-white">
                          Alert
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)]">{topic.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] p-3 text-xs text-[var(--color-text-secondary)]">
            <p className="font-semibold text-[var(--color-text-primary)]">Agent Topics</p>
            <p className="mt-2">
              Fuel Summary, Vehicle Profile, Driver Efficiency Ranking, Transaction Lookup, Anomaly
              Alert, Anomaly Investigation, Fuel Price Finder, Fuel Card Management.
            </p>
          </div>
        </aside>

        <main className="flex flex-1 flex-col gap-6 overflow-auto p-6">
          {selectedTopic === 'fuel-summary' ? (
            <section className="flex flex-col gap-6">
              <div
                className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] p-5"
                style={panelStyle}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">Fuel Summary</h2>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      Spend breakdown and budget alignment across fleet segments.
                    </p>
                  </div>
                  <Fuel className="h-5 w-5 text-[var(--color-text-secondary)]" />
                </div>
                <div className="mt-5 grid gap-4 lg:grid-cols-3">
                  {segmentSpend.map((segment) => (
                    <div
                      key={segment.segment}
                      className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] p-4"
                      style={cardStyle}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-text-muted)]">
                            {segment.segment}
                          </p>
                          <p className="mt-2 text-xl font-semibold">
                            {new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: 'USD',
                              maximumFractionDigits: 0,
                            }).format(segment.spend)}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${
                            segment.variance < 0
                              ? 'bg-[rgba(35,171,145,0.15)] text-[var(--color-status-success)]'
                              : 'bg-[rgba(224,122,95,0.2)] text-[#e07a5f]'
                          }`}
                        >
                          {segment.variance > 0 ? '+' : ''}
                          {segment.variance}%
                        </span>
                      </div>
                      <div className="mt-4">
                        <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                          <span>Budget</span>
                          <span>
                            {new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: 'USD',
                              maximumFractionDigits: 0,
                            }).format(segment.budget)}
                          </span>
                        </div>
                        <div className="mt-2 h-2 w-full rounded-full border border-[var(--color-border-default)] bg-[var(--color-surface-primary)]">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(segment.spend / segment.budget, 1) * 100}%`,
                              background:
                                segment.spend <= segment.budget
                                  ? 'var(--color-status-success)'
                                  : '#e07a5f',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
                <div
                  className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] p-5"
                  style={panelStyle}
                >
                  <h3 className="text-base font-semibold">Budget vs Actual</h3>
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    Forecasted burn rate vs actual usage for current quarter.
                  </p>
                  <div className="mt-4 space-y-4">
                    {segmentSpend.map((segment) => {
                      const ratio = Math.min(segment.spend / segment.budget, 1);
                      return (
                        <div key={`${segment.segment}-budget`}>
                          <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                            <span>{segment.segment}</span>
                            <span>
                              {new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: 'USD',
                                maximumFractionDigits: 0,
                              }).format(segment.spend)}{' '}
                              /{' '}
                              {new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: 'USD',
                                maximumFractionDigits: 0,
                              }).format(segment.budget)}
                            </span>
                          </div>
                          <div className="mt-2 h-3 w-full rounded-full border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)]">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${ratio * 100}%`,
                                background:
                                  ratio <= 1
                                    ? 'linear-gradient(90deg, var(--color-status-success), #23ab91)'
                                    : 'linear-gradient(90deg, #e07a5f, #f08f7a)',
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div
                  className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] p-5"
                  style={panelStyle}
                >
                  <h3 className="text-base font-semibold">Regional Spend Heat Map</h3>
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    Concentration of fuel spend by operating region.
                  </p>
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    {regionHeat.map((region) => (
                      <div
                        key={region.region}
                        className="flex flex-col justify-between rounded-xl border border-[var(--color-border-default)] p-3 text-xs"
                        style={{
                          background: `linear-gradient(135deg, rgba(35,171,145,${
                            region.value + 0.1
                          }), rgba(11,19,32,0.9))`,
                        }}
                      >
                        <span className="text-[var(--color-text-muted)]">{region.region}</span>
                        <span className="mt-3 text-sm font-semibold text-white">
                          {(region.value * 100).toFixed(0)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          {selectedTopic === 'vehicle-profile' ? (
            <section className="flex flex-col gap-6">
              <div
                className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] p-5"
                style={panelStyle}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">Vehicle Fuel Profile</h2>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      MPG trends, fill history, and cost per mile by vehicle.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] px-3 py-2">
                    <select
                      value={selectedVehicleId}
                      onChange={(event) => setSelectedVehicleId(event.currentTarget.value)}
                      className="bg-transparent text-sm text-[var(--color-text-primary)] outline-none"
                    >
                      {vehicles.map((vehicle) => (
                        <option key={vehicle.id} value={vehicle.id}>
                          {vehicle.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="h-4 w-4 text-[var(--color-text-muted)]" />
                  </div>
                </div>

                <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                  <div
                    className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] p-4"
                    style={cardStyle}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.26em] text-[var(--color-text-muted)]">
                          MPG Trend (8 weeks)
                        </p>
                        <p className="text-sm text-[var(--color-text-secondary)]">
                          {selectedVehicle.name} • {selectedVehicle.segment}
                        </p>
                      </div>
                      <Gauge className="h-4 w-4 text-[var(--color-text-secondary)]" />
                    </div>
                    <div className="mt-4 flex items-end gap-2">
                      {selectedVehicle.mpgTrend.map((value, index) => (
                        <div key={`${selectedVehicle.id}-${index}`} className="flex flex-col items-center gap-2">
                          <div
                            className="w-6 rounded-lg"
                            style={{
                              height: `${value * 8}px`,
                              background:
                                'linear-gradient(180deg, var(--color-accent-primary), rgba(17,94,89,0.4))',
                              border: '1px solid var(--color-border-default)',
                            }}
                          />
                          <span className="text-[10px] text-[var(--color-text-muted)]">
                            W{index + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div
                    className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] p-4"
                    style={cardStyle}
                  >
                    <h3 className="text-sm font-semibold">Efficiency Snapshot</h3>
                    <div className="mt-4 grid gap-3">
                      <div className="flex items-center justify-between rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-primary)] px-3 py-2 text-sm">
                        <span className="text-[var(--color-text-secondary)]">Cost per mile</span>
                        <span className="font-semibold">${selectedVehicle.costPerMile.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-primary)] px-3 py-2 text-sm">
                        <span className="text-[var(--color-text-secondary)]">Fleet baseline MPG</span>
                        <span className="font-semibold">{selectedVehicle.mpgBaseline.toFixed(1)}</span>
                      </div>
                      <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-primary)] px-3 py-2 text-sm">
                        <p className="text-[var(--color-text-secondary)]">Baseline comparison</p>
                        <div className="mt-2 flex items-center gap-2 text-sm font-semibold">
                          <ArrowUpRight className="h-4 w-4 text-[var(--color-status-success)]" />
                          {(
                            ((selectedVehicle.mpgTrend[selectedVehicle.mpgTrend.length - 1] -
                              selectedVehicle.mpgBaseline) /
                              selectedVehicle.mpgBaseline) *
                            100
                          ).toFixed(1)}
                          % above baseline
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] p-4" style={cardStyle}>
                  <h3 className="text-sm font-semibold">Fill History</h3>
                  <div className="mt-3 overflow-hidden rounded-xl border border-[var(--color-border-default)]">
                    <table className="w-full text-sm">
                      <thead className="bg-[var(--color-surface-primary)] text-xs text-[var(--color-text-muted)]">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">Date</th>
                          <th className="px-3 py-2 text-left font-medium">Station</th>
                          <th className="px-3 py-2 text-right font-medium">Gallons</th>
                          <th className="px-3 py-2 text-right font-medium">Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedVehicle.fillHistory.map((fill) => (
                          <tr key={`${selectedVehicle.id}-${fill.date}`} className="border-t border-[var(--color-border-default)]">
                            <td className="px-3 py-2">{fill.date}</td>
                            <td className="px-3 py-2 text-[var(--color-text-secondary)]">{fill.station}</td>
                            <td className="px-3 py-2 text-right">{fill.gallons}</td>
                            <td className="px-3 py-2 text-right">
                              {new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: 'USD',
                                maximumFractionDigits: 0,
                              }).format(fill.cost)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          {selectedTopic === 'driver-ranking' ? (
            <section className="flex flex-col gap-6">
              <div
                className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] p-5"
                style={panelStyle}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">Driver Efficiency Ranking</h2>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      Normalized MPG with route difficulty and load context.
                    </p>
                  </div>
                  <Users className="h-5 w-5 text-[var(--color-text-secondary)]" />
                </div>

                <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--color-border-default)]">
                  <table className="w-full text-sm">
                    <thead className="bg-[var(--color-surface-tertiary)] text-xs text-[var(--color-text-muted)]">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Driver</th>
                        <th className="px-3 py-2 text-left font-medium">Vehicle</th>
                        <th className="px-3 py-2 text-right font-medium">Normalized MPG</th>
                        <th className="px-3 py-2 text-right font-medium">Route Difficulty</th>
                        <th className="px-3 py-2 text-right font-medium">Load Factor</th>
                        <th className="px-3 py-2 text-right font-medium">Grade</th>
                        <th className="px-3 py-2 text-right font-medium">Trend</th>
                      </tr>
                    </thead>
                    <tbody>
                      {drivers.map((driver) => (
                        <tr key={driver.id} className="border-t border-[var(--color-border-default)]">
                          <td className="px-3 py-2 font-semibold">{driver.name}</td>
                          <td className="px-3 py-2 text-[var(--color-text-secondary)]">{driver.vehicle}</td>
                          <td className="px-3 py-2 text-right">{driver.normalizedMpg.toFixed(1)}</td>
                          <td className="px-3 py-2 text-right">{driver.routeDifficulty.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right">{driver.loadFactor.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right">
                            <span className="rounded-full border border-[var(--color-border-default)] bg-[var(--color-surface-primary)] px-2 py-0.5 text-xs font-semibold">
                              {driver.grade}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            {driver.trend === 'up' ? (
                              <ArrowUpRight className="ml-auto h-4 w-4 text-[var(--color-status-success)]" />
                            ) : null}
                            {driver.trend === 'down' ? (
                              <ArrowDownRight className="ml-auto h-4 w-4 text-[var(--color-status-danger)]" />
                            ) : null}
                            {driver.trend === 'flat' ? (
                              <ChevronRight className="ml-auto h-4 w-4 text-[var(--color-text-muted)]" />
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          ) : null}

          {selectedTopic === 'transaction-lookup' ? (
            <section className="flex flex-col gap-6">
              <div
                className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] p-5"
                style={panelStyle}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">Transaction Lookup</h2>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      Search fuel purchase transactions by driver, vehicle, or station.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] px-3 py-2">
                    <Search className="h-4 w-4 text-[var(--color-text-muted)]" />
                    <input
                      value={transactionSearch}
                      onChange={(event) => setTransactionSearch(event.currentTarget.value)}
                      placeholder="Search transactions"
                      className="w-56 bg-transparent text-sm outline-none"
                    />
                  </div>
                </div>

                <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--color-border-default)]">
                  <table className="w-full text-sm">
                    <thead className="bg-[var(--color-surface-tertiary)] text-xs text-[var(--color-text-muted)]">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Date</th>
                        <th className="px-3 py-2 text-left font-medium">Vehicle</th>
                        <th className="px-3 py-2 text-left font-medium">Driver</th>
                        <th className="px-3 py-2 text-left font-medium">Station</th>
                        <th className="px-3 py-2 text-right font-medium">Gallons</th>
                        <th className="px-3 py-2 text-right font-medium">Amount</th>
                        <th className="px-3 py-2 text-right font-medium">Card</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTransactions.map((transaction) => {
                        const isExpanded = expandedTransaction === transaction.id;
                        return (
                          <Fragment key={transaction.id}>
                            <tr
                              className="border-t border-[var(--color-border-default)]"
                            >
                              <td className="px-3 py-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedTransaction((prev) =>
                                      prev === transaction.id ? null : transaction.id,
                                    )
                                  }
                                  className="flex items-center gap-2 text-left text-[var(--color-text-primary)]"
                                >
                                  <ChevronRight
                                    className={`h-4 w-4 transition ${
                                      isExpanded ? 'rotate-90' : ''
                                    }`}
                                  />
                                  {transaction.date}
                                </button>
                              </td>
                              <td className="px-3 py-2 text-[var(--color-text-secondary)]">
                                {transaction.vehicle}
                              </td>
                              <td className="px-3 py-2 text-[var(--color-text-secondary)]">
                                {transaction.driver}
                              </td>
                              <td className="px-3 py-2">{transaction.station}</td>
                              <td className="px-3 py-2 text-right">{transaction.gallons}</td>
                              <td className="px-3 py-2 text-right">
                                {new Intl.NumberFormat('en-US', {
                                  style: 'currency',
                                  currency: 'USD',
                                }).format(transaction.amount)}
                              </td>
                              <td className="px-3 py-2 text-right text-[var(--color-text-secondary)]">
                                •••• {transaction.cardLast4}
                              </td>
                            </tr>
                            {isExpanded ? (
                              <tr className="border-t border-[var(--color-border-default)] bg-[var(--color-surface-primary)]">
                                <td className="px-3 py-3 text-xs text-[var(--color-text-secondary)]" colSpan={7}>
                                  <div className="flex flex-wrap items-center gap-4">
                                    <span>Location: {transaction.location}</span>
                                    <span>Odometer: {transaction.odometer.toLocaleString()} mi</span>
                                    <span>
                                      Status:{' '}
                                      <span
                                        className={`font-semibold ${
                                          transaction.status === 'review'
                                            ? 'text-[var(--color-status-warning)]'
                                            : 'text-[var(--color-status-success)]'
                                        }`}
                                      >
                                        {transaction.status === 'review' ? 'Needs review' : 'Approved'}
                                      </span>
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            ) : null}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          ) : null}

          {selectedTopic === 'anomaly-alert' ? (
            <section className="flex flex-col gap-6">
              <div
                className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] p-5"
                style={panelStyle}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">Anomaly Alert</h2>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      Rule-based anomaly detection with confidence scoring.
                    </p>
                  </div>
                  <AlertTriangle className="h-5 w-5 text-[var(--color-status-warning)]" />
                </div>
                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  {anomalyAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] p-4"
                      style={cardStyle}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-text-muted)]">
                            {alert.id}
                          </p>
                          <h3 className="mt-1 text-base font-semibold">
                            {alert.vehicle} • {alert.driver}
                          </h3>
                        </div>
                        <span
                          className="rounded-full px-2 py-1 text-xs font-semibold"
                          style={{
                            background: `${ruleTypeColors[alert.ruleType]}22`,
                            color: ruleTypeColors[alert.ruleType],
                            border: `1px solid ${ruleTypeColors[alert.ruleType]}`,
                          }}
                        >
                          {alert.ruleType}
                        </span>
                      </div>
                      <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
                        {alert.evidence}
                      </p>
                      <div className="mt-4">
                        <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                          <span>Confidence</span>
                          <span>{Math.round(alert.confidence * 100)}%</span>
                        </div>
                        <div className="mt-2 h-2 w-full rounded-full border border-[var(--color-border-default)] bg-[var(--color-surface-primary)]">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${alert.confidence * 100}%`,
                              background: ruleTypeColors[alert.ruleType],
                            }}
                          />
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-between text-sm">
                        <span className="text-[var(--color-text-secondary)]">
                          {alert.recommendedAction}
                        </span>
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-primary)] px-3 py-2 text-xs font-semibold text-[var(--color-text-primary)]"
                        >
                          Investigate
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          {selectedTopic === 'anomaly-investigation' ? (
            <section className="flex flex-col gap-6">
              <div
                className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] p-5"
                style={panelStyle}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">Anomaly Investigation</h2>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      Deep evidence correlation and escalation recommendation.
                    </p>
                  </div>
                  <GitCompareArrows className="h-5 w-5 text-[var(--color-text-secondary)]" />
                </div>

                <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                  <div
                    className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] p-4"
                    style={cardStyle}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-text-muted)]">
                          Transaction detail
                        </p>
                        <h3 className="mt-1 text-base font-semibold">
                          {selectedAlert.vehicle} • {selectedAlert.driver}
                        </h3>
                      </div>
                      <span
                        className="rounded-full px-2 py-1 text-xs font-semibold"
                        style={{
                          background: `${ruleTypeColors[selectedAlert.ruleType]}22`,
                          color: ruleTypeColors[selectedAlert.ruleType],
                          border: `1px solid ${ruleTypeColors[selectedAlert.ruleType]}`,
                        }}
                      >
                        {selectedAlert.ruleType}
                      </span>
                    </div>
                    <div className="mt-4 grid gap-3 text-sm text-[var(--color-text-secondary)]">
                      <div className="flex items-center justify-between rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-primary)] px-3 py-2">
                        <span>GPS route deviation</span>
                        <span className="font-semibold text-[var(--color-status-warning)]">18.4 mi</span>
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-primary)] px-3 py-2">
                        <span>Telematics alignment score</span>
                        <span className="font-semibold text-[var(--color-status-success)]">86%</span>
                      </div>
                      <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-primary)] px-3 py-2">
                        <p className="text-xs text-[var(--color-text-muted)]">Evidence correlation</p>
                        <ul className="mt-2 space-y-1 text-sm text-[var(--color-text-secondary)]">
                          <li>Fill volume exceeded tank capacity by 14 gallons.</li>
                          <li>Route tracker shows unplanned stop at non-preferred station.</li>
                          <li>Card used 2 hours after last dispatch confirmation.</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div
                    className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] p-4"
                    style={cardStyle}
                  >
                    <h3 className="text-sm font-semibold">Escalation Recommendation</h3>
                    <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                      {selectedAlert.recommendedAction}
                    </p>
                    <div className="mt-4 flex items-center gap-2 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-primary)] px-3 py-2 text-sm">
                      <ShieldAlert className="h-4 w-4 text-[var(--color-status-warning)]" />
                      <span className="text-[var(--color-text-secondary)]">Supervisor review required</span>
                    </div>
                    <div className="mt-3 flex items-center gap-2 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-primary)] px-3 py-2 text-sm">
                      <ShieldCheck className="h-4 w-4 text-[var(--color-status-success)]" />
                      <span className="text-[var(--color-text-secondary)]">Notify finance analyst for hold</span>
                    </div>
                    <button
                      type="button"
                      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-accent-primary)] px-4 py-2 text-sm font-semibold text-white"
                    >
                      Escalate Case
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          {selectedTopic === 'fuel-price-finder' ? (
            <section className="flex flex-col gap-6">
              <div
                className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] p-5"
                style={panelStyle}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">Fuel Price Finder</h2>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      Recommended stations by price, distance, and savings.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] px-3 py-2">
                    <MapPin className="h-4 w-4 text-[var(--color-text-muted)]" />
                    <input
                      placeholder="Enter location or route"
                      className="w-56 bg-transparent text-sm outline-none"
                    />
                  </div>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                  <div className="space-y-3">
                    {sortedStations.map((station) => (
                        <div
                          key={station.id}
                          className="flex items-center justify-between rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] px-4 py-3"
                          style={cardStyle}
                        >
                          <div>
                            <p className="text-sm font-semibold">{station.name}</p>
                            <p className="text-xs text-[var(--color-text-secondary)]">
                              {station.distance} mi away
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold">${station.price.toFixed(2)} / gal</p>
                            <p className="text-xs text-[var(--color-status-success)]">
                              Save ${station.savings}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                  <div
                    className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] p-4"
                    style={cardStyle}
                  >
                    <h3 className="text-sm font-semibold">Savings Calculator</h3>
                    <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                      Estimated savings for a 300-gallon fleet purchase.
                    </p>
                    <div className="mt-4 flex items-center justify-between rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-primary)] px-3 py-2 text-sm">
                      <span className="text-[var(--color-text-secondary)]">Best station</span>
                      <span className="font-semibold">
                        ${sortedStations[0].price.toFixed(2)} / gal
                      </span>
                    </div>
                    <div className="mt-3 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-primary)] px-3 py-2 text-sm">
                      <p className="text-[var(--color-text-secondary)]">Projected savings</p>
                      <p className="mt-1 text-xl font-semibold text-[var(--color-status-success)]">$63.00</p>
                    </div>
                    <button
                      type="button"
                      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-accent-primary)] px-4 py-2 text-sm font-semibold text-white"
                    >
                      Share Route Suggestion
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          {selectedTopic === 'card-management' ? (
            <section className="flex flex-col gap-6">
              <div
                className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] p-5"
                style={panelStyle}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">Fuel Card Management</h2>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      Suspend or reactivate cards with role-based authorization.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] px-3 py-2 text-sm">
                    <span className="text-[var(--color-text-secondary)]">Role</span>
                    <select
                      value={currentRole}
                      onChange={(event) => setCurrentRole(event.currentTarget.value as Role)}
                      className="bg-transparent text-sm font-semibold outline-none"
                    >
                      <option>Fleet Manager</option>
                      <option>Driver</option>
                      <option>Finance Analyst</option>
                    </select>
                  </div>
                </div>

                {!canManageCards ? (
                  <div className="mt-4 flex items-center gap-2 rounded-xl border border-[var(--color-border-default)] bg-[rgba(231,76,60,0.12)] px-3 py-2 text-sm text-[var(--color-status-danger)]">
                    <ShieldAlert className="h-4 w-4" />
                    Role authorization required for card actions.
                  </div>
                ) : null}

                <div className="mt-4 space-y-3">
                  {fuelCards.map((card) => (
                    <div
                      key={card.id}
                      className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] px-4 py-3"
                      style={cardStyle}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-primary)]">
                          <CreditCard className="h-4 w-4 text-[var(--color-text-secondary)]" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{card.id}</p>
                          <p className="text-xs text-[var(--color-text-secondary)]">
                            Driver: {card.driver} • Limit ${card.limit}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${
                            card.status === 'Active'
                              ? 'bg-[rgba(35,171,145,0.15)] text-[var(--color-status-success)]'
                              : 'bg-[rgba(231,76,60,0.18)] text-[var(--color-status-danger)]'
                          }`}
                        >
                          {card.status}
                        </span>
                        <span className="text-xs text-[var(--color-text-secondary)]">
                          Last used {card.lastUsed}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setConfirmAction({
                              cardId: card.id,
                              action: card.status === 'Active' ? 'Suspend' : 'Reactivate',
                            })
                          }
                          disabled={!canManageCards}
                          className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold ${
                            canManageCards
                              ? 'border-[var(--color-border-default)] bg-[var(--color-surface-primary)] text-[var(--color-text-primary)]'
                              : 'border-[var(--color-border-default)] bg-[var(--color-surface-primary)] text-[var(--color-text-muted)] opacity-60'
                          }`}
                        >
                          {card.status === 'Active' ? (
                            <XCircle className="h-4 w-4" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}
                          {card.status === 'Active' ? 'Suspend' : 'Reactivate'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ) : null}
        </main>

        <aside className="flex w-80 flex-col gap-6 border-l border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] p-4">
          <div className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] p-4" style={panelStyle}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Anomaly Trend</h3>
              <AlertTriangle className="h-4 w-4 text-[var(--color-text-secondary)]" />
            </div>
            <div className="mt-4 flex items-end gap-2">
              {anomalyTrend.map((value, index) => (
                <div key={`trend-${index}`} className="flex flex-col items-center gap-2">
                  <div
                    className="w-5 rounded-lg"
                    style={{
                      height: `${value * 12}px`,
                      background: 'linear-gradient(180deg, #e07a5f, rgba(231,76,60,0.3))',
                      border: '1px solid var(--color-border-default)',
                    }}
                  />
                  <span className="text-[10px] text-[var(--color-text-muted)]">W{index + 1}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] p-4" style={panelStyle}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Rule Type Distribution</h3>
              <Droplet className="h-4 w-4 text-[var(--color-text-secondary)]" />
            </div>
            <div className="mt-4 space-y-3">
              {ruleDistribution.map(([rule, count]) => (
                <div key={rule} className="flex items-center justify-between text-sm">
                  <span className="text-[var(--color-text-secondary)]">{rule}</span>
                  <span className="font-semibold">{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] p-4 text-sm" style={panelStyle}>
            <h3 className="text-sm font-semibold">Actionable Highlights</h3>
            <ul className="mt-3 space-y-2 text-[var(--color-text-secondary)]">
              <li>Top savings opportunity: Switch last-mile routes to Texaco City Fuel.</li>
              <li>Driver Morgan Rivera improved normalized MPG by 6.2% this month.</li>
              <li>Two anomalies require finance hold confirmation.</li>
            </ul>
          </div>
        </aside>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] px-6 py-3 text-xs text-[var(--color-text-secondary)]">
        <span>Data freshness: Sep 20, 2024 14:45 UTC • Next sync in 12 min</span>
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[var(--color-status-success)]" />
            Fuel API connected
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[var(--color-status-warning)]" />
            Telematics latency 2.4s
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[var(--color-status-info)]" />
            Payments queue healthy
          </span>
        </div>
      </footer>

      {confirmAction ? (
        <div className="absolute inset-0 flex items-center justify-center bg-[rgba(6,10,20,0.65)] p-6">
          <div className="w-full max-w-md rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] p-5 text-sm" style={panelStyle}>
            <h3 className="text-base font-semibold">Confirm card action</h3>
            <p className="mt-2 text-[var(--color-text-secondary)]">
              {confirmAction.action} card {confirmAction.cardId}? This action is logged for audit
              and can be reversed by authorized roles.
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] px-4 py-2 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                className="rounded-xl bg-[var(--color-accent-primary)] px-4 py-2 text-sm font-semibold text-white"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
