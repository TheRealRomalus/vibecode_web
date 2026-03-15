"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

type SessionStatus = "UPCOMING" | "COMPLETED" | "CANCELLED";

type Exercise = {
  id: string;
  name: string;
  targetSets: number;
  targetReps: string;
  targetWeight: number | null;
};

type Plan = { id: string; name: string; exercises: Exercise[] };

type ExistingLog = {
  exerciseId: string;
  setsLogged: number;
  repsLogged: string;
  weightUsed: number | null;
  weightsLogged: string | null;
  notes: string | null;
};

type PreviousLog = {
  exerciseId: string;
  exerciseName: string;
  setsLogged: number;
  repsLogged: string;
  weightUsed: number | null;
};

type Booking = {
  id: string;
  startTime: Date;
  endTime: Date;
  workoutType: string;
  notes: string | null;
  trainerNotes: string | null;
  status: SessionStatus;
  client: { name: string | null; image: string | null };
};

type SetRow = { reps: string; weight: string };
type LogEntry = { rows: SetRow[]; notes: string };

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}
function formatTime(d: Date) {
  return new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function buildRows(ex: Exercise, existing: ExistingLog | undefined): SetRow[] {
  if (existing) {
    const repsArr = existing.repsLogged.split(",");
    const weightsArr = existing.weightsLogged
      ? existing.weightsLogged.split(",")
      : Array(existing.setsLogged).fill(existing.weightUsed != null ? String(existing.weightUsed) : "");
    return Array.from({ length: existing.setsLogged }, (_, i) => ({
      reps: repsArr[i]?.trim() ?? repsArr[repsArr.length - 1]?.trim() ?? "",
      weight: weightsArr[i]?.trim() ?? weightsArr[weightsArr.length - 1]?.trim() ?? "",
    }));
  }
  return Array.from({ length: ex.targetSets }, () => ({
    reps: ex.targetReps,
    weight: ex.targetWeight != null ? String(ex.targetWeight) : "",
  }));
}

function buildLogsForPlan(plan: Plan, existingLogs: ExistingLog[]): Record<string, LogEntry> {
  const result: Record<string, LogEntry> = {};
  for (const ex of plan.exercises) {
    const existing = existingLogs.find((l) => l.exerciseId === ex.id);
    result[ex.id] = {
      rows: buildRows(ex, existing),
      notes: existing?.notes ?? "",
    };
  }
  return result;
}

export default function SessionEditForm({
  booking,
  plans,
  existingLogs,
  previousLogs,
  previousSessionDate,
}: {
  booking: Booking;
  plans: Plan[];
  existingLogs: ExistingLog[];
  previousLogs: PreviousLog[];
  previousSessionDate: Date | null;
}) {
  const router = useRouter();
  const [trainerNotes, setTrainerNotes] = useState(booking.trainerNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(plans[0] ?? null);
  const [logs, setLogs] = useState<Record<string, LogEntry>>(
    () => plans[0] ? buildLogsForPlan(plans[0], existingLogs) : {}
  );

  const isCancelled = booking.status === "CANCELLED";

  function switchPlan(plan: Plan) {
    setSelectedPlan(plan);
    // Merge existing log data for new plan's exercises
    setLogs((prev) => {
      const next = { ...prev };
      for (const ex of plan.exercises) {
        if (!next[ex.id]) {
          const existing = existingLogs.find((l) => l.exerciseId === ex.id);
          next[ex.id] = {
            rows: buildRows(ex, existing),
            notes: existing?.notes ?? "",
          };
        }
      }
      return next;
    });
  }

  function updateRow(exerciseId: string, rowIndex: number, field: "reps" | "weight", value: string) {
    setLogs((prev) => {
      const entry = prev[exerciseId];
      const rows = entry.rows.map((r, i) => i === rowIndex ? { ...r, [field]: value } : r);
      return { ...prev, [exerciseId]: { ...entry, rows } };
    });
  }

  function addRow(exerciseId: string) {
    setLogs((prev) => {
      const entry = prev[exerciseId];
      const last = entry.rows[entry.rows.length - 1] ?? { reps: "", weight: "" };
      return { ...prev, [exerciseId]: { ...entry, rows: [...entry.rows, { ...last }] } };
    });
  }

  function removeRow(exerciseId: string, rowIndex: number) {
    setLogs((prev) => {
      const entry = prev[exerciseId];
      if (entry.rows.length <= 1) return prev;
      return { ...prev, [exerciseId]: { ...entry, rows: entry.rows.filter((_, i) => i !== rowIndex) } };
    });
  }

  function updateNotes(exerciseId: string, notes: string) {
    setLogs((prev) => ({ ...prev, [exerciseId]: { ...prev[exerciseId], notes } }));
  }

  async function saveLogs() {
    if (!selectedPlan) return;
    const payload = selectedPlan.exercises
      .filter((ex) => logs[ex.id]?.rows.length > 0)
      .map((ex) => {
        const entry = logs[ex.id];
        const repsLogged = entry.rows.map((r) => r.reps || "0").join(",");
        const weightsLogged = entry.rows.map((r) => r.weight || "0").join(",");
        const firstWeight = entry.rows.find((r) => r.weight)?.weight;
        return {
          exerciseId: ex.id,
          setsLogged: entry.rows.length,
          repsLogged,
          weightUsed: firstWeight ? Number(firstWeight) : null,
          weightsLogged,
          notes: entry.notes || null,
        };
      });

    await fetch(`/api/sessions/${booking.id}/logs`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch(`/api/sessions/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trainerNotes }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save");
      }
      await saveLogs();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel() {
    if (!confirm("Cancel this session? The client will see it as cancelled.")) return;
    setCancelling(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to cancel");
      }
      router.push("/trainer");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setCancelling(false);
    }
  }

  async function handleMarkComplete() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to update");
      }
      await saveLogs();
      router.push("/trainer");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Client info card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
        {booking.client.image ? (
          <Image src={booking.client.image} alt="" width={48} height={48} className="rounded-full" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-semibold text-lg">
            {booking.client.name?.[0] ?? "C"}
          </div>
        )}
        <div>
          <p className="font-semibold text-gray-900">{booking.client.name ?? "Client"}</p>
          <p className="text-sm text-gray-500">{formatDate(booking.startTime)}</p>
          <p className="text-sm text-gray-500">{formatTime(booking.startTime)} – {formatTime(booking.endTime)}</p>
        </div>
        {isCancelled && (
          <span className="ml-auto text-xs font-medium px-2 py-1 rounded-full bg-red-100 text-red-600">Cancelled</span>
        )}
      </div>

      {/* Exercise log */}
      {plans.length > 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-5">
          {/* Plan picker */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Workout Plan</p>
            {plans.length === 1 ? (
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2">
                <p className="text-sm font-semibold text-indigo-900">{plans[0].name}</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {plans.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => switchPlan(plan)}
                    disabled={isCancelled}
                    className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors ${
                      selectedPlan?.id === plan.id
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white text-gray-700 border-gray-200 hover:border-indigo-300"
                    } disabled:opacity-50`}
                  >
                    {plan.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Exercises for selected plan */}
          {selectedPlan && selectedPlan.exercises.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-2">No exercises in this plan yet.</p>
          )}

          {selectedPlan && selectedPlan.exercises.map((ex) => {
            const entry = logs[ex.id] ?? { rows: buildRows(ex, undefined), notes: "" };
            const prev = previousLogs.find((l) => l.exerciseId === ex.id);

            return (
              <div key={ex.id} className="border-t pt-4 first:border-0 first:pt-0 space-y-3">
                {/* Exercise header */}
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900">{ex.name}</p>
                  {prev && (
                    <p className="text-xs text-gray-400 text-right flex-shrink-0">
                      Last: {prev.setsLogged}×{prev.repsLogged}
                      {prev.weightUsed ? ` @ ${prev.weightUsed}kg` : ""}
                    </p>
                  )}
                </div>
                <p className="text-xs text-gray-400">
                  Target: {ex.targetSets}×{ex.targetReps}{ex.targetWeight ? ` @ ${ex.targetWeight}kg` : ""}
                  {previousSessionDate && !prev && (
                    <span className="ml-2 italic">No log from last session</span>
                  )}
                </p>

                {/* Column headers */}
                <div className="grid grid-cols-[28px_1fr_1fr_24px] gap-2">
                  <span className="text-xs text-gray-400 text-center">Set</span>
                  <span className="text-xs text-gray-400">Reps</span>
                  <span className="text-xs text-gray-400">kg</span>
                  <span />
                </div>

                {/* Per-set rows */}
                {entry.rows.map((row, i) => (
                  <div key={i} className="grid grid-cols-[28px_1fr_1fr_24px] gap-2 items-center">
                    <span className="text-xs font-mono text-gray-400 text-center">{i + 1}</span>
                    <input
                      value={row.reps}
                      disabled={isCancelled}
                      onChange={(e) => updateRow(ex.id, i, "reps", e.target.value)}
                      placeholder={ex.targetReps}
                      className="w-full rounded-xl border border-gray-200 px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-gray-50"
                    />
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={row.weight}
                      disabled={isCancelled}
                      onChange={(e) => updateRow(ex.id, i, "weight", e.target.value)}
                      placeholder="—"
                      className="w-full rounded-xl border border-gray-200 px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-gray-50"
                    />
                    {!isCancelled && entry.rows.length > 1 ? (
                      <button
                        onClick={() => removeRow(ex.id, i)}
                        className="text-gray-300 hover:text-red-400 text-sm leading-none"
                      >
                        ✕
                      </button>
                    ) : (
                      <span />
                    )}
                  </div>
                ))}

                {!isCancelled && (
                  <button
                    onClick={() => addRow(ex.id)}
                    className="text-xs text-indigo-500 hover:text-indigo-700 font-medium"
                  >
                    + Add set
                  </button>
                )}

                <input
                  value={entry.notes}
                  disabled={isCancelled}
                  onChange={(e) => updateNotes(ex.id, e.target.value)}
                  placeholder="Notes (optional)"
                  className="w-full rounded-xl border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-gray-50"
                />
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Trainer notes */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div>
          <label className="text-sm font-semibold text-gray-700">Note for Client</label>
          <p className="text-xs text-gray-400 mt-0.5">Visible on the client&apos;s dashboard after you save.</p>
        </div>
        <textarea
          value={trainerNotes}
          onChange={(e) => setTrainerNotes(e.target.value)}
          disabled={isCancelled}
          rows={3}
          placeholder="e.g. Great work today — increase squat weight next session."
          className="w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-gray-50 disabled:text-gray-400"
          maxLength={2000}
        />
        <p className="text-xs text-gray-400 text-right">{trainerNotes.length}/2000</p>
      </div>

      {booking.notes && (
        <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-500 mb-1">Client&apos;s booking notes</p>
          <p className="text-sm text-gray-700">{booking.notes}</p>
        </div>
      )}

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>}
      {success && <p className="text-sm text-green-600 bg-green-50 rounded-xl px-4 py-3">Saved successfully.</p>}

      {!isCancelled && (
        <div className="space-y-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 rounded-2xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
          {booking.status === "UPCOMING" && (
            <>
              <button
                onClick={handleMarkComplete}
                disabled={saving}
                className="w-full py-3 rounded-2xl bg-green-600 text-white font-semibold text-sm hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                Mark as completed
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="w-full py-3 rounded-2xl border border-red-200 text-red-600 font-semibold text-sm hover:bg-red-50 disabled:opacity-50 transition-colors"
              >
                {cancelling ? "Cancelling…" : "Cancel session"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
