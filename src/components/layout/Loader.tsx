'use client';
import { useState, useEffect } from 'react';

interface Props { show: boolean }

const STEPS = [
  { icon: '📡', label: 'Fetching market quotes' },
  { icon: '🌐', label: 'Computing macro flows' },
  { icon: '📊', label: 'Loading sector data' },
  { icon: '⚡', label: 'Initialising charts' },
];

export default function Loader({ show }: Props) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!show) { setStep(0); return; }
    const t = setInterval(() => setStep(s => Math.min(s + 1, STEPS.length - 1)), 650);
    return () => clearInterval(t);
  }, [show]);

  if (!show) return null;

  return (
    <div className="loader-overlay active">
      <div className="loader-card">
        <div className="loader-brand">
          <span className="loader-brand-icon">◈</span>
          <span className="loader-brand-name">Fund Flow</span>
        </div>
        <div className="loader-spinner-wrap">
          <div className="loader-ring" />
          <div className="loader-ring-inner" />
        </div>
        <div className="loader-step-label">
          <span className="loader-step-icon">{STEPS[step].icon}</span>
          {STEPS[step].label}
        </div>
        <div className="loader-progress">
          <div
            className="loader-progress-bar"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
