import { useEffect, useState } from "react";

import { api } from "../api/client";
import type { LeaveType, User, WorkStatus } from "../types";

const today = new Date().toISOString().slice(0, 10);

const LEAVE_TYPE_LABEL: Record<LeaveType, string> = {
  vacation: "휴가",
  remote: "재택",
};

export default function WorkStatusPage() {
  const [items, setItems] = useState<WorkStatus[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [statusDate, setStatusDate] = useState(today);
  const [leaveType, setLeaveType] = useState<LeaveType>("vacation");
  const [content, setContent] = useState("");
  const [ownerId, setOwnerId] = useState<number | null>(null);

  const load = () => {
    api.listWorkStatus().then(setItems).catch((e) => setError(String(e)));
  };

  useEffect(() => {
    load();
    api.listUsers().then(setUsers).catch((e) => setError(String(e)));
  }, []);

  const userLabel = (id: number | null) => {
    if (id == null) return "-";
    const u = users.find((u) => u.id === id);
    return u ? (u.full_name ?? u.username) : "-";
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api.createWorkStatus({
        status_date: statusDate,
        leave_type: leaveType,
        content: content || null,
        owner_user_id: ownerId,
      });
      setContent("");
      load();
    } catch (e) {
      setError(String(e));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("항목을 삭제하시겠습니까?")) return;
    await api.deleteWorkStatus(id);
    load();
  };

  return (
    <div>
      <h2>예방점검 - 주간업무 (근무 상황)</h2>
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      <form className="inline" onSubmit={handleCreate}>
        <input
          type="date"
          value={statusDate}
          onChange={(e) => setStatusDate(e.target.value)}
          required
        />
        <select value={leaveType} onChange={(e) => setLeaveType(e.target.value as LeaveType)}>
          <option value="vacation">휴가</option>
          <option value="remote">재택</option>
        </select>
        <input placeholder="내용" value={content} onChange={(e) => setContent(e.target.value)} />
        <select
          value={ownerId ?? ""}
          onChange={(e) => setOwnerId(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">담당자 선택</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.full_name ?? u.username}
            </option>
          ))}
        </select>
        <button type="submit">등록</button>
      </form>

      <table>
        <thead>
          <tr>
            <th>일자</th>
            <th>휴가/재택</th>
            <th>내용</th>
            <th>담당자</th>
            <th>수정일시</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.status_date}</td>
              <td>{LEAVE_TYPE_LABEL[item.leave_type]}</td>
              <td>{item.content ?? "-"}</td>
              <td>{userLabel(item.owner_user_id)}</td>
              <td>{new Date(item.updated_at).toLocaleString()}</td>
              <td>
                <button className="secondary" onClick={() => handleDelete(item.id)}>
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
