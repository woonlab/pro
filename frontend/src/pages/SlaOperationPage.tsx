import { useEffect, useState } from "react";

import { api } from "../api/client";
import type { SlaOperationMonthlyInput } from "../types";

const thisMonth = new Date().toISOString().slice(0, 7);

const emptyForm: SlaOperationMonthlyInput = {
  backup_total_count: 0,
  backup_success_count: 0,
  change_failure_count: 0,
  deliverable_score: 0,
  security_incident: false,
};

export default function SlaOperationPage() {
  const [yearMonth, setYearMonth] = useState(thisMonth);
  const [form, setForm] = useState<SlaOperationMonthlyInput>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getSlaOperationMonthly(yearMonth)
      .then((data) =>
        setForm({
          backup_total_count: data.backup_total_count,
          backup_success_count: data.backup_success_count,
          change_failure_count: data.change_failure_count,
          deliverable_score: data.deliverable_score,
          security_incident: data.security_incident,
        })
      )
      .catch((e) => setError(String(e)));
  }, [yearMonth]);

  const backupRate = form.backup_total_count
    ? ((form.backup_success_count / form.backup_total_count) * 100).toFixed(2)
    : "-";

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api.setSlaOperationMonthly(yearMonth, form);
      alert("저장했습니다.");
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <div>
      <h2>SLA - 운영관리</h2>
      {error && <p style={{ color: "crimson" }}>{error}</p>}

      <input
        type="month"
        value={yearMonth}
        onChange={(e) => setYearMonth(e.target.value)}
        style={{ marginBottom: 12 }}
      />

      <form onSubmit={handleSave}>
        <h4>백업성공률 (성공률: {backupRate}{backupRate !== "-" ? "%" : ""})</h4>
        <div className="inline" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8 }}>
          <label>
            백업 수행건수
            <input
              type="number"
              value={form.backup_total_count}
              onChange={(e) => setForm({ ...form, backup_total_count: Number(e.target.value) })}
            />
          </label>
          <label>
            백업 성공건수
            <input
              type="number"
              value={form.backup_success_count}
              onChange={(e) => setForm({ ...form, backup_success_count: Number(e.target.value) })}
            />
          </label>
        </div>

        <h4>변경작업 실패건수</h4>
        <input
          type="number"
          value={form.change_failure_count}
          onChange={(e) => setForm({ ...form, change_failure_count: Number(e.target.value) })}
        />

        <h4>산출물관리수준 (점수)</h4>
        <input
          type="number"
          value={form.deliverable_score}
          onChange={(e) => setForm({ ...form, deliverable_score: Number(e.target.value) })}
        />

        <h4>보안준수</h4>
        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={form.security_incident}
            onChange={(e) => setForm({ ...form, security_incident: e.target.checked })}
          />
          이번 달 보안 사고 발생함
        </label>

        <div style={{ marginTop: 12 }}>
          <button type="submit">저장</button>
        </div>
      </form>
    </div>
  );
}
