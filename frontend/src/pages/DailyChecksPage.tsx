import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import type { DailyCheck, User } from "../types";

const today = new Date().toISOString().slice(0, 10);

export default function DailyChecksPage() {
  const { user } = useAuth();
  const [checks, setChecks] = useState<DailyCheck[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [yearMonth, setYearMonth] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [checkDate, setCheckDate] = useState(today);
  const [inspectorId, setInspectorId] = useState<number | null>(null);
  const [commonContent, setCommonContent] = useState("");
  const [maintenanceContent, setMaintenanceContent] = useState("");
  const [logMissingContent, setLogMissingContent] = useState("");
  const [ongoingWorkContent, setOngoingWorkContent] = useState("");

  const load = () => {
    api
      .listDailyChecks(yearMonth || undefined)
      .then(setChecks)
      .catch((e) => setError(String(e)));
  };

  useEffect(() => {
    load();
    api.listUsers().then(setUsers).catch((e) => setError(String(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearMonth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm("저장하시겠습니까?")) return;
    setError(null);
    try {
      await api.createDailyCheck({
        check_date: checkDate,
        inspector_user_id: inspectorId,
        common_content: commonContent || null,
        maintenance_content: maintenanceContent || null,
        log_missing_content: logMissingContent || null,
        ongoing_work_content: ongoingWorkContent || null,
      });
      setCommonContent("");
      setMaintenanceContent("");
      setLogMissingContent("");
      setOngoingWorkContent("");
      load();
    } catch (e) {
      setError(String(e));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("이 일일업무보고를 삭제할까요?")) return;
    await api.deleteDailyCheck(id);
    load();
  };

  const handleApprove = async (id: number) => {
    if (!confirm("결재하시겠습니까?")) return;
    try {
      await api.approveDailyCheck(id);
      load();
    } catch (e) {
      setError(String(e));
    }
  };

  const userLabel = (id: number | null) => {
    if (id == null) return "-";
    const u = users.find((u) => u.id === id);
    return u ? (u.full_name ?? u.username) : "-";
  };

  return (
    <div>
      <h2>예방점검 - 일일업무보고 등록</h2>
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <div
          className="inline"
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8 }}
        >
          <input type="date" value={checkDate} onChange={(e) => setCheckDate(e.target.value)} required />
          <select
            value={inspectorId ?? ""}
            onChange={(e) => setInspectorId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">점검자 선택</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name ?? u.username}
              </option>
            ))}
          </select>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            marginTop: 12,
          }}
        >
          <div>
            <h4>공통사항</h4>
            <textarea
              rows={6}
              style={{ width: "100%", boxSizing: "border-box" }}
              value={commonContent}
              onChange={(e) => setCommonContent(e.target.value)}
            />
          </div>
          <div>
            <h4>유지관리</h4>
            <textarea
              rows={6}
              style={{ width: "100%", boxSizing: "border-box" }}
              value={maintenanceContent}
              onChange={(e) => setMaintenanceContent(e.target.value)}
            />
          </div>
          <div>
            <h4>로그미수집</h4>
            <textarea
              rows={6}
              style={{ width: "100%", boxSizing: "border-box" }}
              value={logMissingContent}
              onChange={(e) => setLogMissingContent(e.target.value)}
            />
          </div>
          <div>
            <h4>진행 중 업무</h4>
            <textarea
              rows={6}
              style={{ width: "100%", boxSizing: "border-box" }}
              value={ongoingWorkContent}
              onChange={(e) => setOngoingWorkContent(e.target.value)}
            />
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <button type="submit">저장</button>
        </div>
      </form>

      <h2>일일업무보고 목록</h2>
      <div className="inline" style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          type="month"
          value={yearMonth}
          onChange={(e) => setYearMonth(e.target.value)}
          placeholder="조회년월"
        />
      </div>
      <table>
        <thead>
          <tr>
            <th>일자</th>
            <th>점검자</th>
            <th>등록일시</th>
            <th>결재여부</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {checks.map((c) => (
            <tr key={c.id}>
              <td>
                <Link to={`/daily-checks/${c.id}`}>{c.check_date}</Link>
              </td>
              <td>{userLabel(c.inspector_user_id)}</td>
              <td>{new Date(c.created_at).toLocaleString()}</td>
              <td>{c.approved ? "결재완료" : "미결재"}</td>
              <td style={{ display: "flex", gap: 6 }}>
                {!c.approved && user?.is_admin && (
                  <button onClick={() => handleApprove(c.id)}>결재</button>
                )}
                <button className="secondary" onClick={() => handleDelete(c.id)}>
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
