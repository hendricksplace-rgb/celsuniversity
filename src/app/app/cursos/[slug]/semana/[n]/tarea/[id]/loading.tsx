import s from "@/components/bsns/shell.module.css";
import k from "@/components/bsns/skeleton.module.css";

// CelsBSNS tasks: the skeleton uses the same full-width frame as the interactive pages (top bar, hero, rail), so the
// page does not jump when it streams in (the generic /app skeleton keeps the app bar, which these pages hide).
export default function Loading() {
  return (
    <div className={s.page} role="status" aria-live="polite">
      <span className={s.sr}>Cargando…</span>
      <div className={s.sticky} aria-hidden>
        <div className={s.bar}>
          <div className={s.barIn}>
            <span className={`${s.backBtn} ${k.pulse}`} />
            <span className={s.barTitle}>
              <span className={`${k.line} ${k.pulse}`} style={{ width: 110 }} />
              <span className={`${k.line} ${k.pulse}`} style={{ width: 220, height: 16, marginTop: 6 }} />
            </span>
          </div>
          <div className={s.progress} />
        </div>
        <div className={s.stepRow}>
          <span className={`${k.line} ${k.pulse}`} style={{ width: 170 }} />
        </div>
      </div>
      <div className={s.layout} aria-hidden>
        <div className={s.main}>
          <div className={`${s.hero} ${k.hero}`} />
          <div className={`${s.card} ${k.block} ${k.pulse}`} />
        </div>
        <div className={s.rail}>
          <div className={`${s.railCard} ${k.rail} ${k.pulse}`} />
        </div>
      </div>
    </div>
  );
}
