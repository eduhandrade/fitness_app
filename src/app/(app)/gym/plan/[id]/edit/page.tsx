import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { PlanBuilder } from "@/components/gym/plan-builder";

export default async function EditGymPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const userId = await requireUserId();
  const { id } = await params;

  const plan = await prisma.gymPlan.findFirst({
    where: { id, userId },
    include: {
      days: {
        orderBy: { order: "asc" },
        include: { exercises: { orderBy: { order: "asc" } } },
      },
    },
  });

  if (!plan) notFound();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Edit workout plan</h1>
      <PlanBuilder
        initialPlan={{
          id: plan.id,
          name: plan.name,
          days: plan.days.map((d) => ({
            id: d.id,
            name: d.name,
            exercises: d.exercises.map((e) => ({
              id: e.id,
              name: e.name,
              targetSets: e.targetSets,
              targetReps: e.targetReps,
              targetWeightKg: e.targetWeightKg,
            })),
          })),
        }}
      />
    </div>
  );
}
