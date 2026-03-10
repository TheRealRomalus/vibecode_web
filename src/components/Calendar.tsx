"use client";

import { useState, useMemo } from "react";

export type DayData = {
  date: string; // "YYYY-MM-DD"
  upcoming: number;
  past: number;
};

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const DAY_HEADERS = ["M", "T", "W", "T", "F", "S", "S"];

export default function Calendar({
  days,
  showCounts = false,
}: {
  days: DayData[];
  showCounts?: boolean;
}) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const todayStr = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  const dayMap = useMemo(() => {
    const m = new Map<string, DayData>();
    days.forEach((d) => m.set(d.date, d));
    return m;
  }, [days]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay(); // 0=Sun
  const startPad = (firstDow + 6) % 7; // shift so Mon=0

  const cells: (number | null)[] = [
    ...Array(startPad).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <p className="font-semibold text-gray-900 text-sm">
          {MONTH_NAMES[month]} {year}
        </p>
        <button
          onClick={nextMonth}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_HEADERS.map((d, i) => (
          <p key={i} className="text-center text-xs text-gray-400 font-medium py-1">
            {d}
          </p>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          if (!day) return <div key={`pad-${i}`} />;

          const dateStr = [
            year,
            String(month + 1).padStart(2, "0"),
            String(day).padStart(2, "0"),
          ].join("-");
          const data = dayMap.get(dateStr);
          const isToday = dateStr === todayStr;

          return (
            <div key={dateStr} className="flex flex-col items-center py-0.5">
              <span
                className={`text-sm w-8 h-8 flex items-center justify-center rounded-full font-medium transition-colors ${
                  isToday
                    ? "bg-indigo-600 text-white"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {day}
              </span>

              {/* Dots */}
              <div className="flex items-center gap-0.5 mt-0.5 h-3">
                {data?.upcoming ? (
                  <span className="relative inline-flex">
                    <span className="block w-1.5 h-1.5 rounded-full bg-red-500" />
                    {showCounts && data.upcoming > 1 && (
                      <span className="absolute -top-1 -right-2 text-[8px] leading-none font-bold text-red-500">
                        {data.upcoming}
                      </span>
                    )}
                  </span>
                ) : null}
                {data?.past ? (
                  <span className="block w-1.5 h-1.5 rounded-full bg-gray-300" />
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-50">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-xs text-gray-400">Upcoming</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-gray-300" />
          <span className="text-xs text-gray-400">Past</span>
        </div>
      </div>
    </div>
  );
}
