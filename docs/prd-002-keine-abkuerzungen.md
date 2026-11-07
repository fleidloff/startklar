# PRD 002: Keine Abkürzungen im Spiel

| | |
|---|---|
| Status | Entwurf, noch nicht umgesetzt |
| Stand | 7. November 2026 |
| Anlass | Ein Kind (8 Jahre) stolperte beim Lesen über „Std.“ in der Flugzeit auf der Weltkarte. |
| Betroffene Dateien | `game/data.ts`, `components/scenes/WorldMap.tsx`, `components/scenes/Takeoff.tsx`, `components/scenes/Marshaller.tsx`, `game/state.test.ts` |

## 1. Problem

Das Spiel ist für Kinder ab 8 Jahren. Kinder in diesem Alter lesen Wort für Wort. Eine Abkürzung wie „Std.“ oder „km/h“ ist für sie kein Wort, sondern ein Rätsel. Sie unterbricht das Lesen und das Spiel.

Eine Suche durch alle Texte im Spiel (Daten, Szenen, Hinweise, Fenster, Schilder) findet diese Abkürzungen:

| Stelle | Heute | Neu |
|---|---|---|
| Flugzeit auf der Weltkarte (`flightTime` in `game/data.ts`) | `2 Std. 15 Min.` | `2 Stunden 15 Minuten` |
| Entfernung zum Ziel (`WorldMap.tsx`, Zeile 169) | `1.234 km` | `1.234 Kilometer` |
| Länge des Flugzeugs (`WorldMap.tsx`, Zeile 139) | `37,6 m` | `37,6 Meter` |
| Spannweite des Flugzeugs (`WorldMap.tsx`, Zeile 140) | `35,8 m` | `35,8 Meter` |
| Tempo des Flugzeugs (`WorldMap.tsx`, Zeile 142) | `840 km/h` | `840 Kilometer pro Stunde` |
| Tempo-Anzeige beim Start (`Takeoff.tsx`, Zeile 207) | `180 km/h` | `180 Kilometer pro Stunde` |
| Hinweis beim Start (`Takeoff.tsx`, Zeile 94) | `Tempo 180 km/h – schneller!` | `Tempo 180 Kilometer pro Stunde – schneller!` |
| Abstands-Schilder beim Einwinken (`Marshaller.tsx`, Zeile 179) | `5m`, `1m` | `5 Meter`, `1 Meter` |
| Hersteller der ATR 72 (`game/data.ts`) | `Frankreich & Italien` | `Frankreich und Italien` |

## 2. Ziel

Jeder Text, den ein Kind im Spiel liest, besteht aus ganzen Wörtern.

**Erfolgskriterien**
- Kein Text im Spiel enthält eine der Abkürzungen aus der Tabelle in Abschnitt 1.
- Alle neuen, längeren Texte passen in ihre Felder und Schilder, auch auf einem 16:10-Tablet.
- Die Flugzeit ist richtig gebeugt (Einzahl und Mehrzahl, siehe Anforderung 1).

## 3. Nicht-Ziele

- **Flugnummern** wie „LH 204“ bleiben. Sie sind Kennungen, keine Abkürzungen, und stehen so auch an echten Flughäfen.
- **Flughafen-Kennungen** wie „(BER)“ hinter dem Städtenamen bleiben aus demselben Grund (siehe aber offene Frage 1).
- **Flugzeug-Namen** wie „Airbus A320“ oder „ATR 72“ bleiben. Das sind Eigennamen.
- **Englische Wörter** wie „Gate“ oder „Pushback“ sind keine Abkürzungen und nicht Teil dieses PRD.
- Texte für Entwickler (Quelltext, `README.md`, Kommentare) ändern sich nicht.

## 4. Anforderungen

### Anforderung 1: Flugzeit in ganzen Wörtern

`flightTime` in `game/data.ts` gibt die Zeit in ganzen Wörtern zurück und beugt richtig:

| Minuten gesamt | Ergebnis |
|---|---|
| 45 | `45 Minuten` |
| 61 | `1 Stunde 1 Minute` |
| 120 | `2 Stunden` |
| 135 | `2 Stunden 15 Minuten` |

Heute erscheint bei voller Stunde „2 Std. 0 Min.“. Eine Null-Angabe fällt künftig weg.

**Abnahme:** Ein Test in `game/state.test.ts` prüft die vier Fälle aus der Tabelle.

### Anforderung 2: Maßeinheiten ausschreiben

- Meter, Kilometer und Kilometer pro Stunde stehen als ganze Wörter da (siehe Tabelle in Abschnitt 1).
- Zahlen behalten das deutsche Format mit Punkt und Komma (`toLocaleString("de-DE")`).

**Abnahme:** Weltkarte, Zielfenster und Flugzeug-Steckbrief zeigen keine Einheiten-Abkürzung mehr.

### Anforderung 3: Platz für längere Texte

Zwei Stellen sind heute auf kurze Texte zugeschnitten:

- **Tempo-Anzeige beim Start** (`Takeoff.tsx`): Der Text steht rechts neben dem Tempo-Balken und hat dort etwa 100 Pixel Platz. „180 Kilometer pro Stunde“ braucht bei Schriftgröße 24 etwa das Dreifache. Lösung: Zahl groß in einer Zeile, darunter „Kilometer pro Stunde“ kleiner in einer zweiten Zeile. Alternative: Das Feld breiter machen.
- **Abstands-Schilder beim Einwinken** (`Marshaller.tsx`): Das Pfeil-Schild ist 70 Pixel breit. „5 Meter“ passt bei Schriftgröße 22 nicht hinein. Lösung: Schild breiter machen (etwa 110 Pixel), die Pfeilspitze bleibt.

**Abnahme:** Screenshot beider Stellen. Kein Text ragt über seinen Rahmen.

### Anforderung 4: Regel für neue Texte

Neue Texte im Spiel verwenden keine Abkürzungen. Diese Regel steht ab jetzt in diesem PRD und gilt für alle folgenden PRDs.

## 5. Prüfung

- Das ganze Spiel einmal durchspielen: Tower, Einwinken, alle Aufgaben, Pushback, Start, Weltkarte mit Zielfenster und Steckbrief.
- Je einen Steckbrief für ein kurzes und ein langes Ziel öffnen (Flugzeit unter und über einer Stunde).
- `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build`.

## 6. Aufwand

Klein. Die meisten Änderungen sind einzelne Texte. Nur die zwei Stellen aus Anforderung 3 brauchen eine kleine Anpassung am Layout.

## 7. Offene Fragen

1. Sollen die Flughafen-Kennungen in Klammern, wie „Tokio (HND)“, ganz wegfallen? Sie sind keine Wörter, und ein Kind kann sie nicht vorlesen. Sie zeigen aber, wie es am echten Flughafen aussieht.
2. „USA“ steht als Landesname beim Ziel New York und als Herkunft bei Boeing. Bleibt „USA“, weil Kinder es so kennen und sagen, oder wird es zu „Vereinigte Staaten“?
