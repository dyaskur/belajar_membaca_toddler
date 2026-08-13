<script>
  import { base } from '$app/paths';
  import { AUDIO_CDN } from '$lib/audio/config.js';

  /**
   * Privacy policy. Google Play requires a publicly reachable policy URL for every app,
   * and specifically for anything that declares children as its target audience.
   *
   * Everything below describes what the code actually does — no accounts, no analytics,
   * no third-party SDKs, and no profile data ever leaving the device. Keep it that way, or
   * update this page in the same PR.
   */

  /** Published privacy contact. Play's Families policy expects this to be monitored. */
  const CONTACT = 'support@yaskur.com';

  /** Host the app fetches its audio clips from (Android build). */
  const AUDIO_HOST = AUDIO_CDN ? new URL(AUDIO_CDN).host : 'belajar-membaca.gj.lc';

  const UPDATED = '13 Agustus 2026';
</script>

<svelte:head>
  <title>Kebijakan Privasi · Ayo Belajar Membaca</title>
  <meta name="description" content="Kebijakan privasi aplikasi Ayo Belajar Membaca" />
</svelte:head>

<header class="mb-6 flex items-center justify-between">
  <a href="{base}/" class="back-button" aria-label="Kembali">←</a>
  <h1 class="text-xl font-black">Kebijakan Privasi</h1>
  <span></span>
</header>

