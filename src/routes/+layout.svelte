<script>
  import '../app.css';
  let { children } = $props();
</script>

<div class="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-4">
  {@render children()}
</div>
