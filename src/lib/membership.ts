/**
 * Membership display labels are configurable (Admin Console → Membership names),
 * stored in rule_config under `membership_labels`. The underlying enum values
 * (`basic` / `elite` / `privilege`) stay stable — only the shown name changes,
 * so renaming Basic→Silver doesn't touch any data.
 */
export type MembershipLabels = Record<string, string>;

export const DEFAULT_MEMBERSHIP_LABELS: MembershipLabels = {
  basic: "Basic",
  elite: "Elite",
  privilege: "Privilege",
};

export function membershipLabel(
  type: string,
  labels?: MembershipLabels | null,
): string {
  return (
    labels?.[type] ??
    DEFAULT_MEMBERSHIP_LABELS[type] ??
    type.charAt(0).toUpperCase() + type.slice(1)
  );
}
