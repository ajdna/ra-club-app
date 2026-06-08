import Link from "next/link";
import { getConfigMap } from "@/modules/rules-engine";
import { membershipLabel, type MembershipLabels } from "@/lib/membership";
import { AddMemberForm, type MembershipOption } from "./AddMemberForm";

export const dynamic = "force-dynamic";

export default async function AddPage() {
  const cfg = await getConfigMap(["membership_labels", "pricing"]);
  const labels = (cfg.membership_labels as MembershipLabels) ?? {};
  const pricing = (cfg.pricing as Record<string, number>) ?? {};

  const options: MembershipOption[] = ["basic", "elite", "privilege"].map(
    (type) => {
      const name = membershipLabel(type, labels);
      const price = pricing[type];
      return {
        value: type,
        label: price ? `${name} (₹${price.toLocaleString("en-IN")})` : name,
      };
    },
  );

  return (
    <main className="px-4 pb-8 pt-5">
      <Link href="/members" className="text-sm font-semibold text-sage-d">
        ← Members
      </Link>
      <h1 className="font-display mt-3 text-2xl font-semibold text-emerald">
        Naya member add karein
      </h1>
      <p className="mt-1 text-sm text-ink/60">
        Yeh member aapki downline mein add hoga (aap unke coach).
      </p>

      <AddMemberForm options={options} />
    </main>
  );
}
