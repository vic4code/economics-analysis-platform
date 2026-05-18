'use client';
import { useState, useEffect } from 'react';
import { ChevronDown, TrendingUp, ArrowRightLeft, Clock } from 'lucide-react';

interface Props {
  onEnter: () => void;
}

const PILLARS = [
  {
    icon: TrendingUp,
    title: 'Trend Over Price',
    desc: 'Forget whether a stock is "cheap" or "expensive." When capital rotates into a sector, it flows regardless of valuation. We track the direction of money — not its destination price.',
  },
  {
    icon: ArrowRightLeft,
    title: 'No Such Thing as Too Late',
    desc: "Traditional analysis asks: has this stock run too far? We ask: is the trend still intact? A trend-based view removes the anxiety of timing — what matters is the current phase of rotation, not when you arrived.",
  },
  {
    icon: Clock,
    title: 'Time-Agnostic Signals',
    desc: 'Momentum, sector rotation, and institutional flow cycles repeat across every market era. We surface these structural rhythms so you can position alongside capital — not against it.',
  },
];

export default function HeroSection({ onEnter }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  return (
    <section className={`hero-section${visible ? ' hero-visible' : ''}`} aria-label="Platform introduction">
      <div className="hero-glow-orb hero-orb-1" aria-hidden />
      <div className="hero-glow-orb hero-orb-2" aria-hidden />

      <div className="hero-inner">
        <div className="hero-eyebrow">
          <span className="hero-badge">Market Observation Platform</span>
        </div>

        <h1 className="hero-headline">
          Stop asking<br />
          <em>if it&apos;s too late.</em>
        </h1>

        <p className="hero-lead">
          Most analysis tools obsess over price levels and valuations — but when a stock has
          already run 300%, asking "is it cheap?" is the wrong question.
        </p>
        <p className="hero-lead hero-lead-2">
          This platform was built around a single insight:{' '}
          <strong>capital flows and trend rotations are time-agnostic.</strong>{' '}
          When institutional money moves into a sector, it doesn&apos;t care whether you bought at the
          bottom. What matters is where the trend is <em>now</em> — and where it&apos;s heading.
        </p>

        <div className="hero-pillars" role="list">
          {PILLARS.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="hero-pillar" role="listitem">
              <div className="hero-pillar-icon" aria-hidden>
                <Icon size={18} strokeWidth={1.6} />
              </div>
              <div className="hero-pillar-body">
                <h3 className="hero-pillar-title">{title}</h3>
                <p className="hero-pillar-desc">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="hero-vs">
          <div className="hero-vs-col hero-vs-old">
            <span className="hero-vs-label">Traditional Tools Ask</span>
            <ul className="hero-vs-list">
              <li>Is this stock overvalued?</li>
              <li>Have I missed the run?</li>
              <li>What&apos;s the fair-value target?</li>
              <li>When should I have bought?</li>
            </ul>
          </div>
          <div className="hero-vs-divider" aria-hidden>vs</div>
          <div className="hero-vs-col hero-vs-new">
            <span className="hero-vs-label">We Ask Instead</span>
            <ul className="hero-vs-list">
              <li>Where is capital flowing today?</li>
              <li>Which sectors are in trend acceleration?</li>
              <li>Is this rotation early, mid, or late cycle?</li>
              <li>What does institutional flow say?</li>
            </ul>
          </div>
        </div>

        <button
          className="hero-cta"
          onClick={onEnter}
          aria-label="Open the dashboard"
        >
          Open Dashboard
          <ChevronDown size={16} strokeWidth={2} className="hero-cta-icon" aria-hidden />
        </button>
      </div>
    </section>
  );
}
