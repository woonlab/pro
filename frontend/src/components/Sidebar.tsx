import { Link, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";

const NAV_ITEMS = [
  { to: "/", label: "장비관리" },
  { to: "/daily-checks", label: "일일점검" },
  { to: "/special-checks", label: "특별점검" },
  { to: "/weekly-tasks", label: "주간예정업무" },
  { to: "/work-status", label: "근무상황" },
  { to: "/part-replacements", label: "파트교체현황" },
  { to: "/support-tickets", label: "기술지원현황" },
  { to: "/failure-incidents", label: "장애관리" },
  { to: "/sla/availability", label: "SLA-가용성관리" },
  { to: "/sla/operations", label: "SLA-운영관리" },
  { to: "/sla/monthly-status", label: "SLA-월간현황" },
];

const ADMIN_NAV_ITEMS = [
  { to: "/sla/master-data", label: "SLA-Master Data" },
  { to: "/users", label: "계정 관리" },
  { to: "/session-settings", label: "세션 타임아웃" },
  { to: "/groups", label: "그룹 관리" },
  { to: "/permissions", label: "권한 관리" },
  { to: "/menus", label: "메뉴 관리" },
  { to: "/codes", label: "코드 관리" },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const linkClass = (to: string) =>
    `app-sidebar__link${location.pathname === to ? " active" : ""}`;

  return (
    <aside className="app-sidebar">
      <Link to="/" className="app-sidebar__brand">
        FMS<span>ICT</span>
      </Link>
      <nav className="app-sidebar__nav">
        {NAV_ITEMS.map((item) => (
          <Link key={item.to} to={item.to} className={linkClass(item.to)}>
            {item.label}
          </Link>
        ))}
        {user?.is_admin && (
          <>
            <div className="app-sidebar__divider">관리자 메뉴</div>
            {ADMIN_NAV_ITEMS.map((item) => (
              <Link key={item.to} to={item.to} className={linkClass(item.to)}>
                {item.label}
              </Link>
            ))}
          </>
        )}
      </nav>
      {user && (
        <div className="app-sidebar__user">
          <div>{user.full_name ?? user.username}님</div>
          <button className="ghost" onClick={handleLogout}>
            로그아웃
          </button>
        </div>
      )}
    </aside>
  );
}
