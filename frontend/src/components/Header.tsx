import { useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="app-header">
      <div className="app-header__brand">
        FMS<span>ICT</span>
      </div>
      {user && (
        <div className="app-header__user">
          <span>{user.full_name ?? user.username}님</span>
          <button className="ghost" onClick={handleLogout}>
            로그아웃
          </button>
        </div>
      )}
    </header>
  );
}
