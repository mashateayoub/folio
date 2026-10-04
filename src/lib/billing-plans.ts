export const billingPlans = {
  free: { name: "Free", projects: 40, seats: 5, compiles: 1_000 },
  team: { name: "Team", projects: 100, seats: 100, compiles: 20_000 },
} as const;

export type PlanId = keyof typeof billingPlans;

export function effectivePlan(
  plan: PlanId,
  validUntil: Date | null,
  now = Date.now(),
): PlanId {
  return plan === "team" && validUntil !== null && validUntil.getTime() > now
    ? "team"
    : "free";
}
