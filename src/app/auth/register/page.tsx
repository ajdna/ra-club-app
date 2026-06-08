import { createClient } from "@/lib/supabase/server";
import { RegisterForm } from "./RegisterForm";

/**
 * Server component — fetches active coaches (via anon-accessible RPC) and
 * passes them to the client RegisterForm so the dropdown is SSR'd.
 */
export default async function RegisterPage() {
  const supabase = await createClient();

  const { data: coaches } = await supabase.rpc("get_coaches_for_registration");

  const coachList = (coaches ?? []) as {
    id: string;
    name: string;
    role: string;
  }[];

  return <RegisterForm coaches={coachList} />;
}
