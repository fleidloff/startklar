import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { AE, AR, AT, AU, BR, CA, CH, CN, DE, EG, ES, FR, GB, IN, IS, IT, JP, KE, MX, NO, TH, TR, US, ZA } from "country-flag-icons/react/3x2";
import { COUNTRIES, type CountryCode } from "@/game/data";
import { sfx } from "@/game/sound";
import { Icon } from "./icons";

const FLAGS: Record<CountryCode, typeof DE> = { AE, AR, AT, AU, BR, CA, CH, CN, DE, EG, ES, FR, GB, IN, IS, IT, JP, KE, MX, NO, TH, TR, US, ZA };

// Not a native popover: the top layer would escape the scaled .stage.
export function Flag({ code, height = 26 }: { code: CountryCode; height?: number }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const F = FLAGS[code];
  const country = COUNTRIES[code];
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open]);
  return (
    <span className="flag-wrap" ref={ref}>
      <button
        type="button"
        className="flag-btn"
        aria-label={`Flagge von ${country.name}`}
        aria-expanded={open}
        onClick={() => {
          if (!open) sfx.click();
          setOpen(!open);
        }}
      >
        <span className="flag" style={{ height, width: height * 1.5 }}>
          <F />
        </span>
      </button>
      {open && (
        <span className="flag-bubble" role="note" style={{ "--tail": `${height * 0.75 + 10}px` } as CSSProperties}>
          <b>{country.name}</b>
          <span>
            {country.name} liegt in {country.continent}.
          </span>
          <span>
            Dort leben etwa <span className="nowrap">{country.people}</span> Menschen.
          </span>
        </span>
      )}
    </span>
  );
}

interface RoundButtonProps {
  icon: string;
  label: string;
  color: string;
  onClick: () => void;
  active?: boolean;
  dim?: boolean;
  badge?: number | string;
  size?: number;
  pulse?: boolean;
}

export function RoundButton({ icon, label, color, onClick, active, dim, badge, size = 92, pulse }: RoundButtonProps) {
  return (
    <button
      type="button"
      className={`round-btn${active ? " active" : ""}${dim ? " dim" : ""}${pulse ? " pulse" : ""}`}
      style={{ width: size, height: size, background: color }}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      <Icon name={icon} size={size * 0.62} />
      {badge !== undefined && badge !== 0 && <span className="badge">{badge}</span>}
    </button>
  );
}

export function Banner({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <div className="banner" role="status" aria-live="polite">
      <div className="banner-left">{left}</div>
      <div className="banner-divider" />
      <div className="banner-right">{right}</div>
    </div>
  );
}

export function Modal({ children, onClose, label, wide }: { children: ReactNode; onClose?: () => void; label: string; wide?: boolean }) {
  useEffect(() => {
    if (!onClose) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className={`modal${wide ? " wide" : ""}`} role="dialog" aria-modal="true" aria-label={label} onClick={(e) => e.stopPropagation()}>
        {onClose && (
          <button type="button" className="modal-close" onClick={onClose} aria-label="Schließen">
            <Icon name="close" size={30} />
          </button>
        )}
        {children}
      </div>
    </div>
  );
}

export function BigButton({ children, onClick, color = "#4cbb6c", icon, autoFocus }: { children: ReactNode; onClick: () => void; color?: string; icon?: string; autoFocus?: boolean }) {
  return (
    <button type="button" className="big-btn" style={{ background: color }} onClick={onClick} autoFocus={autoFocus}>
      {icon && <Icon name={icon} size={40} />}
      <span>{children}</span>
    </button>
  );
}

export function Stars() {
  return (
    <svg className="stars" viewBox="0 0 200 120" aria-hidden="true">
      {[[30, 40, 14, "#ffd23a"], [100, 26, 22, "#f39a35"], [170, 44, 14, "#ffd23a"], [60, 92, 9, "#ef6fae"], [146, 96, 9, "#3aa3e8"]].map(([x, y, r, c], i) => (
        <path key={i} className="star" style={{ animationDelay: `${i * 0.08}s` }} d={star(x as number, y as number, r as number)} fill={c as string} stroke="#26303f" strokeWidth={3} strokeLinejoin="round" />
      ))}
    </svg>
  );
}

function star(cx: number, cy: number, r: number) {
  return [...Array(10).keys()]
    .map((i) => {
      const a = (Math.PI / 5) * i - Math.PI / 2;
      const rr = i % 2 ? r * 0.48 : r;
      return `${i ? "L" : "M"}${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`;
    })
    .join(" ") + "Z";
}

const FLAKES = [...Array(40).keys()].map((i) => ({ left: (i * 37) % 100, delay: (i * 0.71) % 8, size: 6 + ((i * 7) % 8), dur: 7 + ((i * 3) % 6) }));

export function Snowfall() {
  return (
    <div className="snowfall" aria-hidden="true">
      {FLAKES.map((f, i) => (
        <span key={i} style={{ left: `${f.left}%`, width: f.size, height: f.size, animationDelay: `${f.delay}s`, animationDuration: `${f.dur}s` }} />
      ))}
    </div>
  );
}
