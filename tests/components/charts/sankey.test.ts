/**
 * Unit tests for the Sankey layout algorithm (pure logic, no DOM/SVG).
 * Import only the layout function — not the React component.
 */

import { computeSankeyLayout } from '@/components/charts/SankeyChart';

const mockData = {
  sectors:     ['Technology', 'Energy', 'Bonds', 'Healthcare', 'Crypto', 'Utilities'],
  flow_scores: [4.2,          -3.1,     -2.5,     1.8,          3.0,      -1.2],
  mcaps:       [280,           38,       100,      38,           38,        14],
};

describe('computeSankeyLayout', () => {
  const layout = computeSankeyLayout(mockData, 420, 720);

  it('sources have negative flow scores', () => {
    layout.sources.forEach(n => expect(n.score).toBeLessThan(0));
  });

  it('sinks have positive flow scores', () => {
    layout.sinks.forEach(n => expect(n.score).toBeGreaterThan(0));
  });

  it('every link references valid source and sink ids', () => {
    const sourceIds = new Set(layout.sources.map(n => n.id));
    const sinkIds   = new Set(layout.sinks.map(n => n.id));
    layout.links.forEach(l => {
      expect(sourceIds.has(l.source.id)).toBe(true);
      expect(sinkIds.has(l.target.id)).toBe(true);
    });
  });

  it('link widths are positive', () => {
    layout.links.forEach(l => expect(l.width).toBeGreaterThan(0));
  });

  it('nodes have non-negative heights', () => {
    [...layout.sources, ...layout.sinks].forEach(n => expect(n.height).toBeGreaterThan(0));
  });
});
