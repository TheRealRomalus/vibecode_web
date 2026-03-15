"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Slot = { dayOfWeek: number; startTime: string; endTime: string };
type Block = { id: string; start: string; end: string };
type DayState = { enabled: boolean; blocks: Block[] };

const UI_DAYS: { dow: number; label: string }[] = [
  { dow: 1, label: "Monday" },
  { dow: 2, label: "Tuesday" },
  { dow: 3, label: "Wednesday" },
  { dow: 4, label: "Thursday" },
  { dow: 5, label: "Friday" },
  { dow: 6, label: "Saturday" },
  { dow: 0, label: "Sunday" },
];

let _id = 0;
function mkId() {
  return String(++_id);
}

/** Returns true if any two blocks in the list overlap. Blocks are sorted by start. */
function hasOverlap(blocks: Block[]): boolean {
  const sorted = [...blocks].sort((a, b) => a.start.localeCompare(b.start));
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].end > sorted[i + 1].start) return true;
  }
  return false;
}

function blockError(b: Block): string | null {
  if (b.start >= b.end) return "End must be after start";
  return null;
}

function initDays(initial: Slot[]): Map<number, DayState> {
  // Group slots by dayOfWeek
  const grouped = new Map<number, Block[]>();
  for (const s of initial) {
    const list = grouped.get(s.dayOfWeek) ?? [];
    list.push({ id: mkId(), start: s.startTime, end: s.endTime });
    grouped.set(s.dayOfWeek, list);
  }
  const m = new Map<number, DayState>();
  for (const { dow } of UI_DAYS) {
    const blocks = grouped.get(dow);
    m.set(dow, {
      enabled: !!blocks && blocks.length > 0,
      blocks: blocks ?? [{ id: mkId(), start: "09:00", end: "18:00" }],
    });
  }
  return m;
}

export default function AvailabilityForm({ initial }: { initial: Slot[] }) {
  const router = useRouter();
  const [days, setDays] = useState<Map<number, DayState>>(() => initDays(initial));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function toggleDay(dow: number) {
    setDays((prev) => {
      const next = new Map(prev);
      const d = next.get(dow)!;
      next.set(dow, { ...d, enabled: !d.enabled });
      return next;
    });
  }

  function updateBlock(dow: number, id: string, field: "start" | "end", value: string) {
    setDays((prev) => {
      const next = new Map(prev);
      const d = next.get(dow)!;
      next.set(dow, {
        ...d,
        blocks: d.blocks.map((b) => (b.id === id ? { ...b, [field]: value } : b)),
      });
      return next;
    });
  }

  function addBlock(dow: number) {
    setDays((prev) => {
      const next = new Map(prev);
      const d = next.get(dow)!;
      // Suggest a start time 1 h after the last block's end
      const lastEnd = d.blocks.at(-1)?.end ?? "09:00";
      const [h, min] = lastEnd.split(":").map(Number);
      const newH = Math.min(h + 1, 22);
      const newStart = `${String(newH).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
      const newEnd = `${String(Math.min(newH + 1, 23)).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
      next.set(dow, { ...d, blocks: [...d.blocks, { id: mkId(), start: newStart, end: newEnd }] });
      return next;
    });
  }

  function removeBlock(dow: number, id: string) {
    setDays((prev) => {
      const next = new Map(prev);
      const d = next.get(dow)!;
      const remaining = d.blocks.filter((b) => b.id !== id);
      next.set(dow, {
        enabled: remaining.length > 0,
        blocks: remaining.length > 0 ? remaining : [{ id: mkId(), start: "09:00", end: "18:00" }],
      });
      return next;
    });
  }

  function validate(): string | null {
    for (const { dow, label } of UI_DAYS) {
      const d = days.get(dow)!;
      if (!d.enabled) continue;
      for (const b of d.blocks) {
        if (b.start >= b.end) return `${label}: each block's end must be after its start`;
      }
      if (hasOverlap(d.blocks)) {
        return `${label}: time blocks overlap — adjust times before saving`;
      }
    }
    return null;
  }

  async function handleSave() {
    const validErr = validate();
    if (validErr) { setError(validErr); return; }

    setSaving(true);
    setError(null);
    setSuccess(false);

    const slots: Slot[] = [];
    for (const { dow } of UI_DAYS) {
      const d = days.get(dow)!;
      if (!d.enabled) continue;
      for (const b of d.blocks) {
        slots.push({ dayOfWeek: dow, startTime: b.start, endTime: b.end });
      }
    }

    try {
      const res = await fetch("/api/trainer/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slots }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save");
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Toggle the days you work. Add multiple time blocks per day (e.g.
        9am–12pm and 2pm–6pm). Overlapping blocks are not allowed.
      </p>

      {UI_DAYS.map(({ dow, label }) => {
        const d = days.get(dow)!;
        const dayHasOverlap = d.enabled && d.blocks.length > 1 && hasOverlap(d.blocks);

        return (
          <div
            key={dow}
            className={`rounded-2xl border p-4 transition-colors ${
              d.enabled
                ? dayHasOverlap
                  ? "border-red-200 bg-red-50/30"
                  : "border-indigo-200 bg-indigo-50/30"
                : "border-gray-100 bg-white"
            }`}
          >
            {/* Day header + toggle */}
            <div className="flex items-center justify-between mb-3">
              <p className={`font-semibold text-sm ${d.enabled ? "text-gray-900" : "text-gray-400"}`}>
                {label}
              </p>
              <button
                onClick={() => toggleDay(dow)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  d.enabled ? "bg-indigo-600" : "bg-gray-200"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    d.enabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {d.enabled && (
              <div className="space-y-2">
                {d.blocks.map((b) => {
                  const err = blockError(b);
                  return (
                    <div key={b.id}>
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={b.start}
                          onChange={(e) => updateBlock(dow, b.id, "start", e.target.value)}
                          className={`flex-1 rounded-xl border px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                            err ? "border-red-300 bg-red-50" : "border-gray-200"
                          }`}
                        />
                        <span className="text-xs text-gray-400 flex-shrink-0">to</span>
                        <input
                          type="time"
                          value={b.end}
                          onChange={(e) => updateBlock(dow, b.id, "end", e.target.value)}
                          className={`flex-1 rounded-xl border px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                            err ? "border-red-300 bg-red-50" : "border-gray-200"
                          }`}
                        />
                        {/* Remove button — only shown when >1 block */}
                        {d.blocks.length > 1 && (
                          <button
                            onClick={() => removeBlock(dow, b.id)}
                            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            aria-label="Remove block"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                      {err && <p className="text-xs text-red-500 mt-1 pl-1">{err}</p>}
                    </div>
                  );
                })}

                {dayHasOverlap && (
                  <p className="text-xs text-red-500 pl-1">
                    These blocks overlap — adjust times to fix
                  </p>
                )}

                <button
                  onClick={() => addBlock(dow)}
                  className="mt-1 flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Add time block
                </button>
              </div>
            )}
          </div>
        );
      })}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>
      )}
      {success && (
        <p className="text-sm text-green-700 bg-green-50 rounded-xl px-4 py-3">
          Availability saved successfully.
        </p>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3 rounded-2xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
      >
        {saving ? "Saving…" : "Save availability"}
      </button>
    </div>
  );
}
