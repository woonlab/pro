import type { YearlyStatCount } from "../types";

export default function YearlyStatsTable({ rows }: { rows: YearlyStatCount[] }) {
  const groups = Array.from(new Set(rows.map((r) => r.group_name)));
  const years = Array.from(new Set(rows.map((r) => r.year))).sort((a, b) => b - a);
  const countFor = (group: string, year: number) =>
    rows.find((r) => r.group_name === group && r.year === year)?.count ?? 0;

  if (groups.length === 0) return <p>데이터가 없습니다.</p>;

  return (
    <table>
      <thead>
        <tr>
          <th>구분</th>
          {years.map((y) => (
            <th key={y}>{y}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {groups.map((g) => (
          <tr key={g}>
            <td>{g}</td>
            {years.map((y) => (
              <td key={y}>{countFor(g, y)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
