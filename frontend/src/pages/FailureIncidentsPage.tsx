import { useEffect, useState } from "react";

import { api } from "../api/client";
import YearlyStatsTable from "../components/YearlyStatsTable";
import { codeName, findRootByName } from "../lib/codeLookup";
import type {
  Code,
  Equipment,
  EquipmentScope,
  FailureIncident,
  FailureStatus,
  User,
  YearlyStatCount,
} from "../types";

const nowLocal = () => new Date().toISOString().slice(0, 16);

const STATUS_LABEL: Record<FailureStatus, string> = {
  registered: "등록",
  in_progress: "처리 중",
  completed: "처리 완료",
  approved: "결재 완료",
};

const ADVANCE_LABEL: Record<FailureStatus, string | null> = {
  registered: "처리",
  in_progress: "완료",
  completed: "결재",
  approved: null,
};

export default function FailureIncidentsPage() {
  const [incidents, setIncidents] = useState<FailureIncident[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [codes, setCodes] = useState<Code[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [byType, setByType] = useState<YearlyStatCount[]>([]);
  const [byOrg, setByOrg] = useState<YearlyStatCount[]>([]);
  const [yearMonth, setYearMonth] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [occurredAt, setOccurredAt] = useState(nowLocal());
  const [equipmentId, setEquipmentId] = useState<number | null>(null);
  const [content, setContent] = useState("");
  const [severityCodeId, setSeverityCodeId] = useState<number | null>(null);
  const [equipmentScope, setEquipmentScope] = useState<EquipmentScope | "">("");

  const severityOptions = findRootByName(codes, "장애 등급")?.children ?? [];

  const load = () => {
    api
      .listFailureIncidents({ yearMonth: yearMonth || undefined, status: statusFilter || undefined })
      .then(setIncidents)
      .catch((e) => setError(String(e)));
    api.failureIncidentStats("type").then(setByType).catch((e) => setError(String(e)));
    api.failureIncidentStats("org").then(setByOrg).catch((e) => setError(String(e)));
  };

  useEffect(() => {
    load();
    api.listEquipment().then(setEquipment).catch((e) => setError(String(e)));
    api.listCodes().then(setCodes).catch((e) => setError(String(e)));
    api.listUsers().then(setUsers).catch((e) => setError(String(e)));
  }, [yearMonth, statusFilter]);

  const selectedEquipment = equipment.find((e) => e.id === equipmentId) ?? null;

  const userLabel = (id: number | null) => {
    if (id == null) return "-";
    const u = users.find((u) => u.id === id);
    return u ? (u.full_name ?? u.username) : "-";
  };

  const equipmentLabel = (id: number | null) => {
    if (id == null) return "-";
    const e = equipment.find((e) => e.id === id);
    return e ? `${e.serial_no ?? "-"} / ${e.name}` : "-";
  };

  const orgOf = (id: number | null) => {
    const e = equipment.find((e) => e.id === id);
    return e ? codeName(codes, e.org_code_id) : "-";
  };

  const typeOf = (id: number | null) => {
    const e = equipment.find((e) => e.id === id);
    return e ? codeName(codes, e.major_category_code_id) : "-";
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    if (!confirm("장애를 등록하시겠습니까?")) return;
    setError(null);
    try {
      await api.createFailureIncident({
        occurred_at: new Date(occurredAt).toISOString(),
        equipment_id: equipmentId,
        content,
        severity_code_id: severityCodeId,
        equipment_scope: equipmentScope || null,
      });
      setContent("");
      load();
    } catch (e) {
      setError(String(e));
    }
  };

  const handleAdvance = async (incident: FailureIncident) => {
    const label = ADVANCE_LABEL[incident.status];
    if (!label) return;
    if (!confirm(`장애 ${label}(을)를 진행하시겠습니까?`)) return;
    setError(null);
    try {
      await api.advanceFailureIncident(incident.id);
      load();
    } catch (e) {
      setError(String(e));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("이 장애 건을 삭제할까요?")) return;
    await api.deleteFailureIncident(id);
    load();
  };

  return (
    <div>
      <h2>장애관리 - 등록</h2>
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      <form onSubmit={handleCreate}>
        <div
          className="inline"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 8,
          }}
        >
          <input
            type="datetime-local"
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
            required
          />
          <select
            value={equipmentId ?? ""}
            onChange={(e) => setEquipmentId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">자산(연번) 선택</option>
            {equipment.map((e) => (
              <option key={e.id} value={e.id}>
                {e.serial_no ?? "-"} / {e.name}
              </option>
            ))}
          </select>
          <select
            value={severityCodeId ?? ""}
            onChange={(e) => setSeverityCodeId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">장애등급 선택</option>
            {severityOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
          <select
            value={equipmentScope}
            onChange={(e) => setEquipmentScope(e.target.value as EquipmentScope | "")}
          >
            <option value="">장애장비 선택</option>
            <option value="single">단일업무장비</option>
            <option value="common">공통장비</option>
          </select>
        </div>

        {selectedEquipment && (
          <p style={{ marginTop: 8 }}>
            소속기관: {codeName(codes, selectedEquipment.org_code_id)} / 도입년월:{" "}
            {selectedEquipment.purchase_date ?? "-"} / 장애유형:{" "}
            {codeName(codes, selectedEquipment.major_category_code_id)} / 제품구분:{" "}
            {codeName(codes, selectedEquipment.product_type_code_id)} / 제조사:{" "}
            {codeName(codes, selectedEquipment.manufacturer_code_id)} / 모델명:{" "}
            {selectedEquipment.model ?? "-"}
          </p>
        )}

        <textarea
          placeholder="내용"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          style={{ width: "100%", marginTop: 8, minHeight: 60 }}
        />

        <div style={{ marginTop: 8 }}>
          <button type="submit">등록</button>
        </div>
      </form>

      <h2>장애관리 이력</h2>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input type="month" value={yearMonth} onChange={(e) => setYearMonth(e.target.value)} />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">전체 상태</option>
          <option value="registered">등록</option>
          <option value="in_progress">처리 중</option>
          <option value="completed">처리 완료</option>
          <option value="approved">결재 완료</option>
        </select>
      </div>

      <table>
        <thead>
          <tr>
            <th>발생일자</th>
            <th>소속기관</th>
            <th>장애유형</th>
            <th>자산</th>
            <th>내용</th>
            <th>상태</th>
            <th>등록자</th>
            <th>처리자</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {incidents.map((incident) => (
            <tr key={incident.id}>
              <td>{new Date(incident.occurred_at).toLocaleString()}</td>
              <td>{orgOf(incident.equipment_id)}</td>
              <td>{typeOf(incident.equipment_id)}</td>
              <td>{equipmentLabel(incident.equipment_id)}</td>
              <td>{incident.content}</td>
              <td>{STATUS_LABEL[incident.status]}</td>
              <td>{userLabel(incident.registered_by_user_id)}</td>
              <td>{userLabel(incident.handled_by_user_id)}</td>
              <td style={{ display: "flex", gap: 6 }}>
                {ADVANCE_LABEL[incident.status] && (
                  <button onClick={() => handleAdvance(incident)}>
                    {ADVANCE_LABEL[incident.status]}
                  </button>
                )}
                <button className="secondary" onClick={() => handleDelete(incident.id)}>
                  삭제
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>유형별 현황</h3>
      <YearlyStatsTable rows={byType} />

      <h3>청별 현황</h3>
      <YearlyStatsTable rows={byOrg} />
    </div>
  );
}
