import { useEffect, useState } from "react";

import { api } from "../api/client";
import { findRootByName } from "../lib/codeLookup";
import type { Code, EquipmentScope, SlaFailureTimeLimit, SlaMetric } from "../types";

const DIRECTION_LABEL: Record<string, string> = {
  higher_better: "높을수록 좋음",
  lower_better: "낮을수록 좋음",
  binary: "발생여부",
};

export default function SlaMasterDataPage() {
  const [metrics, setMetrics] = useState<SlaMetric[]>([]);
  const [drafts, setDrafts] = useState<Record<number, SlaMetric>>({});
  const [limits, setLimits] = useState<SlaFailureTimeLimit[]>([]);
  const [codes, setCodes] = useState<Code[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [severityCodeId, setSeverityCodeId] = useState<number | null>(null);
  const [scope, setScope] = useState<EquipmentScope>("single");
  const [maxMinutes, setMaxMinutes] = useState(0);

  const severityOptions = findRootByName(codes, "장애 등급")?.children ?? [];

  const load = () => {
    api
      .listSlaMetrics()
      .then((data) => {
        setMetrics(data);
        setDrafts(Object.fromEntries(data.map((m) => [m.id, m])));
      })
      .catch((e) => setError(String(e)));
    api.listSlaFailureTimeLimits().then(setLimits).catch((e) => setError(String(e)));
  };

  useEffect(() => {
    load();
    api.listCodes().then(setCodes).catch((e) => setError(String(e)));
  }, []);

  const totalWeight = metrics.reduce((sum, m) => sum + Number(m.weight), 0);

  const handleSave = async (id: number) => {
    const draft = drafts[id];
    if (!draft) return;
    setError(null);
    try {
      await api.updateSlaMetric(id, {
        weight: Number(draft.weight),
        threshold_100: Number(draft.threshold_100),
        threshold_90: Number(draft.threshold_90),
        threshold_80: Number(draft.threshold_80),
        threshold_70: Number(draft.threshold_70),
      });
      load();
    } catch (e) {
      setError(String(e));
    }
  };

  const handleAddLimit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!severityCodeId) return;
    setError(null);
    try {
      await api.createSlaFailureTimeLimit({
        severity_code_id: severityCodeId,
        equipment_scope: scope,
        max_minutes: maxMinutes,
      });
      load();
    } catch (e) {
      setError(String(e));
    }
  };

  const handleDeleteLimit = async (id: number) => {
    if (!confirm("삭제하시겠습니까?")) return;
    await api.deleteSlaFailureTimeLimit(id);
    load();
  };

  const codeLabel = (id: number) => severityOptions.find((o) => o.id === id)?.name ?? "-";

  return (
    <div>
      <h2>SLA - Master Data</h2>
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      <p>가중치 합계: {totalWeight}% {totalWeight !== 100 && <span className="text-muted-danger">(100%가 되어야 저장이 정상 반영됩니다)</span>}</p>

      <table>
        <thead>
          <tr>
            <th>지표명</th>
            <th>방향</th>
            <th>가중치(%)</th>
            <th>100점</th>
            <th>90점</th>
            <th>80점</th>
            <th>70점(미만은 60점)</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {metrics.map((m) => {
            const draft = drafts[m.id] ?? m;
            return (
              <tr key={m.id}>
                <td>{m.name}</td>
                <td>{DIRECTION_LABEL[m.direction]}</td>
                <td>
                  <input
                    type="number"
                    value={draft.weight}
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [m.id]: { ...draft, weight: Number(e.target.value) },
                      }))
                    }
                  />
                </td>
                {(["threshold_100", "threshold_90", "threshold_80", "threshold_70"] as const).map(
                  (field) => (
                    <td key={field}>
                      {m.direction === "binary" ? (
                        "-"
                      ) : (
                        <input
                          type="number"
                          value={draft[field]}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [m.id]: { ...draft, [field]: Number(e.target.value) },
                            }))
                          }
                        />
                      )}
                    </td>
                  )
                )}
                <td>
                  <button onClick={() => handleSave(m.id)}>저장</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h3>장애조치 최대허용시간</h3>
      <form className="inline" onSubmit={handleAddLimit}>
        <select
          value={severityCodeId ?? ""}
          onChange={(e) => setSeverityCodeId(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">장애등급 선택</option>
          {severityOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        <select value={scope} onChange={(e) => setScope(e.target.value as EquipmentScope)}>
          <option value="single">단일업무장비</option>
          <option value="common">공통장비</option>
        </select>
        <input
          type="number"
          placeholder="허용시간(분)"
          value={maxMinutes}
          onChange={(e) => setMaxMinutes(Number(e.target.value))}
        />
        <button type="submit">추가</button>
      </form>

      <table>
        <thead>
          <tr>
            <th>장애등급</th>
            <th>장애장비구분</th>
            <th>허용시간(분)</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {limits.map((l) => (
            <tr key={l.id}>
              <td>{codeLabel(l.severity_code_id)}</td>
              <td>{l.equipment_scope === "single" ? "단일업무장비" : "공통장비"}</td>
              <td>{l.max_minutes}</td>
              <td>
                <button className="secondary" onClick={() => handleDeleteLimit(l.id)}>
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
