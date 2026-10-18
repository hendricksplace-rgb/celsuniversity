"use client";

import { useEffect } from "react";
import { callEvaluation } from "./api";
import type { EvalT } from "./Questions";

export function Unsubscribe({ token, t }: { token: string; t: EvalT }) {
  useEffect(() => {
    if (token) void callEvaluation({ action: "unsubscribe", t: token }).catch(() => undefined);
  }, [token]);
  return (
    <div className="mx-auto max-w-md pt-16 text-center">
      <div className="text-5xl">💌</div>
      <h1 className="mt-3 text-2xl font-extrabold text-white">{t.unsubTitle}</h1>
      <p className="mt-2 text-sm text-[#A9A4C0]">{t.unsubSub}</p>
    </div>
  );
}
