"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function TrainerNav() {
  const path = usePathname();

  const active = (href: string) =>
    path === href || (href !== "/trainer" && path.startsWith(href));
  const sessionsActive = path === "/trainer" || path.startsWith("/trainer/sessions");

  const item = (_href: string, isActive: boolean) =>
    `flex-1 flex flex-col items-center py-2 transition-colors ${
      isActive ? "text-violet-600" : "text-gray-400 hover:text-gray-700"
    }`;

  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white border-t z-20">
      <div className="max-w-lg mx-auto flex">
        {/* Sessions */}
        <Link href="/trainer" className={item("/trainer", sessionsActive)}>
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7A1 1 0 003 11h1v6a1 1 0 001 1h4v-4h2v4h4a1 1 0 001-1v-6h1a1 1 0 00.707-1.707l-7-7z" />
          </svg>
          <span className={`text-xs mt-0.5 ${sessionsActive ? "font-medium" : ""}`}>Sessions</span>
        </Link>

        {/* Clients */}
        <Link href="/trainer/clients" className={item("/trainer/clients", active("/trainer/clients"))}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className={`text-xs mt-0.5 ${active("/trainer/clients") ? "font-medium" : ""}`}>Clients</span>
        </Link>

        {/* Availability */}
        <Link href="/trainer/availability" className={item("/trainer/availability", active("/trainer/availability"))}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className={`text-xs mt-0.5 ${active("/trainer/availability") ? "font-medium" : ""}`}>Schedule</span>
        </Link>

        {/* Profile */}
        <Link href="/profile" className={item("/profile", active("/profile"))}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className={`text-xs mt-0.5 ${active("/profile") ? "font-medium" : ""}`}>Profile</span>
        </Link>
      </div>
    </nav>
  );
}
