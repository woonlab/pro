import { useEffect, useState } from "react";

import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import type { User, UserCreateInput } from "../types";

const emptyForm: UserCreateInput = {
  username: "",
  password: "",
  full_name: "",
  is_admin: false,
};

export default function UsersPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState<UserCreateInput>(emptyForm);
  const [passwordDrafts, setPasswordDrafts] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api
      .listUsers()
      .then(setUsers)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api.createUser({ ...form, full_name: form.full_name || null });
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
      load();
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
        <table>
          <thead>
            <tr>
              <th>아이디</th>
              <th>이름</th>
              <th>권한</th>
              <th>비밀번호 변경</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.username}</td>
                <td>{u.full_name ?? "-"}</td>
                <td>{u.is_admin ? "관리자" : "일반"}</td>
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
      )}
    </div>
  );
}
