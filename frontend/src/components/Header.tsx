import { Link, useNavigate } from "react-router-dom";

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
      <div className="app-header__left">
        <Link to="/" className="app-header__brand">
          FMS<span>ICT</span>
        </Link>
        <Link to="/daily-checks" className="app-header__nav-link">
          일일점검
        </Link>
        <Link to="/special-checks" className="app-header__nav-link">
          특별점검
        </Link>
        <Link to="/weekly-tasks" className="app-header__nav-link">
          주간예정업무
        </Link>
        <Link to="/work-status" className="app-header__nav-link">
          근무상황
        </Link>
        <Link to="/part-replacements" className="app-header__nav-link">
          파트교체현황
        </Link>
        <Link to="/support-tickets" className="app-header__nav-link">
          기술지원현황
        </Link>
        <Link to="/failure-incidents" className="app-header__nav-link">
          장애관리
        </Link>
        <Link to="/sla/availability" className="app-header__nav-link">
          SLA-가용성관리
        </Link>
        <Link to="/sla/operations" className="app-header__nav-link">
          SLA-운영관리
        </Link>
        <Link to="/sla/monthly-status" className="app-header__nav-link">
          SLA-월간현황
        </Link>
        {user?.is_admin && (
          <>
            <Link to="/sla/master-data" className="app-header__nav-link">
              SLA-Master Data
            </Link>
            <Link to="/users" className="app-header__nav-link">
              계정 관리
            </Link>
            <Link to="/groups" className="app-header__nav-link">
              그룹 관리
            </Link>
            <Link to="/permissions" className="app-header__nav-link">
              권한 관리
            </Link>
            <Link to="/menus" className="app-header__nav-link">
              메뉴 관리
            </Link>
            <Link to="/codes" className="app-header__nav-link">
              코드 관리
            </Link>
          </>
        )}
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
