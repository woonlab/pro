import { useEffect, useState } from "react";

import { api } from "../api/client";
import type { SlaMonthlySummary } from "../types";

const thisMonth = new Date().toISOString().slice(0, 7);

export default function SlaMonthlyStatusPage() {
  const [yearMonth, setYearMonth] = useState(thisMonth);
  const [summary, setSummary] = useState<SlaMonthlySummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getSlaMonthlySummary(yearMonth).then(setSummary).catch((e) => setError(String(e)));
  }, [yearMonth]);

  return (
    <div>
      <h2>SLA - 월간현황</h2>
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      <input type="month" value={yearMonth} onChange={(e) => setYearMonth(e.target.value)} />

      {summary && (
        <>
          <p style={{ marginTop: 16 }}>
            장애조치 최대허용시간 초과건수: <strong>{summary.failure_exceed_count}</strong> / 중복
            장애건수: <strong>{summary.failure_duplicate_count}</strong> / 총 장애건수:{" "}
            <strong>{summary.failure_total_count}</strong>
          </p>

          <table>
            <thead>
              <tr>
                <th>구분</th>
                <th>지표명</th>
                <th>가중치</th>
                <th>측정값</th>
                <th>평가점수</th>
                <th>환산점수</th>
              </tr>
            </thead>
            <tbody>
              {summary.rows.map((r) => (
                <tr key={r.key}>
                  <td>
                    {r.key.startsWith("availability")
                      ? "가용성관리"
                      : r.key.startsWith("failure")
                        ? "장애관리"
                        : "운영관리"}
                  </td>
                  <td>{r.name}</td>
                  <td>{r.weight}%</td>
                  <td>
                    {r.direction === "binary"
                      ? r.raw_value
                        ? "발생"
                        : "미발생"
                      : r.raw_value.toLocaleString()}
                  </td>
                  <td>{r.score}</td>
                  <td>{r.weighted_score}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={5} style={{ textAlign: "right", fontWeight: 700 }}>
                  종합 평가점수
                </td>
                <td style={{ fontWeight: 700 }}>{summary.total_score}</td>
              </tr>
            </tfoot>
          </table>
        </>
      )}
    </div>
  );
}
