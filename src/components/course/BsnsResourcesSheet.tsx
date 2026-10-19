"use client";
// "Recursos del curso" on the CelsBSNS week page: a modal on desktop, a bottom sheet on phone (native <dialog>,
// so focus, Escape and the backdrop come from the browser). The rows are rendered on the server and passed in.
import { useRef } from "react";
import s from "./bsns-week.module.css";

export function ResourcesSheet({
  open,
  title,
  close,
  icon,
  children,
}: {
  open: string;
  title: string;
  close: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" className={`${s.btn} ${s.btnS} ${s.resBtn}`} onClick={() => ref.current?.showModal()} aria-haspopup="dialog">
        {icon}
        {open}
      </button>
      <dialog
        ref={ref}
        className={s.sheet}
        aria-labelledby="bw-sheet-title"
        onClick={(e) => {
          if (e.target === e.currentTarget) ref.current?.close();
        }}
      >
        <div className={s.sheetIn}>
          <div className={s.sheetHead}>
            <h2 id="bw-sheet-title">{title}</h2>
            <button type="button" className={s.sheetClose} onClick={() => ref.current?.close()} aria-label={close}>
              <svg viewBox="0 0 24 24" aria-hidden="true" className={s.i}>
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          <div className={s.res}>{children}</div>
        </div>
      </dialog>
    </>
  );
}
