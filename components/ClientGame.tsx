"use client";
import dynamic from "next/dynamic";
import { useEffect } from "react";

const Game = dynamic(() => import("./Game"), {
  ssr: false,
  loading: () => <div className="loading">Flughafen wird geöffnet …</div>,
});

export default function ClientGame() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) void navigator.serviceWorker.register("sw.js");
  }, []);
  return <Game />;
}
