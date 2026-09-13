import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { codeName } from "../lib/codeLookup";
import type { Code, Equipment, MaintenanceRecord, MaintenanceRecordInput, User } from "../types";

const emptyForm: MaintenanceRecordInput = {
  record_type: "inspection",
  performed_at: new Date().toISOString().slice(0, 10),
  next_due_at: null,
  performed_by: "",
  description: "",
};

const RECORD_TYPE_LABEL: Record<string, string> = {
  inspection: "정기점검",
  failure: "장애",
  replacement: "교체",
  other: "기타",
};

export default function EquipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const equipmentId = Number(id);

  const { user } = useAuth();
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [codes, setCodes] = useState<Code[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState<MaintenanceRecordInput>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    api.getEquipment(equipmentId).then(setEquipment).catch((e) => setError(String(e)));
    api
      .listMaintenanceRecords(equipmentId)
      .then(setRecords)
      .catch((e) => setError(String(e)));
  };

  useEffect(load, [equipmentId]);
  useEffect(() => {
    api.listCodes().then(setCodes).catch((e) => setError(String(e)));
    api.listUsers().then(setUsers).catch((e) => setError(String(e)));
  }, []);

  const ownerLabel = (id: number | null) => {
    if (id == null) return "-";
    const u = users.find((u) => u.id === id);
    return u ? (u.full_name ?? u.username) : "-";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createMaintenanceRecord(equipmentId, {
        ...form,
        performed_by: form.performed_by || null,
        description: form.description || null,
        next_due_at: form.next_due_at || null,
      });
      setForm(emptyForm);
      load();
    } catch (e) {
      setError(String(e));
    }
  };

  const handleDelete = async (recordId: number) => {
    if (!confirm("이 이력을 삭제할까요?")) return;
    await api.deleteMaintenanceRecord(recordId);
    load();
  };

  if (error) return <p style={{ color: "crimson" }}>{error}</p>;
  if (!equipment) return <p>불러오는 중...</p>;

  return (
    <div>
      <p>
        <Link to="/">← 목록으로</Link>
      </p>
      <h2>{equipment.name}</h2>
      <p>
        연번: {equipment.serial_no ?? "-"} / 모델: {equipment.model ?? "-"} / 위치:{" "}
        {equipment.location ?? "-"} / IP: {equipment.ip_address ?? "-"} / 담당자:{" "}
        {ownerLabel(equipment.owner_user_id)}
      </p>
      <p>
        소속기관: {codeName(codes, equipment.org_code_id)} / 대분류:{" "}
        {codeName(codes, equipment.major_category_code_id)} / 업무:{" "}
        {codeName(codes, equipment.business_code_id)} / 구분: {equipment.hw_sw ?? "-"} / 제품구분:{" "}
        {codeName(codes, equipment.product_type_code_id)} / 제조사:{" "}
        {codeName(codes, equipment.manufacturer_code_id)}
      </p>
      <p>
        수량: {equipment.quantity} / 단가: {equipment.unit_price.toLocaleString()} / 취득가격:{" "}
        {equipment.acquisition_price.toLocaleString()} / 유지보수 대상여부:{" "}
        {equipment.maintenance_target === "free"
          ? "무상"
          : equipment.maintenance_target === "paid"
            ? "유상"
            : "-"}
        {user?.is_admin && (
          <>
            {" "}
            / 유지관리요율: {equipment.maintenance_rate ?? "-"}% / 유지개월:{" "}
            {equipment.maintenance_months} / 유지관리금액: {equipment.maintenance_amount.toLocaleString()}
          </>
        )}
      </p>
      <p>
        검토결과: {codeName(codes, equipment.review_result_code_id)} / 검토내용:{" "}
        {equipment.review_content ?? "-"}
      </p>

      <h3>유지보수/점검 이력 등록</h3>
      <form className="inline" onSubmit={handleSubmit}>
        <select
          value={form.record_type}
          onChange={(e) => setForm({ ...form, record_type: e.target.value as any })}
        >
          <option value="inspection">정기점검</option>
          <option value="failure">장애</option>
          <option value="replacement">교체</option>
          <option value="other">기타</option>
        </select>
        <input
          type="date"
          value={form.performed_at}
          onChange={(e) => setForm({ ...form, performed_at: e.target.value })}
          required
        />
        <input
          type="date"
          placeholder="다음 점검 예정일"
          value={form.next_due_at ?? ""}
          onChange={(e) => setForm({ ...form, next_due_at: e.target.value })}
        />
        <input
          placeholder="담당자"
          value={form.performed_by ?? ""}
          onChange={(e) => setForm({ ...form, performed_by: e.target.value })}
        />
        <input
          placeholder="내용"
          value={form.description ?? ""}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <button type="submit">등록</button>
      </form>

      <h3>이력 목록</h3>
      <table>
        <thead>
          <tr>
            <th>구분</th>
            <th>수행일</th>
            <th>다음 예정일</th>
            <th>담당자</th>
            <th>내용</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <tr key={r.id}>
              <td>{RECORD_TYPE_LABEL[r.record_type] ?? r.record_type}</td>
              <td>{r.performed_at}</td>
              <td>{r.next_due_at ?? "-"}</td>
              <td>{r.performed_by ?? "-"}</td>
              <td>{r.description ?? "-"}</td>
              <td>
                <button className="secondary" onClick={() => handleDelete(r.id)}>
                  삭제
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
