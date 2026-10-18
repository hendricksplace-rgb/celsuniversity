import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Welcome } from "@/components/shop/Welcome";

type Props = { searchParams: Promise<{ session_id?: string }> };
export const metadata = { title: "Bienvenida · CelsU" };

/** Stripe's success_url. The page itself waits for the webhook before saying anything is active. */
export default async function Bienvenida({ searchParams }: Props) {
  const { session_id } = await searchParams;
  if (!session_id || !/^cs_[A-Za-z0-9_]+$/.test(session_id)) redirect("/app");
  const {
    data: { user },
  } = await (await createClient()).auth.getUser();
  return (
    <div className="mx-auto max-w-xl">
      <Welcome sessionId={session_id} signedIn={!!user} />
    </div>
  );
}
