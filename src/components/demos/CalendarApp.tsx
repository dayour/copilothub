import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Plus,
  Clock,
  X,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

type EventCategory = 'work' | 'personal' | 'health' | 'social';

interface CalendarEvent {
  id: string;
  title: string;
  time: string;
  category: EventCategory;
  description?: string;
}

/* -------------------------------------------------------------------------- */
/*  Category palette -- maps to CopilotHub theme tokens where possible        */
/* -------------------------------------------------------------------------- */

const CATEGORY_COLORS: Record<
  EventCategory,
  { bg: string; border: string; text: string; glow: string; label: string }
> = {
  work: {
    bg: 'rgba(0,120,212,0.18)',
    border: 'var(--color-accent-primary)',
    text: 'var(--color-enterprise-blue-light)',
    glow: '0 0 8px rgba(0,120,212,0.4)',
    label: 'Work',
  },
  personal: {
    bg: 'rgba(78,201,176,0.18)',
    border: 'var(--color-status-success)',
    text: 'var(--color-status-success)',
    glow: '0 0 8px rgba(78,201,176,0.4)',
    label: 'Personal',
  },
  health: {
    bg: 'rgba(244,71,71,0.18)',
    border: 'var(--color-status-error)',
    text: 'var(--color-status-error)',
    glow: '0 0 8px rgba(244,71,71,0.35)',
    label: 'Health',
  },
  social: {
    bg: 'rgba(180,120,240,0.18)',
    border: '#b478f0',
    text: '#c9a0f8',
    glow: '0 0 8px rgba(180,120,240,0.35)',
    label: 'Social',
  },
};

/* -------------------------------------------------------------------------- */
/*  Seed events -- spread across the CURRENT month so they always render      */
/* -------------------------------------------------------------------------- */

function generateSeedEvents(): CalendarEvent[] {
  return [
    { id: 'e1', title: 'Sprint Planning', time: '09:00', category: 'work', description: 'Q3 sprint kickoff with the engineering team.' },
    { id: 'e2', title: 'Design Review', time: '14:00', category: 'work', description: 'Review new dashboard mockups with design.' },
    { id: 'e3', title: 'Morning Run', time: '06:30', category: 'health', description: '5K route through Greenlake.' },
    { id: 'e4', title: 'Dentist Appointment', time: '11:00', category: 'health', description: 'Routine cleaning -- Dr. Park.' },
    { id: 'e5', title: 'Lunch with Sarah', time: '12:00', category: 'social', description: 'Catch up at the Thai place downtown.' },
    { id: 'e6', title: 'Book Club', time: '19:00', category: 'social', description: 'Discussing "Project Hail Mary" this month.' },
    { id: 'e7', title: 'Grocery Shopping', time: '10:00', category: 'personal', description: 'Restock weekly essentials.' },
    { id: 'e8', title: 'Piano Practice', time: '17:30', category: 'personal', description: 'Chopin Nocturne Op.9 No.2 -- focus on dynamics.' },
    { id: 'e9', title: 'Team Standup', time: '09:30', category: 'work', description: 'Daily sync -- keep it under 15 min.' },
    { id: 'e10', title: 'Yoga Class', time: '18:00', category: 'health', description: 'Hot yoga at CorePower.' },
  ];
}

function buildEventMap(): Map<string, CalendarEvent[]> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const events = generateSeedEvents();
  const map = new Map<string, CalendarEvent[]>();

  /* Distribute events deterministically across the month */
  events.forEach((evt, idx) => {
    const day = ((idx * 3 + 2) % daysInMonth) + 1;
    const key = `${year}-${month}-${day}`;
    const existing = map.get(key) ?? [];
    existing.push(evt);
    map.set(key, existing);
  });

  return map;
}

/* -------------------------------------------------------------------------- */
/*  Calendar math helpers                                                     */
/* -------------------------------------------------------------------------- */

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/* -------------------------------------------------------------------------- */
/*  CSS-in-JS helper -- avoids needing an external stylesheet                 */
/* -------------------------------------------------------------------------- */

