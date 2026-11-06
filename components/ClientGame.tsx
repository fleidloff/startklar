"use client";
import dynamic from "next/dynamic";

const Game = dynamic(() => import("./Game"), {
  ssr: false,
  loading: () => <div className="loading">Flughafen wird geöffnet …</div>,
});

export default function ClientGame() {
  return <Game />;
}
