import type {
  Code,
  CodeInput,
  DailyCheck,
  DailyCheckInput,
  Equipment,
  EquipmentInput,
  FailureIncident,
  FailureIncidentCreateInput,
  FailureIncidentUpdateInput,
  Group,
  GroupDetail,
  GroupInput,
  MaintenanceRecord,
  MaintenanceRecordInput,
  Menu,
  MenuInput,
  PartReplacement,
  PartReplacementInput,
  Permission,
  PermissionDetail,
  PermissionInput,
  SessionSettings,
  SessionSettingsUpdateInput,
  SlaBusinessMonthlyEntryInput,
  SlaBusinessMonthlyRow,
  SlaBusinessService,
  SlaBusinessServiceInput,
  SlaFailureTimeLimit,
  SlaFailureTimeLimitInput,
  SlaMetric,
  SlaMetricUpdateInput,
  SlaMonthlySummary,
  SlaOperationMonthly,
  SlaOperationMonthlyInput,
  SpecialCheck,
  SpecialCheckInput,
  StatCount,
  SupportTicket,
  SupportTicketInput,
  Token,
  User,
  UserCreateInput,
  UserDetail,
  UserUpdateInput,
  WeeklyTask,
  WeeklyTaskInput,
  WorkStatus,
  WorkStatusInput,
  YearlyStatCount,
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
  getUser: (id: number) => request<UserDetail>(`/users/${id}`),
  createUser: (data: UserCreateInput) =>
    request<User>("/users", { method: "POST", body: JSON.stringify(data) }),
  updateUser: (id: number, data: UserUpdateInput) =>
    request<User>(`/users/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  updateUserPassword: (id: number, password: string) =>
    request<User>(`/users/${id}/password`, {
      method: "PUT",
      body: JSON.stringify({ password }),
    }),
  setUserGroups: (id: number, ids: number[]) =>
    request<UserDetail>(`/users/${id}/groups`, { method: "PUT", body: JSON.stringify({ ids }) }),
  setUserPermissions: (id: number, ids: number[]) =>
    request<UserDetail>(`/users/${id}/permissions`, {
      method: "PUT",
      body: JSON.stringify({ ids }),
    }),
  deleteUser: (id: number) => request<void>(`/users/${id}`, { method: "DELETE" }),

  listCodes: () => request<Code[]>("/codes"),
  createCode: (data: CodeInput) =>
    request<Code>("/codes", { method: "POST", body: JSON.stringify(data) }),
  updateCode: (id: number, data: Omit<CodeInput, "parent_id">) =>
    request<Code>(`/codes/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  listMenus: () => request<Menu[]>("/menus"),
  createMenu: (data: MenuInput) =>
    request<Menu>("/menus", { method: "POST", body: JSON.stringify(data) }),
  updateMenu: (id: number, data: Omit<MenuInput, "parent_id">) =>
    request<Menu>(`/menus/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteMenu: (id: number) => request<void>(`/menus/${id}`, { method: "DELETE" }),

  listPermissions: () => request<Permission[]>("/permissions"),
  getPermission: (id: number) => request<PermissionDetail>(`/permissions/${id}`),
  createPermission: (data: PermissionInput) =>
    request<Permission>("/permissions", { method: "POST", body: JSON.stringify(data) }),
  updatePermission: (id: number, data: PermissionInput) =>
    request<Permission>(`/permissions/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  setPermissionMenus: (id: number, menus: { menu_id: number; view_only: boolean }[]) =>
    request<PermissionDetail>(`/permissions/${id}/menus`, {
      method: "PUT",
      body: JSON.stringify(menus),
    }),
  setPermissionGroups: (id: number, ids: number[]) =>
    request<PermissionDetail>(`/permissions/${id}/groups`, {
      method: "PUT",
      body: JSON.stringify({ ids }),
    }),
  setPermissionUsers: (id: number, ids: number[]) =>
    request<PermissionDetail>(`/permissions/${id}/users`, {
      method: "PUT",
      body: JSON.stringify({ ids }),
    }),

  listGroups: () => request<Group[]>("/groups"),
  getGroup: (id: number) => request<GroupDetail>(`/groups/${id}`),
  createGroup: (data: GroupInput) =>
    request<Group>("/groups", { method: "POST", body: JSON.stringify(data) }),
  updateGroup: (id: number, data: GroupInput) =>
    request<Group>(`/groups/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  setGroupPermissions: (id: number, ids: number[]) =>
    request<GroupDetail>(`/groups/${id}/permissions`, {
      method: "PUT",
      body: JSON.stringify({ ids }),
    }),
  setGroupUsers: (id: number, ids: number[]) =>
    request<GroupDetail>(`/groups/${id}/users`, {
      method: "PUT",
      body: JSON.stringify({ ids }),
    }),

  listDailyChecks: (yearMonth?: string) =>
    request<DailyCheck[]>(`/daily-checks${yearMonth ? `?year_month=${yearMonth}` : ""}`),
  getDailyCheck: (id: number) => request<DailyCheck>(`/daily-checks/${id}`),
  createDailyCheck: (data: DailyCheckInput) =>
    request<DailyCheck>("/daily-checks", { method: "POST", body: JSON.stringify(data) }),
  updateDailyCheck: (id: number, data: DailyCheckInput) =>
    request<DailyCheck>(`/daily-checks/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  approveDailyCheck: (id: number) =>
    request<DailyCheck>(`/daily-checks/${id}/approve`, { method: "POST" }),
  deleteDailyCheck: (id: number) => request<void>(`/daily-checks/${id}`, { method: "DELETE" }),

  listSpecialChecks: () => request<SpecialCheck[]>("/special-checks"),
  createSpecialCheck: (data: SpecialCheckInput) =>
    request<SpecialCheck>("/special-checks", { method: "POST", body: JSON.stringify(data) }),
  updateSpecialCheck: (id: number, data: SpecialCheckInput) =>
    request<SpecialCheck>(`/special-checks/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteSpecialCheck: (id: number) =>
    request<void>(`/special-checks/${id}`, { method: "DELETE" }),

  listWeeklyTasks: () => request<WeeklyTask[]>("/weekly-tasks"),
  createWeeklyTask: (data: WeeklyTaskInput) =>
    request<WeeklyTask>("/weekly-tasks", { method: "POST", body: JSON.stringify(data) }),
  updateWeeklyTask: (id: number, data: WeeklyTaskInput) =>
    request<WeeklyTask>(`/weekly-tasks/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteWeeklyTask: (id: number) => request<void>(`/weekly-tasks/${id}`, { method: "DELETE" }),

  listWorkStatus: () => request<WorkStatus[]>("/work-status"),
  createWorkStatus: (data: WorkStatusInput) =>
    request<WorkStatus>("/work-status", { method: "POST", body: JSON.stringify(data) }),
  updateWorkStatus: (id: number, data: WorkStatusInput) =>
    request<WorkStatus>(`/work-status/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteWorkStatus: (id: number) => request<void>(`/work-status/${id}`, { method: "DELETE" }),

  listPartReplacements: () => request<PartReplacement[]>("/part-replacements"),
  partReplacementStats: (groupBy: "field" | "org") =>
    request<YearlyStatCount[]>(`/part-replacements/stats?group_by=${groupBy}`),
  createPartReplacement: (data: PartReplacementInput) =>
    request<PartReplacement>("/part-replacements", { method: "POST", body: JSON.stringify(data) }),
  updatePartReplacement: (id: number, data: PartReplacementInput) =>
    request<PartReplacement>(`/part-replacements/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deletePartReplacement: (id: number) =>
    request<void>(`/part-replacements/${id}`, { method: "DELETE" }),

  listSupportTickets: (yearMonth?: string) =>
    request<SupportTicket[]>(`/support-tickets${yearMonth ? `?year_month=${yearMonth}` : ""}`),
  supportTicketStats: (yearMonth?: string) =>
    request<StatCount[]>(`/support-tickets/stats${yearMonth ? `?year_month=${yearMonth}` : ""}`),
  createSupportTicket: (data: SupportTicketInput) =>
    request<SupportTicket>("/support-tickets", { method: "POST", body: JSON.stringify(data) }),
  updateSupportTicket: (id: number, data: SupportTicketInput) =>
    request<SupportTicket>(`/support-tickets/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteSupportTicket: (id: number) =>
    request<void>(`/support-tickets/${id}`, { method: "DELETE" }),

  listFailureIncidents: (params?: {
    yearMonth?: string;
    status?: string;
    orgCodeId?: number;
    majorCategoryCodeId?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.yearMonth) q.set("year_month", params.yearMonth);
    if (params?.status) q.set("status", params.status);
    if (params?.orgCodeId != null) q.set("org_code_id", String(params.orgCodeId));
    if (params?.majorCategoryCodeId != null)
      q.set("major_category_code_id", String(params.majorCategoryCodeId));
    const qs = q.toString();
    return request<FailureIncident[]>(`/failure-incidents${qs ? `?${qs}` : ""}`);
  },
  failureIncidentStats: (groupBy: "type" | "org") =>
    request<YearlyStatCount[]>(`/failure-incidents/stats?group_by=${groupBy}`),
  getFailureIncident: (id: number) => request<FailureIncident>(`/failure-incidents/${id}`),
  createFailureIncident: (data: FailureIncidentCreateInput) =>
    request<FailureIncident>("/failure-incidents", { method: "POST", body: JSON.stringify(data) }),
  updateFailureIncident: (id: number, data: FailureIncidentUpdateInput) =>
    request<FailureIncident>(`/failure-incidents/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  advanceFailureIncident: (id: number) =>
    request<FailureIncident>(`/failure-incidents/${id}/advance`, { method: "POST" }),
  deleteFailureIncident: (id: number) =>
    request<void>(`/failure-incidents/${id}`, { method: "DELETE" }),

  listSlaMetrics: () => request<SlaMetric[]>("/sla/metrics"),
  updateSlaMetric: (id: number, data: SlaMetricUpdateInput) =>
    request<SlaMetric>(`/sla/metrics/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  listSlaFailureTimeLimits: () => request<SlaFailureTimeLimit[]>("/sla/failure-time-limits"),
  createSlaFailureTimeLimit: (data: SlaFailureTimeLimitInput) =>
    request<SlaFailureTimeLimit>("/sla/failure-time-limits", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateSlaFailureTimeLimit: (id: number, data: SlaFailureTimeLimitInput) =>
    request<SlaFailureTimeLimit>(`/sla/failure-time-limits/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteSlaFailureTimeLimit: (id: number) =>
    request<void>(`/sla/failure-time-limits/${id}`, { method: "DELETE" }),

  listSlaBusinessServices: () => request<SlaBusinessService[]>("/sla/business-services"),
  createSlaBusinessService: (data: SlaBusinessServiceInput) =>
    request<SlaBusinessService>("/sla/business-services", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateSlaBusinessService: (id: number, data: SlaBusinessServiceInput) =>
    request<SlaBusinessService>(`/sla/business-services/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteSlaBusinessService: (id: number) =>
    request<void>(`/sla/business-services/${id}`, { method: "DELETE" }),

  getSlaBusinessMonthly: (yearMonth: string) =>
    request<SlaBusinessMonthlyRow[]>(`/sla/business-monthly?year_month=${yearMonth}`),
  setSlaBusinessMonthly: (yearMonth: string, data: SlaBusinessMonthlyEntryInput[]) =>
    request<SlaBusinessMonthlyRow[]>(`/sla/business-monthly?year_month=${yearMonth}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  getSlaOperationMonthly: (yearMonth: string) =>
    request<SlaOperationMonthly>(`/sla/operation-monthly?year_month=${yearMonth}`),
  setSlaOperationMonthly: (yearMonth: string, data: SlaOperationMonthlyInput) =>
    request<SlaOperationMonthly>(`/sla/operation-monthly?year_month=${yearMonth}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  getSlaMonthlySummary: (yearMonth: string) =>
    request<SlaMonthlySummary>(`/sla/monthly-summary?year_month=${yearMonth}`),

  getSessionSettings: () => request<SessionSettings>("/session-settings"),
  updateSessionSettings: (data: SessionSettingsUpdateInput) =>
    request<SessionSettings>("/session-settings", { method: "PUT", body: JSON.stringify(data) }),
};
