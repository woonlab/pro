import { useEffect, useState } from "react";

import { api } from "../api/client";
import { findRootByName } from "../lib/codeLookup";
import type { Code, StatCount, SupportTicket, User } from "../types";

const today = new Date().toISOString().slice(0, 10);

export default function SupportTicketsPage() {
  const [items, setItems] = useState<SupportTicket[]>([]);
  const [codes, setCodes] = useState<Code[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<StatCount[]>([]);
  const [yearMonth, setYearMonth] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [occurredDate, setOccurredDate] = useState(today);
  const [orgCodeId, setOrgCodeId] = useState<number | null>(null);
  const [categoryCodeId, setCategoryCodeId] = useState<number | null>(null);
  const [detailTypeCodeId, setDetailTypeCodeId] = useState<number | null>(null);
  const [content, setContent] = useState("");
  const [resolved, setResolved] = useState(false);
  const [requesterName, setRequesterName] = useState("");
  const [ownerId, setOwnerId] = useState<number | null>(null);

  const orgOptions = findRootByName(codes, "소속기관")?.children ?? [];
  const categoryOptions = findRootByName(codes, "기술지원구분")?.children ?? [];
  const detailTypeOptions = findRootByName(codes, "기술지원세부유형")?.children ?? [];

  const load = () => {
    api
      .listSupportTickets(yearMonth || undefined)
      .then(setItems)
      .catch((e) => setError(String(e)));
    api
      .supportTicketStats(yearMonth || undefined)
      .then(setStats)
      .catch((e) => setError(String(e)));
  };

  useEffect(() => {
    load();
    api.listCodes().then(setCodes).catch((e) => setError(String(e)));
    api.listUsers().then(setUsers).catch((e) => setError(String(e)));
  }, [yearMonth]);

  const codeLabel = (id: number | null, options: Code[]) =>
    options.find((o) => o.id === id)?.name ?? "-";
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
      await api.createSupportTicket({
        occurred_date: occurredDate,
        org_code_id: orgCodeId,
        category_code_id: categoryCodeId,
        detail_type_code_id: detailTypeCodeId,
        content,
        resolved,
        requester_name: requesterName || null,
        owner_user_id: ownerId,
      });
      setContent("");
      setRequesterName("");
      setResolved(false);
      load();
    } catch (e) {
      setError(String(e));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("항목을 삭제하시겠습니까?")) return;
    await api.deleteSupportTicket(id);
    load();
  };

  return (
    <div>
      <h2>기술지원 - 기술지원 현황</h2>
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      <form className="inline" onSubmit={handleCreate}>
        <input
          type="date"
          value={occurredDate}
          onChange={(e) => setOccurredDate(e.target.value)}
          required
        />
        <select
          value={orgCodeId ?? ""}
          onChange={(e) => setOrgCodeId(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">소속기관 선택</option>
          {orgOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        <select
          value={categoryCodeId ?? ""}
          onChange={(e) => setCategoryCodeId(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">구분 선택</option>
          {categoryOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        <select
          value={detailTypeCodeId ?? ""}
          onChange={(e) => setDetailTypeCodeId(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">세부유형 선택</option>
          {detailTypeOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        <input
          placeholder="내용"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
        />
        <input
          placeholder="사용자(요청자)"
          value={requesterName}
          onChange={(e) => setRequesterName(e.target.value)}
        />
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
        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={resolved}
            onChange={(e) => setResolved(e.target.checked)}
          />
          조치완료
        </label>
        <button type="submit">등록</button>
      </form>

      <div className="inline" style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input type="month" value={yearMonth} onChange={(e) => setYearMonth(e.target.value)} />
      </div>

      <table>
        <thead>
          <tr>
            <th>발생일자</th>
            <th>소속기관</th>
            <th>구분</th>
            <th>세부유형</th>
            <th>내용</th>
            <th>조치결과</th>
            <th>사용자</th>
            <th>담당자</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.occurred_date}</td>
              <td>{codeLabel(item.org_code_id, orgOptions)}</td>
              <td>{codeLabel(item.category_code_id, categoryOptions)}</td>
              <td>{codeLabel(item.detail_type_code_id, detailTypeOptions)}</td>
              <td>{item.content}</td>
              <td>{item.resolved ? "O" : "X"}</td>
              <td>{item.requester_name ?? "-"}</td>
              <td>{userLabel(item.owner_user_id)}</td>
              <td>
                <button className="secondary" onClick={() => handleDelete(item.id)}>
                  삭제
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>기술지원 통계 (세부유형별)</h3>
      <table>
        <thead>
          <tr>
            <th>세부유형</th>
            <th>건수</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((s) => (
            <tr key={s.group_id ?? "none"}>
              <td>{s.group_name}</td>
              <td>{s.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
