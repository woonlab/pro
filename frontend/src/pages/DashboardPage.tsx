import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../api/client";
import type { DashboardSlaTrendPoint, DashboardSummary } from "../types";

function currentYearMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function StageCircle({
  label,
  count,
  color,
  onClick,
}: {
  label: string;
  count: number;
  color: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className="dashboard-circle" style={{ borderColor: color }} onClick={onClick}>
      <span className="dashboard-circle__label">{label}</span>
      <span className="dashboard-circle__count">{count}건</span>
    </button>
  );
}

function Arrow() {
  return (
    <span className="dashboard-arrow" aria-hidden="true">
      →
    </span>
  );
}

function LinkCount({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button type="button" className="dashboard-link-count" onClick={onClick}>
      {count}
    </button>
  );
}

const SLA_SERIES: { key: keyof DashboardSlaTrendPoint; label: string; color: string }[] = [
  { key: "total", label: "합계", color: "#2563eb" },
  { key: "availability", label: "가용성 점수", color: "#f59e0b" },
  { key: "operation", label: "운영 점수", color: "#22c55e" },
  { key: "failure", label: "장애 점수", color: "#a855f7" },
];

function SlaTrendChart({ points }: { points: DashboardSlaTrendPoint[] }) {
  const width = 520;
  const height = 220;
  const paddingLeft = 32;
  const paddingBottom = 20;
  const paddingTop = 10;
  const chartWidth = width - paddingLeft - 10;
  const chartHeight = height - paddingTop - paddingBottom;
  const maxVal = 100;

  const xFor = (i: number) =>
    paddingLeft + (points.length <= 1 ? 0 : (i / (points.length - 1)) * chartWidth);
  const yFor = (v: number) =>
    paddingTop + chartHeight - (Math.max(0, Math.min(v, maxVal)) / maxVal) * chartHeight;

  const pathFor = (key: keyof DashboardSlaTrendPoint) =>
    points.map((p, i) => `${i === 0 ? "M" : "L"}${xFor(i)},${yFor(Number(p[key]))}`).join(" ");

  return (
    <div className="dashboard-chart">
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img">
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

      {!data || loading ? (
        <p>불러오는 중...</p>
      ) : (
        <>
          <h2 className="dashboard-section-title">업무 진행 현황</h2>
          <div className="dashboard-row">
            <div className="dashboard-card">
              <h3>장애관리</h3>
              <div className="dashboard-flow">
                <StageCircle
                  label="진행중"
                  count={data.failure_incident.in_progress}
                  color="#6b7280"
                  onClick={() => navigate("/failure-incidents")}
                />
                <Arrow />
                <StageCircle
                  label="처리완료"
                  count={data.failure_incident.completed}
                  color="#f59e0b"
                  onClick={() => navigate("/failure-incidents")}
                />
                <Arrow />
                <StageCircle
                  label="결재완료"
                  count={data.failure_incident.approved}
                  color="#22c55e"
                  onClick={() => navigate("/failure-incidents")}
                />
              </div>
            </div>
            <div className="dashboard-card">
              <h3>일일점검</h3>
              <div className="dashboard-flow">
                <StageCircle
                  label="결재요청"
                  count={data.daily_check.pending_approval}
                  color="#f59e0b"
                  onClick={() => navigate("/daily-checks")}
                />
                <Arrow />
                <StageCircle
                  label="결재완료"
                  count={data.daily_check.approved}
                  color="#22c55e"
                  onClick={() => navigate("/daily-checks")}
                />
              </div>
            </div>
          </div>

          <div className="dashboard-row dashboard-row--split">
            <div className="dashboard-card">
              <h3>SLA (최근 6개월)</h3>
              <SlaTrendChart points={data.sla_trend} />
            </div>
            <div className="dashboard-card">
              <h3>자산관리</h3>
              <div className="dashboard-flow">
                <StageCircle
                  label="기존대상"
                  count={data.asset.existing_count}
                  color="#60a5fa"
                  onClick={() => navigate("/equipments")}
                />
                <Arrow />
                <StageCircle
                  label={data.asset.year_target_label}
                  count={data.asset.year_target_count}
                  color="#2563eb"
                  onClick={() => navigate("/equipments")}
                />
                <Arrow />
                <StageCircle
                  label="삭제(예정)"
                  count={data.asset.delete_planned_count}
                  color="#ef4444"
                  onClick={() => navigate("/equipments")}
                />
              </div>
            </div>
          </div>

          <div className="dashboard-row dashboard-row--split">
            <div className="dashboard-card">
              <h3>예방점검 현황</h3>
              <table>
                <thead>
                  <tr>
                    <th>일일점검</th>
                    <th>특별점검</th>
                    <th>주간예정업무</th>
                    <th>근무상황</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <LinkCount
                        count={data.preventive.daily_check_count}
                        onClick={() => navigate("/daily-checks")}
                      />
                    </td>
                    <td>
                      <LinkCount
                        count={data.preventive.special_check_count}
                        onClick={() => navigate("/special-checks")}
                      />
                    </td>
                    <td>
                      <LinkCount
                        count={data.preventive.weekly_task_count}
                        onClick={() => navigate("/weekly-tasks")}
                      />
                    </td>
                    <td>
                      <LinkCount
                        count={data.preventive.work_status_count}
                        onClick={() => navigate("/work-status")}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="dashboard-card">
              <h3>기술지원 현황</h3>
              <table>
                <thead>
                  <tr>
                    <th rowSpan={2}>파트교체현황</th>
                    <th colSpan={2}>기술지원현황</th>
                    <th rowSpan={2}>대표누리집</th>
                  </tr>
                  <tr>
                    <th>PC 및 프린터</th>
                    <th>정보시스템</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <LinkCount
                        count={data.tech_support.part_replacement_count}
                        onClick={() => navigate("/part-replacements")}
                      />
                    </td>
                    <td>
                      <LinkCount
                        count={data.tech_support.pc_printer_count}
                        onClick={() => navigate("/support-tickets")}
                      />
                    </td>
                    <td>
                      <LinkCount
                        count={data.tech_support.info_system_count}
                        onClick={() => navigate("/support-tickets")}
                      />
                    </td>
                    <td>
                      <LinkCount
                        count={data.tech_support.portal_count}
                        onClick={() => navigate("/support-tickets")}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
