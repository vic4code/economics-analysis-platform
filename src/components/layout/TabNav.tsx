'use client';
import { useEffect } from 'react';
import {
  Globe, BarChart2, TrendingUp, FlaskConical,
  Activity, CalendarDays, AlertTriangle, Network,
} from 'lucide-react';
import type { Period } from '@/types';

const PERIODS: Period[] = ['1d', '5d', '1m', '3m', '6m', '1y', 'ytd'];

const TAB_GROUPS = [
  {
    label: 'Markets',
    tabs: [
      { id: 'macro',    label: 'Macro Flow',     key: '1', Icon: Globe },
      { id: 'overview', label: 'Overview',        key: '2', Icon: BarChart2 },
      { id: 'trends',   label: 'Trend Analysis',  key: '3', Icon: TrendingUp },
    ],
  },
  {
    label: 'Portfolio',
    tabs: [
      { id: 'backtest', label: 'Backtest',        key: '4', Icon: FlaskConical },
      { id: 'flow',     label: 'Flow & Chips',    key: '5', Icon: Activity },
    ],
  },
  {
    label: 'Research',
    tabs: [
      { id: 'cycle',        label: 'Events & Cycles', key: '6', Icon: CalendarDays },
      { id: 'crisis',       label: 'Crisis Atlas',    key: '7', Icon: AlertTriangle },
      { id: 'correlation',  label: 'Correlation',     key: '8', Icon: Network },
    ],
  },
];

const ALL_TABS = TAB_GROUPS.flatMap(g => g.tabs);

interface Props {
  activeTab: string;
  onTabChange: (tab: string) => void;
  period: Period;
  onPeriodChange: (p: Period) => void;
}

export default function TabNav({ activeTab, onTabChange, period, onPeriodChange }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!e.altKey) return;
      const tab = ALL_TABS.find(t => t.key === e.key);
      if (tab) { e.preventDefault(); onTabChange(tab.id); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onTabChange]);

  return (
    <nav className="tab-nav" aria-label="Main navigation">
      <div className="tab-nav-tabs">
        {TAB_GROUPS.map((group, gi) => (
          <div key={group.label} className="tab-group">
            <span className="tab-group-label">{group.label}</span>
            {group.tabs.map(t => (
              <button
                key={t.id}
                className={`tab-btn${activeTab === t.id ? ' active' : ''}`}
                onClick={() => onTabChange(t.id)}
                aria-current={activeTab === t.id ? 'page' : undefined}
              >
                <t.Icon size={14} strokeWidth={1.75} aria-hidden />
                {t.label}
              </button>
            ))}
            {gi < TAB_GROUPS.length - 1 && <div className="tab-sep" aria-hidden />}
          </div>
        ))}
      </div>

      <div className="tab-nav-period" aria-label="Time period">
        {PERIODS.map(p => (
          <button
            key={p}
            className={`period-btn${period === p ? ' active' : ''}`}
            onClick={() => onPeriodChange(p)}
          >
            {p.toUpperCase()}
          </button>
        ))}
      </div>
    </nav>
  );
}
