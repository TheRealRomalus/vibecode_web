"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  clientId: string;
  packageType: "SESSION_COUNT" | "WEEKLY";
  totalSessions: number | null;
  sessionsUsed: number;
  sessionsPerWeek: number | null;
  gracePeriodWeeks: number;
  packageStartDate: string;
  expiresAt: string | null;
  sessionsLeft: number | null;
};

export default function PackageEditor(props: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [packageType, setPackageType] = useState(props.packageType);
  const [totalSessions, setTotalSessions] = useState(props.totalSessions ?? 10);
  const [sessionsPerWeek, setSessionsPerWeek] = useState(props.sessionsPerWeek ?? 2);
  const [gracePeriod, setGracePeriod] = useState(props.gracePeriodWeeks);
  const [startDate, setStartDate] = useState(props.packageStartDate);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/trainer/clients/${props.clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageType,
          totalSessions: packageType === "SESSION_COUNT" ? totalSessions : null,
          sessionsPerWeek: packageType === "WEEKLY" ? sessionsPerWeek : null,
          gracePeriodWeeks: gracePeriod,
          packageStartDate: startDate,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Failed to save");
      }
      setEditing(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-900">Package</h2>
          <button onClick={() => setEditing(true)} className="text-xs text-violet-600 font-medium hover:underline">
            Edit
          </button>
        </div>
        <div className="space-y-2 text-sm">
          {props.packageType === "SESSION_COUNT" ? (
            <>
              <Row label="Type" value="Session pack" />
              <Row label="Sessions" value={`${props.sessionsUsed} used / ${props.totalSessions ?? "?"} total`} />
              {props.sessionsLeft != null && (
                <Row
                  label="Remaining"
                  value={`${props.sessionsLeft} session${props.sessionsLeft !== 1 ? "s" : ""}`}
                  highlight={props.sessionsLeft <= 1 ? "red" : props.sessionsLeft <= 3 ? "orange" : undefined}
                />
              )}
            </>
          ) : (
            <>
              <Row label="Type" value="Weekly" />
              <Row label="Target" value={`${props.sessionsPerWeek ?? "—"} sessions / week`} />
            </>
          )}
          <Row label="Started" value={new Date(props.packageStartDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} />
          {props.expiresAt && (
            <Row
              label="Expires"
              value={new Date(props.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              highlight={new Date(props.expiresAt).getTime() - Date.now() < 14 * 86400000 ? "orange" : undefined}
            />
          )}
          <Row label="Grace period" value={`${props.gracePeriodWeeks} week${props.gracePeriodWeeks !== 1 ? "s" : ""}`} />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-violet-200 shadow-sm p-4 space-y-4">
      <h2 className="text-sm font-bold text-gray-900">Edit Package</h2>

      {/* Package type */}
      <div className="grid grid-cols-2 gap-2">
        {(["SESSION_COUNT", "WEEKLY"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setPackageType(t)}
            className={`py-2.5 rounded-xl text-sm font-medium border transition-colors ${
              packageType === t
                ? "bg-violet-600 text-white border-violet-600"
                : "bg-white text-gray-700 border-gray-200 hover:border-violet-300"
            }`}
          >
            {t === "SESSION_COUNT" ? "Session pack" : "Weekly"}
          </button>
        ))}
      </div>

      {packageType === "SESSION_COUNT" ? (
        <Field label="Total sessions in package">
          <input
            type="number" min={1} value={totalSessions}
            onChange={(e) => setTotalSessions(Number(e.target.value))}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
        </Field>
      ) : (
        <Field label="Sessions per week (target)">
          <input
            type="number" min={1} max={14} value={sessionsPerWeek}
            onChange={(e) => setSessionsPerWeek(Number(e.target.value))}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
        </Field>
      )}

      <Field label="Package start date">
        <input
          type="date" value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
        />
      </Field>

      <Field label={`Grace period (weeks) — default 3`}>
        <input
          type="number" min={0} max={52} value={gracePeriod}
          onChange={(e) => setGracePeriod(Number(e.target.value))}
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
        />
        <p className="text-xs text-gray-400 mt-1">
          {packageType === "SESSION_COUNT" && `Client has ${totalSessions} + ${gracePeriod} = ${totalSessions + gracePeriod} weeks from start date to complete all sessions.`}
          {packageType === "WEEKLY" && "Extra time allowed before renewal is required."}
        </p>
      </Field>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={handleSave} disabled={saving}
          className="flex-1 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          onClick={() => setEditing(false)}
          className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: "red" | "orange" }) {
  const color = highlight === "red" ? "text-red-500 font-semibold" : highlight === "orange" ? "text-orange-500 font-medium" : "text-gray-800";
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-400">{label}</span>
      <span className={color}>{value}</span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-gray-600">{label}</label>
      {children}
    </div>
  );
}
