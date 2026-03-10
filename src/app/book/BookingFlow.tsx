"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import DatePicker from "@/components/DatePicker";

type Trainer = {
  id: string;
  name: string | null;
  image: string | null;
  availableDows: number[];
};

type Slot = { start: string; end: string };

type WorkoutType = "STRENGTH" | "CARDIO" | "MOBILITY" | "HIIT" | "OTHER";

const WORKOUT_OPTIONS: { value: WorkoutType; label: string }[] = [
  { value: "STRENGTH", label: "Strength" },
  { value: "CARDIO", label: "Cardio" },
  { value: "MOBILITY", label: "Mobility" },
  { value: "HIIT", label: "HIIT" },
  { value: "OTHER", label: "Other" },
];

function formatDisplayDate(dateStr: string) {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
}

function formatSlot(slot: Slot) {
  const fmt = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
  };
  return `${fmt(slot.start)} – ${fmt(slot.end)}`;
}

export default function BookingFlow({ trainers }: { trainers: Trainer[] }) {
  const router = useRouter();

  const [trainer, setTrainer] = useState<Trainer | null>(
    trainers.length === 1 ? trainers[0] : null
  );
  const [step, setStep] = useState<"trainer" | "date" | "slot" | "confirm">(
    trainers.length === 1 ? "date" : "trainer"
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [workoutType, setWorkoutType] = useState<WorkoutType>("STRENGTH");
  const [notes, setNotes] = useState("");
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDateSelect(date: string) {
    setSelectedDate(date);
    setSelectedSlot(null);
    setSlots([]);
    setLoadingSlots(true);
    setStep("slot");
    setError(null);

    try {
      const res = await fetch(`/api/trainers/${trainer!.id}/slots?date=${date}`);
      const data = await res.json();
      setSlots(data.slots ?? []);
    } catch {
      setError("Failed to load available slots");
    } finally {
      setLoadingSlots(false);
    }
  }

  async function handleBook() {
    if (!trainer || !selectedDate || !selectedSlot) return;
    setBooking(true);
    setError(null);

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trainerId: trainer.id,
          date: selectedDate,
          slotStart: selectedSlot.start,
          slotEnd: selectedSlot.end,
          workoutType,
          notes: notes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Booking failed");
      }

      router.push("/dashboard?booked=1");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setBooking(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Step: Trainer ─────────────────────────────────── */}
      {step === "trainer" && (
        <section>
          <h2 className="text-base font-bold text-gray-900 mb-3">Choose a trainer</h2>
          {trainers.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center">
              <p className="text-gray-400 text-sm">No trainers available right now.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {trainers.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setTrainer(t); setStep("date"); }}
                  className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors text-left"
                >
                  {t.image ? (
                    <Image src={t.image} alt="" width={44} height={44} className="rounded-full flex-shrink-0" />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg flex-shrink-0">
                      {t.name?.[0] ?? "T"}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-gray-900">{t.name}</p>
                    <p className="text-sm text-gray-400">
                      Available {t.availableDows.length} day{t.availableDows.length !== 1 ? "s" : ""} / week
                    </p>
                  </div>
                  <svg className="w-5 h-5 text-gray-300 ml-auto" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Step: Date ────────────────────────────────────── */}
      {(step === "date" || step === "slot" || step === "confirm") && trainer && (
        <section>
          {/* Trainer summary */}
          <div className="flex items-center gap-2 mb-4">
            {trainers.length > 1 && (
              <button
                onClick={() => { setStep("trainer"); setTrainer(null); setSelectedDate(null); setSelectedSlot(null); }}
                className="text-gray-400 hover:text-gray-700 mr-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            {trainer.image ? (
              <Image src={trainer.image} alt="" width={28} height={28} className="rounded-full" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-semibold">
                {trainer.name?.[0]}
              </div>
            )}
            <p className="text-sm font-semibold text-gray-800">{trainer.name}</p>
          </div>

          <h2 className="text-base font-bold text-gray-900 mb-3">
            {step === "date" ? "Pick a date" : (
              <button
                onClick={() => { setStep("date"); setSelectedSlot(null); }}
                className="flex items-center gap-1 hover:text-indigo-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                {selectedDate ? formatDisplayDate(selectedDate) : "Pick a date"}
              </button>
            )}
          </h2>

          {step === "date" && (
            <DatePicker
              availableDows={new Set(trainer.availableDows)}
              selected={selectedDate}
              onSelect={handleDateSelect}
            />
          )}
        </section>
      )}

      {/* ── Step: Slot ────────────────────────────────────── */}
      {(step === "slot" || step === "confirm") && selectedDate && (
        <section>
          <h2 className="text-base font-bold text-gray-900 mb-3">
            {step === "slot" ? "Pick a time" : (
              <button
                onClick={() => { setStep("slot"); setSelectedSlot(null); }}
                className="flex items-center gap-1 hover:text-indigo-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                {selectedSlot ? formatSlot(selectedSlot) : "Pick a time"}
              </button>
            )}
          </h2>

          {step === "slot" && (
            <>
              {loadingSlots ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                  <p className="text-gray-400 text-sm">Loading available times…</p>
                </div>
              ) : slots.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center">
                  <p className="text-gray-500 text-sm font-medium">No slots available on this day</p>
                  <p className="text-gray-400 text-xs mt-1">All time slots are booked — pick another date</p>
                  <button
                    onClick={() => setStep("date")}
                    className="mt-3 text-sm text-indigo-600 font-medium hover:underline"
                  >
                    ← Back to calendar
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {slots.map((slot) => (
                    <button
                      key={slot.start}
                      onClick={() => { setSelectedSlot(slot); setStep("confirm"); }}
                      className="bg-white rounded-2xl border border-gray-200 py-3 px-2 text-sm font-medium text-gray-800 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                    >
                      {formatSlot(slot)}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* ── Step: Confirm ────────────────────────────────── */}
      {step === "confirm" && trainer && selectedDate && selectedSlot && (
        <section className="space-y-4">
          {/* Summary card */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 space-y-1">
            <p className="font-bold text-indigo-900">{formatDisplayDate(selectedDate)}</p>
            <p className="text-indigo-700 text-sm">{formatSlot(selectedSlot)}</p>
            <p className="text-indigo-600 text-sm">with {trainer.name}</p>
          </div>

          {/* Workout type */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
            <label className="text-sm font-semibold text-gray-700">Workout type</label>
            <div className="grid grid-cols-3 gap-2">
              {WORKOUT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setWorkoutType(opt.value)}
                  className={`py-2 rounded-xl text-sm font-medium border transition-colors ${
                    workoutType === opt.value
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-gray-700 border-gray-200 hover:border-indigo-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
            <label className="text-sm font-semibold text-gray-700">
              Notes <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Any injuries, goals, or requests for your trainer…"
              className="w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>
          )}

          <button
            onClick={handleBook}
            disabled={booking}
            className="w-full py-3.5 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {booking ? "Booking…" : "Confirm booking"}
          </button>
        </section>
      )}
    </div>
  );
}
