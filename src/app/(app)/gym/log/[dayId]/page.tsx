import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { SessionLogForm } from "@/components/gym/session-log-form";

export default async function LogGymSessionPage({
  params,
}: {
  params: Promise<{ dayId: string }>;
}) {
  const userId = await requireUserId();
  const { dayId } = await params;

  const day = await prisma.gymPlanDay.findFirst({
    where: { id: dayId, plan: { userId } },
    include: { exercises: { orderBy: { order: "asc" } } },
  });

  if (!day) notFound();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Log: {day.name}</h1>
      <SessionLogForm
        dayId={day.id}
        exercises={day.exercises.map((ex) => ({
          id: ex.id,
          name: ex.name,
          targetSets: ex.targetSets,
          targetReps: ex.targetReps,
          targetWeightKg: ex.targetWeightKg,
        }))}
      />
    </div>
  );
}
