import { useEffect, useState } from "react";

import { api } from "../api/client";
import type { Group, GroupDetail, Permission, User } from "../types";

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<GroupDetail | null>(null);
  const [newName, setNewName] = useState("");
  const [permissionSelections, setPermissionSelections] = useState<Record<number, boolean>>({});
  const [userSelections, setUserSelections] = useState<Record<number, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const loadList = () => {
    api.listGroups().then(setGroups).catch((e) => setError(String(e)));
  };

  useEffect(() => {
    loadList();
    api.listPermissions().then(setPermissions).catch((e) => setError(String(e)));
    api.listUsers().then(setUsers).catch((e) => setError(String(e)));
  }, []);

  useEffect(() => {
    if (selectedId == null) {
      setDetail(null);
      return;
    }
    api
      .getGroup(selectedId)
      .then((d) => {
        setDetail(d);
        setPermissionSelections(Object.fromEntries(d.permission_ids.map((id) => [id, true])));
        setUserSelections(Object.fromEntries(d.user_ids.map((id) => [id, true])));
      })
      .catch((e) => setError(String(e)));
  }, [selectedId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setError(null);
    try {
      await api.createGroup({ name: newName, description: null, is_active: true });
      setNewName("");
      loadList();
    } catch (e) {
      setError(String(e));
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedId) return;
    setError(null);
    try {
      const ids = Object.entries(permissionSelections)
        .filter(([, checked]) => checked)
        .map(([id]) => Number(id));
      await api.setGroupPermissions(selectedId, ids);
      alert("권한을 저장했습니다.");
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
      await api.setGroupUsers(selectedId, ids);
      alert("사용자를 저장했습니다.");
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <div>
      <h2>그룹 관리</h2>
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      <form className="inline" onSubmit={handleCreate}>
        <input
          placeholder="그룹명 (예: 관리자)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button type="submit">그룹 추가</button>
      </form>

      <div className="split-panel">
        <div className="split-panel__list">
          <table>
            <thead>
              <tr>
                <th>그룹명</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr
                  key={g.id}
                  className={selectedId === g.id ? "row-selected" : ""}
                  onClick={() => setSelectedId(g.id)}
                  style={{ cursor: "pointer" }}
                >
                  <td>{g.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="split-panel__detail">
          {detail ? (
            <div>
              <h3>{detail.name}</h3>

              <h4>
                권한 ({Object.values(permissionSelections).filter(Boolean).length}/
                {permissions.length})
              </h4>
              <div className="checklist">
                {permissions.map((p) => (
                  <label key={p.id} className="checkbox-field checklist__row">
                    <input
                      type="checkbox"
                      checked={!!permissionSelections[p.id]}
                      onChange={(e) =>
                        setPermissionSelections((prev) => ({ ...prev, [p.id]: e.target.checked }))
                      }
                    />
                    {p.name}
                  </label>
                ))}
              </div>
              <button onClick={handleSavePermissions}>권한 저장</button>

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
            <p>왼쪽에서 그룹을 선택하세요.</p>
          )}
        </div>
      </div>
    </div>
  );
}
