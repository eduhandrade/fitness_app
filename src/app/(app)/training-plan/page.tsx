import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { daysAgo } from "@/lib/date";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlanWizard } from "@/components/training/plan-wizard";
import { PlanScheduleView } from "@/components/training/plan-schedule-view";
import { DeleteTrainingPlanButton } from "@/components/training/delete-plan-button";

const LEVEL_LABEL: Record<string, string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
  PROFESSIONAL: "Professional",
};

export default async function TrainingPlanPage() {
  const userId = await requireUserId();

  const plan = await prisma.trainingPlan.findFirst({
    where: { userId, status: "ACTIVE" },
    include: {
      weeks: {
        orderBy: { weekNumber: "asc" },
        include: { sessions: { orderBy: { date: "asc" } } },
      },
    },
  });

  const now = daysAgo(0);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Training</h1>

      {!plan ? (
        <Card>
          <CardHeader>
            <CardTitle>Build your plan</CardTitle>
          </CardHeader>
          <CardContent>
            <PlanWizard />
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle>{plan.name}</CardTitle>
                <DeleteTrainingPlanButton planId={plan.id} planName={plan.name} />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground">
                {LEVEL_LABEL[plan.level]} · {plan.daysPerWeek} days/week ·{" "}
                {plan.minutesPerDay} min/day
              </p>
              {plan.raceDate && (
                <p className="mt-1 text-xs text-foreground-muted">
                  Race day: {plan.raceDate.toISOString().slice(0, 10)}
                </p>
              )}
            </CardContent>
          </Card>

          <PlanScheduleView
            weeks={plan.weeks.map((week) => {
              const weekEnd = new Date(week.startDate.getTime() + 7 * 86_400_000);
              return {
                id: week.id,
                weekNumber: week.weekNumber,
                phase: week.phase,
                startDate: week.startDate,
                targetVolumeMin: week.targetVolumeMin,
                isCurrent: now >= week.startDate && now < weekEnd,
                sessions: week.sessions.map((s) => ({
                  id: s.id,
                  date: s.date,
                  weekStartDate: week.startDate,
                  sport: s.sport,
                  sessionType: s.sessionType,
                  durationMin: s.durationMin,
                  targetIntensity: s.targetIntensity,
                  description: s.description,
                  completed: s.completed,
                })),
              };
            })}
          />

          <Card>
            <details>
              <summary className="cursor-pointer list-none">
                <CardHeader>
                  <CardTitle>Start a new plan</CardTitle>
                </CardHeader>
              </summary>
              <CardContent>
                <PlanWizard />
              </CardContent>
            </details>
          </Card>
        </>
      )}
    </div>
  );
}
