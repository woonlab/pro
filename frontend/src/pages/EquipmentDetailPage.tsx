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

const CATEGORY_LABEL: Record<string, string> = {
  server: "서버",
  security: "보안장비",
  network: "네트워크장비",
};

function Kv({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="ed-kv">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

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

  const maintenanceTarget =
    equipment.maintenance_target === "free" ? "무상" : equipment.maintenance_target === "paid" ? "유상" : "-";
  const sortedRecords = [...records].sort((a, b) => b.performed_at.localeCompare(a.performed_at));

  return (
    <div className="ed-page">
      <p>
        <Link to="/equipments">← 목록으로</Link>
      </p>

      <div className="ed-header">
        <h2>{equipment.name}</h2>
        <span className="dash-pill dash-pill--ok">{equipment.status}</span>
      </div>
      <p className="ed-sub">
        {CATEGORY_LABEL[equipment.category] ?? equipment.category} · 연번 {equipment.serial_no ?? "-"} ·{" "}
        {equipment.model ?? "모델 미입력"}
      </p>

      <div className="ed-kpis">
        <div className="ed-kpi">
          <div>취득가격</div>
          <b>{equipment.acquisition_price.toLocaleString()}</b>
          <small>
            {equipment.quantity}대 × {equipment.unit_price.toLocaleString()}
          </small>
        </div>
        {user?.is_admin && (
          <div className="ed-kpi">
            <div>유지관리금액</div>
            <b>{equipment.maintenance_amount.toLocaleString()}</b>
            <small>요율 {equipment.maintenance_rate ?? "-"}%</small>
          </div>
        )}
        <div className="ed-kpi">
          <div>유지보수</div>
          <b>{maintenanceTarget}</b>
          <small>{user?.is_admin ? `${equipment.maintenance_months}개월` : " "}</small>
        </div>
      </div>

      <div className="ed-body">
        <div className="ed-left">
          <div className="dashboard-card">
            <h3>기본 정보</h3>
            <Kv label="모델" value={equipment.model ?? "-"} />
            <Kv label="위치" value={equipment.location ?? "-"} />
            <Kv label="IP" value={equipment.ip_address ?? "-"} />
            <Kv label="도입년월" value={equipment.purchase_date ?? "-"} />
          </div>
          <div className="dashboard-card">
            <h3>관리 정보</h3>
            <Kv label="소속기관" value={codeName(codes, equipment.org_code_id)} />
            <Kv label="담당자" value={ownerLabel(equipment.owner_user_id)} />
            <Kv label="대분류" value={codeName(codes, equipment.major_category_code_id)} />
            <Kv label="업무" value={codeName(codes, equipment.business_code_id)} />
            <Kv label="구분" value={equipment.hw_sw ?? "-"} />
            <Kv label="제품구분" value={codeName(codes, equipment.product_type_code_id)} />
            <Kv label="제조사" value={codeName(codes, equipment.manufacturer_code_id)} />
          </div>
          <div className="dashboard-card">
            <h3>검토</h3>
            <Kv label="검토결과" value={codeName(codes, equipment.review_result_code_id)} />
            <Kv label="검토내용" value={equipment.review_content ?? "-"} />
          </div>
        </div>

        <div className="dashboard-card ed-history">
          <h3>유지보수/점검 이력</h3>
          <form className="ed-form" onSubmit={handleSubmit}>
            <select
              value={form.record_type}
              onChange={(e) => setForm({ ...form, record_type: e.target.value as MaintenanceRecordInput["record_type"] })}
            >
              <option value="inspection">정기점검</option>
              <option value="failure">장애</option>
              <option value="replacement">교체</option>
              <option value="other">기타</option>
            </select>
            <input
              type="date"
              title="수행일"
              value={form.performed_at}
              onChange={(e) => setForm({ ...form, performed_at: e.target.value })}
              required
            />
            <input
              type="date"
              title="다음 점검 예정일"
              value={form.next_due_at ?? ""}
              onChange={(e) => setForm({ ...form, next_due_at: e.target.value })}
            />
            <input
              placeholder="담당자"
              value={form.performed_by ?? ""}
              onChange={(e) => setForm({ ...form, performed_by: e.target.value })}
            />
            <input
              className="ed-form__wide"
              placeholder="내용"
              value={form.description ?? ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <button type="submit">등록</button>
          </form>

          {sortedRecords.length === 0 ? (
            <p className="dash-empty">등록된 이력이 없습니다.</p>
          ) : (
            <ul className="ed-timeline">
              {sortedRecords.map((r) => (
                <li key={r.id}>
                  <div className="ed-timeline__row">
                    <b>
                      {RECORD_TYPE_LABEL[r.record_type] ?? r.record_type}
                      {r.description ? ` · ${r.description}` : ""}
                    </b>
                    <button className="secondary" onClick={() => handleDelete(r.id)}>
                      삭제
                    </button>
                  </div>
                  <small>
                    {r.performed_at} · {r.performed_by ?? "-"}
                    {r.next_due_at ? ` · 다음 예정 ${r.next_due_at}` : ""}
                  </small>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
