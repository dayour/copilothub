import { useState, useMemo, useCallback, type CSSProperties } from 'react';
import {
  Coffee,
  FileText,
  UserPlus,
  ClipboardList,
  CalendarDays,
  ArrowLeftRight,
  MapPin,
  Settings,
  Search,
  ChevronRight,
  Check,
  Circle,
  Clock,
  AlertTriangle,
  MessageSquare,
  Send,
  Building2,
  Phone,
  User,
  Tag,
  Leaf,
  Shield,
  BookOpen,
  ChevronDown,
  X,
  Star,
  BarChart3,
  RefreshCw,
  Wifi,
  Database,
  Layers,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TopicId =
  | 'recipes'
  | 'hr-policy'
  | 'onboarding'
  | 'operations'
  | 'menu-updates'
  | 'shift-handover'
  | 'store-lookup';

type UserRole = 'Barista' | 'Shift Lead' | 'Store Manager';

interface TopicNavItem {
  id: TopicId;
  label: string;
  icon: React.ReactNode;
  description: string;
}

interface Recipe {
  id: string;
  name: string;
  category: 'hot' | 'cold' | 'seasonal' | 'specialty';
  ingredients: string[];
  steps: string[];
  allergens: string[];
  seasonal: boolean;
  prepTimeMin: number;
  difficulty: 'Easy' | 'Medium' | 'Advanced';
}

interface PolicyDoc {
  id: string;
  title: string;
  category: 'HR' | 'Safety' | 'Operations' | 'Benefits';
  summary: string;
  lastUpdated: string;
  version: string;
  pages: number;
}

interface HandoverEntry {
  id: string;
  author: string;
  role: UserRole;
  time: string;
  date: string;
  notes: string;
  actionItems: { text: string; done: boolean }[];
}

interface StoreInfo {
  id: string;
  name: string;
  address: string;
  city: string;
  region: string;
  phone: string;
  manager: string;
  hours: string;
  status: 'Open' | 'Closed' | 'Limited';
}

interface TrainingModule {
  id: string;
  title: string;
  description: string;
  steps: { label: string; completed: boolean }[];
  estimatedMin: number;
  category: string;
}

interface MenuUpdate {
  id: string;
  name: string;
  description: string;
  effectiveDate: string;
  badge: 'New' | 'Modified' | 'Retired';
  category: string;
  price: string;
}

interface OperationTask {
  id: string;
  label: string;
  phase: 'Opening' | 'Closing';
  done: boolean;
  priority: 'High' | 'Medium' | 'Low';
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  time: string;
}

// ---------------------------------------------------------------------------
// Seed Data
// ---------------------------------------------------------------------------

const RECIPES: Recipe[] = [
  {
    id: 'r1',
    name: 'Caramel Macchiato',
    category: 'hot',
    ingredients: ['Espresso (2 shots)', 'Vanilla syrup (2 pumps)', 'Steamed milk (8oz)', 'Caramel drizzle'],
    steps: ['Steam milk to 155F with vanilla syrup', 'Pull 2 shots espresso', 'Pour milk into cup', 'Add espresso through foam', 'Drizzle caramel in crosshatch pattern'],
    allergens: ['Milk', 'Soy (syrup)'],
    seasonal: false,
    prepTimeMin: 4,
    difficulty: 'Medium',
  },
  {
    id: 'r2',
    name: 'Iced Oat Milk Latte',
    category: 'cold',
    ingredients: ['Espresso (2 shots)', 'Oat milk (10oz)', 'Ice', 'Simple syrup (optional)'],
    steps: ['Fill cup with ice to the rim', 'Pull 2 shots espresso', 'Pour espresso over ice', 'Add oat milk to fill line', 'Stir gently and cap'],
    allergens: ['Oat', 'Gluten (oat milk)'],
    seasonal: false,
    prepTimeMin: 3,
    difficulty: 'Easy',
  },
  {
    id: 'r3',
    name: 'Pumpkin Spice Latte',
    category: 'seasonal',
    ingredients: ['Espresso (2 shots)', 'Pumpkin spice sauce (3 pumps)', 'Steamed milk (8oz)', 'Whipped cream', 'Pumpkin spice topping'],
    steps: ['Add pumpkin sauce to cup', 'Pull 2 shots espresso into cup', 'Stir to combine', 'Steam milk to 160F', 'Pour milk, top with whipped cream and spice dusting'],
    allergens: ['Milk', 'Soy'],
    seasonal: true,
    prepTimeMin: 5,
    difficulty: 'Medium',
  },
  {
    id: 'r4',
    name: 'Classic Pour Over',
    category: 'specialty',
    ingredients: ['Single-origin beans (22g)', 'Filtered water (350ml, 205F)', 'Paper filter'],
    steps: ['Rinse filter with hot water', 'Add grounds, create well in center', 'Bloom with 50ml water for 30 seconds', 'Pour in slow concentric circles to 350ml', 'Total brew time: 3:30-4:00'],
    allergens: [],
    seasonal: false,
    prepTimeMin: 6,
    difficulty: 'Advanced',
  },
  {
    id: 'r5',
    name: 'Matcha Green Tea Latte',
    category: 'hot',
    ingredients: ['Ceremonial matcha (2 scoops)', 'Hot water (2oz)', 'Steamed milk (10oz)', 'Vanilla syrup (1 pump)'],
    steps: ['Sift matcha into cup', 'Add hot water (not boiling)', 'Whisk vigorously until frothy', 'Steam milk with vanilla', 'Pour milk over matcha'],
    allergens: ['Milk'],
    seasonal: false,
    prepTimeMin: 4,
    difficulty: 'Medium',
  },
  {
    id: 'r6',
    name: 'Cold Brew Nitro',
    category: 'cold',
    ingredients: ['Cold brew concentrate', 'Nitrogen infusion', 'Vanilla sweet cream (optional)'],
    steps: ['Fill nitro keg with cold brew concentrate', 'Charge with nitrogen at 40 PSI', 'Pour from nitro tap in smooth cascade', 'Serve without ice for full cascade effect', 'Float sweet cream if requested'],
    allergens: ['Milk (sweet cream)'],
    seasonal: false,
    prepTimeMin: 2,
    difficulty: 'Easy',
  },
  {
    id: 'r7',
    name: 'Gingerbread Mocha',
    category: 'seasonal',
    ingredients: ['Espresso (2 shots)', 'Mocha sauce (2 pumps)', 'Gingerbread syrup (2 pumps)', 'Steamed milk (8oz)', 'Whipped cream', 'Cookie crumble'],
    steps: ['Combine mocha sauce and gingerbread syrup in cup', 'Pull 2 shots espresso, stir into sauces', 'Steam milk to 155F', 'Pour milk, leaving room for whip', 'Top with whipped cream and cookie crumble'],
    allergens: ['Milk', 'Wheat', 'Soy'],
    seasonal: true,
    prepTimeMin: 5,
    difficulty: 'Medium',
  },
  {
    id: 'r8',
    name: 'Espresso Tonic',
    category: 'specialty',
    ingredients: ['Espresso (2 shots)', 'Tonic water (6oz)', 'Ice', 'Orange peel (garnish)'],
    steps: ['Fill glass with ice', 'Pour tonic water over ice', 'Pull 2 shots espresso', 'Slowly pour espresso over the back of a spoon', 'Garnish with orange peel twist'],
    allergens: [],
    seasonal: false,
    prepTimeMin: 3,
    difficulty: 'Easy',
  },
];

const POLICIES: PolicyDoc[] = [
  { id: 'p1', title: 'Employee Code of Conduct', category: 'HR', summary: 'Standards for workplace behavior, dress code, communication expectations, and conflict resolution procedures for all team members.', lastUpdated: '2025-01-15', version: '4.2', pages: 28 },
  { id: 'p2', title: 'Food Safety & Hygiene Standards', category: 'Safety', summary: 'HACCP compliance, handwashing protocols, temperature control logs, allergen handling, and cross-contamination prevention measures.', lastUpdated: '2025-03-01', version: '7.1', pages: 42 },
  { id: 'p3', title: 'Cash Handling & POS Procedures', category: 'Operations', summary: 'Register opening/closing counts, variance thresholds, refund authorization levels, tip pooling rules, and deposit procedures.', lastUpdated: '2024-11-20', version: '3.8', pages: 16 },
  { id: 'p4', title: 'Health Benefits & PTO Guide', category: 'Benefits', summary: 'Medical/dental/vision enrollment, PTO accrual rates by tenure, sick leave policy, parental leave, and tuition reimbursement program.', lastUpdated: '2025-02-01', version: '5.0', pages: 34 },
  { id: 'p5', title: 'Workplace Incident Reporting', category: 'Safety', summary: 'Injury reporting workflow, near-miss documentation, equipment malfunction logging, and escalation timelines for management notification.', lastUpdated: '2025-04-10', version: '2.3', pages: 12 },
];

const HANDOVER_ENTRIES: HandoverEntry[] = [
  {
    id: 'h1', author: 'Maria Santos', role: 'Shift Lead', time: '06:45 AM', date: '2025-07-14',
    notes: 'Morning prep complete. Espresso machine B calibrated — running 0.5s fast, adjusted grind to compensate. Oat milk delivery short by 2 cases; backup order placed via Sysco portal, ETA noon.',
    actionItems: [{ text: 'Monitor machine B shot times at 10 AM', done: false }, { text: 'Check Sysco delivery at noon', done: false }, { text: 'Restock pastry case from walk-in', done: true }],
  },
  {
    id: 'h2', author: 'James Chen', role: 'Store Manager', time: '02:15 PM', date: '2025-07-14',
    notes: 'Lunch rush peaked at 142 transactions (new weekday record). Drive-through times averaging 3:20 — need to stay under 3:00 target. Promoted gingerbread mocha seasonal special, moved 38 units.',
    actionItems: [{ text: 'Review drive-through staffing for peak', done: false }, { text: 'Update seasonal promo signage', done: true }, { text: 'Submit weekly labor report by EOD', done: false }],
  },
  {
    id: 'h3', author: 'Aisha Patel', role: 'Barista', time: '05:30 PM', date: '2025-07-14',
    notes: 'Afternoon steady, no equipment issues. Cold brew keg #2 is at 20% — should be swapped by tomorrow morning. Customer complimented the new matcha art technique from last week\'s training.',
    actionItems: [{ text: 'Swap cold brew keg #2 before morning shift', done: false }, { text: 'Deep clean drip trays', done: true }],
  },
  {
    id: 'h4', author: 'Tyler Brooks', role: 'Shift Lead', time: '09:00 PM', date: '2025-07-14',
    notes: 'Closing shift. Final register count balanced within $0.50 variance. Floors mopped, all surfaces sanitized. Patio furniture stored due to overnight wind advisory. Set alarm, locked all entries.',
    actionItems: [{ text: 'Confirm morning opener has updated alarm code', done: true }, { text: 'File nightly cleaning checklist in Teams', done: true }],
  },
];

const STORES: StoreInfo[] = [
  { id: 's1', name: 'Downtown Flagship', address: '100 Main Street', city: 'Seattle, WA 98101', region: 'Pacific Northwest', phone: '(206) 555-0100', manager: 'James Chen', hours: '5:00 AM - 10:00 PM', status: 'Open' },
  { id: 's2', name: 'University District', address: '4512 University Way NE', city: 'Seattle, WA 98105', region: 'Pacific Northwest', phone: '(206) 555-0145', manager: 'Rachel Kim', hours: '6:00 AM - 11:00 PM', status: 'Open' },
  { id: 's3', name: 'Financial Center', address: '777 3rd Avenue', city: 'New York, NY 10017', region: 'Northeast', phone: '(212) 555-0277', manager: 'David Rosenberg', hours: '5:30 AM - 8:00 PM', status: 'Open' },
  { id: 's4', name: 'Lakeside Plaza', address: '2200 N Lakeshore Dr', city: 'Chicago, IL 60614', region: 'Midwest', phone: '(312) 555-0388', manager: 'Angela Torres', hours: '6:00 AM - 9:00 PM', status: 'Limited' },
  { id: 's5', name: 'Tech Campus Hub', address: '1 Infinite Loop, Bldg 4', city: 'Cupertino, CA 95014', region: 'West Coast', phone: '(408) 555-0421', manager: 'Priya Sharma', hours: '6:30 AM - 6:00 PM', status: 'Open' },
  { id: 's6', name: 'Midtown Remodel', address: '350 Peachtree St NE', city: 'Atlanta, GA 30308', region: 'Southeast', phone: '(404) 555-0560', manager: 'Marcus Williams', hours: 'Temporarily Closed', status: 'Closed' },
];

const TRAINING_MODULES: TrainingModule[] = [
  {
    id: 't1', title: 'Espresso Fundamentals', description: 'Machine operation, shot timing, grind calibration, milk steaming techniques, and latte art basics.',
    category: 'Core Skills', estimatedMin: 90,
    steps: [{ label: 'Machine anatomy & safety', completed: true }, { label: 'Dialing in espresso', completed: true }, { label: 'Milk texturing 101', completed: true }, { label: 'Basic latte art (heart, rosetta)', completed: false }, { label: 'Practical assessment', completed: false }],
  },
  {
    id: 't2', title: 'Food Safety Certification', description: 'ServSafe-aligned module covering temperature danger zones, personal hygiene, allergen awareness, and cleaning protocols.',
    category: 'Compliance', estimatedMin: 120,
    steps: [{ label: 'Temperature control principles', completed: true }, { label: 'Personal hygiene standards', completed: true }, { label: 'Allergen identification', completed: false }, { label: 'Cleaning & sanitizing', completed: false }, { label: 'Written certification exam', completed: false }],
  },
  {
    id: 't3', title: 'POS & Payment Systems', description: 'Register operation, order entry shortcuts, loyalty program, mobile payments, refund processing, and daily reconciliation.',
    category: 'Operations', estimatedMin: 60,
    steps: [{ label: 'Order entry & modifiers', completed: true }, { label: 'Payment processing', completed: true }, { label: 'Loyalty & rewards', completed: true }, { label: 'Refunds & voids', completed: true }, { label: 'End-of-day reconciliation', completed: false }],
  },
  {
    id: 't4', title: 'Customer Service Excellence', description: 'Greeting standards, complaint resolution framework, accessibility awareness, and upselling techniques.',
    category: 'Soft Skills', estimatedMin: 75,
    steps: [{ label: 'Brand greeting & farewell', completed: true }, { label: 'Complaint resolution (LEARN model)', completed: false }, { label: 'Accessibility & inclusion', completed: false }, { label: 'Suggestive selling basics', completed: false }],
  },
  {
    id: 't5', title: 'Shift Lead Readiness', description: 'Labor scheduling, inventory counts, opening/closing supervision, incident response, and team coaching.',
    category: 'Leadership', estimatedMin: 150,
    steps: [{ label: 'Scheduling & break management', completed: true }, { label: 'Inventory & ordering', completed: false }, { label: 'Opening/closing procedures', completed: false }, { label: 'Incident & escalation protocols', completed: false }, { label: 'Coaching & feedback delivery', completed: false }, { label: 'Capstone shift simulation', completed: false }],
  },
];

const MENU_UPDATES: MenuUpdate[] = [
  { id: 'm1', name: 'Pumpkin Spice Latte', description: 'Returning seasonal favorite with updated pumpkin sauce formula — 15% less sugar, same flavor profile.', effectiveDate: '2025-09-01', badge: 'Modified', category: 'Seasonal Hot', price: '$6.25' },
  { id: 'm2', name: 'Gingerbread Mocha', description: 'Limited holiday offering with house-made gingerbread syrup and cookie crumble topping.', effectiveDate: '2025-11-15', badge: 'New', category: 'Seasonal Hot', price: '$6.75' },
  { id: 'm3', name: 'Espresso Tonic', description: 'New permanent menu addition after successful pilot in 120 stores. Orange peel garnish standard.', effectiveDate: '2025-08-01', badge: 'New', category: 'Cold Specialty', price: '$5.50' },
  { id: 'm4', name: 'Blueberry Muffin', description: 'Retiring current SKU. Replaced by Blueberry Streusel Muffin (larger size, streusel topping).', effectiveDate: '2025-08-15', badge: 'Retired', category: 'Bakery', price: '$3.50' },
  { id: 'm5', name: 'Oat Milk Cold Foam', description: 'New topping option available as add-on for any cold beverage. Vanilla or plain variants.', effectiveDate: '2025-07-20', badge: 'New', category: 'Add-Ons', price: '+$0.75' },
  { id: 'm6', name: 'Classic Chai Latte', description: 'Updated spice blend with increased cardamom and reduced clove. New concentrate supplier.', effectiveDate: '2025-08-01', badge: 'Modified', category: 'Hot Tea', price: '$5.75' },
];

const OPERATION_TASKS: OperationTask[] = [
  { id: 'o1', label: 'Unlock doors and disarm security system', phase: 'Opening', done: true, priority: 'High' },
  { id: 'o2', label: 'Power on espresso machines — run calibration cycle', phase: 'Opening', done: true, priority: 'High' },
  { id: 'o3', label: 'Check refrigerator temps and log in food safety binder', phase: 'Opening', done: true, priority: 'High' },
  { id: 'o4', label: 'Stock pastry case from walk-in cooler', phase: 'Opening', done: false, priority: 'Medium' },
  { id: 'o5', label: 'Count register float — verify $200 starting balance', phase: 'Opening', done: false, priority: 'High' },
  { id: 'o6', label: 'Brew first batch of drip coffee (dark + medium roast)', phase: 'Opening', done: false, priority: 'Medium' },
  { id: 'o7', label: 'Run final register reconciliation and print Z-report', phase: 'Closing', done: false, priority: 'High' },
  { id: 'o8', label: 'Drain and back-flush espresso machines', phase: 'Closing', done: false, priority: 'High' },
  { id: 'o9', label: 'Sanitize all food-contact surfaces', phase: 'Closing', done: false, priority: 'High' },
  { id: 'o10', label: 'Mop floors, empty trash, store patio furniture', phase: 'Closing', done: false, priority: 'Medium' },
  { id: 'o11', label: 'Set alarm and lock all entry points', phase: 'Closing', done: false, priority: 'High' },
];

const CHAT_MESSAGES: ChatMessage[] = [
  { id: 'c1', sender: 'user', text: 'How do I make a caramel macchiato?', time: '9:12 AM' },
  { id: 'c2', sender: 'agent', text: 'Great question! For a Caramel Macchiato, start by steaming 8oz of milk to 155\u00B0F with 2 pumps of vanilla syrup. Pull 2 shots of espresso. Pour the steamed milk into the cup, then add the espresso through the foam. Finish with a caramel drizzle in a crosshatch pattern. Prep time is about 4 minutes. Allergens: Milk, Soy (syrup). Would you like tips on the crosshatch technique?', time: '9:12 AM' },
  { id: 'c3', sender: 'user', text: 'Yes, and is there a dairy-free option?', time: '9:13 AM' },
  { id: 'c4', sender: 'agent', text: 'For the crosshatch: hold the caramel bottle 6 inches above the foam and draw 3 parallel lines, then 3 perpendicular lines across them. For dairy-free, substitute oat milk (steam to 145\u00B0F — it scorches easier) and use the sugar-free vanilla which is soy-free. The caramel drizzle does contain dairy, so offer the honey drizzle alternative instead. I have updated the recipe card with these notes. Anything else?', time: '9:13 AM' },
];

const TOPIC_NAV: TopicNavItem[] = [
  { id: 'recipes', label: 'Drink Recipes', icon: <Coffee size={18} />, description: 'Searchable recipe library' },
  { id: 'hr-policy', label: 'HR & Policy', icon: <FileText size={18} />, description: 'Company documents' },
  { id: 'onboarding', label: 'Onboarding', icon: <UserPlus size={18} />, description: 'Training modules' },
  { id: 'operations', label: 'Store Operations', icon: <ClipboardList size={18} />, description: 'Daily procedures' },
  { id: 'menu-updates', label: 'Menu Updates', icon: <CalendarDays size={18} />, description: 'Seasonal changes' },
  { id: 'shift-handover', label: 'Shift Handover', icon: <ArrowLeftRight size={18} />, description: 'Shift notes & actions' },
  { id: 'store-lookup', label: 'Store Lookup', icon: <MapPin size={18} />, description: 'Store directory' },
];

const STORE_OPTIONS = ['Downtown Flagship', 'University District', 'Financial Center', 'Lakeside Plaza', 'Tech Campus Hub'];

// ---------------------------------------------------------------------------
// Style Helpers
// ---------------------------------------------------------------------------

const s = {
  shell: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100%',
    width: '100%',
    background: 'var(--color-surface-primary)',
    color: 'var(--color-text-primary)',
    fontFamily: 'var(--font-family-sans)',
    fontSize: 13,
    overflow: 'hidden',
  } satisfies CSSProperties,

  topBar: {
    display: 'flex',
    alignItems: 'center',
    height: 48,
    padding: '0 16px',
    background: 'var(--color-surface-secondary)',
    borderBottom: '1px solid var(--color-border-default)',
    gap: 16,
    flexShrink: 0,
  } satisfies CSSProperties,

  body: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  } satisfies CSSProperties,

  sidebar: {
    width: 220,
    flexShrink: 0,
    background: 'var(--color-surface-secondary)',
    borderRight: '1px solid var(--color-border-default)',
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
  } satisfies CSSProperties,

  main: {
    flex: 1,
    overflow: 'auto',
    padding: 20,
  } satisfies CSSProperties,

  chatPanel: {
    width: 320,
    flexShrink: 0,
    borderLeft: '1px solid var(--color-border-default)',
    background: 'var(--color-surface-secondary)',
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
  } satisfies CSSProperties,

  statusBar: {
    display: 'flex',
    alignItems: 'center',
    height: 28,
    padding: '0 16px',
    background: 'var(--color-surface-tertiary)',
    borderTop: '1px solid var(--color-border-default)',
    gap: 20,
    fontSize: 11,
    color: 'var(--color-text-secondary)',
    flexShrink: 0,
  } satisfies CSSProperties,

  card: {
    background: 'var(--color-surface-tertiary)',
    border: '1px solid var(--color-border-default)',
    borderRadius: 8,
    padding: 16,
  } satisfies CSSProperties,

  badge: (color: string, bg: string): CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
    color,
    background: bg,
    letterSpacing: 0.3,
  }),

  input: {
    background: 'var(--color-surface-primary)',
    border: '1px solid var(--color-border-default)',
    borderRadius: 6,
    padding: '6px 10px 6px 32px',
    color: 'var(--color-text-primary)',
    fontSize: 13,
    outline: 'none',
    width: '100%',
    fontFamily: 'var(--font-family-sans)',
  } satisfies CSSProperties,

  sidebarItem: (active: boolean): CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 14px',
    cursor: 'pointer',
    borderRadius: 6,
    margin: '1px 8px',
    background: active ? 'var(--color-surface-hover)' : 'transparent',
    color: active ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
    fontWeight: active ? 600 : 400,
    fontSize: 13,
    transition: 'background 0.15s, color 0.15s',
    borderLeft: active ? '3px solid var(--color-accent-primary)' : '3px solid transparent',
  }),
};

