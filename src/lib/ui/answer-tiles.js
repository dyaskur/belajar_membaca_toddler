export const ANSWER_TILE_THEMES = [
  {
    bg: '#fef3c7',
    border: '#f59e0b',
    shadow: 'rgba(245, 158, 11, 0.28)'
  },
  {
    bg: '#fce7f3',
    border: '#ec4899',
    shadow: 'rgba(236, 72, 153, 0.24)'
  },
  {
    bg: '#e0f2fe',
    border: '#0ea5e9',
    shadow: 'rgba(14, 165, 233, 0.25)'
  },
  {
    bg: '#dcfce7',
    border: '#22c55e',
    shadow: 'rgba(34, 197, 94, 0.24)'
  },
  {
    bg: '#ede9fe',
    border: '#8b5cf6',
    shadow: 'rgba(139, 92, 246, 0.24)'
  },
  {
    bg: '#ffedd5',
    border: '#f97316',
    shadow: 'rgba(249, 115, 22, 0.24)'
  }
];

/** @param {number} index */
export function answerTileStyle(index) {
  const theme = ANSWER_TILE_THEMES[index % ANSWER_TILE_THEMES.length];
  return `--tile-bg: ${theme.bg}; --tile-border: ${theme.border}; --tile-shadow: ${theme.shadow};`;
}
