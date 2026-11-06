import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Flughafen-Manager: Startklar!",
    short_name: "Startklar!",
    description: "Ein entspanntes Flughafen-Spiel für Kinder.",
    start_url: "/",
    display: "fullscreen",
    orientation: "landscape",
    background_color: "#8fd0f5",
    theme_color: "#8fd0f5",
    lang: "de",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
