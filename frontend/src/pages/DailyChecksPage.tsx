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

  const load = () => {
    const months = Array.from(
      new Set([weekDays[0], weekDays[6]].map((d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)),
    );
    Promise.all(months.map((m) => api.listDailyChecks(m)))
      .then((lists) => setReports(lists.flat()))
      .catch((e) => setError(String(e)));
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
    </div>
  );
}
