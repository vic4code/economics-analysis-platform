export function getChartTheme() {
  const light =
    typeof document !== 'undefined' &&
    document.documentElement.getAttribute('data-theme') === 'light';
  return {
    tick:    light ? '#57606a' : '#8b949e',
    grid:    light ? 'rgba(0,0,0,0.07)' : '#21262d',
    text:    light ? '#1f2328' : '#cdd9e5',
  };
}
