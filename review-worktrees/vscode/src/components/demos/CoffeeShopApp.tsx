import { useState } from 'react';
import {
  Coffee,
  ShoppingCart,
  Plus,
  Minus,
  CreditCard,
  Receipt,
  TrendingUp,
  Package,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Category = 'Hot Drinks' | 'Cold Drinks' | 'Food' | 'Pastries';

interface MenuItem {
  id: string;
  name: string;
  category: Category;
  price: number;
  description: string;
  emoji: string;
  gradient: string;
}

interface OrderItem {
  menuItem: MenuItem;
  quantity: number;
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const MENU_ITEMS: MenuItem[] = [
  {
    id: 'espresso',
    name: 'Espresso',
    category: 'Hot Drinks',
    price: 3.5,
    description: 'Double shot, rich crema',
    emoji: '☕',
    gradient: 'linear-gradient(145deg, #4a2c0a 0%, #6b3d14 40%, #3d1f05 100%)',
  },
  {
    id: 'cappuccino',
    name: 'Cappuccino',
    category: 'Hot Drinks',
    price: 5.25,
    description: 'Steamed milk, velvety foam',
    emoji: '☕',
    gradient: 'linear-gradient(145deg, #7a4f2a 0%, #9a6b40 40%, #5c3618 100%)',
  },
  {
    id: 'latte',
    name: 'Café Latte',
    category: 'Hot Drinks',
    price: 5.75,
    description: 'Smooth espresso and milk',
    emoji: '☕',
    gradient: 'linear-gradient(145deg, #8b5e3c 0%, #a87048 40%, #6b4428 100%)',
  },
  {
    id: 'flat-white',
    name: 'Flat White',
    category: 'Hot Drinks',
    price: 5.5,
    description: 'Microfoam, bold ratio',
    emoji: '☕',
    gradient: 'linear-gradient(145deg, #5c3d20 0%, #7a5230 40%, #402a14 100%)',
  },
  {
    id: 'iced-latte',
    name: 'Iced Latte',
    category: 'Cold Drinks',
    price: 6.0,
    description: 'Chilled espresso, cold milk',
    emoji: '🧊',
    gradient: 'linear-gradient(145deg, #2d6a8a 0%, #4a8fad 40%, #1d4e68 100%)',
  },
  {
    id: 'cold-brew',
    name: 'Cold Brew',
    category: 'Cold Drinks',
    price: 5.5,
    description: '18-hour steep, smooth finish',
    emoji: '🧊',
    gradient: 'linear-gradient(145deg, #1a3d52 0%, #2e6278 40%, #112840 100%)',
  },
  {
    id: 'frappuccino',
    name: 'Frappé',
    category: 'Cold Drinks',
    price: 6.5,
    description: 'Blended, whipped cream',
    emoji: '🥤',
    gradient: 'linear-gradient(145deg, #4a7c6a 0%, #68a090 40%, #345a4a 100%)',
  },
  {
    id: 'matcha-latte',
    name: 'Matcha Latte',
    category: 'Cold Drinks',
    price: 6.25,
    description: 'Ceremonial grade, oat milk',
    emoji: '🍵',
    gradient: 'linear-gradient(145deg, #3d6b3a 0%, #5a9456 40%, #2a4e28 100%)',
  },
  {
    id: 'avocado-toast',
    name: 'Avocado Toast',
    category: 'Food',
    price: 9.5,
    description: 'Sourdough, chili flakes',
    emoji: '🥑',
    gradient: 'linear-gradient(145deg, #5a7a3a 0%, #7a9e50 40%, #3e5828 100%)',
  },
  {
    id: 'brekkie-wrap',
    name: 'Brekkie Wrap',
    category: 'Food',
    price: 10.5,
    description: 'Egg, cheddar, salsa',
    emoji: '🌯',
    gradient: 'linear-gradient(145deg, #8a5a20 0%, #aa7a3a 40%, #6a3e14 100%)',
  },
  {
    id: 'croissant',
    name: 'Butter Croissant',
    category: 'Pastries',
    price: 4.25,
    description: 'Flaky, all-butter laminated',
    emoji: '🥐',
    gradient: 'linear-gradient(145deg, #b8863c 0%, #d4a858 40%, #8c6228 100%)',
  },
  {
    id: 'cinnamon-roll',
    name: 'Cinnamon Roll',
    category: 'Pastries',
    price: 5.0,
    description: 'Cream cheese glaze',
    emoji: '🍥',
    gradient: 'linear-gradient(145deg, #a06838 0%, #c4884e 40%, #7a4e24 100%)',
  },
  {
    id: 'banana-bread',
    name: 'Banana Bread',
    category: 'Pastries',
    price: 4.75,
    description: 'Walnut, brown sugar crust',
    emoji: '🍞',
    gradient: 'linear-gradient(145deg, #9a7040 0%, #ba9060 40%, #785030 100%)',
  },
];

const CATEGORIES: Category[] = ['Hot Drinks', 'Cold Drinks', 'Food', 'Pastries'];

const TAX_RATE = 0.0875;

// ---------------------------------------------------------------------------
// Daily stats seed data
// ---------------------------------------------------------------------------

const DAILY_STATS = {
  ordersToday: 47,
  revenue: 312.8,
  avgOrder: 6.65,
  topItem: 'Cappuccino',
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div
      style={{
        background: 'linear-gradient(145deg, #3d2010 0%, #5a3018 60%, #2e1608 100%)',
        borderRadius: '10px',
        padding: '12px 16px',
        flex: '1',
        minWidth: '120px',
        boxShadow: `
          4px 4px 8px rgba(0,0,0,0.5),
          -1px -1px 4px rgba(255,220,160,0.08),
          inset 0 1px 0 rgba(255,220,160,0.12),
          inset 0 -2px 0 rgba(0,0,0,0.3)
        `,
        border: '1px solid rgba(180,120,60,0.2)',
        transform: 'translateZ(0)',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        cursor: 'default',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px) translateZ(0)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = `
          6px 6px 12px rgba(0,0,0,0.6),
          -1px -1px 4px rgba(255,220,160,0.12),
          inset 0 1px 0 rgba(255,220,160,0.18),
          inset 0 -2px 0 rgba(0,0,0,0.3)
        `;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateZ(0)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = `
          4px 4px 8px rgba(0,0,0,0.5),
          -1px -1px 4px rgba(255,220,160,0.08),
          inset 0 1px 0 rgba(255,220,160,0.12),
          inset 0 -2px 0 rgba(0,0,0,0.3)
        `;
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
        <span style={{ color: '#d4a054', opacity: 0.9 }}>{icon}</span>
        <span style={{ fontSize: '10px', color: '#c49060', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ fontSize: '22px', fontWeight: 700, color: '#f5e6c8', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: '11px', color: '#a07840', marginTop: '3px' }}>{sub}</div>}
    </div>
  );
}

function MenuCard({
  item,
  onAdd,
}: {
  item: MenuItem;
  onAdd: (item: MenuItem) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  return (
    <div
      onClick={() => onAdd(item)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{
        background: item.gradient,
        borderRadius: '12px',
        padding: '14px',
        cursor: 'pointer',
        userSelect: 'none',
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform 0.18s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.18s ease',
        transform: pressed
          ? 'perspective(600px) translateZ(2px) scale(0.97)'
          : hovered
            ? 'perspective(600px) translateZ(18px) translateY(-3px)'
            : 'perspective(600px) translateZ(0px)',
        boxShadow: pressed
          ? `
            2px 2px 4px rgba(0,0,0,0.6),
            inset 0 2px 4px rgba(0,0,0,0.4),
            inset 0 -1px 0 rgba(255,200,120,0.05)
          `
          : hovered
            ? `
              0 16px 32px rgba(0,0,0,0.6),
              0 6px 12px rgba(0,0,0,0.4),
              -2px -2px 6px rgba(255,200,100,0.15),
              inset 0 1px 0 rgba(255,220,160,0.25),
              inset 0 -3px 0 rgba(0,0,0,0.35)
            `
            : `
              4px 6px 14px rgba(0,0,0,0.5),
              2px 2px 4px rgba(0,0,0,0.3),
              -1px -1px 3px rgba(255,200,100,0.08),
              inset 0 1px 0 rgba(255,220,160,0.18),
              inset 0 -3px 0 rgba(0,0,0,0.3)
            `,
        border: '1px solid rgba(200,150,80,0.18)',
      }}
    >
      {/* Top-edge highlight simulating light catching the top face */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: '10%',
        right: '10%',
        height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(255,230,180,0.35), transparent)',
        pointerEvents: 'none',
      }} />
      {/* Side-face depth strip */}
      <div style={{
        position: 'absolute',
        right: 0,
        top: '8px',
        bottom: '8px',
        width: '4px',
        background: 'linear-gradient(180deg, rgba(0,0,0,0.15), rgba(0,0,0,0.4))',
        borderRadius: '0 12px 12px 0',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: '8px',
        right: '8px',
        height: '4px',
        background: 'rgba(0,0,0,0.35)',
        borderRadius: '0 0 12px 12px',
        pointerEvents: 'none',
      }} />

      <div style={{ fontSize: '28px', marginBottom: '8px', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.5))' }}>
        {item.emoji}
      </div>
      <div style={{ fontWeight: 700, fontSize: '13px', color: '#f5e6c8', marginBottom: '3px', lineHeight: 1.2 }}>
        {item.name}
      </div>
      <div style={{ fontSize: '10px', color: 'rgba(240,220,180,0.65)', marginBottom: '10px', lineHeight: 1.3 }}>
        {item.description}
      </div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{
          fontWeight: 800,
          fontSize: '15px',
          color: '#ffd07a',
          textShadow: '0 1px 3px rgba(0,0,0,0.5)',
        }}>
          ${item.price.toFixed(2)}
        </span>
        <div style={{
          background: 'rgba(255,200,100,0.18)',
          borderRadius: '6px',
          padding: '3px 7px',
          fontSize: '10px',
          color: '#ffd07a',
          border: '1px solid rgba(255,200,100,0.25)',
          fontWeight: 600,
        }}>
          + Add
        </div>
      </div>
    </div>
  );
}

