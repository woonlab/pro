import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { findCodeById, findRootByName } from "../lib/codeLookup";
import type {
  Code,
  DailyCheck,
  DailyCheckFailureInput,
  DailyCheckItemInput,
  User,
} from "../types";

const today = new Date().toISOString().slice(0, 10);

export default function DailyChecksPage() {
  const { user } = useAuth();
  const [checks, setChecks] = useState<DailyCheck[]>([]);
  const [codes, setCodes] = useState<Code[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [yearMonth, setYearMonth] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [checkDate, setCheckDate] = useState(today);
  const [inspectorId, setInspectorId] = useState<number | null>(null);
  const [items, setItems] = useState<DailyCheckItemInput[]>([]);
  const [failures, setFailures] = useState<DailyCheckFailureInput[]>([]);

  const load = () => {
    api
      .listDailyChecks(yearMonth || undefined)
      .then(setChecks)
      .catch((e) => setError(String(e)));
  };

  useEffect(() => {
    load();
    api.listCodes().then(setCodes).catch((e) => setError(String(e)));
    api.listUsers().then(setUsers).catch((e) => setError(String(e)));
  }, [yearMonth]);

  const businessOptions = findRootByName(codes, "업무구분")?.children ?? [];
  const remarkOptions = findRootByName(codes, "특이사항")?.children ?? [];

  const addItem = () =>
    setItems((prev) => [
      ...prev,
      { business_code_id: null, target_code_id: null, remark_code_id: null, note: "" },
    ]);
  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));
  const updateItem = (idx: number, patch: Partial<DailyCheckItemInput>) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const addFailure = () =>
    setFailures((prev) => [
      ...prev,
      { system_name: "", failure_time: "", cause: "", action: "" },
    ]);
  const removeFailure = (idx: number) => setFailures((prev) => prev.filter((_, i) => i !== idx));
  const updateFailure = (idx: number, patch: Partial<DailyCheckFailureInput>) =>
    setFailures((prev) => prev.map((f, i) => (i === idx ? { ...f, ...patch } : f)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm("저장하시겠습니까?")) return;
    setError(null);
    try {
      await api.createDailyCheck({
        check_date: checkDate,
        inspector_user_id: inspectorId,
        items,
        failures,
      });
      setItems([]);
      setFailures([]);
      load();
    } catch (e) {
      setError(String(e));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("이 일일점검을 삭제할까요?")) return;
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
      <h2>예방점검 - 일일점검 등록</h2>
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <div className="inline" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8 }}>
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

        <h4>유지관리 일일 업무 현황</h4>
        {businessOptions.length === 0 && (
          <p className="text-muted-danger">
            코드관리에서 "업무구분" 상위코드와 하위 항목(구분별 대상장비 포함)을 먼저 등록하세요.
          </p>
        )}
        <table>
          <thead>
            <tr>
              <th>구분</th>
              <th>대상장비</th>
              <th>특이사항</th>
              <th>기타</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const targetOptions = findCodeById(codes, item.business_code_id)?.children ?? [];
              return (
                <tr key={idx}>
                  <td>
                    <select
                      value={item.business_code_id ?? ""}
                      onChange={(e) =>
                        updateItem(idx, {
                          business_code_id: e.target.value ? Number(e.target.value) : null,
                          target_code_id: null,
                        })
                      }
                    >
                      <option value="">선택</option>
                      {businessOptions.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      value={item.target_code_id ?? ""}
                      onChange={(e) =>
                        updateItem(idx, {
                          target_code_id: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                    >
                      <option value="">선택</option>
                      {targetOptions.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      value={item.remark_code_id ?? ""}
                      onChange={(e) =>
                        updateItem(idx, {
                          remark_code_id: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                    >
                      <option value="">없음</option>
                      {remarkOptions.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      value={item.note ?? ""}
                      onChange={(e) => updateItem(idx, { note: e.target.value })}
                    />
                  </td>
                  <td>
                    <button type="button" className="secondary" onClick={() => removeItem(idx)}>
                      삭제
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <button type="button" className="secondary" onClick={addItem}>
          + 추가
        </button>

        <h4>장애대응</h4>
        <table>
          <thead>
            <tr>
              <th>시스템</th>
              <th>장애시간</th>
              <th>장애원인</th>
              <th>조치내용</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {failures.map((f, idx) => (
              <tr key={idx}>
                <td>
                  <input
                    value={f.system_name ?? ""}
                    onChange={(e) => updateFailure(idx, { system_name: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    value={f.failure_time ?? ""}
                    onChange={(e) => updateFailure(idx, { failure_time: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    value={f.cause ?? ""}
                    onChange={(e) => updateFailure(idx, { cause: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    value={f.action ?? ""}
                    onChange={(e) => updateFailure(idx, { action: e.target.value })}
                  />
                </td>
                <td>
                  <button type="button" className="secondary" onClick={() => removeFailure(idx)}>
                    삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button type="button" className="secondary" onClick={addFailure}>
          + 추가
        </button>

        <div style={{ marginTop: 12 }}>
          <button type="submit">저장</button>
        </div>
      </form>

      <h2>일일점검 목록</h2>
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
