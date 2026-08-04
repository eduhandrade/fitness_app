import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { formatUtcDate } from "@/lib/date";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExerciseProgressPicker } from "@/components/gym/exercise-progress-picker";
import { GymPlanActions } from "@/components/gym/gym-plan-actions";
import { DeletePlanButton } from "@/components/gym/delete-plan-button";
import { PencilIcon } from "@/components/icons";
import { classifyExercise } from "@/lib/gym/muscle-groups";
import type { TrendPoint } from "@/components/charts/trend-line-chart";

export default async function GymPage() {
  const userId = await requireUserId();

  const [plans, exerciseLogs] = await Promise.all([
    prisma.gymPlan.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        days: {
          orderBy: { order: "asc" },
          include: { exercises: { orderBy: { order: "asc" } } },
        },
      },
    }),
    prisma.exerciseLog.findMany({
      where: { exercise: { day: { plan: { userId } } } },
      include: { exercise: { select: { name: true } }, activity: { select: { startDate: true } } },
      orderBy: { activity: { startDate: "asc" } },
    }),
  ]);

  const activePlan = plans.find((p) => p.isActive) ?? plans[0];
  const otherPlans = plans.filter((p) => p.id !== activePlan?.id);

  const topSetByExerciseAndSession = new Map<string, Map<string, { date: Date; weight: number }>>();
  for (const log of exerciseLogs) {
    const name = log.exercise.name;
    const sessionKey = `${log.activityId}`;
    if (!topSetByExerciseAndSession.has(name)) {
      topSetByExerciseAndSession.set(name, new Map());
    }
    const sessions = topSetByExerciseAndSession.get(name)!;
    const existing = sessions.get(sessionKey);
    if (!existing || log.weightKg > existing.weight) {
      sessions.set(sessionKey, { date: log.activity.startDate, weight: log.weightKg });
    }
  }

  const series: Record<string, TrendPoint[]> = {};
  for (const [name, sessions] of topSetByExerciseAndSession) {
    series[name] = [...sessions.values()]
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map((s) => ({ x: formatUtcDate(s.date), y: s.weight }));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Gym</h1>
        <Link href="/gym/plan/new">
          <Button variant="secondary">New plan</Button>
        </Link>
      </div>

      {!activePlan ? (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <p className="text-sm text-foreground-muted">
              You don&apos;t have a workout plan yet.
            </p>
            <Link href="/gym/plan/new">
              <Button>Create your first plan</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>{activePlan.name}</CardTitle>
              <div className="flex items-center gap-1">
                <Link
                  href={`/gym/plan/${activePlan.id}/edit`}
                  aria-label="Edit plan"
                  className="flex h-7 w-7 items-center justify-center rounded-full text-foreground-muted hover:bg-surface-hover hover:text-primary-strong"
                >
                  <PencilIcon className="h-4 w-4" />
                </Link>
                <DeletePlanButton planId={activePlan.id} planName={activePlan.name} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {activePlan.days.map((day) => (
              <div key={day.id} className="rounded-2xl border border-border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{day.name}</p>
                  <Link href={`/gym/log/${day.id}`}>
                    <Button className="px-3 py-1.5 text-xs">Log session</Button>
                  </Link>
                </div>
                <ul className="space-y-1">
                  {day.exercises.map((ex) => {
                    const classification = classifyExercise(ex.name);
                    return (
                      <li key={ex.id} className="text-xs text-foreground-muted">
                        {ex.name} — {ex.targetSets}×{ex.targetReps}
                        {ex.targetWeightKg ? ` @ ${ex.targetWeightKg}kg` : ""}
                        {classification && (
                          <span className="ml-1.5 text-primary-strong">
                            · {classification.label}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {otherPlans.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Other plans</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {otherPlans.map((plan) => (
              <GymPlanActions key={plan.id} planId={plan.id} planName={plan.name} />
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Exercise progress</CardTitle>
        </CardHeader>
        <CardContent>
          <ExerciseProgressPicker series={series} />
        </CardContent>
      </Card>
    </div>
  );
}
