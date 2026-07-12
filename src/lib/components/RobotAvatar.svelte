<script>
  import Robot from './Robot.svelte';
  import { robotColor } from '$lib/content/avatars.js';
  /** @type {{ color?: string, size?: number }} */
  let { color = 'teal', size = 64 } = $props();
  const c = $derived(robotColor(color));
</script>

<Robot mood="idle" head={c.head} body={c.body} {size} interactive={false} />
