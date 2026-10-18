"use client";

import { signOut } from "@/lib/actions";
import { wipeOffline } from "@/lib/offline";

/** Downloaded books carry the student's own answers: clear them from this device before signing out. */
export function SignOutButton({ label, className = "rounded-lg px-2 py-1.5 text-white/70 hover:bg-white/10" }: { label: string; className?: string }) {
  return (
    <form
      action={async () => {
        await wipeOffline().catch(() => undefined);
        await signOut();
      }}
    >
      <button className={className}>{label}</button>
    </form>
  );
}