// ---------------------------------------------------------------------------
// Sub-Components: Topic Views
// ---------------------------------------------------------------------------

function RecipesView() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [selected, setSelected] = useState<Recipe | null>(null);

  const filtered = useMemo(() => {
    let list = RECIPES;
    if (filter !== 'all') list = list.filter((r) => r.category === filter);
    if (search) list = list.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()) || r.ingredients.some((i) => i.toLowerCase().includes(search.toLowerCase())));
    return list;
  }, [search, filter]);

  const catColors: Record<string, { color: string; bg: string }> = {
    hot: { color: '#f97316', bg: 'rgba(249,115,22,0.15)' },
    cold: { color: '#38bdf8', bg: 'rgba(56,189,248,0.15)' },
    seasonal: { color: '#a78bfa', bg: 'rgba(167,139,250,0.15)' },
    specialty: { color: '#4ec9b0', bg: 'rgba(78,201,176,0.15)' },
  };

  if (selected) {
    return (
      <div>
        <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--color-accent-primary)', cursor: 'pointer', fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-family-sans)' }}>
          <ChevronRight size={14} style={{ transform: 'rotate(180deg)' }} /> Back to recipes
        </button>
        <div style={{ ...s.card, maxWidth: 640 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>{selected.name}</h2>
            <span style={s.badge(catColors[selected.category].color, catColors[selected.category].bg)}>{selected.category}</span>
            {selected.seasonal && <span style={s.badge('#a78bfa', 'rgba(167,139,250,0.15)')}>Seasonal</span>}
          </div>
          <div style={{ display: 'flex', gap: 24, marginBottom: 16, fontSize: 12, color: 'var(--color-text-secondary)' }}>
            <span><Clock size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />{selected.prepTimeMin} min</span>
            <span><Star size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />{selected.difficulty}</span>
          </div>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: 0.8 }}>Ingredients</h3>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {selected.ingredients.map((ing, i) => <li key={i} style={{ marginBottom: 4, lineHeight: 1.5 }}>{ing}</li>)}
            </ul>
          </div>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: 0.8 }}>Preparation Steps</h3>
            <ol style={{ margin: 0, paddingLeft: 18 }}>
              {selected.steps.map((step, i) => <li key={i} style={{ marginBottom: 6, lineHeight: 1.5 }}>{step}</li>)}
            </ol>
          </div>
          {selected.allergens.length > 0 && (
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--color-status-warning)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                <AlertTriangle size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />Allergens
              </h3>
              <div style={{ display: 'flex', gap: 6 }}>
                {selected.allergens.map((a) => <span key={a} style={s.badge('#dcdcaa', 'rgba(220,220,170,0.12)')}>{a}</span>)}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: 9, color: 'var(--color-text-muted)' }} />
          <input style={s.input} placeholder="Search recipes or ingredients..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {['all', 'hot', 'cold', 'seasonal', 'specialty'].map((cat) => (
          <button key={cat} onClick={() => setFilter(cat)} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid ' + (filter === cat ? 'var(--color-accent-primary)' : 'var(--color-border-default)'), background: filter === cat ? 'rgba(0,120,212,0.15)' : 'var(--color-surface-tertiary)', color: filter === cat ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)', cursor: 'pointer', fontSize: 12, fontWeight: 500, textTransform: 'capitalize', fontFamily: 'var(--font-family-sans)' }}>
            {cat === 'all' ? 'All' : cat}
          </button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
        {filtered.map((r) => (
          <div key={r.id} onClick={() => setSelected(r)} style={{ ...s.card, cursor: 'pointer', transition: 'border-color 0.15s, box-shadow 0.15s' }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent-primary)'; e.currentTarget.style.boxShadow = '0 0 0 1px var(--color-accent-primary)'; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border-default)'; e.currentTarget.style.boxShadow = 'none'; }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{r.name}</h3>
              {r.seasonal && <Leaf size={14} style={{ color: '#a78bfa', flexShrink: 0 }} />}
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
              <span style={s.badge(catColors[r.category].color, catColors[r.category].bg)}>{r.category}</span>
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{r.prepTimeMin} min | {r.difficulty}</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
              {r.ingredients.slice(0, 3).join(', ')}{r.ingredients.length > 3 ? ` +${r.ingredients.length - 3} more` : ''}
            </div>
            {r.allergens.length > 0 && (
              <div style={{ display: 'flex', gap: 4, marginTop: 10, flexWrap: 'wrap' }}>
                {r.allergens.map((a) => <span key={a} style={{ ...s.badge('#dcdcaa', 'rgba(220,220,170,0.08)'), fontSize: 10 }}>{a}</span>)}
              </div>
            )}
          </div>
        ))}
      </div>
      {filtered.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>No recipes match your search.</div>}
    </div>
  );
}

