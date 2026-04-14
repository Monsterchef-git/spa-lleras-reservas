import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarDays,
  Sparkles,
  Users,
  UserCircle,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/reservas", icon: CalendarDays, label: "Reservas" },
  { to: "/servicios", icon: Sparkles, label: "Servicios" },
  { to: "/terapeutas", icon: Users, label: "Terapeutas" },
  { to: "/clientes", icon: UserCircle, label: "Clientes" },
  { to: "/reportes", icon: BarChart3, label: "Reportes" },
  { to: "/configuracion", icon: Settings, label: "Configuración" },
];

export function AppSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-card p-2 rounded-lg shadow-md border border-border"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-full w-64 bg-sidebar text-sidebar-foreground z-40 flex flex-col transition-transform duration-300",
          "lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand */}
        <div className="p-6 border-b border-sidebar-border">
          <h1 className="font-heading text-xl font-bold text-sidebar-primary">
            Spa Lleras
          </h1>
          <p className="text-xs text-sidebar-foreground/60 mt-1">
            Central Reservations
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive =
              item.to === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <item.icon className="h-4.5 w-4.5" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-sidebar-border">
          <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors w-full">
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}
