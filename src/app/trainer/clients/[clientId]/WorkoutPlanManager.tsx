"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Exercise = {
  id: string;
  name: string;
  targetSets: number;
  targetReps: string;
  targetWeight: number | null;
  order: number;
};

type Plan = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  exercises: Exercise[];
};

type Props = { clientId: string; plans: Plan[] };

export default function WorkoutPlanManager({ clientId, plans }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [creatingPlan, setCreatingPlan] = useState(false);
  const [newPlanName, setNewPlanName] = useState("");
  const [expandedPlan, setExpandedPlan] = useState<string | null>(
    plans.find((p) => p.active)?.id ?? plans[0]?.id ?? null
  );
  const [addingExerciseToPlan, setAddingExerciseToPlan] = useState<string | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [exLoading, setExLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function createPlan() {
    if (!newPlanName.trim()) return;
    setPlanLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/trainer/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, name: newPlanName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create plan");
      setNewPlanName("");
      setCreatingPlan(false);
      setExpandedPlan(data.id);
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setPlanLoading(false);
    }
  }

  async function togglePlanActive(planId: string, active: boolean) {
    await fetch(`/api/trainer/plans/${planId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    refresh();
  }

  async function deletePlan(planId: string) {
    if (!confirm("Delete this workout plan? All exercises will be removed.")) return;
    await fetch(`/api/trainer/plans/${planId}`, { method: "DELETE" });
    refresh();
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-gray-900">Workout Plans</h2>
        <button
          onClick={() => { setCreatingPlan(true); setError(null); }}
          className="text-xs text-violet-600 font-medium hover:underline"
        >
          + New plan
        </button>
      </div>

      {creatingPlan && (
        <div className="bg-white rounded-2xl border border-violet-200 p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-700">New workout plan</p>
          <input
            autoFocus
            value={newPlanName}
            onChange={(e) => setNewPlanName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createPlan()}
            placeholder="e.g. Strength Phase 1, Cut Programme…"
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={createPlan}
              disabled={planLoading || !newPlanName.trim()}
              className="flex-1 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-50"
            >
              {planLoading ? "Creating…" : "Create"}
            </button>
            <button
              onClick={() => { setCreatingPlan(false); setNewPlanName(""); setError(null); }}
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-500"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {plans.length === 0 && !creatingPlan && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-6 text-center">
          <p className="text-gray-400 text-sm">No workout plans yet.</p>
          <p className="text-gray-400 text-xs mt-1">Create a plan to assign exercises to this client.</p>
        </div>
      )}

      {plans.map((plan) => {
        const isOpen = expandedPlan === plan.id;
        return (
          <div
            key={plan.id}
            className={`bg-white rounded-2xl border shadow-sm ${plan.active ? "border-violet-200" : "border-gray-100"}`}
          >
            {/* Plan header */}
            <div className="p-4">
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => setExpandedPlan(isOpen ? null : plan.id)}
                  className="flex-1 text-left"
                >
                  <div className="flex items-center gap-2">
                    <svg
                      className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isOpen ? "rotate-90" : ""}`}
                      fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="font-semibold text-gray-900 text-sm">{plan.name}</span>
                    {plan.active && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-medium">Active</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 ml-6">
                    {plan.exercises.length} exercise{plan.exercises.length !== 1 ? "s" : ""}
                  </p>
                </button>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <button
                    onClick={() => togglePlanActive(plan.id, !plan.active)}
                    className="text-xs text-gray-400 hover:text-violet-600 font-medium"
                  >
                    {plan.active ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    onClick={() => deletePlan(plan.id)}
                    className="text-xs text-red-400 hover:text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>

            {/* Exercises */}
            {isOpen && (
              <div className="border-t border-gray-50 px-4 pb-4 pt-3 space-y-2">
                {plan.exercises.length === 0 && addingExerciseToPlan !== plan.id && (
                  <p className="text-xs text-gray-400 text-center py-2">No exercises yet.</p>
                )}

                {plan.exercises.map((ex, i) => (
                  <ExerciseRow
                    key={ex.id}
                    exercise={ex}
                    index={i}
                    onSave={async (data) => {
                      await fetch(`/api/trainer/exercises/${ex.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(data),
                      });
                      refresh();
                    }}
                    onDelete={async () => {
                      if (!confirm("Remove this exercise?")) return;
                      await fetch(`/api/trainer/exercises/${ex.id}`, { method: "DELETE" });
                      refresh();
                    }}
                  />
                ))}

                {/* Add exercise inline form */}
                {addingExerciseToPlan === plan.id ? (
                  <AddExerciseForm
                    planId={plan.id}
                    loading={exLoading}
                    onSave={async (data) => {
                      setExLoading(true);
                      try {
                        const res = await fetch(`/api/trainer/plans/${plan.id}/exercises`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(data),
                        });
                        if (!res.ok) throw new Error("Failed");
                        setAddingExerciseToPlan(null);
                        refresh();
                      } finally {
                        setExLoading(false);
                      }
                    }}
                    onCancel={() => setAddingExerciseToPlan(null)}
                  />
                ) : (
                  <button
                    onClick={() => setAddingExerciseToPlan(plan.id)}
                    className="w-full py-2 rounded-xl border border-dashed border-gray-200 text-xs text-gray-400 hover:border-violet-300 hover:text-violet-600 transition-colors"
                  >
                    + Add exercise
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}

// ─── Add exercise form ─────────────────────────────────────────────────────────

function AddExerciseForm({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  planId: _planId,
  loading,
  onSave,
  onCancel,
}: {
  planId: string;
  loading: boolean;
  onSave: (data: { name: string; targetSets: number; targetReps: string; targetWeight: number | null }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [sets, setSets] = useState("3");
  const [reps, setReps] = useState("10");
  const [weight, setWeight] = useState("");

  return (
    <div className="bg-violet-50 rounded-xl p-3 space-y-2 border border-violet-100">
      <p className="text-xs font-semibold text-violet-700">New exercise</p>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Exercise name (e.g. Bench Press)"
        className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
      />
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-xs text-gray-500">Sets</label>
          <input
            type="number" min={1} value={sets}
            onChange={(e) => setSets(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">Reps</label>
          <input
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            placeholder="10 or 8-12"
            className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">kg (opt.)</label>
          <input
            type="number" min={0} step={0.5} value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="—"
            className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onSave({
            name: name.trim(),
            targetSets: Number(sets) || 3,
            targetReps: reps || "10",
            targetWeight: weight ? Number(weight) : null,
          })}
          disabled={loading || !name.trim()}
          className="flex-1 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 disabled:opacity-50"
        >
          {loading ? "Adding…" : "Add exercise"}
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-500 bg-white"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Exercise row ──────────────────────────────────────────────────────────────

function ExerciseRow({
  exercise, index, onSave, onDelete,
}: {
  exercise: Exercise;
  index: number;
  onSave: (data: Partial<Exercise>) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(exercise.name);
  const [sets, setSets] = useState(String(exercise.targetSets));
  const [reps, setReps] = useState(exercise.targetReps);
  const [weight, setWeight] = useState(exercise.targetWeight != null ? String(exercise.targetWeight) : "");

  if (!editing) {
    return (
      <div className="flex items-center justify-between gap-2 py-2 border-b border-gray-50 last:border-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs text-gray-300 font-mono w-4 flex-shrink-0">{index + 1}</span>
          <span className="text-sm font-medium text-gray-900 truncate">{exercise.name}</span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-xs text-gray-400">
            {exercise.targetSets}×{exercise.targetReps}
            {exercise.targetWeight ? ` @ ${exercise.targetWeight}kg` : ""}
          </span>
          <button onClick={() => setEditing(true)} className="text-xs text-violet-500 hover:underline">Edit</button>
          <button onClick={onDelete} className="text-xs text-red-400 hover:text-red-600">✕</button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-xl p-3 space-y-2">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Exercise name"
        className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
      />
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-xs text-gray-400">Sets</label>
          <input
            type="number" min={1} value={sets}
            onChange={(e) => setSets(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400">Reps</label>
          <input
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            placeholder="10 or 8-12"
            className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400">kg (opt.)</label>
          <input
            type="number" min={0} step={0.5} value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="—"
            className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => {
            onSave({
              name: name.trim() || exercise.name,
              targetSets: Number(sets) || exercise.targetSets,
              targetReps: reps || exercise.targetReps,
              targetWeight: weight ? Number(weight) : null,
            });
            setEditing(false);
          }}
          className="flex-1 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700"
        >
          Save
        </button>
        <button
          onClick={() => setEditing(false)}
          className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-500"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
