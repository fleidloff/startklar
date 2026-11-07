# PRD 005: Startklar! als App auf dem Home-Bildschirm

| | |
|---|---|
| Status | Teilweise umgesetzt: Anforderung 4 und 5 (Spielen ohne Netz, neue Versionen) |
| Stand | 7. November 2026 |
| Anlass | Frage: Kann man die Web-App einfach als PWA auf den Home-Bildschirm legen? |
| Betroffene Dateien | `app/manifest.webmanifest`, `app/layout.tsx`, `app/globals.css`, `public/` (neue Icons), `components/ClientGame.tsx`, `scripts/build-sw.mjs`, `scripts/build-sw.test.mjs`, `package.json` |

## 1. Problem

Die Grundlage für eine installierbare App ist schon da:

- `app/manifest.webmanifest` hat Name, Kurzname, Farben und `display: fullscreen`.
- `app/layout.tsx` setzt `appleWebApp.capable`. Auf dem iPhone öffnet das Spiel vom Home-Bildschirm ohne Safari-Leiste.
- Auf GitHub Pages zeigt der Link auf das Manifest richtig auf `/startklar/manifest.webmanifest`.
- Die Töne entstehen im Code. Die Schrift liefert Next.js selbst aus. Es gibt keine externen Dateien zur Laufzeit.

Trotzdem ist das Ergebnis heute schlecht:

| Lücke | Folge |
|---|---|
| Nur ein SVG-Icon | iOS kann SVG nicht als App-Icon nutzen. Auf dem iPhone und iPad zeigt der Home-Bildschirm ein verkleinertes Bildschirmfoto der Seite. |
| Kein Icon mit Rand für Android („maskable“) | Android setzt das Icon klein in einen weißen Kreis. |
| Kein Service Worker | Ohne Netz startet das Spiel nicht. Im Auto oder im Flugzeug geht es nicht. Gerade dort spielen Kinder oft. |
| Keine sicheren Ränder (`env(safe-area-inset-*)`) | `viewportFit: cover` ist an, aber das CSS nutzt die Ränder nicht. Im Querformat auf dem iPhone verdeckt die Kamera-Aussparung einen Teil der Werkzeugleiste. |
| `height: 100vh` in `globals.css` | Auf iOS ist `100vh` oft höher als der sichtbare Bereich. Unten kann ein Streifen abgeschnitten sein. |
| Kein Hinweis zur Installation | Eltern wissen nicht, dass es geht. Auf iOS ist der Weg über „Teilen“ versteckt. |

## 2. Ziel

Eltern legen das Spiel mit wenigen Schritten auf den Home-Bildschirm. Von dort startet es wie eine echte App: mit eigenem Icon, ohne Browser-Leiste, im Querformat und auch ohne Netz.

**Erfolgskriterien**
- Auf iPhone, iPad und Android zeigt der Home-Bildschirm das Flugzeug-Icon, kein Bildschirmfoto.
- Nach dem ersten Start mit Netz startet das Spiel ohne Netz. Alle Szenen und Mini-Spiele funktionieren ohne Netz.
- Chrome auf Android und am Computer bietet „App installieren“ an.
- Keine Bedienelemente liegen unter der Kamera-Aussparung oder dem Home-Balken.
- Nach einem neuen Deploy bekommt die App die neue Version beim ersten Start nach dem Schließen, wenn sie die neue Version schon mit Netz geladen hat.
- Alte Spielstände laden weiter.

## 3. Nicht-Ziele

- Keine App im App Store oder Play Store.
- Keine Push-Mitteilungen.
- Kein eigener „Installieren“-Knopf über `beforeinstallprompt`. Den gibt es nur in Chrome, nicht in Safari.
- Kein Umzug des Spielstands von Safari in die App (siehe Anforderung 6).
- Keine neue Abhängigkeit wie Serwist oder Workbox. Ein kleiner eigener Service Worker reicht für eine statische Seite.

## 4. Anforderungen

### Anforderung 1: Icons für alle Geräte

- Aus dem bestehenden Flugzeug-Icon entstehen PNG-Dateien in `public/`:
  - `apple-touch-icon.png`, 180 × 180 Pixel, ohne runde Ecken (iOS rundet selbst), ohne Transparenz.
  - `icon-192.png` und `icon-512.png` für das Manifest.
  - `icon-maskable-512.png` mit 20 % Rand in der Hintergrundfarbe, für Android.
- Das Manifest listet SVG, beide PNGs und das Maskable-Icon mit `"purpose": "maskable"`.
- `app/layout.tsx` setzt `icons.apple` auf `apple-touch-icon.png`. Der Pfad muss mit dem `basePath` von GitHub Pages funktionieren.
- Die PNGs liegen fertig im Repository. Sie entstehen nicht bei jedem Build.

### Anforderung 2: Start wie eine App

- `display` bleibt `fullscreen`. Das Manifest bekommt `"display_override": ["fullscreen", "standalone"]`. iOS kennt kein `fullscreen` und nimmt `standalone`.
- `orientation` bleibt `landscape`. iOS ignoriert das. Der bestehende Hinweis „Bitte dreh dein Tablet quer!“ in `components/Game.tsx` deckt das schon ab. Er bleibt ohne Änderung.
- `apple-mobile-web-app-status-bar-style` wird `black-translucent`. Das Spiel geht dann bis an den oberen Rand.
- Das Manifest bekommt `"id": "./"`. Der Pfad ist relativ, er funktioniert also mit und ohne `basePath`. Chrome erkennt die App dann auch nach einer Änderung von `start_url` wieder.