const STYLE_ID = 'calendar-app-keyframes';

const KEYFRAMES_CSS = `
@keyframes calFadeSlideIn {
  from { opacity: 0; transform: perspective(800px) rotateX(-4deg) translateY(16px); }
  to   { opacity: 1; transform: perspective(800px) rotateX(0deg) translateY(0); }
}
@keyframes calDayPop {
  0%   { transform: scale(0.85) translateZ(0); opacity: 0; }
  60%  { transform: scale(1.04) translateZ(8px); }
  100% { transform: scale(1) translateZ(4px); opacity: 1; }
}
@keyframes calSlidePanel {
  from { opacity: 0; transform: translateX(24px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes calStickyIn {
  from { opacity: 0; transform: rotate(-2deg) translateY(8px) scale(0.95); }
  to   { opacity: 1; transform: rotate(var(--sticky-rotate,0deg)) translateY(0) scale(1); }
}
@keyframes calGlowPulse {
  0%, 100% { box-shadow: 0 0 6px 2px rgba(0,120,212,0.5), inset 0 0 4px rgba(0,120,212,0.15); }
  50%      { box-shadow: 0 0 14px 4px rgba(0,120,212,0.7), inset 0 0 8px rgba(0,120,212,0.25); }
}
`;

function ensureKeyframes() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = KEYFRAMES_CSS;
  document.head.appendChild(style);
}

/* -------------------------------------------------------------------------- */
/*  Sub-components                                                            */
/* -------------------------------------------------------------------------- */

function StickyNote({
  event,
  index,
}: {
  event: CalendarEvent;
  index: number;
}) {
  const cat = CATEGORY_COLORS[event.category];
  const rotation = index % 2 === 0 ? -1.5 : 1.2;

  return (
    <div
      style={{
        ['--sticky-rotate' as string]: `${rotation}deg`,
        background: cat.bg,
        borderLeft: `3px solid ${cat.border}`,
        color: cat.text,
        borderRadius: 6,
        padding: '6px 8px',
        fontSize: 11,
        lineHeight: 1.35,
        animation: 'calStickyIn 0.35s ease-out both',
        animationDelay: `${index * 0.07}s`,
        transform: `rotate(${rotation}deg)`,
        boxShadow: `0 2px 6px rgba(0,0,0,0.35), ${cat.glow}`,
        cursor: 'default',
        transition: 'transform 0.2s, box-shadow 0.2s',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap' as const,
      }}
      title={`${event.time} -- ${event.title}`}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = `rotate(0deg) translateY(-2px) scale(1.04)`;
        e.currentTarget.style.boxShadow = `0 6px 16px rgba(0,0,0,0.5), ${cat.glow}`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = `rotate(${rotation}deg)`;
        e.currentTarget.style.boxShadow = `0 2px 6px rgba(0,0,0,0.35), ${cat.glow}`;
      }}
    >
      <span style={{ fontWeight: 600 }}>{event.time}</span>{' '}
      {event.title}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  DayCell                                                                   */
/* -------------------------------------------------------------------------- */

