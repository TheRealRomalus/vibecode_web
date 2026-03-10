"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

type WorkoutType = "STRENGTH" | "CARDIO" | "MOBILITY" | "HIIT" | "OTHER";
type SessionStatus = "UPCOMING" | "COMPLETED" | "CANCELLED";

type Booking = {
  id: string;
  startTime: Date;
  endTime: Date;
  workoutType: WorkoutType;
  notes: string | null;
  trainerNotes: string | null;
  status: SessionStatus;
  client: { name: string | null; image: string | null };
};

const WORKOUT_OPTIONS: { value: WorkoutType; label: string }[] = [
  { value: "STRENGTH", label: "Strength" },
  { value: "CARDIO", label: "Cardio" },
  { value: "MOBILITY", label: "Mobility" },
  { value: "HIIT", label: "HIIT" },
  { value: "OTHER", label: "Other" },
];

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(d: Date) {
  return new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default function SessionEditForm({ booking }: { booking: Booking }) {
  const router = useRouter();
  const [workoutType, setWorkoutType] = useState<WorkoutType>(booking.workoutType);
  const [trainerNotes, setTrainerNotes] = useState(booking.trainerNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isCancelled = booking.status === "CANCELLED";

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch(`/api/sessions/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workoutType, trainerNotes }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save");
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
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
      router.push("/trainer");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
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
          <p className="text-sm text-gray-500">
            {formatTime(booking.startTime)} – {formatTime(booking.endTime)}
          </p>
        </div>
        {isCancelled && (
          <span className="ml-auto text-xs font-medium px-2 py-1 rounded-full bg-red-100 text-red-600">
            Cancelled
          </span>
        )}
      </div>

      {/* Workout type */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <label className="text-sm font-semibold text-gray-700">Workout Type</label>
        <div className="grid grid-cols-3 gap-2">
          {WORKOUT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              disabled={isCancelled}
              onClick={() => setWorkoutType(opt.value)}
              className={`py-2 rounded-xl text-sm font-medium border transition-colors ${
                workoutType === opt.value
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-gray-700 border-gray-200 hover:border-indigo-300"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Trainer notes */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div>
          <label className="text-sm font-semibold text-gray-700">Note for Client</label>
          <p className="text-xs text-gray-400 mt-0.5">
            Visible on the client&apos;s dashboard after you save.
          </p>
        </div>
        <textarea
          value={trainerNotes}
          onChange={(e) => setTrainerNotes(e.target.value)}
          disabled={isCancelled}
          rows={4}
          placeholder="e.g. Great work today — focus on form next time. Increase squat weight to 80kg."
          className="w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-gray-50 disabled:text-gray-400"
          maxLength={2000}
        />
        <p className="text-xs text-gray-400 text-right">{trainerNotes.length}/2000</p>
      </div>

      {/* Session notes (read-only) */}
      {booking.notes && (
        <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-500 mb-1">Booking notes (from client)</p>
          <p className="text-sm text-gray-700">{booking.notes}</p>
        </div>
      )}

      {/* Error / success */}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>
      )}
      {success && (
        <p className="text-sm text-green-600 bg-green-50 rounded-xl px-4 py-3">Changes saved successfully.</p>
      )}

      {/* Actions */}
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