### Anforderung 3: Sichere Ränder

- Werkzeugleiste, Banner, Fenster und Knöpfe halten Abstand mit `env(safe-area-inset-top|right|bottom|left)`.
- Der Hintergrund und die Spielwelt gehen bis an den Rand. Nur Bedienelemente rücken ein.
- `100vh` wird `100dvh`.

**Abnahme:** Auf einem iPhone mit Kamera-Aussparung im Querformat (links und rechts gedreht) liegt kein Knopf unter der Aussparung oder dem Home-Balken.

### Anforderung 4: Spielen ohne Netz

- Ein Service Worker speichert beim ersten Start alle Dateien aus `out/`: HTML, JavaScript, CSS, Schrift, Icons, Manifest.
- Das Skript `scripts/build-sw.mjs` läuft nach `next build`. Es schreibt `out/sw.js` mit der Liste aller Dateien und einer Version (Hash über alle Dateien). So sind auch Teile dabei, die Next.js erst später lädt.
- Anfragen an die eigene Seite beantwortet der Service Worker aus dem Speicher. Fehlt eine Datei, holt er sie aus dem Netz.
- Der Speicher heißt `startklar-<Version>`. Andere Projekte auf `fleidloff.github.io` teilen sich den Speicher-Bereich. Der Service Worker löscht darum nur Speicher, deren Name mit `startklar-` beginnt.
- `components/ClientGame.tsx` meldet den Service Worker an, aber nur im Build, nicht bei `next dev`.
- Der Service Worker berührt `localStorage` nicht.

**Abnahme:** Ein Test in `scripts/` prüft: Die Liste enthält jede Datei aus `out/` außer `sw.js` selbst. Alle Pfade beginnen mit dem `basePath`.

### Anforderung 5: Neue Versionen

- Bei jedem Start prüft der Browser, ob es eine neue `sw.js` gibt. Eine neue Version hat einen neuen Hash.
- Der neue Service Worker lädt alle Dateien im Hintergrund. Das Kind spielt die alte Version weiter.
- Der neue Service Worker wartet, bis kein Fenster der App mehr offen ist. Erst dann ersetzt er den alten und löscht den alten Speicher. So fehlt einer offenen alten Version nie eine Datei.
- Auf Android heißt „geschlossen“: Die App ist aus der Liste der offenen Apps weggewischt, oder Android hat sie im Hintergrund beendet. Wer die App nie schließt, bleibt bei der alten Version. Das ist so gewollt.
- Das laufende Spiel lädt nie von selbst neu. So verliert das Kind nie mitten im Spiel seinen Stand.
- Bricht das Laden ab (zum Beispiel ohne Netz), bleibt die alte Version ganz erhalten.

### Anforderung 6: Spielstand

- Der Spielstand bleibt in `localStorage` unter demselben Schlüssel.
- Auf iOS haben Safari und die App vom Home-Bildschirm getrennte Speicher. Ein Spiel, das in Safari begonnen wurde, ist in der App nicht da. Das ist so gewollt und steht im Hinweis (Anforderung 7).
- iOS löscht Daten von Webseiten nach 7 Tagen ohne Besuch. Apps auf dem Home-Bildschirm sind davon ausgenommen. Das ist ein Vorteil der Installation.

### Anforderung 7: Hinweis für Eltern

- Im Spiel gibt es einen kleinen Knopf „Als App speichern“. Er ist nur sichtbar, wenn das Spiel im Browser läuft (`display-mode` ist nicht `standalone` oder `fullscreen`, und `navigator.standalone` ist nicht `true`).
- Antippen öffnet ein Fenster mit den Schritten für das Gerät:
  - iPhone und iPad: „Tippe unten auf Teilen. Wähle dann ‚Zum Home-Bildschirm‘.“ Mit Bild des Teilen-Symbols.
  - Android: „Tippe oben rechts auf das Menü. Wähle dann ‚App installieren‘.“
  - Computer: „Klicke in der Adressleiste auf das Symbol zum Installieren.“
- Der Text sagt auch: „Die App funktioniert auch ohne Internet. Dein Spiel aus dem Browser wird nicht übernommen.“
- Das Fenster ist mit der Tastatur bedienbar und schließt mit Escape.

## 5. Prüfung

- `npm run build` mit `PAGES_BASE_PATH=/startklar`. In `out/` prüfen: `sw.js` mit Dateiliste, Icons, Manifest mit richtigen Pfaden.
- Chrome-Entwicklertools, Bereich „Application“: Manifest ohne Fehler, Service Worker aktiv, App installierbar.
- iPhone: Über Safari auf den Home-Bildschirm legen. Icon prüfen. Starten. Flugmodus an. App schließen und neu starten. Ein Flugzeug ganz abfertigen und alle Mini-Spiele öffnen.
- iPhone im Querformat links und rechts gedreht: Ränder prüfen.
- Android: Installieren, Icon prüfen, Flugmodus-Test wie oben.
- Neue Version deployen. App mit Netz starten, schließen und wieder starten. Die neue Version ist da, der Spielstand auch.
- `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build`.

## 6. Offene Fragen

1. Soll der Knopf „Als App speichern“ für Kinder sichtbar sein, oder nur in einem Bereich für Eltern (zum Beispiel lange drücken)?
2. Soll ein Spielstand aus Safari in die App wandern können, zum Beispiel über einen Code zum Abtippen?
3. Braucht iOS eigene Startbilder (`apple-touch-startup-image`)? Ohne sie zeigt iOS beim Start kurz einen Bildschirm in der Hintergrundfarbe.
