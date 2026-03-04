import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Image, FileText, DollarSign, Users,
  Star, BarChart3, Settings, Camera, ChevronLeft, ChevronRight, LogOut, ShieldCheck
} from "lucide-react";
import { useSidebarStore } from "@/store/sidebar";
import { useAuth } from "@/contexts/AuthContext";

const links = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/portfolio", icon: Image, label: "Portfolio" },
  { to: "/quotations", icon: FileText, label: "Quotations" },
  { to: "/services", icon: DollarSign, label: "Services" },
  { to: "/clients", icon: Users, label: "Clients" },
  { to: "/testimonials", icon: Star, label: "Testimonials" },
  { to: "/analytics", icon: BarChart3, label: "Analytics" },
  { to: "/admins", icon: ShieldCheck, label: "Admins" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export function AppSidebar() {
  const { collapsed, toggle } = useSidebarStore();
  const location = useLocation();
  const { admin, logout } = useAuth();

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border z-40 flex flex-col"
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-sidebar-border">
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
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={`sidebar-link ${isActive ? "active" : "text-sidebar-foreground"}`}
              title={collapsed ? link.label : undefined}
            >
              <link.icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>{link.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Admin Info & Logout */}
      <div className="px-3 py-3 border-t border-sidebar-border">
        {!collapsed && admin && (
          <div className="mb-2 px-3 py-1.5">
            <p className="text-xs font-medium text-foreground truncate">{admin.name}</p>
            <p className="text-[10px] text-muted-foreground truncate">{admin.email}</p>
          </div>
        )}
        <button
          onClick={logout}
          className="sidebar-link w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
          title={collapsed ? "Logout" : undefined}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={toggle}
        className="h-12 flex items-center justify-center border-t border-sidebar-border text-muted-foreground hover:text-foreground transition-colors"
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>
    </motion.aside>
  );
}