function DayCell({
  day,
  isToday,
  isSelected,
  events,
  animationDelay,
  onClick,
}: {
  day: number;
  isToday: boolean;
  isSelected: boolean;
  events: CalendarEvent[];
  animationDelay: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        position: 'relative',
        background: isSelected
          ? 'var(--color-surface-active)'
          : 'var(--color-surface-elevated)',
        border: isToday
          ? '1.5px solid var(--color-accent-primary)'
          : '1px solid var(--color-border-default)',
        borderRadius: 10,
        padding: '6px 8px',
        minHeight: 90,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        textAlign: 'left',
        color: 'var(--color-text-primary)',
        fontFamily: 'var(--font-family-sans)',
        fontSize: 12,
        transformStyle: 'preserve-3d',
        transform: 'translateZ(4px)',
        animation: `calDayPop 0.4s ease-out ${animationDelay}s both`,
        boxShadow: isToday
          ? '0 4px 16px rgba(0,0,0,0.45), 0 0 0 1.5px var(--color-accent-primary)'
          : isSelected
            ? '0 4px 14px rgba(0,0,0,0.4)'
            : '0 3px 10px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.2)',
        transition: 'transform 0.2s, box-shadow 0.2s, background 0.2s',
        outline: 'none',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.transform = 'translateZ(10px) scale(1.03)';
          e.currentTarget.style.boxShadow = isToday
            ? '0 8px 24px rgba(0,0,0,0.5), 0 0 0 2px var(--color-accent-primary)'
            : '0 8px 24px rgba(0,0,0,0.45)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateZ(4px)';
        e.currentTarget.style.boxShadow = isToday
          ? '0 4px 16px rgba(0,0,0,0.45), 0 0 0 1.5px var(--color-accent-primary)'
          : isSelected
            ? '0 4px 14px rgba(0,0,0,0.4)'
            : '0 3px 10px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.2)';
      }}
      aria-label={`Day ${day}${isToday ? ', today' : ''}${events.length ? `, ${events.length} event${events.length > 1 ? 's' : ''}` : ''}`}
    >
      {/* Day number with optional glow ring */}
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 26,
          height: 26,
          borderRadius: '50%',
          fontWeight: isToday ? 700 : 500,
          fontSize: 13,
          background: isToday ? 'var(--color-accent-primary)' : 'transparent',
          color: isToday ? '#fff' : 'var(--color-text-primary)',
          animation: isToday ? 'calGlowPulse 2.5s ease-in-out infinite' : 'none',
          flexShrink: 0,
        }}
      >
        {day}
      </span>

      {/* Event sticky notes (max 2 visible in cell) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0, flex: 1 }}>
        {events.slice(0, 2).map((evt, i) => (
          <StickyNote key={evt.id} event={evt} index={i} />
        ))}
        {events.length > 2 && (
          <span
            style={{
              fontSize: 10,
              color: 'var(--color-text-muted)',
              paddingLeft: 2,
            }}
          >
            +{events.length - 2} more
          </span>
        )}
      </div>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*  EmptyCell -- fills leading/trailing blanks in the grid                    */
/* -------------------------------------------------------------------------- */

function EmptyCell() {
  return (
    <div
      style={{
        background: 'var(--color-surface-secondary)',
        border: '1px solid var(--color-border-subtle)',
        borderRadius: 10,
        minHeight: 90,
        opacity: 0.35,
      }}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  DayDetailPanel                                                            */
/* -------------------------------------------------------------------------- */

function DayDetailPanel({
  day,
  month,
  year,
  events,
  onClose,
}: {
  day: number;
  month: number;
  year: number;
  events: CalendarEvent[];
  onClose: () => void;
}) {
  const dateStr = new Date(year, month, day).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        width: 320,
        maxWidth: '100%',
        background: 'var(--color-surface-secondary)',
        borderLeft: '1px solid var(--color-border-default)',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.4)',
        animation: 'calSlidePanel 0.3s ease-out both',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 20,
        overflow: 'hidden',
      }}
    >
      {/* Panel header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          borderBottom: '1px solid var(--color-border-default)',
          background: 'var(--color-surface-tertiary)',
        }}
      >
        <div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: 'var(--color-text-primary)',
            }}
          >
            {MONTH_NAMES[month]} {day}
          </div>
          <div
            style={{
              fontSize: 11,
              color: 'var(--color-text-secondary)',
              marginTop: 2,
            }}
          >
            {dateStr}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-text-secondary)',
            cursor: 'pointer',
            padding: 4,
            borderRadius: 6,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.15s, background 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--color-surface-hover)';
            e.currentTarget.style.color = 'var(--color-text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'none';
            e.currentTarget.style.color = 'var(--color-text-secondary)';
          }}
          aria-label="Close day detail"
        >
          <X size={18} />
        </button>
      </div>

      {/* Events list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {events.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '40px 0',
              color: 'var(--color-text-muted)',
            }}
          >
            <Calendar size={32} strokeWidth={1.2} />
            <span style={{ fontSize: 13 }}>No events this day</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {events.map((evt, idx) => {
              const cat = CATEGORY_COLORS[evt.category];
              return (
                <div
                  key={evt.id}
                  style={{
                    background: cat.bg,
                    borderLeft: `4px solid ${cat.border}`,
                    borderRadius: 8,
                    padding: '12px 14px',
                    animation: `calStickyIn 0.35s ease-out ${idx * 0.08}s both`,
                    ['--sticky-rotate' as string]: '0deg',
                    boxShadow: `0 2px 8px rgba(0,0,0,0.25), ${cat.glow}`,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      marginBottom: 4,
                    }}
                  >
                    <Clock size={12} style={{ color: cat.text, flexShrink: 0 }} />
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: cat.text,
                      }}
                    >
                      {evt.time}
                    </span>
                    <span
                      style={{
                        marginLeft: 'auto',
                        fontSize: 9,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: `${cat.border}33`,
                        color: cat.text,
                      }}
                    >
                      {cat.label}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--color-text-primary)',
                      marginBottom: 4,
                    }}
                  >
                    {evt.title}
                  </div>
                  {evt.description && (
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--color-text-secondary)',
                        lineHeight: 1.45,
                      }}
                    >
                      {evt.description}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add event button (decorative -- no handler) */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--color-border-default)',
        }}
      >
        <button
          type="button"
          style={{
            width: '100%',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '8px 0',
            borderRadius: 8,
            border: '1px dashed var(--color-border-default)',
            background: 'transparent',
            color: 'var(--color-accent-primary)',
            fontFamily: 'var(--font-family-sans)',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.15s, border-color 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--color-surface-hover)';
            e.currentTarget.style.borderColor = 'var(--color-accent-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.borderColor = 'var(--color-border-default)';
          }}
        >
          <Plus size={14} />
          Add Event
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main CalendarApp component                                                */
/* -------------------------------------------------------------------------- */

