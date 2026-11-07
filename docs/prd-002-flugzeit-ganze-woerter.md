# PRD 002: Flugzeit in ganzen Wörtern

| | |
|---|---|
| Status | Entwurf, noch nicht umgesetzt |
| Stand | 7. November 2026 |
| Anlass | Ein Kind (8 Jahre) stolperte beim Lesen über „Std.“ in der Flugzeit auf der Weltkarte. |
| Betroffene Dateien | `game/data.ts`, `game/state.test.ts` |

## 1. Problem

Das Spiel ist für Kinder ab 8 Jahren. Die Flugzeit im Zielfenster der Weltkarte steht heute als „2 Std. 15 Min.“ da. „Std.“ und „Min.“ sind für ein Kind keine Wörter. Sie unterbrechen das Lesen.

Bei voller Stunde erscheint außerdem „2 Std. 0 Min.“.

## 2. Ziel

Die Flugzeit besteht aus ganzen Wörtern: „Stunden“ statt „Std.“ und „Minuten“ statt „Min.“.

## 3. Nicht-Ziele

Andere Abkürzungen bleiben, weil Kinder sie kennen und sie im Spiel Sinn ergeben: „km“, „m“, „km/h“, „&“, „USA“, Flugnummern wie „LH 204“ und Flughafen-Kennungen wie „BER“.

## 4. Anforderungen

`flightTime` in `game/data.ts` gibt die Zeit in ganzen Wörtern zurück. Sie beugt richtig, und eine Null-Angabe fällt weg:

| Minuten gesamt | Heute | Neu |
|---|---|---|
| 45 | `45 Minuten` | `45 Minuten` |
| 61 | `1 Std. 1 Min.` | `1 Stunde 1 Minute` |
| 120 | `2 Std. 0 Min.` | `2 Stunden` |
| 135 | `2 Std. 15 Min.` | `2 Stunden 15 Minuten` |

Die längere Angabe muss in das Zielfenster der Weltkarte passen.

**Abnahme:** Ein Test in `game/state.test.ts` prüft die vier Fälle aus der Tabelle. Ein Screenshot vom Zielfenster eines fernen Ziels (zum Beispiel Sydney) zeigt die Flugzeit ohne Umbruch-Fehler.

## 5. Prüfung

- Zielfenster für ein nahes Ziel (unter einer Stunde) und ein fernes Ziel öffnen.
- `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build`.

## 6. Aufwand

Sehr klein: eine Funktion und ein Test.
