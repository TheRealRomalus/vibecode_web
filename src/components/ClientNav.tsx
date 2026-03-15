"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function ClientNav() {
  const path = usePathname();

  const active = (href: string) => path === href || path.startsWith(href + "/");

  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white border-t z-20">
      <div className="max-w-lg mx-auto flex">
        {/* Home */}
        <Link
          href="/dashboard"
          className={`flex-1 flex flex-col items-center py-3 transition-colors ${
            active("/dashboard") ? "text-indigo-600" : "text-gray-400 hover:text-gray-700"
          }`}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7A1 1 0 003 11h1v6a1 1 0 001 1h4v-4h2v4h4a1 1 0 001-1v-6h1a1 1 0 00.707-1.707l-7-7z" />
          </svg>
          <span className={`text-xs mt-0.5 ${active("/dashboard") ? "font-medium" : ""}`}>Home</span>
        </Link>

        {/* Book */}
        <Link
          href="/book"
          className={`flex-1 flex flex-col items-center py-3 transition-colors ${
            active("/book") ? "text-indigo-600" : "text-gray-400 hover:text-gray-700"
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span className={`text-xs mt-0.5 ${active("/book") ? "font-medium" : ""}`}>Book</span>
        </Link>

        {/* Profile */}
        <Link
          href="/profile"
          className={`flex-1 flex flex-col items-center py-3 transition-colors ${
            active("/profile") ? "text-indigo-600" : "text-gray-400 hover:text-gray-700"
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className={`text-xs mt-0.5 ${active("/profile") ? "font-medium" : ""}`}>Profile</span>
        </Link>
      </div>
    </nav>
  );
}
