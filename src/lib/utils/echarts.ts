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
    textColor: isDark ? '#6E7A8A' : '#5B6573',
    gridColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)',
    tooltipBg: isDark ? '#141B28' : '#ffffff',
    tooltipBorder: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    tooltipText: isDark ? '#E8EBF0' : '#14181F',
  };
}
