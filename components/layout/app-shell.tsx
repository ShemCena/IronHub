"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  QrCode,
  CreditCard,
  BarChart3,
  Settings,
  Search,
  Bell,
  LogOut,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  ScanLine,
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
  { label: "QR Credentials", href: "/qr-generator", icon: QrCode, permission: "qr:manage" },
  { label: "Plans & Payments", href: "/plans-payments", icon: CreditCard, permission: "plans:view" },
  { label: "Reports", href: "/reports", icon: BarChart3, permission: "reports:view" },
  { label: "Settings", href: "/settings", icon: Settings, permission: "settings:view" },
];

interface SearchResult {
  members: { id: string; memberCode: string; name: string; status: string }[];
  plans: { id: string; name: string; price: number }[];
}

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
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const visibleNav = NAV_ITEMS.filter(
    (item) => !item.permission || hasPermission(session.role, item.permission)
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

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSearchResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
          setSearchOpen(true);
        }
      } catch {
        // Ignore transient search errors
      }
    }, 180);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  async function handleMarkNotificationsRead() {
    setNotifOpen((prev) => !prev);
    if (unreadCount > 0) {
      await fetch("/api/notifications", { method: "PATCH" }).catch(() => {});
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    }
  }

  return (
    <div className="flex min-h-screen bg-[#090A0D] text-[#F5F6F8]">
      {/* Mobile drawer backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-[#292E38] bg-[#111318] transition-[width,transform] duration-200 ease-[var(--ease-out)] lg:static",
          collapsed ? "lg:w-[76px]" : "lg:w-[248px]",
          mobileOpen ? "w-[248px] translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-[#292E38] px-4">
          <Link href="/dashboard" className="focus:outline-none">
            <BrandMark collapsed={collapsed} />
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="rounded-md p-1.5 text-[#A4AAB5] hover:bg-[#20242D] hover:text-white lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 p-3" aria-label="Primary navigation">
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
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150",
                  active
                    ? "bg-[#E32935]/14 text-[#F5F6F8]"
                    : "text-[#A4AAB5] hover:bg-[#20242D] hover:text-[#F5F6F8]"
                )}
              >
                {active && (
                  <span
                    className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-[#E32935]"
                    aria-hidden="true"
                  />
                )}
                <Icon
                  className={cn(
                    "h-[18px] w-[18px] shrink-0 transition-colors",
                    active ? "text-[#E32935]" : "text-[#747C89] group-hover:text-[#F5F6F8]"
                  )}
                />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[#292E38] p-3">
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="hidden w-full items-center justify-center gap-2 rounded-lg border border-[#292E38] bg-[#171A21] px-3 py-2 text-xs font-medium text-[#A4AAB5] transition-colors hover:bg-[#20242D] hover:text-white lg:flex"
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4" />
                <span>Collapse Sidebar</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-[#292E38] bg-[#090A0D]/95 px-4 backdrop-blur-sm lg:px-6">
          <div className="flex flex-1 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-lg border border-[#292E38] bg-[#111318] p-2 text-[#A4AAB5] hover:text-white lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="relative w-full max-w-md">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#747C89]"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchResults && setSearchOpen(true)}
                onBlur={() => setTimeout(() => setSearchOpen(false), 180)}
                placeholder="Search members, IDs, or plans..."
                className="h-10 w-full rounded-lg border border-[#292E38] bg-[#111318] pl-9 pr-3 text-sm text-[#F5F6F8] placeholder:text-[#747C89] focus:border-[#E32935] focus:outline-none"
                aria-label="Global search"
              />
              {searchOpen && searchResults && (
                <div className="absolute left-0 right-0 top-12 z-50 rounded-xl border border-[#292E38] bg-[#171A21] p-2 shadow-xl">
                  {searchResults.members.length === 0 && searchResults.plans.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-[#747C89]">
                      No matching members or plans.
                    </p>
                  ) : (
                    <>
                      {searchResults.members.map((m) => (
                        <Link
                          key={m.id}
                          href={`/members/${m.id}`}
                          className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-[#20242D]"
                        >
                          <span>{m.name}</span>
                          <span className="text-xs text-[#747C89]">{m.memberCode}</span>
                        </Link>
                      ))}
                      {searchResults.plans.map((p) => (
                        <Link
                          key={p.id}
                          href="/plans-payments"
                          className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-[#20242D]"
                        >
                          <span>{p.name} Plan</span>
                          <span className="text-xs text-[#A4AAB5]">₱{p.price}</span>
                        </Link>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Notifications */}
            <div className="relative">
              <button
                type="button"
                onClick={handleMarkNotificationsRead}
                className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-[#292E38] bg-[#111318] text-[#A4AAB5] transition-colors hover:bg-[#20242D] hover:text-white"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#E32935] px-1 text-[10px] font-semibold text-white tabular-nums">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-12 z-50 w-80 rounded-xl border border-[#292E38] bg-[#171A21] p-3 shadow-xl">
                  <div className="mb-2 flex items-center justify-between border-b border-[#292E38] pb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#A4AAB5]">
                      Notifications
                    </span>
                    <button
                      type="button"
                      onClick={() => setNotifOpen(false)}
                      className="text-xs text-[#747C89] hover:text-white"
                    >
                      Close
                    </button>
                  </div>
                  <div className="max-h-72 space-y-2 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="py-4 text-center text-xs text-[#747C89]">
                        No notifications yet.
                      </p>
                    ) : (
                      notifications.map((n) => (
                        <Link
                          key={n.id}
                          href={n.href ?? "/dashboard"}
                          onClick={() => setNotifOpen(false)}
                          className="block rounded-lg border border-[#292E38] bg-[#111318] p-2.5 transition-colors hover:bg-[#20242D]"
                        >
                          <p className="text-xs font-medium text-[#F5F6F8]">{n.title}</p>
                          <p className="mt-0.5 text-xs text-[#A4AAB5]">{n.message}</p>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Account summary & Sign out */}
            <div className="flex items-center gap-3 rounded-lg border border-[#292E38] bg-[#111318] px-3 py-1.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#E32935]/15 text-xs font-semibold text-[#E32935]">
                {session.name
                  .split(" ")
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </div>
              <div className="hidden text-left sm:block">
                <p className="text-xs font-medium leading-tight text-[#F5F6F8]">
                  {session.name}
                </p>
                <p className="text-[11px] leading-tight text-[#747C89]">
                  {getRoleLabel(session.role)}
                </p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                title="Sign out"
                aria-label="Sign out"
                className="ml-1 rounded-md p-1.5 text-[#747C89] transition-colors hover:bg-[#20242D] hover:text-[#F05252]"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="mx-auto w-full max-w-[1440px] flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
