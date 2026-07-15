import { PlanBuilder } from "@/components/gym/plan-builder";

export default function NewGymPlanPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">New workout plan</h1>
      <PlanBuilder />
    </div>
  );
}
