"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  BarChart3,
  Settings,
  Bell,
  LogOut,
  Menu,
  X,
  ScanLine,
  ArrowRight,
  ChevronDown,
  UserCog,
  ShieldAlert,
} from "lucide-react";
import { BrandMark } from "@/components/ui/brand-mark";
import { cn } from "@/lib/utils";
import type { StaffSession } from "@/lib/auth/session";
import { getRoleLabel, hasPermission, type Permission } from "@/lib/permissions/rbac";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: Permission;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permission: "dashboard:view" },
  { label: "Members", href: "/members", icon: Users, permission: "members:view" },
  { label: "Check-In", href: "/check-in", icon: ScanLine, permission: "checkin:perform" },
  { label: "Plans & Payments", href: "/plans-payments", icon: CreditCard, permission: "plans:view" },
  { label: "Reports", href: "/reports", icon: BarChart3, permission: "reports:view" },
  { label: "Admins & Trainors", href: "/team", icon: UserCog, permission: "staff:manage" },
  { label: "Audit Logs", href: "/audit-logs", icon: ShieldAlert, permission: "audit:view" },
  { label: "Settings", href: "/settings", icon: Settings, permission: "account:self" },
];

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  href: string | null;
  isRead: boolean;
  createdAt: string;
}

export function AppShell({
  session,
  children,
}: {
  session: StaffSession;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const visibleNav = NAV_ITEMS.filter(
    (item) => !item.permission || hasPermission(session.role, item.permission)
  ).map((item) =>
    session.role === "TRAINER" && item.href === "/members"
      ? { ...item, label: "Clients" }
      : item
  );

  useEffect(() => {
    fetch("/api/notifications")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setNotifications(data.notifications ?? []);
          setUnreadCount(data.unreadCount ?? 0);
        }
      })
      .catch(() => {});
  }, [pathname]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  async function handleMarkNotificationsRead() {
    setAccountOpen(false);
    setNotifOpen((prev) => !prev);
    if (unreadCount > 0) {
      await fetch("/api/notifications", { method: "PATCH" }).catch(() => {});
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    }
  }

  const initials = session.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex min-h-screen bg-[#090A0D] text-[#F5F6F8]">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/75 print:hidden lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Balanced Fixed Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-screen w-[216px] shrink-0 flex-col border-r border-[#1F232C] bg-[#0D0F14] transition-transform duration-200 ease-[var(--ease-out)] print:hidden lg:sticky lg:top-0 lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-15 shrink-0 items-center justify-between px-4">
          <Link
            href="/dashboard"
            className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E32935]"
          >
            <BrandMark />
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="rounded-md p-1 text-[#A4AAB5] hover:bg-[#20242D] hover:text-white lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2.5" aria-label="Primary navigation">
          {visibleNav.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "group relative flex h-10 items-center gap-2.5 rounded-lg px-3 text-[13px] font-medium transition-[background-color,color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E32935]",
                  active
                    ? "bg-gradient-to-r from-[#E32935] via-[#B81F2A]/75 to-[#E32935]/10 text-white shadow-[0_6px_18px_-6px_rgba(227,41,53,0.5)]"
                    : "text-[#A4AAB5] hover:bg-[#171A21] hover:text-[#F5F6F8]"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    active ? "text-white" : "text-[#8A93A2] group-hover:text-[#F5F6F8]"
                  )}
                />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Fixed-height Athletic Brand Card */}
        <div className="shrink-0 p-3">
          <Link
            href={hasPermission(session.role, "checkin:perform") ? "/check-in" : "/members"}
            className="group relative block h-[142px] overflow-hidden rounded-xl border border-[#242934] bg-[#111318]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/sidebar-athlete.jpg"
              alt=""
              aria-hidden="true"
              className="h-full w-full object-cover object-top opacity-85 transition-transform duration-300 ease-[var(--ease-out)] group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#090A0D] via-[#090A0D]/55 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 flex flex-col items-center p-3 text-center">
              <p
                className="text-sm font-bold uppercase leading-tight tracking-wider text-white"
                style={{ fontFamily: "var(--font-barlow), sans-serif" }}
              >
                STRONGER
                <span className="block text-[#E32935]">TOGETHER</span>
              </p>
              <span className="mt-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#E32935] text-white shadow-[0_0_12px_rgba(227,41,53,0.5)] transition-transform duration-150 group-hover:translate-x-0.5">
                <ArrowRight className="h-3 w-3" />
              </span>
            </div>
          </Link>
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 flex h-15 shrink-0 items-center justify-between gap-3 border-b border-[#1F232C] bg-[#090A0D]/90 px-4 backdrop-blur-md print:hidden md:px-6">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-lg border border-[#242934] bg-[#111318] p-1.5 text-[#A4AAB5] hover:text-white lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="h-4 w-4" />
            </button>
            <span className="text-xs font-medium text-[#A4AAB5]">
              IronHub Fitness · {getRoleLabel(session.role)} Workspace
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Notifications */}
            <div className="relative">
              <button
                type="button"
                onClick={handleMarkNotificationsRead}
                className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-[#242934] bg-[#111318] text-[#A4AAB5] transition-colors hover:bg-[#171A21] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E32935]"
                aria-label="Notifications"
              >
                <Bell className="h-3.5 w-3.5" />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[#E32935] px-1 text-[9px] font-semibold text-white tabular-nums">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-11 z-50 w-72 rounded-xl border border-[#292E38] bg-[#171A21] p-2.5 shadow-2xl">
                  <div className="mb-2 flex items-center justify-between border-b border-[#292E38] pb-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A4AAB5]">
                      Notifications
                    </span>
                    <button
                      type="button"
                      onClick={() => setNotifOpen(false)}
                      className="text-[11px] text-[#8A93A2] hover:text-white"
                    >
                      Close
                    </button>
                  </div>
                  <div className="max-h-64 space-y-1.5 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="py-3 text-center text-xs text-[#8A93A2]">
                        No notifications yet.
                      </p>
                    ) : (
                      notifications.map((n) => (
                        <Link
                          key={n.id}
                          href={n.href ?? "/dashboard"}
                          onClick={() => setNotifOpen(false)}
                          className="block rounded-lg border border-[#292E38] bg-[#111318] p-2 transition-colors hover:bg-[#20242D]"
                        >
                          <p className="text-xs font-medium text-[#F5F6F8]">{n.title}</p>
                          <p className="mt-0.5 text-[11px] text-[#A4AAB5]">{n.message}</p>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Account Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotifOpen(false);
                  setAccountOpen((o) => !o);
                }}
                className="flex h-9 items-center gap-2 rounded-lg border border-[#242934] bg-[#111318] px-2 transition-colors hover:bg-[#171A21] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E32935]"
                aria-expanded={accountOpen}
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#E32935]/18 text-[11px] font-semibold text-[#E32935] ring-1 ring-[#E32935]/35">
                  {initials}
                </div>
                <div className="hidden text-left sm:block">
                  <p className="text-xs font-medium leading-tight text-[#F5F6F8]">
                    {session.name}
                  </p>
                  <p className="text-[10px] leading-tight text-[#8A93A2]">
                    {getRoleLabel(session.role)}
                  </p>
                </div>
                <ChevronDown className="h-3 w-3 text-[#8A93A2]" />
              </button>

              {accountOpen && (
                <div className="absolute right-0 top-11 z-50 w-48 rounded-xl border border-[#292E38] bg-[#171A21] p-1.5 shadow-2xl">
                  <div className="border-b border-[#292E38] px-2.5 py-1.5">
                    <p className="truncate text-xs font-medium text-[#F5F6F8]">{session.name}</p>
                    <p className="truncate text-[10px] text-[#8A93A2]">{session.email}</p>
                  </div>
                  <Link
                    href="/settings"
                    onClick={() => setAccountOpen(false)}
                    className="mt-1 flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-[#A4AAB5] hover:bg-[#20242D] hover:text-white"
                  >
                    <Settings className="h-3.5 w-3.5" />
                    <span>Settings &amp; Account</span>
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-[#F05252] hover:bg-[#F05252]/10"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Full-Width Responsive Workspace Container */}
        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-4 md:px-6 md:py-5">
          {children}
        </main>
      </div>
    </div>
  );
}
