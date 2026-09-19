import { useEffect, useState } from "react";

import { api } from "../api/client";
import type { User, WeeklyTask } from "../types";

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
const MAX_EVENTS_PER_CELL = 2;

function fmt(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export default function WeeklyTasksPage() {
  const todayStr = fmt(new Date());
  const [items, setItems] = useState<WeeklyTask[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [viewMonth, setViewMonth] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const [content, setContent] = useState("");
  const [memo, setMemo] = useState("");
  const [ownerId, setOwnerId] = useState<number | null>(null);

  const load = () => {
    api.listWeeklyTasks().then(setItems).catch((e) => setError(String(e)));
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

  const tasksByDate = new Map<string, WeeklyTask[]>();
  for (const t of items) {
    const list = tasksByDate.get(t.task_date) ?? [];
    list.push(t);
    tasksByDate.set(t.task_date, list);
  }

  const first = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const gridStart = new Date(first);
  gridStart.setDate(1 - first.getDay());
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const weekCount = Math.ceil((first.getDay() + daysInMonth) / 7);
  const cells = Array.from({ length: weekCount * 7 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });

  const shiftMonth = (n: number) => {
    const next = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + n, 1);
    setViewMonth(next);
    setSelectedDate(fmt(next));
  };

  const goToday = () => {
    const n = new Date();
    setViewMonth(new Date(n.getFullYear(), n.getMonth(), 1));
    setSelectedDate(todayStr);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setError(null);
    try {
      await api.createWeeklyTask({
        task_date: selectedDate,
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
    await api.deleteWeeklyTask(id);
    load();
  };

  const selectedTasks = tasksByDate.get(selectedDate) ?? [];
  const selectedLabel = new Date(selectedDate + "T00:00:00");

  return (
    <div>
      <div className="dc-head">
        <h2>
          주간 예정 업무 · {viewMonth.getFullYear()}년 {viewMonth.getMonth() + 1}월
        </h2>
        <div className="dc-nav">
          <button type="button" className="secondary" onClick={() => shiftMonth(-1)}>
            ◀
          </button>
          <button type="button" className="secondary" onClick={goToday}>
            오늘
          </button>
          <button type="button" className="secondary" onClick={() => shiftMonth(1)}>
            ▶
          </button>
        </div>
      </div>

      {error && <p style={{ color: "crimson" }}>{error}</p>}

      <div className="wt-body">
        <div className="wt-cal">
          {DAY_LABELS.map((l, i) => (
            <div key={l} className={`wt-h${i === 0 ? " wt-sun" : i === 6 ? " wt-sat" : ""}`}>
              {l}
            </div>
          ))}
          {cells.map((d) => {
            const date = fmt(d);
            const dayTasks = tasksByDate.get(date) ?? [];
            const other = d.getMonth() !== viewMonth.getMonth();
            const cls = [
              "wt-cell",
              other ? "wt-cell--other" : "",
              date === todayStr ? "wt-cell--today" : "",
              date === selectedDate ? "wt-cell--sel" : "",
            ].join(" ");
            return (
              <button key={date} type="button" className={cls} onClick={() => setSelectedDate(date)}>
                <span className="wt-num">{d.getDate()}</span>
                {dayTasks.slice(0, MAX_EVENTS_PER_CELL).map((t) => (
                  <span key={t.id} className="wt-ev">
                    {t.content}
                  </span>
                ))}
                {dayTasks.length > MAX_EVENTS_PER_CELL && (
                  <span className="wt-more">+{dayTasks.length - MAX_EVENTS_PER_CELL}건</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="dashboard-card wt-side">
          <h3>
            {selectedLabel.getMonth() + 1}월 {selectedLabel.getDate()}일 ({DAY_LABELS[selectedLabel.getDay()]})
          </h3>

          {selectedTasks.length === 0 ? (
            <p className="dash-empty">등록된 업무가 없습니다.</p>
          ) : (
            <ul className="wt-list">
              {selectedTasks.map((t) => (
                <li key={t.id}>
                  <div>
                    <b>{t.content}</b>
                    <small>
                      {userLabel(t.owner_user_id)}
                      {t.memo ? ` · ${t.memo}` : ""}
                    </small>
                  </div>
                  <button className="secondary" onClick={() => handleDelete(t.id)}>
                    삭제
                  </button>
                </li>
              ))}
            </ul>
          )}

          <form className="wt-form" onSubmit={handleCreate}>
            <input
              placeholder="업무 내용"
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
            <button type="submit">+ 등록</button>
          </form>
        </div>
      </div>
    </div>
  );
}
