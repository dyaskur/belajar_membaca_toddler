/** Profile robot colors. The `avatar` field stores one of these ids. */
export const ROBOT_COLORS = [
  { id: 'teal', head: '#14b8a6', body: '#2563eb' },
  { id: 'red', head: '#fb7185', body: '#ef4444' },
  { id: 'purple', head: '#c084fc', body: '#a855f7' },
  { id: 'green', head: '#4ade80', body: '#16a34a' },
  { id: 'amber', head: '#fbbf24', body: '#f59e0b' },
  { id: 'pink', head: '#f472b6', body: '#db2777' },
  { id: 'cyan', head: '#22d3ee', body: '#0891b2' },
  { id: 'indigo', head: '#818cf8', body: '#4f46e5' }
];

export const DEFAULT_AVATAR = 'teal';

/** @param {string} id */
export function robotColor(id) {
  return ROBOT_COLORS.find((c) => c.id === id) ?? ROBOT_COLORS[0];
}