function OrderRow({
  orderItem,
  onIncrement,
  onDecrement,
}: {
  orderItem: OrderItem;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '10px 12px',
      background: 'linear-gradient(145deg, rgba(80,45,15,0.5), rgba(60,35,10,0.5))',
      borderRadius: '8px',
      marginBottom: '6px',
      border: '1px solid rgba(180,120,50,0.15)',
      boxShadow: 'inset 0 1px 0 rgba(255,210,140,0.06), 0 2px 4px rgba(0,0,0,0.3)',
    }}>
      <span style={{ fontSize: '18px' }}>{orderItem.menuItem.emoji}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: '#f0ddb8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {orderItem.menuItem.name}
        </div>
        <div style={{ fontSize: '10px', color: '#a07840' }}>
          ${orderItem.menuItem.price.toFixed(2)} ea
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <button
          onClick={onDecrement}
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '6px',
            border: '1px solid rgba(180,100,40,0.4)',
            background: 'linear-gradient(145deg, #4a2a0c, #3a1e08)',
            color: '#e8c880',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '2px 2px 4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,200,100,0.1)',
            transition: 'transform 0.1s, box-shadow 0.1s',
          }}
          onMouseDown={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.92)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '1px 1px 2px rgba(0,0,0,0.4), inset 0 2px 3px rgba(0,0,0,0.3)';
          }}
          onMouseUp={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '2px 2px 4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,200,100,0.1)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '2px 2px 4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,200,100,0.1)';
          }}
        >
          <Minus size={12} />
        </button>
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#f0ddb8', minWidth: '16px', textAlign: 'center' }}>
          {orderItem.quantity}
        </span>
        <button
          onClick={onIncrement}
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '6px',
            border: '1px solid rgba(180,100,40,0.4)',
            background: 'linear-gradient(145deg, #6a3a10, #4a2a08)',
            color: '#e8c880',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '2px 2px 4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,200,100,0.1)',
            transition: 'transform 0.1s, box-shadow 0.1s',
          }}
          onMouseDown={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.92)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '1px 1px 2px rgba(0,0,0,0.4), inset 0 2px 3px rgba(0,0,0,0.3)';
          }}
          onMouseUp={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '2px 2px 4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,200,100,0.1)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '2px 2px 4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,200,100,0.1)';
          }}
        >
          <Plus size={12} />
        </button>
      </div>
      <div style={{ fontSize: '12px', fontWeight: 700, color: '#ffd07a', minWidth: '44px', textAlign: 'right' }}>
        ${(orderItem.menuItem.price * orderItem.quantity).toFixed(2)}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function CoffeeShopApp() {
  const [activeCategory, setActiveCategory] = useState<Category>('Hot Drinks');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [payPressed, setPayPressed] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [orderNumber, setOrderNumber] = useState(48);

  const filteredItems = MENU_ITEMS.filter((m) => m.category === activeCategory);

  const subtotal = orderItems.reduce((acc, oi) => acc + oi.menuItem.price * oi.quantity, 0);
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;

  function addItem(item: MenuItem) {
    setOrderItems((prev) => {
      const existing = prev.find((oi) => oi.menuItem.id === item.id);
      if (existing) {
        return prev.map((oi) =>
          oi.menuItem.id === item.id ? { ...oi, quantity: oi.quantity + 1 } : oi
        );
      }
      return [...prev, { menuItem: item, quantity: 1 }];
    });
  }

  function increment(id: string) {
    setOrderItems((prev) =>
      prev.map((oi) => (oi.menuItem.id === id ? { ...oi, quantity: oi.quantity + 1 } : oi))
    );
  }

  function decrement(id: string) {
    setOrderItems((prev) =>
      prev
        .map((oi) => (oi.menuItem.id === id ? { ...oi, quantity: oi.quantity - 1 } : oi))
        .filter((oi) => oi.quantity > 0)
    );
  }

  function handlePay() {
    if (orderItems.length === 0) return;
    setShowReceipt(true);
    setOrderNumber((n) => n + 1);
    setOrderItems([]);
  }

  const categoryIcon: Record<Category, React.ReactNode> = {
    'Hot Drinks': <Coffee size={13} />,
    'Cold Drinks': <Package size={13} />,
    'Food': <Package size={13} />,
    'Pastries': <Package size={13} />,
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      minHeight: '600px',
      background: 'linear-gradient(160deg, #1a0e04 0%, #2a1608 40%, #1e0f05 100%)',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#f0ddb8',
      overflow: 'hidden',
    }}>

      {/* ------------------------------------------------------------------ */}
      {/* Header */}
      {/* ------------------------------------------------------------------ */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '14px 20px 10px',
        borderBottom: '1px solid rgba(180,110,40,0.2)',
        background: 'linear-gradient(180deg, rgba(60,28,8,0.8), rgba(30,14,4,0.8))',
        backdropFilter: 'blur(4px)',
        flexShrink: 0,
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: 'linear-gradient(145deg, #8b4e1e, #5a3010)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '3px 3px 6px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,200,100,0.2)',
          border: '1px solid rgba(180,120,50,0.3)',
        }}>
          <Coffee size={20} color="#ffd07a" />
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: '16px', color: '#f5e6c8', letterSpacing: '0.02em' }}>
            Grounds & Grace
          </div>
          <div style={{ fontSize: '10px', color: '#907050', letterSpacing: '0.06em' }}>
            POINT OF SALE SYSTEM
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#4caf50',
            boxShadow: '0 0 6px rgba(76,175,80,0.6)',
          }} />
          <span style={{ fontSize: '11px', color: '#90a870' }}>OPEN</span>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Daily sales dashboard strip */}
      {/* ------------------------------------------------------------------ */}
      <div style={{
        display: 'flex',
        gap: '10px',
        padding: '12px 20px',
        background: 'rgba(20,10,2,0.6)',
        borderBottom: '1px solid rgba(180,110,40,0.15)',
        flexShrink: 0,
        flexWrap: 'wrap',
      }}>
        <StatCard
          icon={<ShoppingCart size={14} />}
          label="Orders Today"
          value={String(DAILY_STATS.ordersToday + (orderNumber - 48))}
          sub="since 7:00 AM"
        />
        <StatCard
          icon={<TrendingUp size={14} />}
          label="Revenue"
          value={`$${(DAILY_STATS.revenue + (orderNumber - 48) * DAILY_STATS.avgOrder).toFixed(2)}`}
          sub="gross sales"
        />
        <StatCard
          icon={<CreditCard size={14} />}
          label="Avg Order"
          value={`$${DAILY_STATS.avgOrder.toFixed(2)}`}
          sub="per transaction"
        />
        <StatCard
          icon={<Coffee size={14} />}
          label="Top Item"
          value={DAILY_STATS.topItem}
          sub="most ordered"
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Main split layout */}
      {/* ------------------------------------------------------------------ */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ---------------------------------------------------------------- */}
        {/* LEFT: Menu */}
        {/* ---------------------------------------------------------------- */}
        <div style={{
          flex: '0 0 60%',
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid rgba(180,110,40,0.2)',
          overflow: 'hidden',
        }}>
          {/* Category tabs */}
          <div style={{
            display: 'flex',
            gap: '6px',
            padding: '12px 16px 10px',
            background: 'rgba(20,10,2,0.4)',
            flexShrink: 0,
            flexWrap: 'wrap',
          }}>
            {CATEGORIES.map((cat) => {
              const active = cat === activeCategory;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    border: active
                      ? '1px solid rgba(200,140,60,0.5)'
                      : '1px solid rgba(120,80,30,0.25)',
                    background: active
                      ? 'linear-gradient(145deg, #7a4a1a, #5a3210)'
                      : 'linear-gradient(145deg, #2e1808, #1e1005)',
                    color: active ? '#ffd07a' : '#907050',
                    fontSize: '12px',
                    fontWeight: active ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: active
                      ? '3px 3px 6px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,200,100,0.2), inset 0 -2px 0 rgba(0,0,0,0.3)'
                      : '2px 2px 4px rgba(0,0,0,0.3)',
                    letterSpacing: '0.02em',
                  }}
                >
                  {categoryIcon[cat]}
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Menu grid */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px 16px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: '12px',
            alignContent: 'start',
          }}>
            {filteredItems.map((item) => (
              <MenuCard key={item.id} item={item} onAdd={addItem} />
            ))}
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* RIGHT: Order builder */}
        {/* ---------------------------------------------------------------- */}
        <div style={{
          flex: '0 0 40%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: 'rgba(15,8,2,0.4)',
        }}>
          {/* Order header */}
          <div style={{
            padding: '14px 16px 10px',
            borderBottom: '1px solid rgba(180,110,40,0.15)',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <ShoppingCart size={16} color="#c49060" />
            <span style={{ fontWeight: 700, fontSize: '14px', color: '#f0ddb8' }}>Current Order</span>
            <span style={{
              marginLeft: 'auto',
              fontSize: '11px',
              color: '#907050',
              background: 'rgba(80,40,10,0.5)',
              padding: '2px 8px',
              borderRadius: '10px',
              border: '1px solid rgba(150,90,30,0.2)',
            }}>
              #{orderNumber}
            </span>
          </div>

          {/* Order items list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
            {orderItems.length === 0 ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                gap: '10px',
                opacity: 0.4,
              }}>
                <Coffee size={40} color="#907050" />
                <span style={{ fontSize: '13px', color: '#907050', textAlign: 'center' }}>
                  Tap menu items<br />to add to order
                </span>
              </div>
            ) : (
              orderItems.map((oi) => (
                <OrderRow
                  key={oi.menuItem.id}
                  orderItem={oi}
                  onIncrement={() => increment(oi.menuItem.id)}
                  onDecrement={() => decrement(oi.menuItem.id)}
                />
              ))
            )}
          </div>

          {/* Totals + Pay */}
          <div style={{
            padding: '12px 14px',
            borderTop: '1px solid rgba(180,110,40,0.15)',
            background: 'rgba(15,8,2,0.6)',
            flexShrink: 0,
          }}>
            {/* Subtotal / Tax / Total */}
            <div style={{ marginBottom: '12px' }}>
              {[
                { label: 'Subtotal', val: `$${subtotal.toFixed(2)}` },
                { label: `Tax (${(TAX_RATE * 100).toFixed(2)}%)`, val: `$${tax.toFixed(2)}` },
              ].map(({ label, val }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span style={{ fontSize: '12px', color: '#907050' }}>{label}</span>
                  <span style={{ fontSize: '12px', color: '#c49060' }}>{val}</span>
                </div>
              ))}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: '8px',
                borderTop: '1px solid rgba(180,110,40,0.2)',
              }}>
                <span style={{ fontSize: '15px', fontWeight: 700, color: '#f0ddb8' }}>Total</span>
                <span style={{ fontSize: '18px', fontWeight: 800, color: '#ffd07a' }}>${total.toFixed(2)}</span>
              </div>
            </div>

            {/* Volumetric Pay button */}
            <button
              onMouseDown={() => setPayPressed(true)}
              onMouseUp={() => { setPayPressed(false); handlePay(); }}
              onMouseLeave={() => setPayPressed(false)}
              disabled={orderItems.length === 0}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '10px',
                border: orderItems.length === 0
                  ? '1px solid rgba(100,70,30,0.2)'
                  : '1px solid rgba(200,140,60,0.45)',
                background: orderItems.length === 0
                  ? 'linear-gradient(145deg, #2a1808, #1e1005)'
                  : payPressed
                    ? 'linear-gradient(145deg, #6a3e10, #4a2808)'
                    : 'linear-gradient(145deg, #a05c1e, #7a4010)',
                color: orderItems.length === 0 ? '#604020' : '#ffd07a',
                fontWeight: 800,
                fontSize: '15px',
                cursor: orderItems.length === 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.1s ease',
                boxShadow: orderItems.length === 0
                  ? 'none'
                  : payPressed
                    ? '1px 2px 4px rgba(0,0,0,0.6), inset 0 3px 6px rgba(0,0,0,0.4)'
                    : '0 6px 14px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,210,120,0.25), inset 0 -4px 0 rgba(0,0,0,0.35)',
                transform: payPressed ? 'translateY(3px) scale(0.985)' : 'translateY(0) scale(1)',
                letterSpacing: '0.04em',
              }}
            >
              <CreditCard size={17} />
              {orderItems.length === 0 ? 'No Items' : `Charge $${total.toFixed(2)}`}
            </button>

            {/* Receipt button */}
            {showReceipt && (
              <button
                onClick={() => setShowReceipt((v) => !v)}
                style={{
                  marginTop: '8px',
                  width: '100%',
                  padding: '8px',
                  borderRadius: '8px',
                  border: '1px solid rgba(150,110,60,0.25)',
                  background: 'transparent',
                  color: '#a07840',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <Receipt size={13} />
                View last receipt
              </button>
            )}
          </div>

          {/* Receipt preview */}
          {showReceipt && (
            <div style={{
              margin: '0 14px 14px',
              borderRadius: '8px',
              background: `
                repeating-linear-gradient(
                  0deg,
                  rgba(245,235,210,0.03) 0px,
                  rgba(245,235,210,0.03) 1px,
                  transparent 1px,
                  transparent 18px
                ),
                linear-gradient(160deg, #2a1e0e, #1e1608)
              `,
              border: '1px solid rgba(200,160,80,0.2)',
              padding: '14px',
              boxShadow: 'inset 0 1px 0 rgba(255,220,160,0.08)',
              fontSize: '11px',
              color: '#c4a070',
              flexShrink: 0,
            }}>
              <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '13px', color: '#e8cc90', marginBottom: '8px', letterSpacing: '0.1em' }}>
                GROUNDS & GRACE
              </div>
              <div style={{ textAlign: 'center', color: '#907050', marginBottom: '10px', fontSize: '10px' }}>
                Order #{orderNumber - 1} — {new Date().toLocaleTimeString()}
              </div>
              <div style={{ borderTop: '1px dashed rgba(180,130,60,0.25)', paddingTop: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ color: '#a07840' }}>PAYMENT RECEIVED</span>
                  <span style={{ color: '#ffd07a', fontWeight: 700 }}>${total.toFixed(2)}</span>
                </div>
                <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '10px', color: '#705030', letterSpacing: '0.06em' }}>
                  THANK YOU — SEE YOU SOON
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
