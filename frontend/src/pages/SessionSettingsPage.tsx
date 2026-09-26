import { useEffect, useState } from "react";

import { api } from "../api/client";

export default function SessionSettingsPage() {
  const [minutes, setMinutes] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getSessionSettings()
      .then((s) => setMinutes(s.idle_timeout_minutes))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const updated = await api.updateSessionSettings({ idle_timeout_minutes: minutes });
      setMinutes(updated.idle_timeout_minutes);
      alert("저장했습니다. 다음 로그인부터 적용됩니다.");
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <div>
      <h2>세션 타임아웃 설정</h2>
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      {loading ? (
        <p>불러오는 중...</p>
      ) : (
        <form onSubmit={handleSave}>
          <label>
            자동 로그아웃 시간 (분) — 이 시간 동안 화면 조작이 없으면 자동 로그아웃됩니다
            <input
              type="number"
              min={1}
              max={1440}
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
              required
            />
          </label>
          <button type="submit">저장</button>
        </form>
      )}
    </div>
  );
}
