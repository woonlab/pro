import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { codeName } from "../lib/codeLookup";
import type { Code, DailyCheck, User } from "../types";

export default function DailyCheckDetailPage() {
  const { id } = useParams<{ id: string }>();
  const checkId = Number(id);
  const { user } = useAuth();

  const [check, setCheck] = useState<DailyCheck | null>(null);
  const [codes, setCodes] = useState<Code[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    api.getDailyCheck(checkId).then(setCheck).catch((e) => setError(String(e)));
  };

  useEffect(() => {
    load();
    api.listCodes().then(setCodes).catch((e) => setError(String(e)));
    api.listUsers().then(setUsers).catch((e) => setError(String(e)));
  }, [checkId]);

  const userLabel = (uid: number | null) => {
    if (uid == null) return "-";
    const u = users.find((u) => u.id === uid);
    return u ? (u.full_name ?? u.username) : "-";
  };

  const handleApprove = async () => {
    if (!confirm("결재하시겠습니까?")) return;
    try {
      await api.approveDailyCheck(checkId);
      load();
    } catch (e) {
      setError(String(e));
    }
  };

  if (error) return <p style={{ color: "crimson" }}>{error}</p>;
  if (!check) return <p>불러오는 중...</p>;

  return (
    <div>
      <p>
        <Link to="/daily-checks">← 목록으로</Link>
      </p>
      <h2>일일점검 상세</h2>
      <p>
        일자: {check.check_date} / 점검자: {userLabel(check.inspector_user_id)} / 결재여부:{" "}
        {check.approved
          ? `결재완료 (${userLabel(check.approved_by_user_id)}, ${
              check.approved_at ? new Date(check.approved_at).toLocaleString() : ""
            })`
          : "미결재"}
      </p>
      {!check.approved && user?.is_admin && (
        <button onClick={handleApprove}>결재</button>
      )}

      <h3>유지관리 일일 업무 현황</h3>
      <table>
        <thead>
          <tr>
            <th>구분</th>
            <th>대상장비</th>
            <th>특이사항</th>
            <th>기타</th>
          </tr>
        </thead>
        <tbody>
          {check.items.map((item) => (
            <tr key={item.id}>
              <td>{codeName(codes, item.business_code_id)}</td>
              <td>{codeName(codes, item.target_code_id)}</td>
              <td>{codeName(codes, item.remark_code_id)}</td>
              <td>{item.note ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>장애대응</h3>
      <table>
        <thead>
          <tr>
            <th>시스템</th>
            <th>장애시간</th>
            <th>장애원인</th>
            <th>조치내용</th>
          </tr>
        </thead>
        <tbody>
          {check.failures.map((f) => (
            <tr key={f.id}>
              <td>{f.system_name ?? "-"}</td>
              <td>{f.failure_time ?? "-"}</td>
              <td>{f.cause ?? "-"}</td>
              <td>{f.action ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
