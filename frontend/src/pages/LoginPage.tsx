import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const locationState = location.state as { from?: string; reason?: string } | null;

  if (user) {
    return <Navigate to={locationState?.from ?? "/"} replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(username, password);
      navigate("/", { replace: true });
    } catch {
      setError("아이디 또는 비밀번호가 올바르지 않습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-hero">
        <svg
          className="login-hero__decor"
          viewBox="0 0 600 800"
          preserveAspectRatio="none"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M 0 500 C 100 450, 150 600, 260 560 S 420 420, 520 470 S 600 600, 600 600"
            stroke="#fe8300"
            strokeWidth="2"
          />
          <path
            d="M 0 640 C 120 615, 180 715, 300 675 S 460 575, 600 635"
            stroke="#fe8300"
            strokeWidth="1.5"
            strokeDasharray="4 6"
            opacity="0.6"
          />
          <circle cx="260" cy="560" r="6" fill="#fe8300" />
          <circle cx="420" cy="420" r="4" fill="#fe8300" opacity="0.7" />
        </svg>

        <div className="login-hero__top">
          <div className="login-hero__brand">
            <span className="login-hero__brand-icon">▮▮▮</span>
            SNET<span>ICT</span>
          </div>
          <nav className="login-hero__nav">
            <span>ASSET</span>
            <span>SUPPORT</span>
            <span>SLA</span>
          </nav>
        </div>
        <hr className="login-hero__divider" />

        <div className="login-hero__body">
          <p className="login-hero__eyebrow">NETWORK OPERATIONS PLATFORM</p>
          <h1 className="login-hero__headline">
            <span className="accent">안전한 운영,</span> 빈틈없는 관리
            <br />
            SNETICT가 함께합니다.
          </h1>
          <p className="login-hero__subtext">
            서버·네트워크·보안장비의 상태와 이력을 통합 관리하여
            <br />더 빠르고 안정적인 인프라 운영을 지원합니다.
          </p>
        </div>

        <p className="login-hero__footnote">
          <span className="dot" /> System protected · Authorized access only
        </p>
      </div>

      <div className="login-panel">
        <div className="login-panel__inner">
          <p className="login-panel__eyebrow">WELCOME BACK</p>
          <h2>로그인</h2>
          <p className="login-panel__subtitle">SNETICT 운영 콘솔에 접속합니다.</p>
          {locationState?.reason === "idle-timeout" && (
            <p className="login-notice">장시간 활동이 없어 자동 로그아웃되었습니다.</p>
          )}

          <form onSubmit={handleSubmit}>
            <label htmlFor="login-username">아이디</label>
            <input
              id="login-username"
              placeholder="관리자 아이디"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              required
            />
            <label htmlFor="login-password">비밀번호</label>
            <input
              id="login-password"
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error && <p className="login-error">{error}</p>}
            <button type="submit" disabled={submitting}>
              {submitting ? "로그인 중..." : "안전하게 로그인"}
            </button>
          </form>

          <p className="login-panel__trust">🔒 사내 인증된 사용자만 접근 가능합니다.</p>
          <p className="login-panel__footer">© 2026 SNETICT · Authorized users only</p>
        </div>
      </div>
    </div>
  );
}
