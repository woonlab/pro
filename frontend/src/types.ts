export type EquipmentCategory = "server" | "security" | "network";
export type EquipmentStatus = "active" | "retired";

export interface Equipment {
  id: number;
  name: string;
  category: EquipmentCategory;
  model: string | null;
  location: string | null;
  ip_address: string | null;
  owner: string | null;
  purchase_date: string | null;
  warranty_end: string | null;
  status: EquipmentStatus;
  created_at: string;
  updated_at: string;
}

export type EquipmentInput = Omit<Equipment, "id" | "created_at" | "updated_at">;

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
  is_admin: boolean;
}

export interface UserCreateInput {
  username: string;
  password: string;
  full_name: string | null;
  is_admin: boolean;
}

export interface Token {
  access_token: string;
  token_type: string;
}
