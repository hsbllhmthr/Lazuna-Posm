import { POS_KEYS, normStore } from './storage';

export function exportToCSV(stores) {
  const headers = [
    'No', 'Store Code', 'Nama Store',
    'Akrilik Ukuran', 'Akrilik Bahan', 'Akrilik Jumlah', 'Akrilik Materi', 'Akrilik Evidence',
    'Outdoor Ukuran', 'Outdoor Jumlah', 'Outdoor Evidence',
    'Kanopi Ukuran', 'Kanopi Jumlah', 'Kanopi Evidence',
    'Menu A3 Evidence',
    'Jumlah TV', 'Orientasi TV', 'Rotasi TV', 'Penambahan TV', 'Keterangan TV', 'TV Board Evidence',
    'Poster A4 Jumlah', 'Poster Materi 1', 'Poster Materi 2', 'Poster A4 Evidence'
  ];

  const photoCountStr = (e) => (e && e.length ? `${e.length} foto` : 'Belum');

  const rows = stores.map((d, i) => [
    i + 1,
    d.c || '',
    d.n || '',
    d.a?.s || '',
    d.a?.b || '',
    d.a?.q || 0,
    d.a?.m || '',
    photoCountStr(d.a?.e),
    d.o?.s || '',
    d.o?.q || 0,
    photoCountStr(d.o?.e),
    d.k?.s || '',
    d.k?.q || 0,
    photoCountStr(d.k?.e),
    photoCountStr(d.m?.e),
    d.t?.q || 0,
    d.t?.r || '',
    d.t?.rt || '',
    d.t?.x || '',
    d.t?.ket || '',
    photoCountStr(d.t?.e),
    d.p?.q || 0,
    d.p?.n1 || '',
    d.p?.n2 || '',
    photoCountStr(d.p?.e)
  ]);

  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\r\n');

  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, 'posm-lazuna.csv');
}

export function exportToJSON(stores) {
  const payload = {
    at: Date.now(),
    stores
  };
  const jsonStr = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
  downloadBlob(blob, `backup-posm-lazuna-${new Date().toISOString().slice(0, 10)}.json`);
}

export function exportToHTML(stores) {
  const data = { at: Date.now(), stores };
  const payload = JSON.stringify(data).replace(/</g, '\\u003c');
  
  // Create a clean standalone HTML template for offline sharing
  const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Dashboard POSM Lazuna Chicken (Backup)</title>
<style>
body { font-family: system-ui, sans-serif; padding: 24px; background: #f6f2ec; color: #241a12; }
.card { background: white; border-radius: 12px; padding: 20px; border: 1px solid #e8ddd0; max-width: 600px; margin: 40px auto; text-align: center; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
h1 { margin-top: 0; color: #d9480f; }
p { color: #7d6e61; line-height: 1.5; }
.badge { display: inline-block; padding: 6px 12px; background: #e3f5e8; color: #2b8a3e; border-radius: 99px; font-weight: bold; margin: 12px 0; }
</style>
</head>
<body>
<div class="card">
  <h1>🍗 Backup Data POSM Lazuna</h1>
  <div class="badge">✓ Berisi ${stores.length} Store</div>
  <p>File ini adalah file backup mandiri yang dapat diimpor langsung ke Dashboard POSM Lazuna Chicken (React + Vite). Tekan tombol <strong>"📥 Impor Data"</strong> pada aplikasi dashboard dan pilih file ini.</p>
</div>
<script id="posm-data" type="application/json">${payload}</script>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  downloadBlob(blob, 'Dashboard POSM Lazuna Chicken.html');
}

export async function importDataFile(file, currentStores) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result);
        let parsed = null;

        // Check if file is HTML containing <script id="posm-data">
        if (text.includes('<script id="posm-data"')) {
          const match = text.match(/<script id="posm-data" type="application\/json">([\s\S]*?)<\/script>/);
          if (!match) {
            return reject(new Error('Format file HTML tidak sesuai / bukan dashboard POSM Lazuna.'));
          }
          parsed = JSON.parse(match[1]);
        } else {
          // Assume JSON
          parsed = JSON.parse(text);
        }

        if (!parsed || !Array.isArray(parsed.stores)) {
          return reject(new Error('File tidak memuat data daftar store yang valid.'));
        }

        const map = {};
        const mergedList = currentStores.map(d => {
          const copy = JSON.parse(JSON.stringify(d));
          map[copy.id] = copy;
          return copy;
        });

        let addCount = 0;
        let updateCount = 0;

        parsed.stores.forEach(incomingStore => {
          normStore(incomingStore);
          const cur = map[incomingStore.id];

          if (!cur) {
            map[incomingStore.id] = incomingStore;
            mergedList.push(incomingStore);
            addCount++;
          } else {
            if ((incomingStore.at || 0) > (cur.at || 0)) {
              cur.c = incomingStore.c;
              cur.n = incomingStore.n;
              cur.at = incomingStore.at;
            }
            POS_KEYS.forEach(k => {
              if ((incomingStore[k]?.at || 0) > (cur[k]?.at || 0)) {
                cur[k] = incomingStore[k];
                updateCount++;
              }
            });
          }
        });

        mergedList.sort((a, b) => (a.no || 0) - (b.no || 0));

        resolve({
          stores: mergedList,
          addCount,
          updateCount
        });
      } catch (err) {
        reject(new Error('Gagal membaca file: ' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('Gagal memproses file.'));
    reader.readAsText(file);
  });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
