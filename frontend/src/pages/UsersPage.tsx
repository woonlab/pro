import { useEffect, useState } from "react";

import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import type { Group, Permission, User, UserCreateInput, UserDetail } from "../types";

const emptyForm: UserCreateInput = {
  username: "",
  password: "",
  full_name: "",
  phone: "",
  is_admin: false,
};

export default function UsersPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [form, setForm] = useState<UserCreateInput>(emptyForm);
  const [passwordDrafts, setPasswordDrafts] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [detailFullName, setDetailFullName] = useState("");
  const [detailPhone, setDetailPhone] = useState("");
  const [detailIsAdmin, setDetailIsAdmin] = useState(false);
  const [detailIsActive, setDetailIsActive] = useState(true);
  const [groupSelections, setGroupSelections] = useState<Record<number, boolean>>({});
  const [permissionSelections, setPermissionSelections] = useState<Record<number, boolean>>({});

  const load = () => {
    setLoading(true);
    api
      .listUsers()
      .then(setUsers)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    api.listGroups().then(setGroups).catch((e) => setError(String(e)));
    api.listPermissions().then(setPermissions).catch((e) => setError(String(e)));
  }, []);

  useEffect(() => {
    if (selectedId == null) {
      setDetail(null);
      return;
    }
    api
      .getUser(selectedId)
      .then((d) => {
        setDetail(d);
        setDetailFullName(d.full_name ?? "");
        setDetailPhone(d.phone ?? "");
        setDetailIsAdmin(d.is_admin);
        setDetailIsActive(d.is_active);
        setGroupSelections(Object.fromEntries(d.group_ids.map((id) => [id, true])));
        setPermissionSelections(Object.fromEntries(d.permission_ids.map((id) => [id, true])));
      })
      .catch((e) => setError(String(e)));
  }, [selectedId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api.createUser({
        ...form,
        full_name: form.full_name || null,
        phone: form.phone || null,
      });
      setForm(emptyForm);
      load();
    } catch (e) {
      setError(String(e));
    }
  };

  const handlePasswordChange = async (id: number) => {
    const password = passwordDrafts[id];
    if (!password) return;
    setError(null);
    try {
      await api.updateUserPassword(id, password);
      setPasswordDrafts((prev) => ({ ...prev, [id]: "" }));
      alert("비밀번호를 변경했습니다.");
    } catch (e) {
      setError(String(e));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("이 계정을 삭제할까요?")) return;
    setError(null);
    try {
      await api.deleteUser(id);
      if (selectedId === id) setSelectedId(null);
      load();
    } catch (e) {
      setError(String(e));
    }
  };

  const handleSaveDetail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    setError(null);
    try {
      await api.updateUser(selectedId, {
        full_name: detailFullName || null,
        phone: detailPhone || null,
        is_admin: detailIsAdmin,
        is_active: detailIsActive,
      });
      load();
      alert("저장했습니다.");
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
      await api.setUserGroups(selectedId, ids);
      alert("그룹을 저장했습니다.");
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
      await api.setUserPermissions(selectedId, ids);
      alert("권한을 저장했습니다.");
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <div>
      <h2>계정 등록</h2>
      <form className="inline" onSubmit={handleCreate}>
        <input
          placeholder="아이디"
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
          required
        />
        <input
          type="password"
          placeholder="비밀번호"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />
        <input
          placeholder="이름"
          value={form.full_name ?? ""}
          onChange={(e) => setForm({ ...form, full_name: e.target.value })}
        />
        <input
          placeholder="연락처"
          value={form.phone ?? ""}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={form.is_admin}
            onChange={(e) => setForm({ ...form, is_admin: e.target.checked })}
          />
          관리자 권한
        </label>
        <button type="submit">등록</button>
      </form>

      <h2>계정 목록</h2>
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      {loading ? (
        <p>불러오는 중...</p>
      ) : (
        <div className="split-panel">
          <div className="split-panel__list">
            <table>
              <thead>
                <tr>
                  <th>아이디</th>
                  <th>이름</th>
                  <th>연락처</th>
                  <th>권한</th>
                  <th>상태</th>
                  <th>비밀번호 변경</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className={selectedId === u.id ? "row-selected" : ""}
                    style={{ cursor: "pointer" }}
                  >
                    <td onClick={() => setSelectedId(u.id)}>{u.username}</td>
                    <td onClick={() => setSelectedId(u.id)}>{u.full_name ?? "-"}</td>
                    <td onClick={() => setSelectedId(u.id)}>{u.phone ?? "-"}</td>
                    <td onClick={() => setSelectedId(u.id)}>{u.is_admin ? "관리자" : "일반"}</td>
                    <td
                      onClick={() => setSelectedId(u.id)}
                      className={u.is_active ? "" : "text-muted-danger"}
                    >
                      {u.is_active ? "정상" : "미사용"}
                    </td>
                    <td>
                      <div className="password-cell">
                        <input
                          type="password"
                          placeholder="새 비밀번호"
                          value={passwordDrafts[u.id] ?? ""}
                          onChange={(e) =>
                            setPasswordDrafts((prev) => ({ ...prev, [u.id]: e.target.value }))
                          }
                        />
                        <button onClick={() => handlePasswordChange(u.id)}>변경</button>
                      </div>
                    </td>
                    <td>
                      <button
                        className="secondary"
                        onClick={() => handleDelete(u.id)}
                        disabled={u.id === me?.id}
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="split-panel__detail">
            {detail ? (
              <div>
                <h3>{detail.username} 상세</h3>
                <form onSubmit={handleSaveDetail}>
                  <label>
                    이름
                    <input
                      value={detailFullName}
                      onChange={(e) => setDetailFullName(e.target.value)}
                    />
                  </label>
                  <label>
                    연락처
                    <input value={detailPhone} onChange={(e) => setDetailPhone(e.target.value)} />
                  </label>
                  <label className="checkbox-field">
                    <input
                      type="checkbox"
                      checked={detailIsAdmin}
                      onChange={(e) => setDetailIsAdmin(e.target.checked)}
                    />
                    관리자 권한
                  </label>
                  <label className="checkbox-field">
                    <input
                      type="checkbox"
                      checked={detailIsActive}
                      onChange={(e) => setDetailIsActive(e.target.checked)}
                    />
                    사용
                  </label>
                  <button type="submit">기본정보 저장</button>
                </form>

                <h4>
                  그룹 ({Object.values(groupSelections).filter(Boolean).length}/{groups.length})
                </h4>
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
                          setPermissionSelections((prev) => ({
                            ...prev,
                            [p.id]: e.target.checked,
                          }))
                        }
                      />
                      {p.name}
                    </label>
                  ))}
                </div>
                <button onClick={handleSavePermissions}>권한 저장</button>
              </div>
            ) : (
              <p>왼쪽에서 계정을 선택하면 상세 정보를 수정할 수 있습니다.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
