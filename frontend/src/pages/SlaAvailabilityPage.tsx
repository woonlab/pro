import { useEffect, useState } from "react";

import { api } from "../api/client";
import type { SlaBusinessMonthlyRow, SlaBusinessService } from "../types";

const thisMonth = new Date().toISOString().slice(0, 7);

export default function SlaAvailabilityPage() {
  const [services, setServices] = useState<SlaBusinessService[]>([]);
  const [rows, setRows] = useState<SlaBusinessMonthlyRow[]>([]);
  const [drafts, setDrafts] = useState<Record<number, { downtime_hours: number; failure_count: number }>>(
    {}
  );
  const [yearMonth, setYearMonth] = useState(thisMonth);
  const [error, setError] = useState<string | null>(null);

  const [newGrade, setNewGrade] = useState(1);
  const [newName, setNewName] = useState("");

  const loadServices = () => {
    api.listSlaBusinessServices().then(setServices).catch((e) => setError(String(e)));
  };

  const loadMonthly = () => {
    api
      .getSlaBusinessMonthly(yearMonth)
      .then((data) => {
        setRows(data);
        setDrafts(
          Object.fromEntries(
            data.map((r) => [
              r.business_service_id,
              { downtime_hours: r.downtime_hours, failure_count: r.failure_count },
            ])
          )
        );
      })
      .catch((e) => setError(String(e)));
  };

  useEffect(loadServices, []);
  useEffect(loadMonthly, [yearMonth]);

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setError(null);
    try {
      await api.createSlaBusinessService({ grade: newGrade, name: newName, is_active: true });
      setNewName("");
      loadServices();
      loadMonthly();
    } catch (e) {
      setError(String(e));
    }
  };

  const handleDeleteService = async (id: number) => {
    if (!confirm("업무명을 삭제하시겠습니까?")) return;
    await api.deleteSlaBusinessService(id);
    loadServices();
    loadMonthly();
  };

  const handleSaveAll = async () => {
    setError(null);
    try {
      const payload = services.map((s) => ({
        business_service_id: s.id,
        downtime_hours: drafts[s.id]?.downtime_hours ?? 0,
        failure_count: drafts[s.id]?.failure_count ?? 0,
      }));
      const updated = await api.setSlaBusinessMonthly(yearMonth, payload);
      setRows(updated);
      alert("저장했습니다.");
    } catch (e) {
      setError(String(e));
    }
  };

  const grades = [1, 2, 3, 4];

  return (
    <div>
      <h2>SLA - 가용성관리</h2>
      {error && <p style={{ color: "crimson" }}>{error}</p>}

      <h3>업무명 등록</h3>
      <form className="inline" onSubmit={handleAddService}>
        <select value={newGrade} onChange={(e) => setNewGrade(Number(e.target.value))}>
          <option value={1}>1등급</option>
          <option value={2}>2등급</option>
          <option value={3}>3등급</option>
          <option value={4}>4등급</option>
        </select>
        <input
          placeholder="업무명"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          required
        />
        <button type="submit">업무명 추가</button>
      </form>

      <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "12px 0" }}>
        <input type="month" value={yearMonth} onChange={(e) => setYearMonth(e.target.value)} />
        <button onClick={handleSaveAll}>전체 저장</button>
      </div>

      {grades.map((grade) => {
        const gradeRows = rows.filter((r) => r.grade === grade);
        if (gradeRows.length === 0) return null;
        const planSum = gradeRows.reduce((s, r) => s + r.plan_hours, 0);
        const uptimeSum = gradeRows.reduce((s, r) => s + r.uptime_hours, 0);
        const rate = planSum ? (uptimeSum / planSum) * 100 : 0;
        return (
          <div key={grade}>
            <h4>{grade}등급 (합계 가동률: {rate.toFixed(3)}%)</h4>
            <table>
              <thead>
                <tr>
                  <th>업무명</th>
                  <th>가동계획시간</th>
                  <th>장애시간</th>
                  <th>장애횟수</th>
                  <th>가동시간</th>
                  <th>가동률</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {gradeRows.map((r) => (
                  <tr key={r.business_service_id}>
                    <td>{r.business_name}</td>
                    <td>{r.plan_hours.toFixed(2)}</td>
                    <td>
                      <input
                        type="number"
                        value={drafts[r.business_service_id]?.downtime_hours ?? 0}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [r.business_service_id]: {
                              downtime_hours: Number(e.target.value),
                              failure_count: prev[r.business_service_id]?.failure_count ?? 0,
                            },
                          }))
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={drafts[r.business_service_id]?.failure_count ?? 0}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [r.business_service_id]: {
                              downtime_hours: prev[r.business_service_id]?.downtime_hours ?? 0,
                              failure_count: Number(e.target.value),
                            },
                          }))
                        }
                      />
                    </td>
                    <td>{r.uptime_hours.toFixed(2)}</td>
                    <td>{r.uptime_rate.toFixed(3)}%</td>
                    <td>
                      <button
                        className="secondary"
                        onClick={() => handleDeleteService(r.business_service_id)}
                      >
                        업무 삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
