import { useEffect, useState } from "react";

import { api } from "../api/client";
import type { SpecialCheck, User } from "../types";

const today = new Date().toISOString().slice(0, 10);

export default function SpecialChecksPage() {
  const [items, setItems] = useState<SpecialCheck[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [checkDate, setCheckDate] = useState(today);
  const [content, setContent] = useState("");
  const [memo, setMemo] = useState("");
  const [ownerId, setOwnerId] = useState<number | null>(null);

  const load = () => {
    api.listSpecialChecks().then(setItems).catch((e) => setError(String(e)));
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
    if (!content.trim()) return;
    setError(null);
    try {
      await api.createSpecialCheck({
        check_date: checkDate,
        content,
        memo: memo || null,
        owner_user_id: ownerId,
      });
      setContent("");
      setMemo("");
      load();
    } catch (e) {
      setError(String(e));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("항목을 삭제하시겠습니까?")) return;
    await api.deleteSpecialCheck(id);
    load();
  };

  return (
    <div>
      <h2>예방점검 - 특별점검</h2>
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      <form className="inline" onSubmit={handleCreate}>
        <input type="date" value={checkDate} onChange={(e) => setCheckDate(e.target.value)} required />
        <input
          placeholder="내용"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
        />
        <input placeholder="비고" value={memo} onChange={(e) => setMemo(e.target.value)} />
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
            <th>내용</th>
            <th>비고</th>
            <th>담당자</th>
            <th>수정일시</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.check_date}</td>
              <td>{item.content}</td>
              <td>{item.memo ?? "-"}</td>
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