<article class="prose-privasi mx-auto max-w-2xl pb-16">
  <p class="updated">Terakhir diperbarui: {UPDATED}</p>

  <p class="lead">
    <strong>Ayo Belajar Membaca</strong> tidak punya akun, iklan, analitik, maupun pelacakan.
    Profil dan kemajuan anak disimpan <strong>hanya di perangkat</strong> dan tidak pernah
    dikirim ke mana pun. Satu-satunya hubungan ke internet adalah mengunduh berkas suara, dan
    seperti setiap permintaan web, penyedia hosting mencatat data teknis standar untuk itu —
    dijelaskan di bawah.
  </p>

  <h2>Data yang disimpan di perangkat</h2>
  <p>
    Aplikasi menyimpan hal berikut <strong>hanya di perangkat Anda</strong> (penyimpanan lokal
    aplikasi atau peramban):
  </p>
  <ul>
    <li>nama panggilan dan warna robot yang dipilih anak;</li>
    <li>perkiraan kelompok umur dan pilihan suara pembaca;</li>
    <li>kemajuan belajar: nilai, level yang terbuka, dan stiker yang dikumpulkan;</li>
    <li>preferensi orang tua, misalnya jumlah pilihan jawaban.</li>
  </ul>
  <p>
    Data ini <strong>tidak pernah dikirim ke server kami</strong> — kami memang tidak punya
    server aplikasi. Menghapus profil di dalam aplikasi, menghapus data aplikasi lewat
    pengaturan Android, atau mencopot pemasangan aplikasi akan menghapusnya sepenuhnya.
  </p>

  <h2>Koneksi internet</h2>
  <p>
    Agar ukuran pemasangan tetap kecil, aplikasi Android diunduh tanpa berkas suara. Suara
    diambil dari <code>{AUDIO_HOST}</code>, dan hanya untuk pembaca yang dipilih: satu paket
    dasar (huruf dan abjad) setelah profil dibuat, lalu paket tiap level atau permainan saat
    pertama kali dibuka. Aplikasi tidak mengunduh level berikutnya di latar belakang. Setelah
    terunduh, semuanya berjalan sepenuhnya tanpa internet.
  </p>
  <p>
    Seperti semua permintaan web, penyedia hosting kami mencatat data teknis standar
    (alamat IP, waktu, jenis perangkat) untuk mengirimkan berkas dan menjaga layanan. Catatan
    ini tidak kami gunakan untuk membuat profil pengguna dan tidak dikaitkan dengan anak mana
    pun. Aplikasi tidak menggunakan cookie pelacak.
  </p>

  <h2>Tidak ada pihak ketiga</h2>
  <p>
    Aplikasi tidak memuat analitik, iklan, jaringan sosial, maupun SDK pihak ketiga. Tidak ada
    pembelian dalam aplikasi. Kami tidak menjual atau membagikan data apa pun, karena kami
    tidak mengumpulkannya.
  </p>

  <h2>Mikrofon dan aktivitas "Ucapkan!"</h2>
  <p>
    <strong>Aplikasi Android tidak meminta izin mikrofon dan tidak merekam suara.</strong>
    Aktivitas "Ucapkan!" tidak tersedia di aplikasi Android.
  </p>
  <p>
    Pada versi web di peramban, aktivitas ini memakai fitur pengenalan suara bawaan peramban.
    Bila digunakan, peramban dapat mengirim potongan suara ke penyedia peramban tersebut
    (misalnya Google untuk Chrome) untuk diubah menjadi teks. Proses itu berada di luar kendali
    kami dan tunduk pada kebijakan privasi penyedia peramban. Kami tidak menerima, menyimpan,
    atau mendengar rekaman tersebut.
  </p>

  <h2>Privasi anak</h2>
  <p>
    Aplikasi ini dibuat untuk anak-anak. Karena tidak ada data yang dikumpulkan atau dikirim,
    tidak ada informasi pribadi anak yang kami miliki. Nama yang diisi hanyalah nama panggilan
    untuk menyapa anak di layar, tersimpan di perangkat, dan boleh diisi bebas.
  </p>

  <h2>Perubahan</h2>
  <p>
    Bila kebijakan ini berubah, tanggal "terakhir diperbarui" di atas ikut berubah, dan versi
    baru terbit bersama pembaruan aplikasi berikutnya.
  </p>

  <h2>Kontak</h2>
  <p>Pertanyaan tentang privasi bisa dikirim ke <a href="mailto:{CONTACT}">{CONTACT}</a>.</p>

  <hr />

  <h2>English summary</h2>
  <p>
    <strong>Ayo Belajar Membaca</strong> has no accounts, ads, analytics or third-party SDKs.
    Profile and progress data stays on the device and is never transmitted. The only network
    activity is downloading audio clips, for which our host keeps standard request logs.
  </p>
  <ul>
    <li>
      <strong>Stored on the device only:</strong> the child's nickname, chosen robot colour,
      age band, selected voice, learning progress, and parent preferences. This never leaves
      the device and is deleted when you delete the profile or uninstall the app.
    </li>
      <li>
      <strong>Network use:</strong> the Android app ships without audio to keep the install
      small and fetches clips from <code>{AUDIO_HOST}</code> for the selected speaker only — a
      basic pack (letters and the alphabet) once a profile exists, then each level's or game's
      pack the first time it is opened. It does not prefetch the next level. Our host records
      standard technical request logs (IP, timestamp, device type); these are not used for
      profiling and no tracking cookies are set. Once downloaded, the app works entirely offline.
    </li>
    <li>
      <strong>Microphone:</strong> the Android app requests no microphone permission and records
      no audio. The "Ucapkan!" activity is unavailable there. On the web version it uses the
      browser's own speech recognition, which may send audio to the browser vendor (e.g. Google
      for Chrome) under that vendor's privacy policy. We never receive or store it.
    </li>
    <li>
      <strong>Children:</strong> the app is designed for children. Because nothing is collected
      or transmitted, we hold no personal information about any child. The name field is a
      display nickname only.
    </li>
  </ul>
  <p>Privacy questions: <a href="mailto:{CONTACT}">{CONTACT}</a></p>
</article>

<style>
  .prose-privasi {
    color: #334155;
    line-height: 1.65;
  }
  .prose-privasi .updated {
    margin-bottom: 1.25rem;
    font-size: 0.8rem;
    color: #94a3b8;
  }
  .prose-privasi .lead {
    margin-bottom: 1.5rem;
    border-radius: 1rem;
    background: #fffbeb;
    padding: 1rem 1.15rem;
    font-size: 1.02rem;
  }
  .prose-privasi h2 {
    margin: 1.75rem 0 0.6rem;
    font-size: 1.05rem;
    font-weight: 800;
    color: #78350f;
  }
  .prose-privasi p {
    margin-bottom: 0.85rem;
  }
  .prose-privasi ul {
    margin: 0 0 0.85rem 1.1rem;
    list-style: disc;
  }
  .prose-privasi li {
    margin-bottom: 0.4rem;
  }
  .prose-privasi code {
    border-radius: 0.35rem;
    background: #f1f5f9;
    padding: 0.1rem 0.35rem;
    font-size: 0.9em;
  }
  .prose-privasi a {
    color: #b45309;
    text-decoration: underline;
  }
  .prose-privasi hr {
    margin: 2.25rem 0 1.5rem;
    border: 0;
    border-top: 1px solid #e2e8f0;
  }
</style>
