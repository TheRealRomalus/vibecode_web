"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";

type Role = "TRAINER" | "CLIENT";

const ROLES = [
  {
    value: "TRAINER" as Role,
    label: "I'm a Trainer",
    description:
      "Manage clients, set availability, view your full booking calendar, and send session reminders.",
    emoji: "🏋️",
    borderSelected: "border-indigo-400",
    ringSelected: "ring-indigo-400",
    bg: "from-indigo-50 to-indigo-100",
    badge: "bg-indigo-100 text-indigo-700",
  },
  {
    value: "CLIENT" as Role,
    label: "I'm a Client",
    description:
      "Book sessions with your trainer, get email reminders, and track your fitness journey over time.",
    emoji: "🤸",
    borderSelected: "border-emerald-400",
    ringSelected: "ring-emerald-400",
    bg: "from-emerald-50 to-emerald-100",
    badge: "bg-emerald-100 text-emerald-700",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [selected, setSelected] = useState<Role | null>(null);
  const [trainerCode, setTrainerCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSelect(role: Role) {
    setSelected(role);
    setError(null);
    if (role === "CLIENT") setTrainerCode("");
  }

  async function handleConfirm() {
    if (!selected) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/user/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: selected,
          ...(selected === "TRAINER" ? { trainerCode } : {}),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Something went wrong");
      }

      // Refresh session so middleware sees onboardingComplete = true
      await update();
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  const canSubmit =
    selected !== null &&
    (selected === "CLIENT" || trainerCode.trim().length > 0);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="mb-10 text-center">
          {session?.user?.image && (
            <Image
              src={session.user.image}
              alt={session.user.name ?? "Your photo"}
              width={64}
              height={64}
              className="mx-auto mb-4 rounded-full ring-2 ring-white shadow"
            />
          )}
          <h1 className="text-3xl font-extrabold text-gray-900">
            Welcome
            {session?.user?.name ? `, ${session.user.name.split(" ")[0]}` : ""}!
          </h1>
          <p className="mt-2 text-gray-500">What brings you to FitBook?</p>
        </div>

        {/* Role cards */}
        <div className="space-y-4">
          {ROLES.map((role) => {
            const isSelected = selected === role.value;
            return (
              <button
                key={role.value}
                onClick={() => handleSelect(role.value)}
                className={[
                  "w-full rounded-2xl border-2 bg-gradient-to-br p-5 text-left transition",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                  "active:scale-[0.99] min-h-[44px]",
                  role.bg,
                  isSelected
                    ? `${role.borderSelected} ${role.ringSelected} shadow-md`
                    : "border-transparent shadow hover:shadow-md",
                ].join(" ")}
                aria-pressed={isSelected}
              >
                <div className="flex items-start gap-4">
                  <span className="text-4xl" role="img" aria-label={role.label}>
                    {role.emoji}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-gray-900">
                        {role.label}
                      </span>
                      {isSelected && (
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${role.badge}`}>
                          Selected
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-600">
                      {role.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Trainer access code — shown only when Trainer is selected */}
        {selected === "TRAINER" && (
          <div className="mt-5 rounded-2xl border border-indigo-200 bg-indigo-50 p-5">
            <label
              htmlFor="trainerCode"
              className="mb-1 block text-sm font-semibold text-indigo-800"
            >
              Trainer access code
            </label>
            <p className="mb-3 text-xs text-indigo-600">
              Trainer accounts are invite-only. Enter the code provided by your
              administrator.
            </p>
            <input
              id="trainerCode"
              type="password"
              value={trainerCode}
              onChange={(e) => {
                setTrainerCode(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && canSubmit && handleConfirm()}
              placeholder="Enter your trainer code"
              autoComplete="off"
              className="w-full rounded-lg border border-indigo-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[44px]"
            />
          </div>
        )}

        {/* Error message */}
        {error && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {/* Confirm button */}
        <button
          onClick={handleConfirm}
          disabled={!canSubmit || loading}
          className="mt-8 w-full rounded-xl bg-indigo-600 px-6 py-4 text-base font-semibold text-white shadow transition hover:bg-indigo-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px]"
        >
          {loading ? "Setting up your account…" : "Get started →"}
        </button>

        <p className="mt-4 text-center text-xs text-gray-400">
          You can&apos;t change your role after this step.
        </p>
      </div>
    </main>
  );
}
