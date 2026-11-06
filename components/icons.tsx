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
  globe: (
    <g {...s}>
      <circle cx={32} cy={32} r={24} fill="#7fd0ea" />
      <path d="M16,22 c6,-2 10,2 12,6 c2,6 -6,6 -4,12 c1,4 -4,6 -6,2 c-3,-5 -6,-10 -2,-20 z" fill="#8ccf55" strokeWidth={2.5} />
      <path d="M36,12 c6,2 8,8 14,10 c4,4 2,12 -4,12 c-6,0 -6,6 -10,8 c-4,-4 -2,-10 -4,-14 c-2,-6 0,-12 4,-16 z" fill="#f6c02c" strokeWidth={2.5} />
    </g>
  ),
  home: (
    <g {...s}>
      <path d="M10,30 L32,10 L54,30" fill="none" />
      <path d="M16,26 v26 h32 v-26" fill="#fff" />
      <rect x={27} y={36} width={10} height={16} fill="#e8574a" />
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
