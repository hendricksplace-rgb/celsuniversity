// C-030: a CelsUS CelsBook cover as a real book (celsus-celsbooks-portadas-mockup.html). The cover image is shown
// whole, at its own letter proportion, never cropped or retouched: only a spine strip, a page edge and a shadow
// are added around it, plus a sheen that crosses it on hover.
import "./covers.css";

export function CoverBook({ src, alt, ribbon, eager, className }: { src: string; alt: string; ribbon?: boolean; eager?: boolean; className?: string }) {
  return (
    <div className={`cbk ${className ?? ""}`}>
      <div className="cv">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} width={1400} height={1812} loading={eager ? "eager" : "lazy"} decoding="async" />
      </div>
      <div className="pg" aria-hidden />
      <div className="sh" aria-hidden />
      {ribbon && (
        <span className="ribbon" aria-hidden>
          ✓
        </span>
      )}
    </div>
  );
}
