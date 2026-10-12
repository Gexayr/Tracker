import { useCallback, useEffect, useRef, useState } from 'react';

const EDGE = 56; // px from the scroller edge where auto-scroll kicks in
const MAX_SPEED = 14; // px per frame

/**
 * Pointer-events based vertical drag-to-reorder (mouse, touch and pen) with a
 * keyboard fallback on the handle (ArrowUp / ArrowDown).
 *
 * - `ids`: item ids in display order.
 * - `onMove(id, toIndex)`: commit a move.
 * - `getScroller()`: optional scroll container (defaults to the window).
 *
 * The dragged item follows the pointer through a direct DOM transform (no
 * re-render per pointermove); React state only changes when the drop slot
 * changes, which shifts the other items out of the way.
 */
export function useReorder({ ids, onMove, getScroller, onAnnounce }) {
  const els = useRef(new Map());
  const drag = useRef(null);
  const [state, setState] = useState(null); // { id, from, over, shift }
  const idsRef = useRef(ids);
  const onMoveRef = useRef(onMove);
  idsRef.current = ids;
  onMoveRef.current = onMove;

  const itemRef = useCallback((id) => (el) => {
    if (el) els.current.set(id, el);
    else els.current.delete(id);
  }, []);

  const scrollPos = (sc) => (sc ? sc.scrollTop : window.scrollY || window.pageYOffset || 0);

  const update = useCallback(() => {
    const d = drag.current;
    if (!d) return;
    const dy = d.y - d.startY + (scrollPos(d.scroller) - d.scroll0);
    const el = els.current.get(d.id);
    if (el) el.style.transform = `translate3d(0, ${dy}px, 0)`;
    const me = d.rects[d.from];
    const center = me.top + me.height / 2 + dy;
    let over = 0;
    d.rects.forEach((r, i) => {
      if (i !== d.from && r && r.top + r.height / 2 < center) over++;
    });
    if (over !== d.over) {
      d.over = over;
      setState((s) => (s ? { ...s, over } : s));
    }
  }, []);

  const tick = useCallback(() => {
    const d = drag.current;
    if (!d) return;
    const sc = d.scroller;
    const top = sc ? sc.getBoundingClientRect().top : 0;
    const bottom = sc ? sc.getBoundingClientRect().bottom : window.innerHeight;
    let v = 0;
    if (d.y < top + EDGE) v = -MAX_SPEED * Math.min(1, (top + EDGE - d.y) / EDGE);
    else if (d.y > bottom - EDGE) v = MAX_SPEED * Math.min(1, (d.y - (bottom - EDGE)) / EDGE);
    if (v) {
      if (sc) sc.scrollTop += v;
      else window.scrollBy(0, v);
      update();
    }
    d.raf = requestAnimationFrame(tick);
  }, [update]);

  const finish = useCallback((commit) => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    cancelAnimationFrame(d.raf);
    const el = els.current.get(d.id);
    if (el) el.style.transform = '';
    setState(null);
    document.body.classList.remove('is-reordering');
    if (commit && d.over !== d.from) onMoveRef.current(d.id, d.over);
  }, []);

  useEffect(() => () => finish(false), [finish]);

  const handleProps = (id, label) => ({
    'data-drag-handle': String(id),
    'aria-label': label,
    onPointerDown: (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const list = idsRef.current;
      const from = list.indexOf(id);
      if (from < 0 || list.length < 2) return;
      e.preventDefault();
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch (_) {
        /* ignore */
      }
      const scroller = (getScroller && getScroller()) || null;
      const rects = list.map((i) => els.current.get(i)?.getBoundingClientRect() || null);
      if (!rects[from]) return;
      const next = rects[from + 1] || null;
      const prev = rects[from - 1] || null;
      const shift = next ? next.top - rects[from].top : prev ? rects[from].top - prev.top : rects[from].height;
      drag.current = {
        id,
        from,
        over: from,
        startY: e.clientY,
        y: e.clientY,
        rects,
        scroller,
        scroll0: scrollPos(scroller),
        raf: 0,
      };
      document.body.classList.add('is-reordering');
      setState({ id, from, over: from, shift });
      drag.current.raf = requestAnimationFrame(tick);
    },
    onPointerMove: (e) => {
      const d = drag.current;
      if (!d || d.id !== id) return;
      d.y = e.clientY;
      update();
    },
    onPointerUp: () => finish(true),
    onPointerCancel: () => finish(false),
    onLostPointerCapture: () => finish(true),
    onKeyDown: (e) => {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      e.preventDefault();
      const list = idsRef.current;
      const from = list.indexOf(id);
      const to = from + (e.key === 'ArrowUp' ? -1 : 1);
      if (from < 0 || to < 0 || to >= list.length) return;
      onMoveRef.current(id, to);
      onAnnounce?.(id, to);
      requestAnimationFrame(() => {
        document.querySelector(`[data-drag-handle="${CSS.escape(String(id))}"]`)?.focus();
      });
    },
  });

  /** Style/class for an item while a drag is in progress. */
  const itemProps = (id) => {
    const s = state;
    if (!s) return { className: '', style: undefined };
    if (id === s.id) return { className: 'is-dragging', style: undefined };
    const idx = idsRef.current.indexOf(id);
    let y = 0;
    if (s.from < s.over && idx > s.from && idx <= s.over) y = -s.shift;
    else if (s.from > s.over && idx >= s.over && idx < s.from) y = s.shift;
    return {
      className: 'is-drag-sibling',
      style: { transform: y ? `translate3d(0, ${y}px, 0)` : undefined },
    };
  };

  return { itemRef, handleProps, itemProps, dragging: !!state };
}
