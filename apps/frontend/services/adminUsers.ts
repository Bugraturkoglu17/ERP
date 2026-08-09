// TODO Backend endpoint önerisi:
// GET    /api/admin/users
// POST   /api/admin/users
// GET    /api/admin/users/:id
// PATCH  /api/admin/users/:id
// POST   /api/admin/users/:id/disable
// POST   /api/admin/users/:id/enable
// POST   /api/admin/users/:id/lock
// POST   /api/admin/users/:id/unlock
// POST   /api/admin/users/:id/reset-password

export type UserRole = "ADMIN" | "MANAGER" | "USER";
export type UserStatus = "active" | "passive" | "locked" | "pending_first_login";

export interface AdminUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  last_login_at: string | null;
  password_changed_at: string | null;
  must_change_password: boolean;
  created_at: string;
}

const SEED: AdminUser[] = [
  {
    id: "admin-1",
    first_name: "Admin",
    last_name: "Kullanıcı",
    email: "admin@golabs.com",
    phone: "0555 111 22 33",
    role: "ADMIN",
    status: "active",
    last_login_at: "2026-08-08T09:15:00Z",
    password_changed_at: "2026-07-01T00:00:00Z",
    must_change_password: false,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "manager-1",
    first_name: "Bilal",
    last_name: "Yönetici",
    email: "bilal@golabs.com",
    phone: "0555 222 33 44",
    role: "MANAGER",
    status: "active",
    last_login_at: "2026-08-07T14:30:00Z",
    password_changed_at: "2026-07-15T00:00:00Z",
    must_change_password: false,
    created_at: "2026-01-15T00:00:00Z",
  },
  {
    id: "user-1",
    first_name: "Buğra",
    last_name: "Türkoğlu",
    email: "bugra@golabs.com",
    phone: "0555 333 44 55",
    role: "USER",
    status: "active",
    last_login_at: "2026-08-08T08:00:00Z",
    password_changed_at: "2026-07-20T00:00:00Z",
    must_change_password: false,
    created_at: "2026-02-01T00:00:00Z",
  },
  {
    id: "user-2",
    first_name: "Ayşe",
    last_name: "Demir",
    email: "ayse@golabs.com",
    phone: "0555 444 55 66",
    role: "USER",
    status: "pending_first_login",
    last_login_at: null,
    password_changed_at: null,
    must_change_password: true,
    created_at: "2026-08-01T00:00:00Z",
  },
  {
    id: "user-3",
    first_name: "Mehmet",
    last_name: "Kaya",
    email: "mehmet@golabs.com",
    phone: "0555 555 66 77",
    role: "USER",
    status: "passive",
    last_login_at: "2026-06-15T10:00:00Z",
    password_changed_at: "2026-05-01T00:00:00Z",
    must_change_password: false,
    created_at: "2026-03-01T00:00:00Z",
  },
  {
    id: "manager-2",
    first_name: "Fatma",
    last_name: "Çelik",
    email: "fatma@golabs.com",
    phone: "0555 666 77 88",
    role: "MANAGER",
    status: "locked",
    last_login_at: "2026-07-01T09:00:00Z",
    password_changed_at: "2026-06-01T00:00:00Z",
    must_change_password: false,
    created_at: "2026-04-01T00:00:00Z",
  },
];

const STORAGE_KEY = "admin_users_mock";

function load(): AdminUser[] {
  if (typeof window === "undefined") return [...SEED];
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED));
    return [...SEED];
  }
  try {
    return JSON.parse(raw);
  } catch {
    return [...SEED];
  }
}

function save(users: AdminUser[]) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  }
}

export function getUsers(): AdminUser[] {
  return load();
}

export function getUserById(id: string): AdminUser | null {
  return load().find((u) => u.id === id) ?? null;
}

export interface CreateUserPayload {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: UserRole;
  is_active: boolean;
  temp_password: string;
}

export function createUser(payload: CreateUserPayload): AdminUser {
  const users = load();
  const user: AdminUser = {
    id: crypto.randomUUID(),
    first_name: payload.first_name,
    last_name: payload.last_name,
    email: payload.email,
    phone: payload.phone,
    role: payload.role,
    status: payload.is_active ? "pending_first_login" : "passive",
    last_login_at: null,
    password_changed_at: null,
    must_change_password: true,
    created_at: new Date().toISOString(),
  };
  save([...users, user]);
  // TODO: Audit log — "Kullanıcı oluşturuldu"
  return user;
}

export interface UpdateUserPayload {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  role?: UserRole;
}

export function updateUser(id: string, payload: UpdateUserPayload): AdminUser | null {
  const users = load();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return null;
  users[idx] = { ...users[idx], ...payload };
  save(users);
  // TODO: Audit log — "Kullanıcı bilgileri güncellendi"
  return users[idx];
}

export function disableUser(id: string): AdminUser | null {
  const users = load();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return null;
  users[idx] = { ...users[idx], status: "passive" };
  save(users);
  // TODO: Audit log — "Kullanıcı pasif yapıldı"
  return users[idx];
}

export function enableUser(id: string): AdminUser | null {
  const users = load();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return null;
  users[idx] = { ...users[idx], status: "active" };
  save(users);
  // TODO: Audit log — "Kullanıcı aktif yapıldı"
  return users[idx];
}

export function lockUser(id: string): AdminUser | null {
  const users = load();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return null;
  users[idx] = { ...users[idx], status: "locked" };
  save(users);
  // TODO: Audit log — "Hesap kilitlendi"
  return users[idx];
}

export function unlockUser(id: string): AdminUser | null {
  const users = load();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return null;
  users[idx] = { ...users[idx], status: "active" };
  save(users);
  // TODO: Audit log — "Kilit açıldı"
  return users[idx];
}

export function deleteUser(id: string): boolean {
  const users = load();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return false;
  users.splice(idx, 1);
  save(users);
  // TODO: Audit log — "Kullanıcı silindi"
  return true;
}

// Yönetici paneli için — sadece USER rolündeki aktif/pasif kullanıcıları döner
export function getManagerUsers(): AdminUser[] {
  return load().filter((u) => u.role === "USER");
}

// Yönetici yalnızca USER rolündeki kullanıcıları yönetebilir
export function managerCanActOn(target: AdminUser): boolean {
  return target.role === "USER";
}

export function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#";
  return Array.from(
    { length: 12 },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

export interface ResetPasswordPayload {
  mode: "system" | "manual";
  new_password?: string;
}

export function resetUserPassword(
  id: string,
  payload: ResetPasswordPayload
): { generatedPassword: string } | null {
  const users = load();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return null;
  const generatedPassword =
    payload.mode === "system"
      ? generateTempPassword()
      : (payload.new_password ?? "");
  users[idx] = {
    ...users[idx],
    must_change_password: true,
    password_changed_at: new Date().toISOString(),
  };
  save(users);
  // TODO: Audit log — "Şifre sıfırlandı"
  // TODO: backend'de password hash işlemi yapılacak; plain text saklanmayacak
  return { generatedPassword };
}
