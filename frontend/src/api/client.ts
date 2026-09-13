import type {
  Equipment,
  EquipmentInput,
  MaintenanceRecord,
  MaintenanceRecordInput,
  Token,
  User,
  UserCreateInput,
} from "../types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
export const TOKEN_STORAGE_KEY = "fms_token";

export const UNAUTHORIZED_EVENT = "fms:unauthorized";

function getToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  }
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${detail}`);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

async function login(username: string, password: string): Promise<Token> {
  const body = new URLSearchParams({ username, password });
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new Error("아이디 또는 비밀번호가 올바르지 않습니다.");
  }
  return res.json() as Promise<Token>;
}

export const api = {
  login,
  me: () => request<User>("/auth/me"),

  listEquipment: () => request<Equipment[]>("/equipments"),
  getEquipment: (id: number) => request<Equipment>(`/equipments/${id}`),
  createEquipment: (data: EquipmentInput) =>
    request<Equipment>("/equipments", { method: "POST", body: JSON.stringify(data) }),
  deleteEquipment: (id: number) => request<void>(`/equipments/${id}`, { method: "DELETE" }),

  listMaintenanceRecords: (equipmentId: number) =>
    request<MaintenanceRecord[]>(`/equipments/${equipmentId}/maintenance-records`),
  createMaintenanceRecord: (equipmentId: number, data: MaintenanceRecordInput) =>
    request<MaintenanceRecord>(`/equipments/${equipmentId}/maintenance-records`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  deleteMaintenanceRecord: (id: number) =>
    request<void>(`/maintenance-records/${id}`, { method: "DELETE" }),

  listUsers: () => request<User[]>("/users"),
  createUser: (data: UserCreateInput) =>
    request<User>("/users", { method: "POST", body: JSON.stringify(data) }),
  updateUserPassword: (id: number, password: string) =>
    request<User>(`/users/${id}/password`, {
      method: "PUT",
      body: JSON.stringify({ password }),
    }),
  deleteUser: (id: number) => request<void>(`/users/${id}`, { method: "DELETE" }),
};
