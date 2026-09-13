import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { api } from "../api/client";
import type { Equipment, MaintenanceRecord, MaintenanceRecordInput } from "../types";

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

  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
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
        모델: {equipment.model ?? "-"} / 위치: {equipment.location ?? "-"} / IP:{" "}
        {equipment.ip_address ?? "-"} / 담당자: {equipment.owner ?? "-"}
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
