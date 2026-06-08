import { createServerClient } from "@/lib/supabase";
import { LandingPage } from "./landing";

export default async function RootPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return <LandingPage loggedIn={!!user} />;
}
