# PRD 001: Detailliertere Grafik nach Briefing-Vorlage

| | |
|---|---|
| Status | Entwurf, noch nicht umgesetzt |
| Stand | 6. November 2026 |
| Referenz | `Airport Simulation - Game Design Specification.pdf`, Abbildungen 1.1, 3.1, 3.3, 3.4, 3.5 |
| Betroffene Dateien | `components/art.tsx`, `components/World.tsx`, `components/scenes/*.tsx` |

## 1. Problem

Die Spielgrafik trifft den Stil des Briefings (dicke Konturen, kräftige Farben, runde Knöpfe), ist aber deutlich weniger detailliert. Ein direkter Vergleich von Abbildung 1.1 mit dem Vorfeld im Spiel zeigt:

| Bereich | Briefing | Spiel heute |
|---|---|---|
| Kamera | Ein Gate füllt fast das Bild. Das Flugzeug ist etwa halb so breit wie der Bildschirm. | Drei Gates im Bild. Das Flugzeug ist etwa ein Fünftel so breit (Zoom 0,9). |
| Flugzeug | Cockpitscheiben, Türen, Triebwerke mit Einlass, Fahrwerksbeine, Winglets, Glanzlichter | Rumpf aus Linien, flache Flügel, Punkt-Fenster |
| Fahrzeuge | Tankwagen mit rundem Tank, Leiter, Schlauch; Bus mit Fenstern, Türen, Felgen | Einfache Kästen |
| Menschen | Groß, mit Gesicht, Haaren, Winken | Winzige Figuren |
| Umgebung | Brücke mit Rotunde und Stützen, Rollweg-Pfeile, Gepäckwagen-Zug am Gate | Brücke als Kastenreihe, keine Pfeile, wenig Leben |
| Schattierung | Weiche Verläufe, Glanz | Flache Farben |

Die Bedienleiste (Werkzeuge, Banner, Radar) entspricht dem Briefing schon gut und ist nicht Teil dieses PRD.

## 2. Ziel

Das Vorfeld und die Mini-Spiele sollen näher an den Briefing-Abbildungen aussehen: näher dran, detailreicher, lebendiger. Kinder sollen Flugzeuge, Fahrzeuge und Personal sofort erkennen.

**Erfolgskriterien**
- Ein Screenshot vom Vorfeld neben Abbildung 1.1 zeigt ähnlichen Bildausschnitt und ähnliche Detailtiefe.
- Das Spiel läuft auf einem mittleren Android-Tablet weiter flüssig (Ziel: 60 Bilder pro Sekunde auf dem Vorfeld, mindestens 45).
- Alle bestehenden Abläufe funktionieren unverändert (Tower, Einwinken, Abfertigung, Pushback, Start, Weltkarte).

## 3. Nicht-Ziele

- **Keine Rasterbilder.** Die Grafik bleibt gezeichnete Vektorgrafik (SVG) im bestehenden System. Gemalte Bilder wie im Briefing (vermutlich von einer Bild-KI) bräuchten Bild-Dateien für jedes Flugzeug aus vielen Blickwinkeln. Das ist ein eigenes Projekt mit Grafiker oder Bildgenerator.
- Keine neuen Spielregeln oder Mini-Spiele.
- Keine Änderung an Bedienleiste, Banner und Weltkarte.

## 4. Anforderungen

Die Schritte sind nach Wirkung pro Aufwand sortiert. Jeder Schritt wird einzeln fertig, geprüft und live gestellt.

### Schritt 1: Kamera näher (Aufwand klein, Wirkung sehr groß)

- Standard-Zoom auf dem Vorfeld so, dass ein Gate mit Flugzeug, Brücke und Fahrzeugen fast das Bild füllt (Richtwert: Zoom 1,6 bis 1,8 statt 0,9 in `Apron.tsx`, Funktion `focus`).
- Beim Auswählen eines Flugzeugs (Banner-Knöpfe oben, Tippen aufs Flugzeug) fährt die Kamera weich zu dessen Gate. Das gibt es schon und bleibt.
- Weiter weg zoomen bleibt möglich (Mausrad heute, später Zwei-Finger-Geste), damit Kinder alle drei Gates sehen können.
- Verschieben mit dem Finger: Grenzen in `Apron.tsx` an den neuen Zoom anpassen.
- Aufgaben-Blasen über den Flugzeugen: Größe bleibt auf dem Bildschirm gleich (`bubbleR = 30 / cam.zoom` prüfen), sie dürfen das Flugzeug nicht verdecken.
- Neu: Zwei-Finger-Zoom auf dem Tablet (heute nur Mausrad).

