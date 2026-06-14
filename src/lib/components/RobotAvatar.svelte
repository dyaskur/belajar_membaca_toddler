<script>
  import { robotColor } from '$lib/content/avatars.js';
  /** @type {{ color?: string, size?: number }} */
  let { color = 'teal', size = 64 } = $props();
  const c = $derived(robotColor(color));
</script>

<svg viewBox="0 0 200 250" width={size} height={size * 1.18} class="block">
  <!-- antenna -->
  <line x1="100" y1="42" x2="100" y2="22" stroke="#94a3b8" stroke-width="5" stroke-linecap="round" />
  <circle cx="100" cy="16" r="9" fill="#fbbf24" />
  <!-- arms -->
  <rect x="30" y="138" width="16" height="58" rx="8" fill={c.body} />
  <rect x="154" y="138" width="16" height="58" rx="8" fill={c.body} />
  <!-- body -->
  <rect x="52" y="126" width="96" height="86" rx="20" fill={c.body} />
  <rect x="72" y="144" width="56" height="44" rx="10" fill="#0f172a" opacity="0.85" />
  <circle cx="86" cy="166" r="5" fill="#22d3ee" />
  <circle cx="100" cy="166" r="5" fill="#34d399" />
  <circle cx="114" cy="166" r="5" fill="#f472b6" />
  <rect x="68" y="210" width="18" height="16" rx="6" fill="#0f172a" opacity="0.85" />
  <rect x="114" y="210" width="18" height="16" rx="6" fill="#0f172a" opacity="0.85" />
  <!-- head -->
  <rect x="54" y="44" width="92" height="78" rx="18" fill={c.head} />
  <rect x="64" y="56" width="72" height="54" rx="12" fill="#0f172a" />
  <circle cx="85" cy="80" r="8" fill="#22d3ee" />
  <circle cx="115" cy="80" r="8" fill="#22d3ee" />
  <path d="M82 96 q18 16 36 0" stroke="#22d3ee" stroke-width="5" fill="none" stroke-linecap="round" />
</svg>
