# PRD 006: Flagge antippen zeigt das Land

| | |
|---|---|
| Status | Umgesetzt am 7. November 2026 |
| Stand | 7. November 2026 |
| Anlass | Kinder sollen beim Spielen die Länder und ihre Flaggen lernen. |
| Betroffene Dateien | `game/data.ts`, `components/ui.tsx`, `components/scenes/WorldMap.tsx`, `app/globals.css`, `game/state.test.ts` |

## 1. Problem

Das Spiel zeigt an drei Stellen eine Landesflagge:

| Stelle | Datei | Steht der Ländername daneben? |
|---|---|---|
| Banner oben (Flug am Gate) | `components/Game.tsx:358` | Nein, nur die Stadt |
| Checkliste eines Flugs | `components/Game.tsx:547` | Nein, nur die Stadt |
| Zielfenster der Weltkarte | `components/scenes/WorldMap.tsx:164` | Ja, als Unterzeile |

Ein Kind sieht also meistens eine Flagge ohne Namen. Antippen tut heute nichts. Die Flagge ist ein reines Bild mit dem Ländercode (zum Beispiel „DE“) als Titel.

## 2. Ziel

Ein Kind tippt auf eine Flagge. Eine kleine Sprechblase an der Flagge zeigt:

- den Namen des Landes, groß,
- den Kontinent,
- wie viele Menschen dort leben, gerundet und in ganzen Wörtern.

Beispiel:

> **Japan**
> liegt in Asien
> Dort leben etwa 124 Millionen Menschen.

**Erfolgskriterien**
- Jede Flagge im Spiel lässt sich antippen und zeigt die Sprechblase.
- Ein Kind (8 Jahre) kann die Sprechblase ohne Hilfe lesen.
- Das laufende Spiel wird nicht unterbrochen: Die Sprechblase ist kein neues Fenster, und Banner, Checkliste und Zielfenster bleiben offen.

## 3. Nicht-Ziele

- Kein Flaggen-Quiz und keine Sammlung „gelernter“ Länder. Das kann ein späteres PRD sein.
- Keine Vorlese-Funktion.
- Keine neuen Ziele oder Länder.
- Keine Länder-Fakten über Kontinent und Einwohner hinaus. Die Stadt hat schon ihren eigenen Fakt im Zielfenster.
- Keine Änderung an der Faktentabelle des Zielfensters. Kontinent und Einwohner stehen nur in der Sprechblase, damit sich die Flagge überall gleich verhält.

## 4. Anforderungen

### 4.1 Länderdaten

Eine Liste `COUNTRIES` in `game/data.ts`, Schlüssel ist der Flaggen-Code. Jeder Eintrag hat Name, Kontinent und Einwohner (gerundet).

Der Ländername zieht aus `Destination.country` in diese Liste um. Grund: Heute steht „Spanien“ zweimal (Madrid und Mallorca). Das Feld `country` fällt weg, das Zielfenster liest den Namen über den Flaggen-Code.

Vorschlag für die Daten (Stand 2025, gerundet; vor der Umsetzung gegen eine aktuelle Quelle prüfen):

| Code | Land | Kontinent | Einwohner |
|---|---|---|---|
| DE | Deutschland | Europa | 84 Millionen |
| FR | Frankreich | Europa | 68 Millionen |
| GB | Großbritannien | Europa | 69 Millionen |
| IT | Italien | Europa | 59 Millionen |
| ES | Spanien | Europa | 49 Millionen |
| AT | Österreich | Europa | 9 Millionen |
| CH | Schweiz | Europa | 9 Millionen |
| NO | Norwegen | Europa | 6 Millionen |
| IS | Island | Europa | 400 Tausend |
| TR | Türkei | Europa und Asien | 86 Millionen |
| EG | Ägypten | Afrika | 116 Millionen |
| KE | Kenia | Afrika | 57 Millionen |
| ZA | Südafrika | Afrika | 64 Millionen |
| AE | Vereinigte Arabische Emirate | Asien | 11 Millionen |
| IN | Indien | Asien | 1,5 Milliarden |
| TH | Thailand | Asien | 72 Millionen |
| CN | China | Asien | 1,4 Milliarden |
| JP | Japan | Asien | 124 Millionen |
| AU | Australien | Australien | 27 Millionen |
| US | USA | Nordamerika | 340 Millionen |
| CA | Kanada | Nordamerika | 41 Millionen |
| MX | Mexiko | Nordamerika | 130 Millionen |
| BR | Brasilien | Südamerika | 212 Millionen |
| AR | Argentinien | Südamerika | 46 Millionen |

Zahlen stehen in ganzen Wörtern („Millionen“, nicht „Mio.“), wie in PRD 002. Die Sprechblase zeigt die Zahl selbst, keinen Vergleich mit Deutschland.

### 4.2 Flagge als Knopf

`Flag` in `components/ui.tsx` wird ein Knopf:

- Antippen oder Klicken öffnet die Sprechblase. Nochmal Antippen schließt sie.
- Tippen woanders hin schließt sie.
- Die Taste Escape schließt nur die Sprechblase, nicht das Fenster darunter (Checkliste, Zielfenster).
- Immer nur eine Sprechblase ist offen.
- Der Knopf hat einen Namen für Bildschirmleser, zum Beispiel „Flagge von Japan“. Mit der Tastatur erreichbar, Enter öffnet.
- Die Tippfläche ist mindestens 44 mal 44 Punkte groß, auch wenn die Flagge kleiner aussieht.

Kein eingebautes `popover`-Attribut: Es legt die Sprechblase in eine Ebene außerhalb der skalierten Spielfläche (`.stage`). Die Sprechblase wäre dann falsch groß und falsch platziert. Darum schließt eigener Code die Sprechblase beim Tippen daneben und bei Escape.

### 4.3 Sprechblase

- Stil wie die bestehenden Fenster: dicke Kontur, runde Ecken, kräftige Farben.
- Sitzt an der Flagge und bleibt ganz im Bild, auch am Bildschirmrand (Banner oben rechts).
- Langer Name („Vereinigte Arabische Emirate“) bricht sauber um.
- Ein kurzes Klick-Geräusch beim Öffnen (`sfx.click`), wie bei anderen Knöpfen.
- Bei „weniger Bewegung“ im System erscheint die Sprechblase ohne Animation.

**Abnahme:** Die Typprüfung stellt sicher, dass jeder Flaggen-Code aus der Zielliste einen Eintrag in `COUNTRIES` und ein Flaggenbild hat (`flag: CountryCode`). Screenshots zeigen die offene Sprechblase im Banner, in der Checkliste und im Zielfenster, eine davon für die Vereinigten Arabischen Emirate.

## 5. Prüfung

- Jede der drei Stellen: Flagge antippen, Sprechblase lesen, daneben tippen, Sprechblase ist weg.
- In der Checkliste Escape drücken: erst geht die Sprechblase zu, beim zweiten Mal die Checkliste.
- Handy-Breite und Tablet-Breite, hell und dunkel.
- `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build`.

## 6. Aufwand

Klein: eine Datenliste, ein umgebauter Knopf, eine Sprechblase mit Stil, ein Test.
