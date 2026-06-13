"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  ClipboardList,
  LogOut,
  Menu,
  Moon,
  Plus,
  Sun,
  X,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "./theme-provider";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth/session", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const links = [
    { href: "/dashboard", label: "Meine Umfragen", icon: ClipboardList },
    { href: "/surveys/new", label: "Neu erstellen", icon: Plus },
  ];

  return (
    <div className="min-h-dvh kraftstoff-bg">
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Sidebar schließen"
        />
      )}

      <aside className={cn("sidebar fixed left-0 top-0 z-50 flex flex-col", sidebarOpen && "open")}>
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
          <Link href="/dashboard" className="font-semibold text-[var(--foreground)]">
            Kraftstoff <span className="text-[var(--accent)]">Survey</span>
          </Link>
          <button
            type="button"
            className="btn-ghost md:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "sidebar-link",
                (pathname === href || pathname.startsWith(`${href}/`)) && "active"
              )}
              onClick={() => setSidebarOpen(false)}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-[var(--border-subtle)] space-y-1">
          <button type="button" className="sidebar-link w-full" onClick={toggleTheme}>
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            {theme === "dark" ? "Light Theme" : "Dark Theme"}
          </button>
          <button type="button" className="sidebar-link w-full" onClick={handleLogout}>
            <LogOut size={18} />
            Abmelden
          </button>
        </div>
      </aside>

      <div className="admin-main md:ml-[var(--sidebar-width)]">
        <header className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--background)]/80 backdrop-blur-md">
          <button
            type="button"
            className="btn-ghost md:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={20} />
          </button>
          <span className="mono-label flex items-center gap-2">
            <BarChart3 size={14} className="text-[var(--accent)]" />
            Admin
          </span>
        </header>
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
