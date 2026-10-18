import { AcceptInvite } from "./AcceptInvite";

export const metadata = { title: "Aceptar invitación · CelsU" };

/** Where the "Invite user" email lands: the invited person sets a password and goes to /admin. */
export default function AceptarPage() {
  return (
    <div className="grid min-h-screen place-items-center bg-[#F7F5FA] px-4 text-[#1B1830]">
      <AcceptInvite />
    </div>
  );
}
