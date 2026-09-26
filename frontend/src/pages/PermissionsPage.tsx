import { useEffect, useState } from "react";

import { api } from "../api/client";
import type { Group, Menu, Permission, PermissionDetail, User } from "../types";

function flattenMenus(menus: Menu[], depth = 0): { menu: Menu; depth: number }[] {
  return menus.flatMap((m) => [{ menu: m, depth }, ...flattenMenus(m.children, depth + 1)]);
}

export default function PermissionsPage() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<PermissionDetail | null>(null);
  const [newName, setNewName] = useState("");
  const [menuSelections, setMenuSelections] = useState<Record<number, boolean>>({});
  const [viewOnlySelections, setViewOnlySelections] = useState<Record<number, boolean>>({});
  const [groupSelections, setGroupSelections] = useState<Record<number, boolean>>({});
  const [userSelections, setUserSelections] = useState<Record<number, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const loadList = () => {
    api.listPermissions().then(setPermissions).catch((e) => setError(String(e)));
  };

  useEffect(() => {
    loadList();
    api.listMenus().then(setMenus).catch((e) => setError(String(e)));
    api.listGroups().then(setGroups).catch((e) => setError(String(e)));
    api.listUsers().then(setUsers).catch((e) => setError(String(e)));
  }, []);

  useEffect(() => {
    if (selectedId == null) {
      setDetail(null);
      return;
    }
    api
      .getPermission(selectedId)
      .then((d) => {
        setDetail(d);
        const menuMap: Record<number, boolean> = {};
        const viewOnlyMap: Record<number, boolean> = {};
        d.menus.forEach((m) => {
          menuMap[m.menu_id] = true;
          viewOnlyMap[m.menu_id] = m.view_only;
        });
        setMenuSelections(menuMap);
        setViewOnlySelections(viewOnlyMap);
        setGroupSelections(Object.fromEntries(d.group_ids.map((id) => [id, true])));
        setUserSelections(Object.fromEntries(d.user_ids.map((id) => [id, true])));
      })
      .catch((e) => setError(String(e)));
  }, [selectedId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setError(null);
    try {
      await api.createPermission({ name: newName, description: null, is_active: true });
      setNewName("");
      loadList();
    } catch (e) {
      setError(String(e));
    }
  };

  const handleSaveMenus = async () => {
    if (!selectedId) return;
    setError(null);
    try {
      const menuIds = Object.entries(menuSelections)
        .filter(([, checked]) => checked)
        .map(([id]) => Number(id));
      await api.setPermissionMenus(
        selectedId,
        menuIds.map((menu_id) => ({ menu_id, view_only: !!viewOnlySelections[menu_id] }))
      );
      alert("메뉴 권한을 저장했습니다.");
    } catch (e) {
      setError(String(e));
    }
  };

  const handleSaveGroups = async () => {
    if (!selectedId) return;
    setError(null);
    try {
      const ids = Object.entries(groupSelections)
        .filter(([, checked]) => checked)
        .map(([id]) => Number(id));
      await api.setPermissionGroups(selectedId, ids);
      alert("그룹을 저장했습니다.");
    } catch (e) {
      setError(String(e));
    }
  };

  const handleSaveUsers = async () => {
    if (!selectedId) return;
    setError(null);
    try {
      const ids = Object.entries(userSelections)
        .filter(([, checked]) => checked)
        .map(([id]) => Number(id));
      await api.setPermissionUsers(selectedId, ids);
      alert("사용자를 저장했습니다.");
    } catch (e) {
      setError(String(e));
    }
  };

  const menuRows = flattenMenus(menus);

  return (
    <div>
      <h2>권한 관리</h2>
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      <form className="inline" onSubmit={handleCreate}>
        <input
          placeholder="권한명 (예: 시스템 관리자)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button type="submit">권한 추가</button>
      </form>

      <div className="split-panel">
        <div className="split-panel__list">
          <table>
            <thead>
              <tr>
                <th>권한명</th>
              </tr>
            </thead>
            <tbody>
              {permissions.map((p) => (
                <tr
                  key={p.id}
                  className={selectedId === p.id ? "row-selected" : ""}
                  onClick={() => setSelectedId(p.id)}
                  style={{ cursor: "pointer" }}
                >
                  <td>{p.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="split-panel__detail">
          {detail ? (
            <div>
              <h3>{detail.name}</h3>

              <h4>메뉴 ({Object.values(menuSelections).filter(Boolean).length}/{menuRows.length})</h4>
              <div className="checklist">
                {menuRows.map(({ menu, depth }) => (
                  <div key={menu.id} className="checklist__row" style={{ paddingLeft: depth * 16 }}>
                    <label className="checkbox-field">
                      <input
                        type="checkbox"
                        checked={!!menuSelections[menu.id]}
                        onChange={(e) =>
                          setMenuSelections((prev) => ({ ...prev, [menu.id]: e.target.checked }))
                        }
                      />
                      {menu.name}
                    </label>
                    {menuSelections[menu.id] && (
                      <label className="checkbox-field checklist__view-only">
                        <input
                          type="checkbox"
                          checked={!!viewOnlySelections[menu.id]}
                          onChange={(e) =>
                            setViewOnlySelections((prev) => ({
                              ...prev,
                              [menu.id]: e.target.checked,
                            }))
                          }
                        />
                        조회전용
                      </label>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={handleSaveMenus}>메뉴 저장</button>

              <h4>그룹 ({Object.values(groupSelections).filter(Boolean).length}/{groups.length})</h4>
              <div className="checklist">
                {groups.map((g) => (
                  <label key={g.id} className="checkbox-field checklist__row">
                    <input
                      type="checkbox"
                      checked={!!groupSelections[g.id]}
                      onChange={(e) =>
                        setGroupSelections((prev) => ({ ...prev, [g.id]: e.target.checked }))
                      }
                    />
                    {g.name}
                  </label>
                ))}
              </div>
              <button onClick={handleSaveGroups}>그룹 저장</button>

              <h4>사용자 ({Object.values(userSelections).filter(Boolean).length}/{users.length})</h4>
              <div className="checklist">
                {users.map((u) => (
                  <label key={u.id} className="checkbox-field checklist__row">
                    <input
                      type="checkbox"
                      checked={!!userSelections[u.id]}
                      onChange={(e) =>
                        setUserSelections((prev) => ({ ...prev, [u.id]: e.target.checked }))
                      }
                    />
                    {u.full_name ?? u.username}
                  </label>
                ))}
              </div>
              <button onClick={handleSaveUsers}>사용자 저장</button>
            </div>
          ) : (
            <p>왼쪽에서 권한을 선택하세요.</p>
          )}
        </div>
      </div>
    </div>
  );
}
