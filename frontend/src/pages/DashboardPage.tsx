import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../api/client";
import type { DashboardSlaTrendPoint, DashboardSummary } from "../types";

function currentYearMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

const SLA_SERIES: { key: keyof DashboardSlaTrendPoint; label: string; color: string }[] = [
  { key: "total", label: "합계", color: "#2563eb" },
  { key: "availability", label: "가용성", color: "#f59e0b" },
  { key: "operation", label: "운영", color: "#22c55e" },
  { key: "failure", label: "장애", color: "#a855f7" },
];

const ASSET_COLORS = ["#2563eb", "#22c55e", "#f59e0b", "#a855f7"];

function SlaTrendChart({ points }: { points: DashboardSlaTrendPoint[] }) {
  const width = 520;
  const height = 200;
  const paddingLeft = 32;
  const paddingBottom = 20;
  const paddingTop = 10;
  const chartWidth = width - paddingLeft - 10;
  const chartHeight = height - paddingTop - paddingBottom;

  const xFor = (i: number) =>
    paddingLeft + (points.length <= 1 ? 0 : (i / (points.length - 1)) * chartWidth);
  const yFor = (v: number) =>
    paddingTop + chartHeight - (Math.max(0, Math.min(v, 100)) / 100) * chartHeight;
  const pathFor = (key: keyof DashboardSlaTrendPoint) =>
    points.map((p, i) => `${i === 0 ? "M" : "L"}${xFor(i)},${yFor(Number(p[key]))}`).join(" ");

  return (
    <div className="dashboard-chart">
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img">
        <title>SLA 점수 추이</title>
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line x1={paddingLeft} y1={yFor(v)} x2={width - 10} y2={yFor(v)} stroke="#e2e2e2" strokeWidth={1} />
            <text x={paddingLeft - 6} y={yFor(v) + 4} fontSize={10} textAnchor="end" fill="#888">
              {v}
            </text>
          </g>
        ))}
        {SLA_SERIES.map((s) => (
          <path key={s.key} d={pathFor(s.key)} fill="none" stroke={s.color} strokeWidth={2} />
        ))}
        {points.map((p, i) => (
          <text key={p.year_month} x={xFor(i)} y={height - 4} fontSize={10} textAnchor="middle" fill="#888">
            {p.year_month}
          </text>
        ))}
      </svg>
      <div className="dashboard-chart__legend">
        {SLA_SERIES.map((s) => (
          <span key={s.key}>
            <i style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function Bar({ percent, color }: { percent: number; color: string }) {
  return (
    <div className="dash-bar">
      <i style={{ width: `${Math.max(0, Math.min(percent, 100))}%`, background: color }} />
    </div>
  );
}

function AssetDonut({ items }: { items: { label: string; count: number }[] }) {
  const total = items.reduce((s, i) => s + i.count, 0);
  const r = 28;
  const circumference = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="dash-donut">
      <svg viewBox="0 0 80 80" width="110" height="110" role="img">
        <title>자산 분류별 현황</title>
        <circle cx="40" cy="40" r={r} fill="none" stroke="#eef0f3" strokeWidth={12} />
        {total > 0 &&
          items.map((item, i) => {
            const len = (item.count / total) * circumference;
            const el = (
              <circle
                key={item.label}
                cx="40"
                cy="40"
                r={r}
                fill="none"
                stroke={ASSET_COLORS[i % ASSET_COLORS.length]}
                strokeWidth={12}
                strokeDasharray={`${len} ${circumference - len}`}
                strokeDashoffset={-offset}
                transform="rotate(-90 40 40)"
              />
            );
            offset += len;
            return el;
          })}
        <text x="40" y="44" textAnchor="middle" fontSize="14" fontWeight="700" fill="#333">
          {total}
        </text>
      </svg>
      <ul>
        {items.map((item, i) => (
          <li key={item.label}>
            <i style={{ background: ASSET_COLORS[i % ASSET_COLORS.length] }} />
            {item.label} <b>{item.count}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const initial = currentYearMonth();
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const load = (y: number, m: number) => {
    setLoading(true);
    api
      .getDashboardSummary(y, m)
      .then(setData)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load(initial.year, initial.month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const years = useMemo(() => {
    const cur = currentYearMonth().year;
    return Array.from({ length: 6 }, (_, i) => cur - 4 + i);
  }, []);

  const pct = (part: number, total: number) => (total > 0 ? (part / total) * 100 : 0);

  const renderBody = (d: DashboardSummary) => {
    const fi = d.failure_incident;
    const fiTotal = fi.in_progress + fi.completed + fi.approved;
    const dc = d.daily_check;
    const dcTotal = dc.pending_approval + dc.approved;
    const ts = d.tech_support;
    const latest = d.sla_trend[d.sla_trend.length - 1];
    const slaTotal = latest?.total ?? 0;
    const summaryRows: { label: string; count: number; path: string }[] = [
      { label: "장애 발생", count: fiTotal, path: "/failure-incidents" },
      { label: "일일업무보고", count: dcTotal, path: "/daily-checks" },
      { label: "기술지원", count: d.ticket_total, path: "/support-tickets" },
      { label: "특별점검", count: d.preventive.special_check_count, path: "/special-checks" },
      { label: "주간예정업무", count: d.preventive.weekly_task_count, path: "/weekly-tasks" },
      { label: "근무상황", count: d.preventive.work_status_count, path: "/work-status" },
      { label: "파트교체", count: ts.part_replacement_count, path: "/part-replacements" },
    ];

    return (
      <>
        <div className="dashboard-row dashboard-row--three">
          <div className="dashboard-card">
            <h3>장애</h3>
            <button type="button" className="dash-big dash-big--link" onClick={() => navigate("/failure-incidents")}>
              {fiTotal}
            </button>
            <Bar percent={pct(fi.approved, fiTotal)} color="#ef4444" />
            <p className="dash-sub">
              진행 {fi.in_progress} · 처리 {fi.completed} · 결재 {fi.approved}
            </p>
          </div>
          <div className="dashboard-card">
            <h3>일일업무보고</h3>
            <button type="button" className="dash-big dash-big--link" onClick={() => navigate("/daily-checks")}>
              {dcTotal}
            </button>
            <Bar percent={pct(dc.approved, dcTotal)} color="#22c55e" />
            <p className="dash-sub">
              결재완료 {dc.approved} · 대기 {dc.pending_approval}
            </p>
          </div>
          <div className="dashboard-card">
            <h3>기술지원</h3>
            <button type="button" className="dash-big dash-big--link" onClick={() => navigate("/support-tickets")}>
              {d.ticket_total}
            </button>
            <Bar percent={pct(d.ticket_total - d.ticket_unresolved, d.ticket_total)} color="#2563eb" />
            <p className="dash-sub">
              PC {ts.pc_printer_count} · 시스템 {ts.info_system_count} · 누리집 {ts.portal_count}
            </p>
          </div>
        </div>

        <div className="dashboard-row dashboard-row--main">
          <div className="dashboard-card">
            <h3>SLA 항목별 점수 · 최근 6개월 추이</h3>
            {d.sla_groups.map((g, i) => (
              <div key={g.key} className="dash-slarow">
                <div>
                  <span>{g.label}</span>
                  <b>{g.score.toFixed(1)}</b>
                </div>
                <Bar percent={g.score} color={["#2563eb", "#22c55e", "#f59e0b"][i % 3]} />
              </div>
            ))}
            <SlaTrendChart points={d.sla_trend} />
          </div>
          <div className="dashboard-card">
            <h3>자산 현황</h3>
            <AssetDonut items={d.asset_categories} />
            <p className="dash-sub">
              {d.asset.year_target_label} {d.asset.year_target_count} · 삭제(예정) {d.asset.delete_planned_count}
            </p>
          </div>
        </div>

        <div className="dashboard-row dashboard-row--main">
          <div className="dashboard-card">
            <h3>
              내가 처리할 일 <span className="dash-count">{d.todo_total}</span>
            </h3>
            {d.todos.length === 0 ? (
              <p className="dash-empty">처리할 업무가 없습니다.</p>
            ) : (
              <ul className="dash-todo">
                {d.todos.map((t, i) => (
                  <li key={i}>
                    <button type="button" onClick={() => navigate(t.path)}>
                      <span>{t.title}</span>
                      <span className={`dash-pill dash-pill--${t.badge_type}`}>{t.badge}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {d.todo_total > d.todos.length && (
              <p className="dash-more">외 {d.todo_total - d.todos.length}건</p>
            )}
          </div>

          <div className="dash-col">
            <div className="dashboard-card">
              <h3>
                {d.year}년 {d.month}월 요약
              </h3>
              <ul className="dash-rows">
                {summaryRows.map((r) => (
                  <li key={r.label}>
                    <span>{r.label}</span>
                    <button type="button" className="dashboard-link-count" onClick={() => navigate(r.path)}>
                      {r.count}건
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="dashboard-card">
              <h3>SLA 종합점수</h3>
              <div className="dash-big">
                {slaTotal.toFixed(1)}
                <small> / 100</small>
              </div>
              <Bar percent={slaTotal} color="#22c55e" />
            </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="dashboard">
      <div className="dashboard-toolbar">
        <label htmlFor="dashboard-year">조회년월</label>
        <select id="dashboard-year" value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => load(year, month)}>
          조회
        </button>
      </div>

      {!data || loading ? <p>불러오는 중...</p> : renderBody(data)}
    </div>
  );
}
