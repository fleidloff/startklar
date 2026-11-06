import { useEffect, type ReactNode } from "react";
import { AE, AR, AT, AU, BR, CA, CH, CN, DE, EG, ES, FR, GB, IN, IS, IT, JP, KE, MX, NO, TH, TR, US, ZA } from "country-flag-icons/react/3x2";
import { Icon } from "./icons";

const FLAGS: Record<string, typeof DE> = { AE, AR, AT, AU, BR, CA, CH, CN, DE, EG, ES, FR, GB, IN, IS, IT, JP, KE, MX, NO, TH, TR, US, ZA };

export function Flag({ code, height = 26 }: { code: string; height?: number }) {
  const F = FLAGS[code];
  if (!F) return null;
  return (
    <span className="flag" style={{ height, width: height * 1.5 }}>
      <F title={code} />
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
