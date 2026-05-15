'use client';
import { useEffect } from 'react';

interface Props {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const TAB_GROUPS = [
  {
    label: 'Markets',
    tabs: [
      { id: 'macro',    label: '🌐 Macro Flow',      key: '1' },
      { id: 'overview', label: '📊 Overview',         key: '2' },
      { id: 'trends',   label: '📈 Trend Analysis',   key: '3' },
    ],
  },
  {
    label: 'Portfolio',
    tabs: [
      { id: 'backtest', label: '🔬 Backtest',          key: '4' },
      { id: 'flow',     label: '📡 Flow & Chips',      key: '5' },
    ],
  },
  {
    label: 'Research',
    tabs: [
      { id: 'cycle',       label: '📅 Events & Cycles', key: '6' },
      { id: 'crisis',      label: '🚨 Crisis Atlas',    key: '7' },
      { id: 'correlation', label: '🔗 Correlation',     key: '8' },
    ],
  },
];

// Flat list used for keyboard shortcut lookup
const ALL_TABS = TAB_GROUPS.flatMap(g => g.tabs);

export default function TabNav({ activeTab, onTabChange }: Props) {
  // Alt+1–8 keyboard shortcuts
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
      {TAB_GROUPS.map((group, gi) => (
        <div key={group.label} className="tab-group">
          <span className="tab-group-label">{group.label}</span>
          {group.tabs.map(t => (
            <button
              key={t.id}
              className={`tab-btn${activeTab === t.id ? ' active' : ''}`}
              onClick={() => onTabChange(t.id)}
              title={`Alt+${t.key}`}
              aria-current={activeTab === t.id ? 'page' : undefined}
            >
              {t.label}
              <kbd className="tab-kbd">Alt+{t.key}</kbd>
            </button>
          ))}
          {gi < TAB_GROUPS.length - 1 && <div className="tab-sep" aria-hidden />}
        </div>
      ))}
    </nav>
  );
}