function PolicyView() {
  const [filter, setFilter] = useState<string>('All');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const categories = ['All', 'HR', 'Safety', 'Operations', 'Benefits'];
  const filtered = filter === 'All' ? POLICIES : POLICIES.filter((p) => p.category === filter);
  const selected = POLICIES.find((p) => p.id === selectedId);

  const catIcon: Record<string, React.ReactNode> = {
    HR: <User size={14} />,
    Safety: <Shield size={14} />,
    Operations: <ClipboardList size={14} />,
    Benefits: <BookOpen size={14} />,
  };

  return (
    <div style={{ display: 'flex', gap: 16, height: '100%' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {categories.map((cat) => (
            <button key={cat} onClick={() => setFilter(cat)} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid ' + (filter === cat ? 'var(--color-accent-primary)' : 'var(--color-border-default)'), background: filter === cat ? 'rgba(0,120,212,0.15)' : 'var(--color-surface-tertiary)', color: filter === cat ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)', cursor: 'pointer', fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-family-sans)' }}>
              {cat}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.map((p) => (
            <div key={p.id} onClick={() => setSelectedId(p.id)} style={{ ...s.card, padding: '12px 14px', cursor: 'pointer', borderColor: selectedId === p.id ? 'var(--color-accent-primary)' : 'var(--color-border-default)', display: 'flex', alignItems: 'center', gap: 12 }} onMouseEnter={(e) => { if (selectedId !== p.id) e.currentTarget.style.background = 'var(--color-surface-hover)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--color-surface-tertiary)'; }}>
              <div style={{ color: 'var(--color-accent-primary)', flexShrink: 0 }}>{catIcon[p.category]}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{p.title}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{p.category} | v{p.version} | {p.pages} pages</div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', flexShrink: 0 }}>
                Updated {p.lastUpdated}
              </div>
            </div>
          ))}
        </div>
      </div>
      {selected && (
        <div style={{ ...s.card, width: 320, flexShrink: 0, alignSelf: 'flex-start' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{selected.title}</h3>
            <button onClick={() => setSelectedId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 0 }}><X size={14} /></button>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <span style={s.badge('var(--color-accent-primary)', 'rgba(0,120,212,0.12)')}>{selected.category}</span>
            <span style={s.badge('var(--color-text-secondary)', 'var(--color-surface-hover)')}>v{selected.version}</span>
          </div>
          <p style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--color-text-secondary)', margin: '0 0 12px 0' }}>{selected.summary}</p>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'flex', justifyContent: 'space-between' }}>
            <span>{selected.pages} pages</span>
            <span>Last updated: {selected.lastUpdated}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function HandoverView() {
  const [entries, setEntries] = useState(HANDOVER_ENTRIES);

  const toggleItem = useCallback((entryId: string, itemIdx: number) => {
    setEntries((prev) =>
      prev.map((e) =>
        e.id === entryId
          ? { ...e, actionItems: e.actionItems.map((ai, i) => (i === itemIdx ? { ...ai, done: !ai.done } : ai)) }
          : e,
      ),
    );
  }, []);

  const roleColor: Record<UserRole, string> = {
    Barista: '#4ec9b0',
    'Shift Lead': '#569cd6',
    'Store Manager': '#c586c0',
  };

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ position: 'relative', paddingLeft: 24 }}>
        <div style={{ position: 'absolute', left: 7, top: 0, bottom: 0, width: 2, background: 'var(--color-border-default)' }} />
        {entries.map((entry) => {
          const doneCount = entry.actionItems.filter((ai) => ai.done).length;
          return (
            <div key={entry.id} style={{ marginBottom: 24, position: 'relative' }}>
              <div style={{ position: 'absolute', left: -21, top: 4, width: 12, height: 12, borderRadius: '50%', background: roleColor[entry.role], border: '2px solid var(--color-surface-primary)' }} />
              <div style={s.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{entry.author}</span>
                    <span style={s.badge(roleColor[entry.role], roleColor[entry.role] + '20')}>{entry.role}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Clock size={11} /> {entry.time} | {entry.date}
                  </div>
                </div>
                <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--color-text-secondary)', margin: '0 0 12px 0' }}>{entry.notes}</p>
                {entry.actionItems.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                      Action Items ({doneCount}/{entry.actionItems.length})
                    </div>
                    {entry.actionItems.map((ai, idx) => (
                      <div key={idx} onClick={() => toggleItem(entry.id, idx)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', cursor: 'pointer', fontSize: 12 }}>
                        {ai.done ? <Check size={14} style={{ color: 'var(--color-status-success)' }} /> : <Circle size={14} style={{ color: 'var(--color-text-muted)' }} />}
                        <span style={{ textDecoration: ai.done ? 'line-through' : 'none', color: ai.done ? 'var(--color-text-muted)' : 'var(--color-text-primary)' }}>{ai.text}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StoreLookupView() {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!search) return STORES;
    const q = search.toLowerCase();
    return STORES.filter((st) => st.name.toLowerCase().includes(q) || st.city.toLowerCase().includes(q) || st.region.toLowerCase().includes(q) || st.manager.toLowerCase().includes(q));
  }, [search]);

  const selected = STORES.find((st) => st.id === selectedId);

  const statusColor: Record<string, { color: string; bg: string }> = {
    Open: { color: '#4ec9b0', bg: 'rgba(78,201,176,0.15)' },
    Closed: { color: '#f44747', bg: 'rgba(244,71,71,0.15)' },
    Limited: { color: '#dcdcaa', bg: 'rgba(220,220,170,0.15)' },
  };

  return (
    <div style={{ display: 'flex', gap: 16 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ position: 'relative', marginBottom: 16, maxWidth: 360 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: 9, color: 'var(--color-text-muted)' }} />
          <input style={s.input} placeholder="Search stores, cities, regions..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {filtered.map((st) => (
            <div key={st.id} onClick={() => setSelectedId(st.id)} style={{ ...s.card, cursor: 'pointer', borderColor: selectedId === st.id ? 'var(--color-accent-primary)' : 'var(--color-border-default)' }} onMouseEnter={(e) => { if (selectedId !== st.id) e.currentTarget.style.borderColor = 'var(--color-border-strong)'; }} onMouseLeave={(e) => { if (selectedId !== st.id) e.currentTarget.style.borderColor = 'var(--color-border-default)'; }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{st.name}</h3>
                <span style={s.badge(statusColor[st.status].color, statusColor[st.status].bg)}>{st.status}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                <div>{st.address}</div>
                <div>{st.city}</div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 8 }}>{st.region}</div>
            </div>
          ))}
        </div>
      </div>
      {selected && (
        <div style={{ width: 320, flexShrink: 0 }}>
          {/* Map placeholder */}
          <div style={{ ...s.card, marginBottom: 12, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, var(--color-surface-tertiary), var(--color-surface-elevated))' }}>
            <div style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
              <MapPin size={28} style={{ marginBottom: 8, opacity: 0.5 }} />
              <div style={{ fontSize: 11 }}>Map — {selected.city}</div>
            </div>
          </div>
          <div style={s.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{selected.name}</h3>
              <button onClick={() => setSelectedId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 0 }}><X size={14} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <Building2 size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0, marginTop: 1 }} />
                <div><div>{selected.address}</div><div style={{ color: 'var(--color-text-muted)' }}>{selected.city}</div></div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Phone size={14} style={{ color: 'var(--color-text-muted)' }} />
                <span>{selected.phone}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={14} style={{ color: 'var(--color-text-muted)' }} />
                <span>{selected.hours}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <User size={14} style={{ color: 'var(--color-text-muted)' }} />
                <span>Manager: {selected.manager}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Tag size={14} style={{ color: 'var(--color-text-muted)' }} />
                <span>Region: {selected.region}</span>
              </div>
              <div style={{ marginTop: 4 }}>
                <span style={s.badge(statusColor[selected.status].color, statusColor[selected.status].bg)}>{selected.status}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OperationsView() {
  const [tasks, setTasks] = useState(OPERATION_TASKS);
  const [phaseFilter, setPhaseFilter] = useState<'All' | 'Opening' | 'Closing'>('All');

  const toggleTask = useCallback((id: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  }, []);

  const filtered = phaseFilter === 'All' ? tasks : tasks.filter((t) => t.phase === phaseFilter);
  const openingDone = tasks.filter((t) => t.phase === 'Opening' && t.done).length;
  const openingTotal = tasks.filter((t) => t.phase === 'Opening').length;
  const closingDone = tasks.filter((t) => t.phase === 'Closing' && t.done).length;
  const closingTotal = tasks.filter((t) => t.phase === 'Closing').length;

  const priorityColor: Record<string, string> = { High: '#f44747', Medium: '#dcdcaa', Low: '#4ec9b0' };

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {(['All', 'Opening', 'Closing'] as const).map((phase) => (
          <button key={phase} onClick={() => setPhaseFilter(phase)} style={{ padding: '5px 14px', borderRadius: 6, border: '1px solid ' + (phaseFilter === phase ? 'var(--color-accent-primary)' : 'var(--color-border-default)'), background: phaseFilter === phase ? 'rgba(0,120,212,0.15)' : 'var(--color-surface-tertiary)', color: phaseFilter === phase ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)', cursor: 'pointer', fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-family-sans)' }}>
            {phase}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 16, fontSize: 12, color: 'var(--color-text-secondary)', alignItems: 'center' }}>
          <span>Opening: {openingDone}/{openingTotal}</span>
          <span>Closing: {closingDone}/{closingTotal}</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--color-surface-hover)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${((openingDone + closingDone) / tasks.length) * 100}%`, background: 'var(--color-status-success)', borderRadius: 2, transition: 'width 0.3s' }} />
        </div>
        <span style={{ fontSize: 11, color: 'var(--color-text-muted)', flexShrink: 0 }}>{openingDone + closingDone}/{tasks.length}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {filtered.map((task) => (
          <div key={task.id} onClick={() => toggleTask(task.id)} style={{ ...s.card, padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, opacity: task.done ? 0.6 : 1 }}>
            {task.done ? <Check size={16} style={{ color: 'var(--color-status-success)', flexShrink: 0 }} /> : <Circle size={16} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />}
            <span style={{ flex: 1, textDecoration: task.done ? 'line-through' : 'none', fontSize: 13 }}>{task.label}</span>
            <span style={{ ...s.badge(priorityColor[task.priority], priorityColor[task.priority] + '18'), fontSize: 10 }}>{task.priority}</span>
            <span style={{ ...s.badge('var(--color-text-muted)', 'var(--color-surface-hover)'), fontSize: 10 }}>{task.phase}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MenuUpdatesView() {
  const badgeStyle: Record<string, { color: string; bg: string }> = {
    New: { color: '#4ec9b0', bg: 'rgba(78,201,176,0.15)' },
    Modified: { color: '#569cd6', bg: 'rgba(86,156,214,0.15)' },
    Retired: { color: '#f44747', bg: 'rgba(244,71,71,0.15)' },
  };

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {MENU_UPDATES.map((mu) => (
          <div key={mu.id} style={s.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{mu.name}</h3>
              <span style={s.badge(badgeStyle[mu.badge].color, badgeStyle[mu.badge].bg)}>{mu.badge}</span>
            </div>
            <p style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--color-text-secondary)', margin: '0 0 12px 0' }}>{mu.description}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: 'var(--color-text-muted)' }}>
              <span>{mu.category}</span>
              <span>{mu.price}</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
              <CalendarDays size={11} /> Effective: {mu.effectiveDate}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OnboardingView() {
  const [modules, setModules] = useState(TRAINING_MODULES);

  const toggleStep = useCallback((modId: string, stepIdx: number) => {
    setModules((prev) =>
      prev.map((m) =>
        m.id === modId
          ? { ...m, steps: m.steps.map((st, i) => (i === stepIdx ? { ...st, completed: !st.completed } : st)) }
          : m,
      ),
    );
  }, []);

  return (
    <div style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {modules.map((mod) => {
        const done = mod.steps.filter((st) => st.completed).length;
        const pct = Math.round((done / mod.steps.length) * 100);
        return (
          <div key={mod.id} style={s.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 2px 0' }}>{mod.title}</h3>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{mod.category} | ~{mod.estimatedMin} min</div>
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: pct === 100 ? 'var(--color-status-success)' : 'var(--color-accent-primary)' }}>{pct}%</span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: '0 0 10px 0' }}>{mod.description}</p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' }}>
              <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--color-surface-hover)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? 'var(--color-status-success)' : 'var(--color-accent-primary)', borderRadius: 3, transition: 'width 0.3s' }} />
              </div>
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)', flexShrink: 0 }}>{done}/{mod.steps.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {mod.steps.map((step, idx) => (
                <div key={idx} onClick={() => toggleStep(mod.id, idx)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0', cursor: 'pointer', fontSize: 12 }}>
                  {step.completed ? <Check size={14} style={{ color: 'var(--color-status-success)' }} /> : <Circle size={14} style={{ color: 'var(--color-text-muted)' }} />}
                  <span style={{ textDecoration: step.completed ? 'line-through' : 'none', color: step.completed ? 'var(--color-text-muted)' : 'var(--color-text-primary)' }}>{step.label}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-Component: Chat Panel
// ---------------------------------------------------------------------------

function ChatPanel() {
  const [messages, setMessages] = useState(CHAT_MESSAGES);
  const [draft, setDraft] = useState('');

  const handleSend = useCallback(() => {
    if (!draft.trim()) return;
    const userMsg: ChatMessage = { id: `c${Date.now()}`, sender: 'user', text: draft.trim(), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    const agentMsg: ChatMessage = { id: `c${Date.now() + 1}`, sender: 'agent', text: 'Let me check the knowledge base for that. I\'ll pull the relevant information from the SharePoint hub and get back to you in a moment.', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setMessages((prev) => [...prev, userMsg, agentMsg]);
    setDraft('');
  }, [draft]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-border-default)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <MessageSquare size={16} style={{ color: 'var(--color-accent-primary)' }} />
        <span style={{ fontWeight: 600, fontSize: 13 }}>Virtual Coach Chat</span>
        <span style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', background: 'var(--color-status-success)' }} />
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.map((msg) => (
          <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start', maxWidth: '90%', alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{ padding: '8px 12px', borderRadius: msg.sender === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px', background: msg.sender === 'user' ? 'var(--color-accent-primary)' : 'var(--color-surface-tertiary)', color: msg.sender === 'user' ? '#fff' : 'var(--color-text-primary)', fontSize: 12, lineHeight: 1.5 }}>
              {msg.text}
            </div>
            <span style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 3, paddingLeft: 4, paddingRight: 4 }}>{msg.time}</span>
          </div>
        ))}
      </div>
      <div style={{ padding: '10px 14px', borderTop: '1px solid var(--color-border-default)', display: 'flex', gap: 8, flexShrink: 0 }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
          placeholder="Ask the Virtual Coach..."
          style={{ ...s.input, paddingLeft: 10 }}
        />
        <button onClick={handleSend} style={{ background: 'var(--color-accent-primary)', border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Send size={14} style={{ color: '#fff' }} />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Export
// ---------------------------------------------------------------------------

export function CoffeeVirtualCoach() {
  const [activeTopic, setActiveTopic] = useState<TopicId>('recipes');
  const [selectedStore, setSelectedStore] = useState(STORE_OPTIONS[0]);
  const [role, setRole] = useState<UserRole>('Shift Lead');
  const [showStoreDropdown, setShowStoreDropdown] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);

  const roleColors: Record<UserRole, { color: string; bg: string }> = {
    Barista: { color: '#4ec9b0', bg: 'rgba(78,201,176,0.15)' },
    'Shift Lead': { color: '#569cd6', bg: 'rgba(86,156,214,0.15)' },
    'Store Manager': { color: '#c586c0', bg: 'rgba(197,134,192,0.15)' },
  };

  const topicHeadings: Record<TopicId, string> = {
    recipes: 'Drink Recipes',
    'hr-policy': 'HR & Policy Documents',
    onboarding: 'Onboarding & Training',
    operations: 'Store Operations',
    'menu-updates': 'Menu Updates',
    'shift-handover': 'Shift Handover Log',
    'store-lookup': 'Store Directory',
  };

  const renderContent = useCallback(() => {
    switch (activeTopic) {
      case 'recipes': return <RecipesView />;
      case 'hr-policy': return <PolicyView />;
      case 'shift-handover': return <HandoverView />;
      case 'store-lookup': return <StoreLookupView />;
      case 'operations': return <OperationsView />;
      case 'menu-updates': return <MenuUpdatesView />;
      case 'onboarding': return <OnboardingView />;
      default: return null;
    }
  }, [activeTopic]);

  return (
    <div style={s.shell}>
      {/* Top Bar */}
      <div style={s.topBar}>
        <Coffee size={20} style={{ color: 'var(--color-accent-primary)' }} />
        <span style={{ fontWeight: 700, fontSize: 15 }}>Virtual Coach</span>
        <span style={{ fontSize: 11, color: 'var(--color-text-muted)', borderLeft: '1px solid var(--color-border-default)', paddingLeft: 12 }}>Copilot Studio Agent | 500+ Stores</span>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Store selector */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => { setShowStoreDropdown((v) => !v); setShowRoleDropdown(false); }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--color-border-default)', background: 'var(--color-surface-tertiary)', color: 'var(--color-text-primary)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-family-sans)' }}
            >
              <Building2 size={13} /> {selectedStore} <ChevronDown size={12} />
            </button>
            {showStoreDropdown && (
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border-default)', borderRadius: 8, padding: 4, zIndex: 100, minWidth: 200, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                {STORE_OPTIONS.map((name) => (
                  <div key={name} onClick={() => { setSelectedStore(name); setShowStoreDropdown(false); }} style={{ padding: '6px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12, background: selectedStore === name ? 'var(--color-surface-hover)' : 'transparent', fontWeight: selectedStore === name ? 600 : 400 }} onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-surface-hover)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = selectedStore === name ? 'var(--color-surface-hover)' : 'transparent'; }}>
                    {name}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Role selector */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => { setShowRoleDropdown((v) => !v); setShowStoreDropdown(false); }}
              style={{ ...s.badge(roleColors[role].color, roleColors[role].bg), cursor: 'pointer', border: 'none', fontFamily: 'var(--font-family-sans)', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <User size={11} /> {role} <ChevronDown size={10} />
            </button>
            {showRoleDropdown && (
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border-default)', borderRadius: 8, padding: 4, zIndex: 100, minWidth: 140, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                {(['Barista', 'Shift Lead', 'Store Manager'] as UserRole[]).map((r) => (
                  <div key={r} onClick={() => { setRole(r); setShowRoleDropdown(false); }} style={{ padding: '6px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12, background: role === r ? 'var(--color-surface-hover)' : 'transparent', fontWeight: role === r ? 600 : 400 }} onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-surface-hover)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = role === r ? 'var(--color-surface-hover)' : 'transparent'; }}>
                    {r}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={s.body}>
        {/* Sidebar */}
        <div style={s.sidebar}>
          <div style={{ padding: '12px 14px 8px', fontSize: 10, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Topics</div>
          <div style={{ flex: 1, overflow: 'auto', paddingBottom: 8 }}>
            {TOPIC_NAV.map((item) => (
              <div key={item.id} onClick={() => setActiveTopic(item.id)} style={s.sidebarItem(activeTopic === item.id)}>
                <span style={{ flexShrink: 0, display: 'flex' }}>{item.icon}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid var(--color-border-default)', padding: 8 }}>
            <div style={{ ...s.sidebarItem(false), color: 'var(--color-text-muted)' }}>
              <Settings size={16} />
              <span>Agent Settings</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div style={s.main}>
          <h1 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 4px 0' }}>{topicHeadings[activeTopic]}</h1>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '0 0 20px 0' }}>
            Knowledge grounded from SharePoint hub libraries | {selectedStore}
          </p>
          {renderContent()}
        </div>

        {/* Chat Panel */}
        <div style={s.chatPanel}>
          <ChatPanel />
        </div>
      </div>

      {/* Status Bar */}
      <div style={s.statusBar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Wifi size={11} style={{ color: 'var(--color-status-success)' }} />
          <span>SharePoint Sync: Connected</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Database size={11} style={{ color: 'var(--color-status-info)' }} />
          <span>Knowledge: Updated 12 min ago</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Layers size={11} style={{ color: '#c586c0' }} />
          <span>Hub: Corporate Root &gt; Pacific Northwest &gt; {selectedStore}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginLeft: 'auto' }}>
          <RefreshCw size={11} />
          <span>Copilot Studio v2.4</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <BarChart3 size={11} />
          <span>526 stores active</span>
        </div>
      </div>
    </div>
  );
}
