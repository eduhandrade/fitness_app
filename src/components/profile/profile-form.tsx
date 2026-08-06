"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { DateSelectField } from "@/components/ui/date-select-field";
import { updateProfile, type ProfileState } from "@/app/(app)/profile/actions";

const initialState: ProfileState = {};
const CURRENT_YEAR = new Date().getUTCFullYear();

export function ProfileForm({
  heightCm,
  dateOfBirth,
  sex,
}: {
  heightCm?: number | null;
  dateOfBirth?: string | null;
  sex?: string | null;
}) {
  const [state, formAction, pending] = useActionState(updateProfile, initialState);

  return (
    <form action={formAction} className="space-y-3">
      {/* Each field on its own full-width row — a shared 2-column grid isn't
          reliably safe for a <select> with long option text ("Prefer not to
          say" gets clipped at half width). */}
      <div className="space-y-1.5">
        <label htmlFor="heightCm" className="text-xs font-medium text-foreground-muted">
          Height (cm)
        </label>
        <input
          id="heightCm"
          name="heightCm"
          type="number"
          step="0.1"
          defaultValue={heightCm ?? undefined}
          className="w-full rounded-xl border border-border bg-surface-hover px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </div>

      <div className="space-y-1.5">
        <span className="text-xs font-medium text-foreground-muted">Date of birth</span>
        <DateSelectField
          id="dateOfBirth"
          name="dateOfBirth"
          defaultValue={dateOfBirth}
          minYear={CURRENT_YEAR - 100}
          maxYear={CURRENT_YEAR}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="sex" className="text-xs font-medium text-foreground-muted">
          Sex
        </label>
        <select
          id="sex"
          name="sex"
          defaultValue={sex ?? ""}
          className="w-full rounded-xl border border-border bg-surface-hover px-3 py-2 text-sm outline-none focus:border-primary"
        >
          <option value="">Prefer not to say</option>
          <option value="MALE">Male</option>
          <option value="FEMALE">Female</option>
          <option value="OTHER">Other</option>
        </select>
      </div>

      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      {state.success && <p className="text-sm text-primary-strong">Saved.</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}
