import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import type { DailyCheck, User } from "../types";

const DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

function fmt(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function mondayOf(d: Date): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const offset = (r.getDay() + 6) % 7;
  r.setDate(r.getDate() - offset);
  return r;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  r.setDate(r.getDate() + n);
  return r;
}

function Highlight({ text, q }: { text: string | null; q: string }) {
  if (!text) return <>-</>;
  const term = q.trim();
  if (!term) return <>{text}</>;
  const parts = text.split(new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return (
    <>
      {parts.map((p, i) =>
        p.toLowerCase() === term.toLowerCase() ? <mark key={i}>{p}</mark> : <span key={i}>{p}</span>,
      )}
    </>
  );
}

const SECTIONS: { key: "common" | "maintenance" | "logMissing" | "ongoing"; label: string }[] = [
  { key: "common", label: "공통사항" },
  { key: "maintenance", label: "유지관리" },
  { key: "logMissing", label: "로그미수집" },
  { key: "ongoing", label: "진행 중 업무" },
];

export default function DailyChecksPage() {
  const { user } = useAuth();
  const todayStr = fmt(new Date());
  const [weekStart, setWeekStart] = useState<Date>(mondayOf(new Date()));
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [reports, setReports] = useState<DailyCheck[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [inspectorId, setInspectorId] = useState<number | null>(null);
  const [text, setText] = useState({ common: "", maintenance: "", logMissing: "", ongoing: "" });

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekLabel = `${weekStart.getFullYear()}년 ${weekStart.getMonth() + 1}월 ${weekStart.getDate()}일 주`;

  const [q, setQ] = useState("");
  const [appliedQ, setAppliedQ] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "approved" | "pending">("all");
  const [results, setResults] = useState<DailyCheck[]>([]);
  const [previewId, setPreviewId] = useState<number | null>(null);

  const runSearch = (term = appliedQ) => {
    api
      .searchDailyChecks({
        q: term || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        approved: statusFilter === "all" ? undefined : statusFilter === "approved",
      })
      .then(setResults)
      .catch((e) => setError(String(e)));
  };

  const load = () => {
    const months = Array.from(
      new Set([weekDays[0], weekDays[6]].map((d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)),
    );
    Promise.all(months.map((m) => api.listDailyChecks(m)))
      .then((lists) => setReports(lists.flat()))
      .catch((e) => setError(String(e)));
    runSearch();
  };

  const handleSearch = () => {
    setAppliedQ(q);
    runSearch(q);
  };

  const handleReset = () => {
    setQ("");
    setAppliedQ("");
    setDateFrom("");
    setDateTo("");
    setStatusFilter("all");
    api.searchDailyChecks({}).then(setResults).catch((e) => setError(String(e)));
  };

  const goToReport = (r: DailyCheck) => {
    const d = new Date(r.check_date + "T00:00:00");
    setWeekStart(mondayOf(d));
    setSelectedDate(r.check_date);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(load, [weekStart]);
  useEffect(() => {
    api.listUsers().then(setUsers).catch((e) => setError(String(e)));
  }, []);

  const reportFor = (date: string) => reports.find((r) => r.check_date === date);
  const current = reportFor(selectedDate);

  useEffect(() => {
    setText({
      common: current?.common_content ?? "",
      maintenance: current?.maintenance_content ?? "",
      logMissing: current?.log_missing_content ?? "",
      ongoing: current?.ongoing_work_content ?? "",
    });
    setInspectorId(current?.inspector_user_id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, reports]);

  const shiftWeek = (n: number) => {
    const next = addDays(weekStart, n * 7);
    setWeekStart(next);
    const todayInWeek = fmt(mondayOf(new Date())) === fmt(next);
    setSelectedDate(todayInWeek ? todayStr : fmt(next));
  };

  const goThisWeek = () => {
    setWeekStart(mondayOf(new Date()));
    setSelectedDate(todayStr);
  };

  const dayStatus = (date: string): { label: string; cls: string } => {
    const r = reportFor(date);
    if (r) return r.approved ? { label: "완료", cls: "dc-day--done" } : { label: "결재대기", cls: "dc-day--wait" };
    if (date <= todayStr) return { label: "미작성", cls: "dc-day--none" };
    return { label: "-", cls: "" };
  };

  const handleSave = async () => {
    setError(null);
    const payload = {
      check_date: selectedDate,
      inspector_user_id: inspectorId,
      common_content: text.common || null,
      maintenance_content: text.maintenance || null,
      log_missing_content: text.logMissing || null,
      ongoing_work_content: text.ongoing || null,
    };
    try {
      if (current) await api.updateDailyCheck(current.id, payload);
      else await api.createDailyCheck(payload);
      load();
    } catch (e) {
      setError(String(e));
    }
  };

  const handleApprove = async () => {
    if (!current || !confirm("결재하시겠습니까?")) return;
    try {
      await api.approveDailyCheck(current.id);
      load();
    } catch (e) {
      setError(String(e));
    }
  };

  const handleDelete = async () => {
    if (!current || !confirm("이 일일업무보고를 삭제할까요?")) return;
    await api.deleteDailyCheck(current.id);
    load();
  };

  const userLabel = (id: number | null) => {
    if (id == null) return "-";
    const u = users.find((u) => u.id === id);
    return u ? (u.full_name ?? u.username) : "-";
  };

  const locked = current?.approved ?? false;

  return (
    <div>
      <div className="dc-head">
        <h2>일일업무보고</h2>
        <div className="dc-nav">
          <button type="button" className="secondary" onClick={() => shiftWeek(-1)}>
            ◀ 이전 주
          </button>
          <b>{weekLabel}</b>
          <button type="button" className="secondary" onClick={() => shiftWeek(1)}>
            다음 주 ▶
          </button>
          <button type="button" className="secondary" onClick={goThisWeek}>
            이번 주
          </button>
        </div>
      </div>

      <div className="dc-week">
        {weekDays.map((d, i) => {
          const date = fmt(d);
          const st = dayStatus(date);
          return (
            <button
              key={date}
              type="button"
              className={`dc-day ${st.cls}${date === selectedDate ? " dc-day--sel" : ""}`}
              onClick={() => setSelectedDate(date)}
            >
              <span>
                {DAY_LABELS[i]} {d.getDate()}
              </span>
              <small>{st.label}</small>
            </button>
          );
        })}
      </div>

      <div className="dashboard-card dc-editor">
        <div className="dc-editor__head">
          <h3>
            {selectedDate} ({DAY_LABELS[(new Date(selectedDate).getDay() + 6) % 7]}){" "}
            {current ? (locked ? "· 결재완료" : "· 결재대기") : "· 새 보고서"}
          </h3>
          <div className="dc-editor__meta">
            {locked ? (
              <span>점검자: {userLabel(current?.inspector_user_id ?? null)}</span>
            ) : (
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
            )}
            {current && <Link to={`/daily-checks/${current.id}`}>상세</Link>}
          </div>
        </div>

        {error && <p style={{ color: "crimson" }}>{error}</p>}

        <div className="dc-grid">
          {SECTIONS.map((s) => (
            <div key={s.key}>
              <h4>{s.label}</h4>
              <textarea
                rows={6}
                readOnly={locked}
                value={text[s.key]}
                onChange={(e) => setText({ ...text, [s.key]: e.target.value })}
              />
            </div>
          ))}
        </div>

        <div className="dc-actions">
          {current && user?.is_admin && !locked && <button onClick={handleApprove}>결재</button>}
          {current && (
            <button className="secondary" onClick={handleDelete}>
              삭제
            </button>
          )}
          {!locked && <button onClick={handleSave}>저장</button>}
        </div>
      </div>

      <div className="dashboard-card dc-search">
        <h3>일지 검색</h3>
        <div className="dc-search__bar">
          <input
            className="dc-search__q"
            placeholder="내용 검색 (공통사항 / 유지관리 / 로그미수집 / 진행 중 업무)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <input type="date" title="시작일" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <span>~</span>
          <input type="date" title="종료일" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}>
            <option value="all">전체 상태</option>
            <option value="approved">결재완료</option>
            <option value="pending">결재대기</option>
          </select>
          <button type="button" onClick={handleSearch}>
            검색
          </button>
          <button type="button" className="secondary" onClick={handleReset}>
            초기화
          </button>
        </div>
        <p className="dash-sub">총 {results.length}건 · 행을 누르면 아래에서 전체 내용을 볼 수 있습니다.</p>

        <table className="dc-search__table">
          <colgroup>
            <col style={{ width: "12%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "20%" }} />
            <col style={{ width: "20%" }} />
            <col style={{ width: "19%" }} />
            <col style={{ width: "19%" }} />
          </colgroup>
          <thead>
            <tr>
              <th>일자</th>
              <th>점검자</th>
              <th>공통사항</th>
              <th>유지관리</th>
              <th>로그미수집</th>
              <th>진행 중 업무</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr
                key={r.id}
                className={r.id === previewId ? "dc-row--sel" : ""}
                onClick={() => setPreviewId(r.id)}
              >
                <td>
                  {r.check_date.slice(5)} <span className={r.approved ? "dc-ok" : "dc-wait"}>●</span>
                </td>
                <td>{userLabel(r.inspector_user_id)}</td>
                <td>
                  <Highlight text={r.common_content} q={appliedQ} />
                </td>
                <td>
                  <Highlight text={r.maintenance_content} q={appliedQ} />
                </td>
                <td>
                  <Highlight text={r.log_missing_content} q={appliedQ} />
                </td>
                <td>
                  <Highlight text={r.ongoing_work_content} q={appliedQ} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {results.length === 0 && <p className="dash-empty">검색 결과가 없습니다.</p>}

        {(() => {
          const p = results.find((r) => r.id === previewId) ?? results[0];
          if (!p) return null;
          return (
            <div className="dc-preview">
              <div className="dc-preview__head">
                <b>
                  {p.check_date} · {p.approved ? "결재완료" : "결재대기"}
                </b>
                <button type="button" className="secondary" onClick={() => goToReport(p)}>
                  이 날짜로 이동
                </button>
              </div>
              <div className="dc-preview__grid">
                {(
                  [
                    ["공통사항", p.common_content],
                    ["유지관리", p.maintenance_content],
                    ["로그미수집", p.log_missing_content],
                    ["진행 중 업무", p.ongoing_work_content],
                  ] as const
                ).map(([label, text]) => (
                  <div key={label}>
                    <b>{label}</b>
                    <p>
                      <Highlight text={text} q={appliedQ} />
                    </p>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
