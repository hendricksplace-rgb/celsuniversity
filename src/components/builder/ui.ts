// Shared classes for the course builder (admin pages use the light app style).
const focus = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D6006A]";

export const btn = {
  primary: `inline-flex items-center justify-center gap-1.5 rounded-full bg-[#D6006A] px-4 py-2 text-sm font-extrabold text-white transition hover:bg-[#B0005A] disabled:opacity-50 ${focus}`,
  ghost: `inline-flex items-center justify-center gap-1.5 rounded-full border border-[#E3DDEA] bg-white px-3.5 py-2 text-sm font-bold text-[#1B1830] transition hover:bg-[#F7F5FA] disabled:opacity-50 ${focus}`,
  small: `inline-flex items-center justify-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-[#4A4766] transition hover:bg-[#F1EDF5] disabled:opacity-50 ${focus}`,
  danger: `inline-flex items-center justify-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-[#B42318] transition hover:bg-[#FDECEA] disabled:opacity-50 ${focus}`,
};

export const input = `min-w-0 rounded-xl border border-[#E3DDEA] bg-white px-3 py-2 text-sm text-[#1B1830] placeholder:text-[#8A86A0] ${focus}`;
export const label = "block text-xs font-extrabold uppercase tracking-wider text-[#5E5A73]";
export { focus };
