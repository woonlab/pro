export type EquipmentCategory = "server" | "security" | "network";
export type EquipmentStatus = "active" | "retired";
export type HwSw = "HW" | "SW";
export type MaintenanceTarget = "free" | "paid";

export interface Equipment {
  id: number;
  serial_no: string | null;
  name: string;
  category: EquipmentCategory;
  model: string | null;
  location: string | null;
  ip_address: string | null;
  purchase_date: string | null;
  warranty_end: string | null;
  status: EquipmentStatus;

  owner_user_id: number | null;
  org_code_id: number | null;
  major_category_code_id: number | null;
  business_code_id: number | null;
  product_type_code_id: number | null;
  manufacturer_code_id: number | null;
  review_result_code_id: number | null;
  review_content: string | null;

  hw_sw: HwSw | null;
  maintenance_target: MaintenanceTarget | null;

  quantity: number;
  unit_price: number;
  maintenance_rate: number | null;
  maintenance_months: number;

  acquisition_price: number;
  maintenance_amount: number;

  created_at: string;
  updated_at: string;
}

export type EquipmentInput = Omit<
  Equipment,
  "id" | "created_at" | "updated_at" | "acquisition_price" | "maintenance_amount" | "serial_no"
> & { serial_no?: string | null };

export type MaintenanceRecordType = "inspection" | "failure" | "replacement" | "other";

export interface MaintenanceRecord {
  id: number;
  equipment_id: number;
  record_type: MaintenanceRecordType;
  performed_at: string;
  next_due_at: string | null;
  performed_by: string | null;
  description: string | null;
  created_at: string;
}

export type MaintenanceRecordInput = Omit<
  MaintenanceRecord,
  "id" | "equipment_id" | "created_at"
>;

export interface User {
  id: number;
  username: string;
  full_name: string | null;
  phone: string | null;
  is_admin: boolean;
  is_active: boolean;
}

export interface UserDetail extends User {
  group_ids: number[];
  permission_ids: number[];
}

export interface UserCreateInput {
  username: string;
  password: string;
  full_name: string | null;
  phone: string | null;
  is_admin: boolean;
}

export interface UserUpdateInput {
  full_name: string | null;
  phone: string | null;
  is_admin: boolean;
  is_active: boolean;
}

export interface Token {
  access_token: string;
  token_type: string;
}

export interface Code {
  id: number;
  parent_id: number | null;
  code: number;
  name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  children: Code[];
}

export interface CodeInput {
  parent_id: number | null;
  name: string;
  description: string | null;
  is_active: boolean;
}

export interface Menu {
  id: number;
  parent_id: number | null;
  name: string;
  path: string | null;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  children: Menu[];
}

export interface MenuInput {
  parent_id: number | null;
  name: string;
  path: string | null;
  description: string | null;
  is_active: boolean;
}