**Abnahme:** Das Flugzeug am Gate ist etwa halb so breit wie der Bildschirm. Alle Blasen bleiben tippbar. Wechsel zwischen Gates per Banner-Knopf funktioniert.

### Schritt 2: Flugzeug detaillierter (Aufwand mittel, Wirkung groß)

Betrifft `Plane` in `art.tsx` (Isometrie) und `SidePlane` (Seitenansicht für Start und Sticker).

- Cockpit: zwei bis drei einzelne Scheiben statt eines Strichs.
- Türen: vordere und hintere Passagiertür als Umriss, Frachttür über dem Förderband.
- Fenster: abgerundete Einzel-Fenster statt Punkte, wenn der Zoom groß genug ist.
- Triebwerke: Einlass mit Fan-Ring und Glanz, Aufhängung am Flügel.
- Flügel: Winglets an den Spitzen, angedeutete Klappen an der Hinterkante.
- Fahrwerk: sichtbare Beine mit Rädern (Bug- und Hauptfahrwerk).
- Glanzlicht auf dem Rumpf (heller Streifen oben) und weicher Schatten am Boden.
- Lackierung: Heckflosse und Bauchstreifen bleiben in der Airline-Farbe, dazu ein Streifen am Triebwerk.
- Typ-Merkmale bleiben erkennbar: Buckel beim Jumbo-Jet, zwei Decks beim A380, Propeller bei der ATR 72.
- Detailstufe hängt vom Zoom ab: Kleine Details (Fenster, Türen) erst ab einem Mindest-Zoom zeichnen, damit es bei weitem Zoom nicht unruhig wird und schnell bleibt.

**Abnahme:** Neben Abbildung 1.1 gelegt, wirkt das Flugzeug ähnlich detailliert. Alle 10 Typen sind geprüft (Vergleichsbild aller Typen). Schnee auf den Flügeln (Winter) passt weiter auf die neue Form.

### Schritt 3: Gate-Umgebung (Aufwand mittel, Wirkung mittel)

Betrifft `World.tsx` (`Terminal`, `Bridge`, `Ground`, `propsForGate`).

- Fluggastbrücke: Rotunde am Terminal, Stütze mit Rädern, Ziehharmonika-Rillen, Regenbogen-Farben bleiben.
- Terminal: Fensterrahmen, Dachkante, Gate-Schild mit Nummer (gibt es) etwas größer.
- Boden: gelbe Pfeil-Ketten auf Rollweg und Spurlinie (wie in Abbildung 1.1), Betonfugen, leichte Reifenspuren.
- Leben am Gate: Gepäckwagen-Zug mit bunten Koffern, Personal an mehreren Stellen, Vorfeldbus in der Nähe des Flugzeugs.
- Tower im Hintergrund mit Fensterband und Antenne (gibt es) etwas detaillierter.

**Abnahme:** Der Bildausschnitt eines Gates wirkt so belebt wie in Abbildung 1.1, ohne die Aufgaben-Blasen zu verdecken.

### Schritt 4: Fahrzeuge (Aufwand mittel, Wirkung mittel)

Betrifft `Bus`, `FuelTruck`, `Tug`, `BaggageCart`, `BeltLoader`, `Stairs`, `DeiceTruck` in `art.tsx`.

- Räder mit Felgen statt dunkler Ellipsen.
- Führerhaus mit Scheibe und Fahrer-Silhouette.
- Tankwagen: runder Tank mit Glanz, Leiter, Aufschrift „Treibstoff“ (gibt es), Schlauchtrommel.
- Bus: Fensterreihe mit Rahmen, Türen, Zielanzeige.
- Schlepper: Warnstreifen, Rundumleuchte (gibt es).
- Gepäckwagen: Gitter-Seitenwände, Deichsel.

