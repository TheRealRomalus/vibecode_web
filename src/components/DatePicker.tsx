"use client";

import { useState } from "react";

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAY_HEADERS = ["M", "T", "W", "T", "F", "S", "S"];

function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function DatePicker({
  availableDows,
  selected,
  onSelect,
}: {
  availableDows: Set<number>;
  selected: string | null;
  onSelect: (date: string) => void;
}) {
  const today = new Date();
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay();
  const startPad = (firstDow + 6) % 7;

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

  // Don't allow navigating to months in the past
  const isPrevDisabled = year === today.getFullYear() && month === today.getMonth();

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          disabled={isPrevDisabled}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <p className="font-semibold text-gray-900 text-sm">{MONTH_NAMES[month]} {year}</p>
        <button
          onClick={nextMonth}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {DAY_HEADERS.map((d, i) => (
          <p key={i} className="text-center text-xs text-gray-400 font-medium py-1">{d}</p>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          if (!day) return <div key={`pad-${i}`} />;

          const dateStr = toDateStr(year, month, day);
          const dow = new Date(year, month, day).getDay();
          const isPast = dateStr < todayStr;
          const isAvailable = availableDows.has(dow) && !isPast;
          const isSelected = dateStr === selected;
          const isToday = dateStr === todayStr;

          return (
            <div key={dateStr} className="flex justify-center py-0.5">
              <button
                disabled={!isAvailable}
                onClick={() => onSelect(dateStr)}
                className={`w-9 h-9 rounded-full text-sm font-medium transition-colors ${
                  isSelected
                    ? "bg-indigo-600 text-white"
                    : isToday && isAvailable
                    ? "ring-2 ring-indigo-400 text-indigo-700 hover:bg-indigo-50"
                    : isAvailable
                    ? "text-gray-800 hover:bg-indigo-50 hover:text-indigo-700"
                    : "text-gray-300 cursor-not-allowed"
                }`}
              >
                {day}
              </button>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-400 mt-3 text-center">
        Highlighted dates have trainer availability
      </p>
    </div>
  );
}
