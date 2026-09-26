import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";

const WARNING_SECONDS = 60;
const ACTIVITY_EVENTS = ["mousedown", "mousemove", "keydown", "wheel", "touchstart"] as const;
const CHECK_INTERVAL_MS = 1000;

export default function IdleTimeoutGuard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [timeoutMinutes, setTimeoutMinutes] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const lastActivityRef = useRef(Date.now());

  useEffect(() => {
    if (!user) {
      setTimeoutMinutes(null);
      return;
    }
    api
      .getSessionSettings()
      .then((s) => setTimeoutMinutes(s.idle_timeout_minutes))
      .catch(() => setTimeoutMinutes(null));
  }, [user]);

  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    setSecondsLeft((prev) => (prev != null ? null : prev));
  }, []);

  useEffect(() => {
    if (!user) return;
    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, resetActivity));
    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, resetActivity));
    };
  }, [user, resetActivity]);

  useEffect(() => {
    if (!user || timeoutMinutes == null) return;
    const timeoutMs = timeoutMinutes * 60 * 1000;

    const interval = setInterval(() => {
      const remainingMs = timeoutMs - (Date.now() - lastActivityRef.current);
      if (remainingMs <= 0) {
        logout();
        navigate("/login", { replace: true, state: { reason: "idle-timeout" } });
        return;
      }
      setSecondsLeft(remainingMs <= WARNING_SECONDS * 1000 ? Math.ceil(remainingMs / 1000) : null);
    }, CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [user, timeoutMinutes, logout, navigate]);

  if (secondsLeft == null) return null;

  return (
    <div className="idle-modal-backdrop">
      <div className="idle-modal">
        <h3>세션 만료 예정</h3>
        <p>
          장시간 활동이 없어 <strong>{secondsLeft}초</strong> 후 자동 로그아웃됩니다.
        </p>
        <button onClick={resetActivity}>계속 사용하기</button>
      </div>
    </div>
  );
}
