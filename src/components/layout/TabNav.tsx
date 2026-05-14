'use client';
interface Props {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const TABS = [
  { id: 'macro',    label: '🌐 Macro Flow' },
  { id: 'overview', label: '📊 Overview' },
  { id: 'trends',   label: '📈 Trend Analysis' },
  { id: 'backtest', label: '🔬 Backtest' },
  { id: 'flow',     label: '📡 Flow & Chips' },
  { id: 'cycle',    label: '📅 Events & Cycles' },
];

export default function TabNav({ activeTab, onTabChange }: Props) {
  return (
    <nav className="tab-nav">
      {TABS.map(t => (
        <button key={t.id} className={`tab-btn${activeTab === t.id ? ' active' : ''}`}
          onClick={() => onTabChange(t.id)}>
          {t.label}
        </button>
      ))}
    </nav>
  );
}
