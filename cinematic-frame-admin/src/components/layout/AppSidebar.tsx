import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Image, FileText, DollarSign, Users,
  Star, BarChart3, Settings, Camera, ChevronLeft, ChevronRight, LogOut, ShieldCheck, Receipt, User
} from "lucide-react";
import { useUIStore } from "@/store/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useNotificationStore } from "@/store/notifications";

const links = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/portfolio", icon: Image, label: "Portfolio" },
  { to: "/quotations", icon: FileText, label: "Quotations" },
  { to: "/services", icon: DollarSign, label: "Services" },
  { to: "/clients", icon: Users, label: "Clients" },
  // { to: "/testimonials", icon: Star, label: "Testimonials" },
  // { to: "/analytics", icon: BarChart3, label: "Analytics" },
  { to: "/bills", icon: Receipt, label: "Bills" },
  { to: "/admins", icon: ShieldCheck, label: "Admins" },
  { to: "/profile", icon: User, label: "My Profile" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export function AppSidebar() {
  const { collapsed, toggleSidebar } = useUIStore();
  const location = useLocation();
  const { admin, logout } = useAuth();
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 210 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border z-40 flex flex-col"
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-3 border-b border-sidebar-border">
        <Camera className="h-7 w-7 text-primary flex-shrink-0" />
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="ml-3 font-display text-lg font-semibold text-foreground tracking-tight"
          >
            Cinematic Frame
          </motion.span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {links.map((link) => {
          const isActive = location.pathname === link.to;
          const showBadge = link.to === "/quotations" && unreadCount > 0;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={`sidebar-link ${isActive ? "active" : "text-sidebar-foreground"}`}
              title={collapsed ? link.label : undefined}
            >
              <div className="relative">
                <link.icon className="h-5 w-5 flex-shrink-0" />
                {showBadge && collapsed && (
                  <span className="absolute -top-1.5 -right-1.5 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center text-[8px] font-bold text-white animate-pulse">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>
              {!collapsed && (
                <div className="flex items-center justify-between flex-1">
                  <span>{link.label}</span>
                  {showBadge && (
                    <span className="h-5 min-w-[20px] px-1.5 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white animate-pulse">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </div>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="mt-auto border-t border-sidebar-border flex flex-col">
        <div className="p-3">
          <button
            onClick={logout}
            className="sidebar-link w-full text-red-500 hover:text-red-400 hover:bg-red-500/10 transition-all border-none shadow-none"
            title={collapsed ? "Logout" : undefined}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span className="font-semibold tracking-wide text-sm">Logout</span>}
          </button>
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={toggleSidebar}
          className="h-12 flex items-center justify-center border-t border-sidebar-border text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/30 transition-colors w-full"
          title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </motion.aside>
  );
}
