import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import type { DailyCheck, User } from "../types";

export default function DailyCheckDetailPage() {
  const { id } = useParams<{ id: string }>();
  const checkId = Number(id);
  const { user } = useAuth();

  const [check, setCheck] = useState<DailyCheck | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    api.getDailyCheck(checkId).then(setCheck).catch((e) => setError(String(e)));
  };

  useEffect(() => {
    load();
    api.listUsers().then(setUsers).catch((e) => setError(String(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const sections: { title: string; content: string | null }[] = [
    { title: "공통사항", content: check.common_content },
    { title: "유지관리", content: check.maintenance_content },
    { title: "로그미수집", content: check.log_missing_content },
    { title: "진행 중 업무", content: check.ongoing_work_content },
  ];

  return (
    <div>
      <p>
        <Link to="/daily-checks">← 목록으로</Link>
      </p>
      <h2>일일업무보고 상세</h2>
      <p>
        일자: {check.check_date} / 점검자: {userLabel(check.inspector_user_id)} / 결재여부:{" "}
        {check.approved
          ? `결재완료 (${userLabel(check.approved_by_user_id)}, ${
              check.approved_at ? new Date(check.approved_at).toLocaleString() : ""
            })`
          : "미결재"}
      </p>
      {!check.approved && user?.is_admin && <button onClick={handleApprove}>결재</button>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
        {sections.map((s) => (
          <div key={s.title} className="split-panel__detail">
            <h4>{s.title}</h4>
            <p style={{ whiteSpace: "pre-wrap" }}>{s.content || "-"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
