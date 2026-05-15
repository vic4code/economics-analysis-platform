import * as echarts from 'echarts/core';
import { BarChart, LineChart, PieChart, ScatterChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  GraphicComponent,
  TitleComponent,
  MarkLineComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  BarChart, LineChart, PieChart, ScatterChart,
  GridComponent, TooltipComponent, LegendComponent, GraphicComponent, TitleComponent,
  MarkLineComponent,
  CanvasRenderer,
]);

export { echarts };

export function getEChartsTheme() {
  const isDark = typeof document !== 'undefined'
    ? document.documentElement.getAttribute('data-theme') !== 'light'
    : true;
  return {
    isDark,
    bg: 'transparent',
    textColor: isDark ? '#94a3b8' : '#5a6e8a',
    gridColor: isDark ? 'rgba(99,179,237,0.06)' : 'rgba(59,130,246,0.08)',
    tooltipBg: isDark ? '#0d1627' : '#ffffff',
    tooltipBorder: 'rgba(99,179,237,0.2)',
    tooltipText: isDark ? '#e2e8f0' : '#1e2a3a',
  };
}
