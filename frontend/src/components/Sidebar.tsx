import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";

interface NavItem {
  to: string;
  label: string;
}

interface NavGroup {
  key: string;
  label: string;
  items: NavItem[];
  adminOnly?: boolean;
  defaultOpen: boolean;
}

const TOP_ITEMS: NavItem[] = [
  { to: "/", label: "대시보드" },
  { to: "/equipments", label: "장비관리" },
];

const GROUPS: NavGroup[] = [
  {
    key: "preventive",
    label: "예방점검",
    defaultOpen: true,
    items: [
      { to: "/daily-checks", label: "일일점검" },
      { to: "/special-checks", label: "특별점검" },
      { to: "/weekly-tasks", label: "주간예정업무" },
      { to: "/work-status", label: "근무상황" },
    ],
  },
  {
    key: "support",
    label: "지원 · 장애",
    defaultOpen: true,
    items: [
      { to: "/part-replacements", label: "파트교체현황" },
      { to: "/support-tickets", label: "기술지원현황" },
      { to: "/failure-incidents", label: "장애관리" },
    ],
  },
  {
    key: "sla",
    label: "SLA",
    defaultOpen: false,
    items: [
      { to: "/sla/availability", label: "가용성관리" },
      { to: "/sla/operations", label: "운영관리" },
      { to: "/sla/monthly-status", label: "월간현황" },
    ],
  },
  {
    key: "admin",
    label: "관리자",
    adminOnly: true,
    defaultOpen: false,
    items: [
      { to: "/sla/master-data", label: "SLA-Master Data" },
      { to: "/users", label: "계정 관리" },
      { to: "/session-settings", label: "세션 타임아웃" },
      { to: "/groups", label: "그룹 관리" },
      { to: "/permissions", label: "권한 관리" },
      { to: "/menus", label: "메뉴 관리" },
      { to: "/codes", label: "코드 관리" },
    ],
  },
];

const STORAGE_KEY = "fms_sidebar_open";

function loadOpenState(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState<Record<string, boolean>>(loadOpenState);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const linkClass = (to: string) =>
    `app-sidebar__link${location.pathname === to ? " active" : ""}`;

  const activeGroup = GROUPS.find((g) => g.items.some((i) => i.to === location.pathname))?.key;

  useEffect(() => {
    if (activeGroup && open[activeGroup] === false) {
      setOpen((prev) => ({ ...prev, [activeGroup]: true }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGroup]);

  const isOpen = (g: NavGroup) => open[g.key] ?? (g.defaultOpen || g.key === activeGroup);

  const toggle = (g: NavGroup) => {
    const next = { ...open, [g.key]: !isOpen(g) };
    setOpen(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore storage failures
    }
  };

  return (
    <aside className="app-sidebar">
      <Link to="/" className="app-sidebar__brand">
        FMS<span>ICT</span>
      </Link>
      <nav className="app-sidebar__nav">
        {TOP_ITEMS.map((item) => (
          <Link key={item.to} to={item.to} className={linkClass(item.to)}>
            {item.label}
          </Link>
        ))}
        {GROUPS.filter((g) => !g.adminOnly || user?.is_admin).map((g) => {
          const expanded = isOpen(g);
          return (
            <div key={g.key} className="app-sidebar__group">
              <button
                type="button"
                className="app-sidebar__group-head"
                aria-expanded={expanded}
                onClick={() => toggle(g)}
              >
                <span>{g.label}</span>
                <span aria-hidden="true">{expanded ? "▾" : "▸"}</span>
              </button>
              {expanded &&
                g.items.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`${linkClass(item.to)} app-sidebar__link--sub`}
                  >
                    {item.label}
                  </Link>
                ))}
            </div>
          );
        })}
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
