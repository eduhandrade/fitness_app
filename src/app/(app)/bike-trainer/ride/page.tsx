import { RideSession } from "@/components/bike-trainer/ride-session";

export default function BikeTrainerRidePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Bike Trainer</h1>
      <RideSession />
    </div>
  );
}
