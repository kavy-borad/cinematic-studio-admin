import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { motion } from "framer-motion";
import { AppSidebar } from "./AppSidebar";
import { useSidebarStore } from "@/store/sidebar";
import { initNotifications } from "@/store/notifications";

export function DashboardLayout() {
  const { collapsed } = useSidebarStore();

  useEffect(() => {
    initNotifications();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <motion.main
        animate={{ marginLeft: collapsed ? 72 : 210 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="min-h-screen"
      >
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Outlet />
        </motion.div>
      </motion.main>
    </div>
  );
}
