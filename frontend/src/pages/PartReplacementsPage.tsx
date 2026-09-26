import { useEffect, useState } from "react";

import { api } from "../api/client";
import YearlyStatsTable from "../components/YearlyStatsTable";
import { findRootByName } from "../lib/codeLookup";
import type { Code, PartReplacement, User, YearlyStatCount } from "../types";

const today = new Date().toISOString().slice(0, 10);

export default function PartReplacementsPage() {
  const [items, setItems] = useState<PartReplacement[]>([]);
  const [codes, setCodes] = useState<Code[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [byField, setByField] = useState<YearlyStatCount[]>([]);
  const [byOrg, setByOrg] = useState<YearlyStatCount[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [occurredDate, setOccurredDate] = useState(today);
  const [orgCodeId, setOrgCodeId] = useState<number | null>(null);
  const [fieldCodeId, setFieldCodeId] = useState<number | null>(null);
  const [replaceType, setReplaceType] = useState("");
  const [ownerId, setOwnerId] = useState<number | null>(null);

  const orgOptions = findRootByName(codes, "소속기관")?.children ?? [];
  const fieldOptions = findRootByName(codes, "대분류")?.children ?? [];

  const load = () => {
    api.listPartReplacements().then(setItems).catch((e) => setError(String(e)));
    api.partReplacementStats("field").then(setByField).catch((e) => setError(String(e)));
    api.partReplacementStats("org").then(setByOrg).catch((e) => setError(String(e)));
  };

  useEffect(() => {
    load();
    api.listCodes().then(setCodes).catch((e) => setError(String(e)));
    api.listUsers().then(setUsers).catch((e) => setError(String(e)));
  }, []);

  const codeLabel = (id: number | null, options: Code[]) =>
    options.find((o) => o.id === id)?.name ?? "-";
  const userLabel = (id: number | null) => {
    if (id == null) return "-";
    const u = users.find((u) => u.id === id);
    return u ? (u.full_name ?? u.username) : "-";
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replaceType.trim()) return;
    setError(null);
    try {
      await api.createPartReplacement({
        occurred_date: occurredDate,
        org_code_id: orgCodeId,
        field_code_id: fieldCodeId,
        replace_type: replaceType,
        owner_user_id: ownerId,
      });
      setReplaceType("");
      load();
    } catch (e) {
      setError(String(e));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("항목을 삭제하시겠습니까?")) return;
    await api.deletePartReplacement(id);
    load();
  };

  return (
    <div>
      <h2>기술지원 - 파트교체 현황</h2>
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
          value={fieldCodeId ?? ""}
          onChange={(e) => setFieldCodeId(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">분야 선택</option>
          {fieldOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        <input
          placeholder="교체유형"
          value={replaceType}
          onChange={(e) => setReplaceType(e.target.value)}
          required
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
        <button type="submit">등록</button>
      </form>

      <h3>파트교체 현황 이력</h3>
      <table>
        <thead>
          <tr>
            <th>발생일자</th>
            <th>소속기관</th>
            <th>분야</th>
            <th>교체유형</th>
            <th>담당자</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.occurred_date}</td>
              <td>{codeLabel(item.org_code_id, orgOptions)}</td>
              <td>{codeLabel(item.field_code_id, fieldOptions)}</td>
              <td>{item.replace_type}</td>
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

      <h3>유형별 현황</h3>
      <YearlyStatsTable rows={byField} />

      <h3>청별 현황</h3>
      <YearlyStatsTable rows={byOrg} />
    </div>
  );
}
