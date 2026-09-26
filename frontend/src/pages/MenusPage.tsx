import { useEffect, useState } from "react";

import { api } from "../api/client";
import type { Menu } from "../types";

function flatten(menus: Menu[], depth = 0): { menu: Menu; depth: number }[] {
  return menus.flatMap((m) => [{ menu: m, depth }, ...flatten(m.children, depth + 1)]);
}

function findById(menus: Menu[], id: number): Menu | null {
  for (const m of menus) {
    if (m.id === id) return m;
    const found = findById(m.children, id);
    if (found) return found;
  }
  return null;
}

export default function MenusPage() {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [rootName, setRootName] = useState("");
  const [detailName, setDetailName] = useState("");
  const [detailPath, setDetailPath] = useState("");
  const [detailDesc, setDetailDesc] = useState("");
  const [detailActive, setDetailActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    api.listMenus().then(setMenus).catch((e) => setError(String(e)));
  };

  useEffect(load, []);

  const selected = selectedId != null ? findById(menus, selectedId) : null;

  useEffect(() => {
    if (selected) {
      setDetailName(selected.name);
      setDetailPath(selected.path ?? "");
      setDetailDesc(selected.description ?? "");
      setDetailActive(selected.is_active);
    }
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddRoot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rootName.trim()) return;
    setError(null);
    try {
      await api.createMenu({
        parent_id: null,
        name: rootName,
        path: null,
        description: null,
        is_active: true,
      });
      setRootName("");
      load();
    } catch (e) {
      setError(String(e));
    }
  };

  const handleAddChild = async () => {
    if (!selected) return;
    const name = prompt("하위 메뉴명을 입력하세요");
    if (!name) return;
    setError(null);
    try {
      await api.createMenu({
        parent_id: selected.id,
        name,
        path: null,
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
      await api.updateMenu(selected.id, {
        name: detailName,
        path: detailPath || null,
        description: detailDesc || null,
        is_active: detailActive,
      });
      load();
    } catch (e) {
      setError(String(e));
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (!confirm("이 메뉴를 삭제할까요?")) return;
    setError(null);
    try {
      await api.deleteMenu(selected.id);
      setSelectedId(null);
      load();
    } catch (e) {
      setError(String(e));
    }
  };

  const rows = flatten(menus);

  return (
    <div>
      <h2>메뉴 관리</h2>
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      <form className="inline" onSubmit={handleAddRoot}>
        <input
          placeholder="상위 메뉴명 (예: 자산관리)"
          value={rootName}
          onChange={(e) => setRootName(e.target.value)}
        />
        <button type="submit">상위메뉴 추가</button>
      </form>

      <div className="split-panel">
        <div className="split-panel__list">
          <table>
            <thead>
              <tr>
                <th>메뉴명</th>
                <th>경로</th>
                <th>사용여부</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ menu, depth }) => (
                <tr
                  key={menu.id}
                  className={selectedId === menu.id ? "row-selected" : ""}
                  onClick={() => setSelectedId(menu.id)}
                  style={{ cursor: "pointer" }}
                >
                  <td style={{ paddingLeft: 12 + depth * 20 }}>{menu.name}</td>
                  <td>{menu.path ?? "-"}</td>
                  <td className={menu.is_active ? "" : "text-muted-danger"}>
                    {menu.is_active ? "사용" : "미사용"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="split-panel__detail">
          {selected ? (
            <form onSubmit={handleSaveDetail}>
              <h3>메뉴 상세</h3>
              <label>
                메뉴명
                <input value={detailName} onChange={(e) => setDetailName(e.target.value)} />
              </label>
              <label>
                경로
                <input value={detailPath} onChange={(e) => setDetailPath(e.target.value)} />
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
                  하위메뉴 추가
                </button>
                <button type="button" className="secondary" onClick={handleDelete}>
                  삭제
                </button>
              </div>
            </form>
          ) : (
            <p>왼쪽에서 메뉴를 선택하세요.</p>
          )}
        </div>
      </div>
    </div>
  );
}
