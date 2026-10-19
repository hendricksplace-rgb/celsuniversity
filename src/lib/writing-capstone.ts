// Which Capstone field "Agregar a mi Capstone" on a Writing page fills: the part's first field that fills from
// Writing (part 1: "bg", part 3: "leader_msg", part 4: "jobs"…); "bg" when the part has none.
import { CAPSTONE_PARTS } from "@/lib/capstone";

export const writingFieldKey = (part: number) => CAPSTONE_PARTS.find((c) => c.part === part)?.fields.find((f) => f.fill_from === "writing")?.k ?? "bg";
