import { useEffect, useState } from "react";

import { api } from "../api/client";
import type { Code } from "../types";

function flatten(codes: Code[], depth = 0): { code: Code; depth: number }[] {
  return codes.flatMap((c) => [{ code: c, depth }, ...flatten(c.children, depth + 1)]);
}

function findById(codes: Code[], id: number): Code | null {
  for (const c of codes) {
    if (c.id === id) return c;
    const found = findById(c.children, id);
    if (found) return found;
  }
  return null;
}

export default function CodesPage() {
  const [codes, setCodes] = useState<Code[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [rootName, setRootName] = useState("");
  const [detailName, setDetailName] = useState("");
  const [detailDesc, setDetailDesc] = useState("");
  const [detailActive, setDetailActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    api.listCodes().then(setCodes).catch((e) => setError(String(e)));
  };

  useEffect(load, []);

  const selected = selectedId != null ? findById(codes, selectedId) : null;

  useEffect(() => {
    if (selected) {
      setDetailName(selected.name);
      setDetailDesc(selected.description ?? "");
      setDetailActive(selected.is_active);
    }
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddRoot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rootName.trim()) return;
    setError(null);
    try {
      await api.createCode({ parent_id: null, name: rootName, description: null, is_active: true });
      setRootName("");
      load();
    } catch (e) {
      setError(String(e));
    }
  };

  const handleAddChild = async () => {
    if (!selected) return;
    const name = prompt("하위 코드명을 입력하세요");
    if (!name) return;
    setError(null);
    try {
      await api.createCode({
        parent_id: selected.id,
        name,
        description: null,
        is_active: true,
      });
      load();
    } catch (e) {
      setError(String(e));
    }
  };

  const handleSaveDetail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setError(null);
    try {
      await api.updateCode(selected.id, {
        name: detailName,
        description: detailDesc || null,
        is_active: detailActive,
      });
      load();
    } catch (e) {
      setError(String(e));
    }
  };

  const rows = flatten(codes);

  return (
    <div>
      <h2>마스터 코드관리</h2>
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      <form className="inline" onSubmit={handleAddRoot}>
        <input
          placeholder="상위 코드명 (예: 장애 등급)"
          value={rootName}
          onChange={(e) => setRootName(e.target.value)}
        />
        <button type="submit">상위코드 추가</button>
      </form>

      <div className="split-panel">
        <div className="split-panel__list">
          <table>
            <thead>
              <tr>
                <th>코드</th>
                <th>코드명</th>
                <th>사용여부</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ code, depth }) => (
                <tr
                  key={code.id}
                  className={selectedId === code.id ? "row-selected" : ""}
                  onClick={() => setSelectedId(code.id)}
                  style={{ cursor: "pointer" }}
                >
                  <td>{code.code}</td>
                  <td style={{ paddingLeft: 12 + depth * 20 }}>{code.name}</td>
                  <td className={code.is_active ? "" : "text-muted-danger"}>
                    {code.is_active ? "사용" : "미사용"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="split-panel__detail">
          {selected ? (
            <form onSubmit={handleSaveDetail}>
              <h3>코드 상세 ({selected.code})</h3>
              <label>
                코드명
                <input value={detailName} onChange={(e) => setDetailName(e.target.value)} />
              </label>
              <label>
                설명
                <input value={detailDesc} onChange={(e) => setDetailDesc(e.target.value)} />
              </label>
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={detailActive}
                  onChange={(e) => setDetailActive(e.target.checked)}
                />
                사용
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="submit">저장</button>
                <button type="button" className="secondary" onClick={handleAddChild}>
                  하위코드 추가
                </button>
              </div>
            </form>
          ) : (
            <p>왼쪽에서 코드를 선택하세요.</p>
          )}
        </div>
      </div>
    </div>
  );
}