export interface Permission {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface PermissionMenuLink {
  menu_id: number;
  menu_name: string;
  view_only: boolean;
}

export interface PermissionDetail extends Permission {
  menus: PermissionMenuLink[];
  group_ids: number[];
  user_ids: number[];
}

export interface PermissionInput {
  name: string;
  description: string | null;
  is_active: boolean;
}

export interface Group {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface GroupDetail extends Group {
  permission_ids: number[];
  user_ids: number[];
}

export interface GroupInput {
  name: string;
  description: string | null;
  is_active: boolean;
}

export interface DailyCheckInput {
  check_date: string;
  inspector_user_id: number | null;
  common_content: string | null;
  maintenance_content: string | null;
  log_missing_content: string | null;
  ongoing_work_content: string | null;
}

export interface DailyCheck extends DailyCheckInput {
  id: number;
  approved: boolean;
  approved_by_user_id: number | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SpecialCheckInput {
  check_date: string;
  content: string;
  memo: string | null;
  owner_user_id: number | null;
}

export interface SpecialCheck extends SpecialCheckInput {
  id: number;
  created_at: string;
  updated_at: string;
}

export interface WeeklyTaskInput {
  task_date: string;
  content: string;
  memo: string | null;
  owner_user_id: number | null;
}

export interface WeeklyTask extends WeeklyTaskInput {
  id: number;
  created_at: string;
  updated_at: string;
}

export type LeaveType = "vacation" | "remote";

export interface WorkStatusInput {
  status_date: string;
  leave_type: LeaveType;
  content: string | null;
  owner_user_id: number | null;
}

export interface WorkStatus extends WorkStatusInput {
  id: number;
  created_at: string;
  updated_at: string;
}

export interface PartReplacementInput {
  occurred_date: string;
  org_code_id: number | null;
  field_code_id: number | null;
  replace_type: string;
  owner_user_id: number | null;
}

export interface PartReplacement extends PartReplacementInput {
  id: number;
  created_at: string;
  updated_at: string;
}

export interface SupportTicketInput {
  occurred_date: string;
  org_code_id: number | null;
  category_code_id: number | null;
  detail_type_code_id: number | null;
  content: string;
  resolved: boolean;
  requester_name: string | null;
  owner_user_id: number | null;
}

export interface SupportTicket extends SupportTicketInput {
  id: number;
  created_at: string;
  updated_at: string;
}

export interface StatCount {
  group_id: number | null;
  group_name: string;
  count: number;
}

export interface YearlyStatCount extends StatCount {
  year: number;
}

export type FailureStatus = "registered" | "in_progress" | "completed" | "approved";
export type EquipmentScope = "single" | "common";

export interface FailureIncidentCreateInput {
  occurred_at: string;
  equipment_id: number | null;
  content: string;
  severity_code_id: number | null;
  equipment_scope: EquipmentScope | null;
}

export interface FailureIncidentUpdateInput {
  content: string;
  severity_code_id: number | null;
  equipment_scope: EquipmentScope | null;
  resolved_at: string | null;
  service_down_at: string | null;
  cause_analysis: string | null;
  follow_up_action: string | null;
}

export interface FailureIncident {
  id: number;
  occurred_at: string;
  equipment_id: number | null;
  content: string;
  status: FailureStatus;
  resolved_at: string | null;
  service_down_at: string | null;
  severity_code_id: number | null;
  equipment_scope: EquipmentScope | null;
  cause_analysis: string | null;
  follow_up_action: string | null;
  registered_by_user_id: number | null;
  handled_by_user_id: number | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export type SlaDirection = "higher_better" | "lower_better" | "binary";

export interface SlaMetric {
  id: number;
  key: string;
  name: string;
  direction: SlaDirection;
  weight: number;
  threshold_100: number;
  threshold_90: number;
  threshold_80: number;
  threshold_70: number;
  updated_at: string;
}

export interface SlaMetricUpdateInput {
  weight: number;
  threshold_100: number;
  threshold_90: number;
  threshold_80: number;
  threshold_70: number;
}

export interface SlaFailureTimeLimitInput {
  severity_code_id: number;
  equipment_scope: EquipmentScope;
  max_minutes: number;
}

export interface SlaFailureTimeLimit extends SlaFailureTimeLimitInput {
  id: number;
}

export interface SlaBusinessServiceInput {
  grade: number;
  name: string;
  is_active: boolean;
}

export interface SlaBusinessService extends SlaBusinessServiceInput {
  id: number;
  created_at: string;
}

export interface SlaBusinessMonthlyEntryInput {
  business_service_id: number;
  downtime_hours: number;
  failure_count: number;
}

export interface SlaBusinessMonthlyRow {
  business_service_id: number;
  business_name: string;
  grade: number;
  plan_hours: number;
  downtime_hours: number;
  failure_count: number;
  uptime_hours: number;
  uptime_rate: number;
}

export interface SlaOperationMonthlyInput {
  backup_total_count: number;
  backup_success_count: number;
  change_failure_count: number;
  deliverable_score: number;
  security_incident: boolean;
}

export interface SlaOperationMonthly extends SlaOperationMonthlyInput {
  id: number;
  year_month: string;
  updated_at: string;
}

export interface SlaScoreRow {
  key: string;
  name: string;
  direction: SlaDirection;
  weight: number;
  raw_value: number;
  score: number;
  weighted_score: number;
}

export interface SlaMonthlySummary {
  year_month: string;
  rows: SlaScoreRow[];
  total_score: number;
  failure_exceed_count: number;
  failure_duplicate_count: number;
  failure_total_count: number;
}

export interface SessionSettings {
  idle_timeout_minutes: number;
  updated_at: string;
}

export interface SessionSettingsUpdateInput {
  idle_timeout_minutes: number;
}

export interface DashboardFailureIncidentCounts {
  in_progress: number;
  completed: number;
  approved: number;
}

export interface DashboardDailyCheckCounts {
  pending_approval: number;
  approved: number;
}

export interface DashboardAssetSummary {
  existing_count: number;
  year_target_label: string;
  year_target_count: number;
  delete_planned_count: number;
}

export interface DashboardPreventiveSummary {
  daily_check_count: number;
  special_check_count: number;
  weekly_task_count: number;
  work_status_count: number;
}

export interface DashboardTechSupportSummary {
  part_replacement_count: number;
  pc_printer_count: number;
  info_system_count: number;
  portal_count: number;
}

export interface DashboardSlaTrendPoint {
  year_month: string;
  total: number;
  availability: number;
  operation: number;
  failure: number;
}

export interface DashboardTodoItem {
  kind: string;
  title: string;
  badge: string;
  badge_type: "danger" | "warn" | "ok";
  path: string;
}

export interface DashboardAssetCategory {
  category: string;
  label: string;
  count: number;
}

export interface DashboardSlaGroup {
  key: string;
  label: string;
  score: number;
}

export interface DashboardSummary {
  year: number;
  month: number;
  failure_incident: DashboardFailureIncidentCounts;
  daily_check: DashboardDailyCheckCounts;
  asset: DashboardAssetSummary;
  preventive: DashboardPreventiveSummary;
  tech_support: DashboardTechSupportSummary;
  sla_trend: DashboardSlaTrendPoint[];
  todos: DashboardTodoItem[];
  todo_total: number;
  asset_categories: DashboardAssetCategory[];
  sla_groups: DashboardSlaGroup[];
  ticket_total: number;
  ticket_unresolved: number;
}