**Abnahme:** Jedes Fahrzeug ist ohne Text erkennbar. Die Mini-Spiele Bus, Tanken, Gepäck, Pushback und Enteisung sehen besser aus und funktionieren weiter.

### Schritt 5: Menschen (Aufwand klein bis mittel, Wirkung mittel)

Betrifft `Person` und `Passenger` in `art.tsx`.

- Etwa doppelt so groß wie heute.
- Gesicht mit Augen und Lächeln, Haare, verschiedene Hautfarben (gibt es).
- Warnweste mit Reflexstreifen, Gehörschutz oder Helm.
- Posen: winken, zeigen, Koffer tragen. Leichte Bewegung (gibt es als „bob“).

**Abnahme:** Personal ist im Vorfeld klar erkennbar und freundlich. Die Bewegung respektiert „Bewegung reduzieren“ (prefers-reduced-motion).

### Querschnitt: Schattierung

- Dezente Verläufe auf großen Flächen (Rumpf, Tank, Terminal-Glas), weiche Bodenschatten.
- Nur über wenige, wiederverwendete SVG-Verläufe (`<defs>`), nicht pro Objekt neu, wegen Leistung.

## 5. Technische Hinweise

- Alles bleibt im bestehenden Isometrie-System: Projektion `P()` in `game/iso.ts`, Zeichen-Bausteine in `art.tsx`, Tiefen-Sortierung über `Drawable.depth` in `World.tsx`.
- Leistung: Mehr Details heißen mehr SVG-Elemente. Deshalb Detailstufe nach Zoom, wiederverwendbare `<defs>` und keine Filter (Blur) auf vielen Elementen. Vor und nach jedem Schritt die Bildrate auf dem Vorfeld messen.
- Mini-Spiel-Kameras (`zoom` in `BusGame`, `Fuel`, `Baggage`, `Deice`, `Pushback`, `Tower`) nach Schritt 1 und 2 prüfen, weil sie dieselben Zeichnungen nutzen.
- Animationen auf SVG-Elementen mit eigener Position nur über `translate`, `rotate` oder `scale` mit gesetztem `transform-origin`, nie über CSS `transform` (siehe die früheren Fehler mit hüpfenden Personen und Knöpfen).
- Spielstand-Format (`localStorage`, Version 1) ändert sich nicht.

## 6. Prüfung pro Schritt

- Screenshot aus dem Spiel neben die passende Briefing-Abbildung legen.
- Alle 10 Flugzeugtypen und beide Jahreszeiten ansehen.
- Einmal den ganzen Ablauf spielen: Tower, Einwinken, alle Aufgaben, Pushback, Start, Weltkarte.
- `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build`.
- Bildrate auf einem Tablet oder in der Chrome-Leistungsansicht mit Tablet-Drosselung messen.

## 7. Reihenfolge und Aufwand

| Schritt | Aufwand | Wirkung |
|---|---|---|
| 1. Kamera näher | klein | sehr groß |
| 2. Flugzeug detaillierter | mittel | groß |
| 3. Gate-Umgebung | mittel | mittel |
| 4. Fahrzeuge | mittel | mittel |
| 5. Menschen | klein bis mittel | mittel |

Empfehlung: Schritt 1 und 2 zuerst, zusammen etwa so viel Arbeit wie das Start-Mini-Spiel. Danach entscheiden, ob 3 bis 5 nötig sind.

## 8. Risiken

- **Leistung auf älteren Tablets:** Gegenmittel sind Detailstufe nach Zoom und das Messen der Bildrate je Schritt.
- **Unübersichtlichkeit:** Mehr Details können die Aufgaben-Blasen verdecken. Blasen bleiben immer oben und gut sichtbar.
- **Grenze des Stils:** Vektorgrafik erreicht den gemalten Look der Briefing-Bilder nicht ganz (siehe Nicht-Ziele).

## 9. Offene Fragen

- Soll das Vorfeld beim Start des Spiels schon nah am ersten Gate sein, oder kurz alle Gates zeigen und dann hineinzoomen?
- Wird die Zwei-Finger-Zoom-Geste gewünscht, oder reicht das Wechseln per Banner-Knopf?
- Ist eine spätere Umstellung auf gemalte Bild-Dateien geplant? Dann lohnt sich Schritt 4 und 5 in Vektor eventuell nicht.
