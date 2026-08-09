<script>
  import '../app.css';
  import { beforeNavigate } from '$app/navigation';

  let { children } = $props();

  // Toddlers mash the hardware/gesture back button mid-activity. Block only
  // popstate-triggered navigation (back/forward); in-app links and explicit
  // "Kembali" buttons still navigate normally.
  beforeNavigate((navigation) => {
    if (navigation.type === 'popstate') navigation.cancel();
  });
</script>

<div class="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-4">
  {@render children()}
</div>
