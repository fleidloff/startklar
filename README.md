# Flughafen-Manager: Startklar!

A relaxed airport ground-handling game for children (age 8), in German, built from the game design spec. No timers, no scores, no game over.

```bash
npm install
npm run dev
```

Open https://localhost:3000 in landscape (made for 16:10 tablets, works with mouse, touch and keyboard).

`npm run dev` serves HTTPS with a self-signed certificate (`certificates/`, created by `scripts/dev-cert.mjs` with `openssl` for localhost and all LAN IPs). On a tablet, open `https://<your-mac-ip>:3000` and accept the certificate warning once. HTTPS is needed so the screen stays on in fullscreen. `npm run dev:http` runs plain HTTP for local use.

## Game loop

1. **Tower** (radar button, top right): draw a line from a plane to the green arrow of a runway.
2. **Einwinker**: wave both light wands up and down to bring the plane to the STOP line.
3. **Abfertigung**: Vorfeldbus (draw the route), Gepäck (drag bags onto the belt), Betankung (connect hose, hold pump), Enteisung (winter only, wipe the snow).
4. **Pushback**: pull the tug along the yellow line. The plane taxis and takes off.
5. **Weltkarte**: routes of all flights, destination facts and aircraft stickers.

Progress is saved in the browser (`localStorage`, key `flughafen-startklar`, versioned).

## Checks

```bash
npm run lint && npx tsc --noEmit && npm test && npm run build
```

## Deploy

Every push to `main` runs `.github/workflows/pages.yml`: checks, static export (`out/`) and deploy to GitHub Pages at https://fleidloff.github.io/startklar/. One-time setup: repository Settings → Pages → Source: **GitHub Actions**.
