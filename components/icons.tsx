import type { ReactNode } from "react";
import { OUT } from "./art";

const s = { stroke: OUT, strokeWidth: 3, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

const ICONS: Record<string, ReactNode> = {
  bus: (
    <g {...s}>
      <rect x={8} y={14} width={48} height={30} rx={7} fill="#fff" />
      <rect x={13} y={19} width={10} height={10} rx={2} fill="#7cc4ec" />
      <rect x={27} y={19} width={10} height={10} rx={2} fill="#7cc4ec" />
      <rect x={41} y={19} width={10} height={10} rx={2} fill="#7cc4ec" />
      <line x1={8} y1={35} x2={56} y2={35} />
      <circle cx={20} cy={46} r={5} fill="#3b4250" />
      <circle cx={44} cy={46} r={5} fill="#3b4250" />
    </g>
  ),
  finger: (
    <g {...s}>
      <rect x={4} y={18} width={16} height={36} rx={4} fill="#c9d2dc" />
      <line x1={36} y1={36} x2={36} y2={50} />
      <rect x={28} y={48} width={16} height={5} rx={2} fill="#6f7787" />
      <rect x={16} y={20} width={30} height={16} rx={2} fill="#fff" />
      <path d="M26,20 v16 M36,20 v16" />
      <rect x={44} y={14} width={16} height={24} rx={3} fill="#7cc4ec" />
    </g>
  ),
  pushback: (
    <g {...s}>
      <rect x={8} y={28} width={34} height={14} rx={3} fill="#f6c02c" />
      <path d="M22,28 L24,14 L38,14 L42,28 Z" fill="#f6c02c" />
      <rect x={27} y={17} width={10} height={9} rx={1} fill="#7cc4ec" />
      <line x1={42} y1={36} x2={56} y2={36} />
      <circle cx={18} cy={46} r={8} fill="#3b4250" />
      <circle cx={18} cy={46} r={3} fill="#f6c02c" />
      <circle cx={40} cy={47} r={6} fill="#3b4250" />
    </g>
  ),
  tanken: (
    <g {...s}>
      <rect x={12} y={10} width={28} height={44} rx={5} fill="#f6c02c" />
      <rect x={17} y={16} width={18} height={12} rx={2} fill="#fff" />
      <path d="M26,34 c-4,6 -4,10 0,10 c4,0 4,-4 0,-10 z" fill="#e8574a" />
      <path d="M40,22 h6 a4,4 0 0 1 4,4 v18 a3,3 0 0 1 -6,0 v-10 h-4" fill="none" />
    </g>
  ),
  gepaeck: (
    <g {...s}>
      <path d="M24,16 v-5 h16 v5" fill="none" />
      <rect x={10} y={16} width={44} height={34} rx={6} fill="#c97b3c" />
      <line x1={22} y1={16} x2={22} y2={50} />
      <line x1={42} y1={16} x2={42} y2={50} />
      <rect x={26} y={26} width={12} height={9} rx={2} fill="#9a6ee8" />
      <rect x={28} y={38} width={9} height={6} rx={1.5} fill="#4cbb6c" />
    </g>
  ),
  enteisung: (
    <g {...s}>
      <path d="M12,44 l14,-14 l8,8 l-14,14 z" fill="#f6c02c" />
      <path d="M26,30 l10,-10 l8,8 l-10,10" fill="#3b4250" />
      <path d="M17,49 l-5,8" />
      <circle cx={48} cy={14} r={2.5} fill="#fff" strokeWidth={2} />
      <circle cx={54} cy={22} r={2} fill="#fff" strokeWidth={2} />
      <circle cx={44} cy={8} r={2} fill="#fff" strokeWidth={2} />
      <path d="M42,22 l8,-6 M44,26 l10,-2" strokeWidth={2.5} />
    </g>
  ),
  einwinker: (
    <g {...s}>
      <line x1={14} y1={6} x2={20} y2={22} stroke="#ff7a2f" strokeWidth={6} />
      <line x1={50} y1={6} x2={44} y2={22} stroke="#ff7a2f" strokeWidth={6} />
      <path d="M20,22 L24,34 M44,22 L40,34" strokeWidth={5} />
      <rect x={22} y={30} width={20} height={22} rx={5} fill="#c8f02c" />
      <line x1={22} y1={42} x2={42} y2={42} stroke="#fff" strokeWidth={3} />
      <circle cx={32} cy={22} r={7} fill="#a8704a" />
      <path d="M24,20 a8,8 0 0 1 16,0" fill="#f39a35" />
    </g>
  ),
  checkliste: (
    <g {...s}>
      <rect x={14} y={10} width={36} height={46} rx={4} fill="#f7e2b8" />
      <rect x={24} y={6} width={16} height={8} rx={2} fill="#9aa3ad" />
      <path d="M20,24 l3,3 l5,-6 M20,35 l3,3 l5,-6 M20,46 l3,3 l5,-6" stroke="#2e9e4f" />
      <line x1={32} y1={25} x2={44} y2={25} />
      <line x1={32} y1={36} x2={44} y2={36} />
      <line x1={32} y1={47} x2={44} y2={47} />
    </g>
  ),
  car: (
    <g {...s}>
      <path d="M8,40 v-8 l6,-2 l6,-10 h22 l8,10 l8,2 v8 z" fill="#e8574a" />
      <path d="M23,23 h8 v8 h-12 z M35,23 h6 l5,8 h-11 z" fill="#7cc4ec" strokeWidth={2.5} />
      <circle cx={19} cy={42} r={6} fill="#3b4250" />
      <circle cx={46} cy={42} r={6} fill="#3b4250" />
      <circle cx={19} cy={42} r={2} fill="#c3ccd6" strokeWidth={0} />
      <circle cx={46} cy={42} r={2} fill="#c3ccd6" strokeWidth={0} />
    </g>
  ),
  globe: (
    <g {...s}>
      <circle cx={32} cy={32} r={24} fill="#7fd0ea" />
      <path d="M16,22 c6,-2 10,2 12,6 c2,6 -6,6 -4,12 c1,4 -4,6 -6,2 c-3,-5 -6,-10 -2,-20 z" fill="#8ccf55" strokeWidth={2.5} />
      <path d="M36,12 c6,2 8,8 14,10 c4,4 2,12 -4,12 c-6,0 -6,6 -10,8 c-4,-4 -2,-10 -4,-14 c-2,-6 0,-12 4,-16 z" fill="#f6c02c" strokeWidth={2.5} />
    </g>
  ),
  airport: (
    <g {...s}>
      <rect x={6} y={36} width={38} height={18} rx={2} fill="#e9edf2" />
      <rect x={10} y={40} width={30} height={7} rx={1} fill="#7cc4ec" strokeWidth={2.5} />
      <rect x={45} y={24} width={9} height={30} fill="#fff" />
      <path d="M40,14 H59 L56,25 H43 Z" fill="#5c86ad" />
      <rect x={41} y={10} width={17} height={4} rx={1} fill="#fff" strokeWidth={2.5} />
      <line x1={49.5} y1={4} x2={49.5} y2={10} strokeWidth={2.5} />
      <path d="M6,22 L14,22 L20,12 L24,12 L21,22 L29,22 L32,18 L35,18 L34,25 L21,27 L24,34 L20,34 L14,27 L7,26 Z" fill="#f6c02c" strokeWidth={2.2} />
    </g>
  ),
  sound: (
    <g {...s}>
      <path d="M12,26 h10 l12,-10 v32 l-12,-10 h-10 z" fill="#fff" />
      <path d="M42,24 a10,10 0 0 1 0,16 M47,18 a18,18 0 0 1 0,28" fill="none" />
    </g>
  ),
  mute: (
    <g {...s}>
      <path d="M12,26 h10 l12,-10 v32 l-12,-10 h-10 z" fill="#fff" />
      <path d="M42,24 l12,16 M54,24 l-12,16" />
    </g>
  ),
  sun: (
    <g {...s}>
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
        <line key={a} x1={32 + Math.cos((a * Math.PI) / 180) * 18} y1={32 + Math.sin((a * Math.PI) / 180) * 18} x2={32 + Math.cos((a * Math.PI) / 180) * 26} y2={32 + Math.sin((a * Math.PI) / 180) * 26} />
      ))}
      <circle cx={32} cy={32} r={12} fill="#ffd23a" />
    </g>
  ),
  snow: (
    <g {...s} stroke="#fff" strokeWidth={4}>
      {[0, 60, 120].map((a) => (
        <g key={a} transform={`rotate(${a} 32 32)`}>
          <line x1={32} y1={8} x2={32} y2={56} />
          <path d="M26,12 l6,6 l6,-6 M26,52 l6,-6 l6,6" fill="none" />
        </g>
      ))}
    </g>
  ),
  help: (
    <g {...s}>
      <path d="M22,24 a10,10 0 1 1 14,9 c-3,1.5 -4,3 -4,7" fill="none" strokeWidth={5} />
      <circle cx={32} cy={50} r={3} fill={OUT} />
    </g>
  ),
  plane: (
    <g {...s}>
      <path d="M8,36 L20,36 L30,20 L36,20 L32,36 L46,36 L52,28 L56,28 L54,40 L32,44 L36,56 L30,56 L20,44 L10,42 Z" fill="#fff" />
    </g>
  ),
  radar: (
    <g {...s}>
      <circle cx={32} cy={32} r={24} fill="#1f5f3f" />
      <circle cx={32} cy={32} r={14} fill="none" stroke="#7de08f" strokeWidth={2} />
      <line x1={32} y1={32} x2={50} y2={16} stroke="#7de08f" />
      <circle cx={42} cy={40} r={3} fill="#fff" strokeWidth={1.5} />
    </g>
  ),
  fullscreen: (
    <g {...s} strokeWidth={5} fill="none">
      <path d="M10,24 V10 H24 M40,10 H54 V24 M54,40 V54 H40 M24,54 H10 V40" />
    </g>
  ),
  "fullscreen-exit": (
    <g {...s} strokeWidth={5} fill="none">
      <path d="M24,10 V24 H10 M54,24 H40 V10 M40,54 V40 H54 M10,40 H24 V54" />
    </g>
  ),
  start: (
    <g {...s}>
      <line x1={6} y1={54} x2={58} y2={54} strokeWidth={4} />
      <line x1={10} y1={54} x2={22} y2={54} stroke="#fff" strokeWidth={2} />
      <line x1={30} y1={54} x2={42} y2={54} stroke="#fff" strokeWidth={2} />
      <g transform="rotate(-28 32 32)">
        <path d="M6,34 L18,34 L28,18 L34,18 L30,34 L44,34 L50,26 L54,26 L52,38 L30,42 L34,54 L28,54 L18,42 L8,40 Z" fill="#fff" />
      </g>
      <path d="M6,26 h8 M4,34 h6" strokeWidth={3} />
    </g>
  ),
  "zoom-in": (
    <g {...s}>
      <line x1={40} y1={40} x2={55} y2={55} strokeWidth={9} />
      <circle cx={27} cy={27} r={18} fill="#fff" strokeWidth={4} />
      <path d="M19,27 h16 M27,19 v16" strokeWidth={5} />
    </g>
  ),
  "zoom-out": (
    <g {...s}>
      <line x1={40} y1={40} x2={55} y2={55} strokeWidth={9} />
      <circle cx={27} cy={27} r={18} fill="#fff" strokeWidth={4} />
      <path d="M19,27 h16" strokeWidth={5} />
    </g>
  ),
  lamp: (
    <g {...s}>
      <path d="M32,8 C20,8 13,17 13,26 C13,34 19,38 22,44 H42 C45,38 51,34 51,26 C51,17 44,8 32,8 Z" fill="#ffe27a" />
      <rect x={22} y={44} width={20} height={6} rx={2} fill="#c3ccd6" />
      <rect x={24} y={50} width={16} height={6} rx={3} fill="#9aa3ad" />
      <path d="M27,36 L32,24 L37,36" fill="none" />
    </g>
  ),
  close: (
    <g {...s} strokeWidth={6}>
      <line x1={18} y1={18} x2={46} y2={46} />
      <line x1={46} y1={18} x2={18} y2={46} />
    </g>
  ),
};

export function Icon({ name, size = 56 }: { name: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      {ICONS[name] ?? ICONS.plane}
    </svg>
  );
}