export function CalendarApp() {
  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [animKey, setAnimKey] = useState(0);

  /* Stable event map seeded against CURRENT month */
  const eventMap = useRef(buildEventMap());

  /* Inject keyframes once */
  useEffect(() => {
    ensureKeyframes();
  }, []);

  /* Navigation */
  const goToPrevMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 0) {
        setViewYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
    setSelectedDay(null);
    setAnimKey((k) => k + 1);
  }, []);

  const goToNextMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 11) {
        setViewYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
    setSelectedDay(null);
    setAnimKey((k) => k + 1);
  }, []);

  const goToToday = useCallback(() => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setSelectedDay(today.getDate());
    setAnimKey((k) => k + 1);
  }, [today]);

  /* Calendar grid data */
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth);
  const isCurrentMonth =
    viewYear === today.getFullYear() && viewMonth === today.getMonth();

  /* Build array of day cells */
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const trailingBlanks = (7 - (cells.length % 7)) % 7;
  for (let i = 0; i < trailingBlanks; i++) cells.push(null);

  const getEventsForDay = useCallback(
    (day: number): CalendarEvent[] => {
      const key = `${viewYear}-${viewMonth}-${day}`;
      return eventMap.current.get(key) ?? [];
    },
    [viewYear, viewMonth],
  );

  const selectedEvents = selectedDay !== null ? getEventsForDay(selectedDay) : [];

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background:
          'linear-gradient(180deg, var(--color-surface-primary) 0%, var(--color-surface-secondary) 100%)',
        fontFamily: 'var(--font-family-sans)',
        color: 'var(--color-text-primary)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* ------------------------------------------------------------------ */}
      {/*  Header                                                            */}
      {/* ------------------------------------------------------------------ */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px 12px',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Calendar
            size={22}
            style={{ color: 'var(--color-accent-primary)' }}
          />
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: -0.3,
              margin: 0,
            }}
          >
            {MONTH_NAMES[viewMonth]} {viewYear}
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <NavButton onClick={goToPrevMonth} label="Previous month">
            <ChevronLeft size={18} />
          </NavButton>
          <button
            type="button"
            onClick={goToToday}
            style={{
              background: 'var(--color-surface-elevated)',
              border: '1px solid var(--color-border-default)',
              borderRadius: 8,
              padding: '5px 14px',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--color-accent-primary)',
              cursor: 'pointer',
              fontFamily: 'var(--font-family-sans)',
              transition: 'background 0.15s, box-shadow 0.15s',
              boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--color-surface-hover)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.35)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--color-surface-elevated)';
              e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.25)';
            }}
          >
            Today
          </button>
          <NavButton onClick={goToNextMonth} label="Next month">
            <ChevronRight size={18} />
          </NavButton>
        </div>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/*  Day-of-week headers                                               */}
      {/* ------------------------------------------------------------------ */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 6,
          padding: '0 24px 8px',
          flexShrink: 0,
        }}
      >
        {DAY_HEADERS.map((dh) => (
          <div
            key={dh}
            style={{
              textAlign: 'center',
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: 0.8,
              color: 'var(--color-text-muted)',
              padding: '4px 0',
            }}
          >
            {dh}
          </div>
        ))}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/*  Calendar grid (3D perspective container)                           */}
      {/* ------------------------------------------------------------------ */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '0 24px 24px',
          perspective: 1200,
          perspectiveOrigin: '50% 20%',
          position: 'relative',
        }}
      >
        <div
          key={animKey}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: 6,
            transformStyle: 'preserve-3d',
            animation: 'calFadeSlideIn 0.5s ease-out both',
          }}
        >
          {cells.map((day, idx) => {
            if (day === null) {
              return <EmptyCell key={`empty-${idx}`} />;
            }
            const dayEvents = getEventsForDay(day);
            const row = Math.floor(idx / 7);
            const col = idx % 7;
            const delay = row * 0.04 + col * 0.02;

            return (
              <DayCell
                key={`day-${day}`}
                day={day}
                isToday={isCurrentMonth && day === today.getDate()}
                isSelected={selectedDay === day}
                events={dayEvents}
                animationDelay={delay}
                onClick={() =>
                  setSelectedDay((prev) => (prev === day ? null : day))
                }
              />
            );
          })}
        </div>

        {/* Day detail slide-in panel */}
        {selectedDay !== null && (
          <DayDetailPanel
            day={selectedDay}
            month={viewMonth}
            year={viewYear}
            events={selectedEvents}
            onClose={() => setSelectedDay(null)}
          />
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/*  Footer legend                                                     */}
      {/* ------------------------------------------------------------------ */}
      <footer
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 20,
          padding: '10px 24px',
          borderTop: '1px solid var(--color-border-subtle)',
          flexShrink: 0,
        }}
      >
        {(Object.keys(CATEGORY_COLORS) as EventCategory[]).map((cat) => {
          const c = CATEGORY_COLORS[cat];
          return (
            <div
              key={cat}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 11,
                color: 'var(--color-text-secondary)',
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: 10,
                  height: 10,
                  borderRadius: 3,
                  background: c.border,
                  boxShadow: c.glow,
                }}
              />
              {c.label}
            </div>
          );
        })}
      </footer>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Tiny NavButton used in the header                                         */
/* -------------------------------------------------------------------------- */

function NavButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 32,
        height: 32,
        borderRadius: 8,
        border: '1px solid var(--color-border-default)',
        background: 'var(--color-surface-elevated)',
        color: 'var(--color-text-secondary)',
        cursor: 'pointer',
        transition: 'background 0.15s, color 0.15s, box-shadow 0.15s',
        boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--color-surface-hover)';
        e.currentTarget.style.color = 'var(--color-text-primary)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.35)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'var(--color-surface-elevated)';
        e.currentTarget.style.color = 'var(--color-text-secondary)';
        e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.25)';
      }}
    >
      {children}
    </button>
  );
}
