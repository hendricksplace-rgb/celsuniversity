// Server side of <InstallCard>: reads the "Ahora no" cookie so the card is in the first HTML or not at all.
import { cookies } from "next/headers";
import { InstallCard } from "./InstallApp";
import { DISMISS_KEY } from "./keys";

export async function InstallCardSlot() {
  const dismissed = (await cookies()).has(DISMISS_KEY);
  return <InstallCard dismissed={dismissed} />;
}
