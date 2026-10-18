"use client";

// A reorderable list for the course builder. Drag an item by its handle (mouse, touch or pen), or focus
// the handle and use ↑/↓: the new order is saved when the drag ends (onReorder gets the ids in order).
import { useEffect, useRef, useState } from "react";

type Props<T> = {
  items: T[];
  getId: (item: T) => string;
  getLabel: (item: T) => string;
  onReorder: (ids: string[]) => void;
  render: (item: T, handle: React.ReactNode) => React.ReactNode;
  className?: string;
};

export function Sortable<T>({ items, getId, getLabel, onReorder, render, className }: Props<T>) {
  const [order, setOrder] = useState(() => items.map(getId));
  const [dragging, setDragging] = useState<string | null>(null);
  const [announce, setAnnounce] = useState("");
  const listRef = useRef<HTMLUListElement>(null);
  const orderRef = useRef(order);
  orderRef.current = order;

  // New items from the server (added, deleted, saved elsewhere) replace the local order.
  const key = items.map(getId).join(",");
  useEffect(() => setOrder(key ? key.split(",") : []), [key]);

  const byId = new Map(items.map((i) => [getId(i), i]));
  const commit = (next: string[]) => {
    if (next.join(",") !== key) onReorder(next);
  };

  const move = (id: string, delta: number) => {
    const cur = orderRef.current;
    const from = cur.indexOf(id);
    const to = Math.max(0, Math.min(cur.length - 1, from + delta));
    if (from === to) return;
    const next = [...cur];
    next.splice(to, 0, ...next.splice(from, 1));
    setOrder(next);
    setAnnounce(`${getLabel(byId.get(id)!)}: posición ${to + 1} de ${next.length}`);
    commit(next);
  };

  const onPointerDown = (id: string) => (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    setDragging(id);
    // Listen on the window: React moves the row (and its handle) in the DOM while dragging, which
    // would drop pointer capture on the handle.
    const onMove = (ev: PointerEvent) => {
      const list = listRef.current;
      if (!list) return;
      const rows = [...list.children] as HTMLElement[];
      const cur = orderRef.current;
      // The new slot: how many of the other rows have their middle above the pointer.
      const to = rows.filter((row, i) => {
        if (cur[i] === id) return false;
        const r = row.getBoundingClientRect();
        return ev.clientY > r.top + r.height / 2;
      }).length;
      if (to !== cur.indexOf(id)) {
        const next = cur.filter((x) => x !== id);
        next.splice(to, 0, id);
        orderRef.current = next;
        setOrder(next);
      }
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      setDragging(null);
      commit(orderRef.current);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  return (
    <>
      <ul ref={listRef} className={className}>
        {order.map((id) => {
          const item = byId.get(id);
          if (!item) return null;
          const handle = (
            <button
              type="button"
              aria-label={`Mover: ${getLabel(item)}`}
              aria-describedby="sortable-help"
              title="Arrastra o usa ↑ ↓"
              onPointerDown={onPointerDown(id)}
              onKeyDown={(e) => {
                if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                  e.preventDefault();
                  move(id, e.key === "ArrowUp" ? -1 : 1);
                  // Keep focus on the handle after React moves the row.
                  const target = e.currentTarget;
                  requestAnimationFrame(() => target.focus());
                }
              }}
              className="grid size-9 shrink-0 cursor-grab touch-none place-items-center rounded-lg text-lg text-[#6B6680] hover:bg-[#F1EDF5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D6006A] active:cursor-grabbing"
            >
              <span aria-hidden>⠿</span>
            </button>
          );
          return (
            <li key={id} className={dragging === id ? "relative z-10 opacity-80 shadow-lg" : undefined}>
              {render(item, handle)}
            </li>
          );
        })}
      </ul>
      <p id="sortable-help" className="sr-only">
        Usa las flechas arriba y abajo para cambiar el orden.
      </p>
      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>
    </>
  );
}
