# AzzamBOT - Discord Sleep Detector Bot

AzzamBOT adalah bot Discord berbasis Node.js yang berfungsi untuk memantau status keberadaan (*presence*) seorang pengguna di dalam Voice Channel secara berulang. Bot akan memutar pertanyaan suara secara rutin, mendengarkan respons mikrofon target, dan memicu alarm jika tidak ada respons yang terdeteksi (dianggap sedang tidur).

---

## Fitur Utama

- **Deteksi Voice Activity (VAD):** Mendengarkan secara akurat aliran audio (*voice stream*) dari pengguna target setelah pertanyaan diputar.
- **Interval Pemantauan Otomatis:** Memantau pengguna secara berkala (setiap 2 menit) secara otomatis tanpa perlu memanggil ulang perintah.
- **Dua Tahap Audio:**
  - Memutar `pertanyaan.mp3` untuk meminta respons dari pengguna.
  - Memutar `alarm.mp3` secara otomatis jika hasil deteksi bernilai `FALSE` (pengguna tidak merespons/tidur).
- **Tampilan Notifikasi Formal:** Notifikasi hasil deteksi ditampilkan secara rapi menggunakan blok kode (*codeblock*) tanpa emoji.
- **Manajemen Sesi yang Aman:** Menyediakan perintah untuk menghentikan pemantauan dan memutus koneksi bot dari Voice Channel kapan saja.

---

## Prasyarat Sistem

Sebelum menjalankan bot, pastikan perangkat kamu sudah terpasang:

- **Node.js** (Versi 18 ke atas disarankan)
- **FFmpeg** (Diperlukan oleh `@discordjs/voice` untuk mengolah audio)
- **Akun Discord** & **Akses Discord Developer Portal**

---

## Struktur Folder Proyek

```text
AzzamBOT/
├── node_modules/
├── .env
├── index.js
├── package.json
├── pertanyaan.mp3
└── alarm.mp3