/**
 * Daftar Akun Resmi Dashboard POSM Lazuna Chicken
 * 
 * Hak Akses:
 * - Superadmin: CRUD penuh pada data table gerai (Tambah, Edit, Hapus, Upload Foto)
 * - Administrator: Hanya Lihat (View-Only), tidak dapat melakukan CRUD
 */

export const REGISTERED_USERS = [
  {
    id: 'usr-1',
    email: 'galihfauzi@gmail.com',
    username: 'galihfauzi',
    name: 'Galih Ahmad Fauzi',
    role: 'Administrator', // View-only
    password: 'lazuna123'
  },
  {
    id: 'usr-2',
    email: 'andryantospp@gmail.com',
    username: 'andryantospp',
    name: 'Andryanto Suppu',
    role: 'Superadmin', // CRUD Penuh
    password: 'lazuna123'
  },
  {
    id: 'usr-3',
    email: 'ragildaffa14@gmail.com',
    username: 'ragildaffa14',
    name: 'Ahmad Ragil Daffa',
    role: 'Superadmin', // CRUD Penuh
    password: 'lazuna123'
  },
  {
    id: 'usr-4',
    email: 'zerodezain@gmail.com',
    username: 'zerodezain',
    name: 'M Zyaki Firmansyah',
    role: 'Superadmin', // CRUD Penuh
    password: 'lazuna123'
  },
  {
    id: 'usr-5',
    email: 'mfachrulazy@gmail.com',
    username: 'mfachrulazy',
    name: 'Muh Fachrul Razy',
    role: 'Administrator', // View-only
    password: 'lazuna123'
  }
];

export const USERS_STORAGE_KEY = 'lazuna_posm_registered_users';

/**
 * Cek apakah user memiliki izin untuk melakukan CRUD (Superadmin)
 */
export function canUserPerformCRUD(user) {
  if (!user) return false;
  const role = String(user.role || '').toLowerCase().trim();
  return role === 'superadmin' || role === 'super admin';
}

/**
 * Mengambil seluruh daftar akun aktif (sinkronisasi otomatis dengan konfigurasi master)
 */
export function getRegisteredUsers() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return REGISTERED_USERS;
  }
  try {
    const saved = localStorage.getItem(USERS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Sinkronisasi data user terdaftar dengan konfigurasi master terbaru
        const updated = parsed.map((u) => {
          const master = REGISTERED_USERS.find(
            (m) => m.email.toLowerCase() === (u.email || '').toLowerCase()
          );
          return master ? { ...u, name: master.name, role: master.role } : u;
        });

        const existingEmails = new Set(updated.map((u) => (u.email || '').toLowerCase()));
        const missing = REGISTERED_USERS.filter((u) => !existingEmails.has(u.email.toLowerCase()));
        const combined = [...updated, ...missing];
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(combined));
        return combined;
      }
    }
  } catch (err) {
    console.warn('Gagal membaca users dari localStorage:', err);
  }

  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(REGISTERED_USERS));
  } catch (err) {}

  return REGISTERED_USERS;
}

/**
 * Mencari akun berdasarkan email atau username
 */
export function findUserByEmailOrUsername(identifier) {
  if (!identifier) return null;
  const clean = identifier.trim().toLowerCase();
  const users = getRegisteredUsers();

  return (
    users.find((u) => {
      const uEmail = (u.email || '').toLowerCase();
      const uUsername = (u.username || '').toLowerCase();
      const uPrefix = uEmail.split('@')[0];
      return uEmail === clean || uUsername === clean || uPrefix === clean;
    }) || null
  );
}
