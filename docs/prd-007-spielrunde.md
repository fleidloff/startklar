# PRD 007: Spielrunde von 20 Minuten mit Pause

| | |
|---|---|
| Status | Entwurf, noch nicht umgesetzt |
| Stand | 7. November 2026 |
| Anlass | Wunsch: Eine Spielrunde dauert etwa 20 Minuten. Danach sind alle Flugzeuge gestartet, und es kommen keine neuen. Erst nach mindestens 20 Minuten Pause sind wieder 3 neue Flugzeuge im Tower. |
| Betroffene Dateien | `game/state.ts`, `game/state.test.ts`, `components/Game.tsx`, `components/scenes/Tower.tsx`, `components/icons.tsx` |

## 1. Problem

Heute kommt immer ein neues Flugzeug, sobald weniger als 3 Flugzeuge da sind. Das Spiel hat kein Ende. Ein Kind kann ohne Grenze weiterspielen. Eltern müssen das Spiel selbst beenden, und das gibt oft Streit.

## 2. Ziel

Eine Spielrunde hat ein natürliches Ende. Der Flughafen macht nach etwa 20 Minuten eine Pause. Das Kind fertigt die letzten Flugzeuge noch ab und sieht dann einen leeren Flughafen. Nach 20 Minuten Pause kommen 3 neue Flugzeuge.

**Erfolgskriterien**
- Eine Runde dauert meist 18 bis 25 Minuten.
- Kein Flugzeug wird mitten in der Abfertigung abgebrochen.
- Das Kind versteht ohne Erklärung, dass gerade Pause ist und wann es weitergeht.
- Das Kind sieht an der Uhr im Tower auf einen Blick, wie viel Zeit noch bis Mittag ist.
- Neu anfangen, Sommer und Winter oder Nacht umgehen die Pause nicht.
- Alte Spielstände laden weiter.

## 3. Nicht-Ziele

- Keine echte Kindersicherung. Wer den Speicher des Browsers löscht oder die Uhr des Geräts verstellt, umgeht die Pause.
- Keine Einstellung für Eltern, um die Zeiten zu ändern.
- Kein Zeitlimit für Weltkarte und Sticker. Sie sind auch in der Pause offen.
- Die Uhr im Tower zeigt nicht die echte Uhrzeit.

## 4. Begriffe

| Begriff | Bedeutung |
|---|---|
| Spielzeit | Zeit seit Rundenbeginn, in der das Spiel offen und sichtbar ist. Der Titelbildschirm zählt nicht. |
| Ankunftsfenster | Die ersten 15 Minuten Spielzeit. Nur in dieser Zeit kommen Flugzeuge wie heute. |
| Ausklang | Spielzeit ab 15 Minuten, solange noch Flugzeuge da sind. |
| Pause | Beginnt, wenn das letzte Flugzeug der Runde gestartet ist. Oder wenn das Spiel geschlossen oder unsichtbar ist. |

## 5. Anforderungen

### Anforderung 1: Beginn einer Runde

- Eine Runde beginnt mit 3 Flugzeugen im Anflug. Sie sind sofort im Tower sichtbar.
- Stehen noch Flugzeuge aus der letzten Runde am Gate, bleiben sie dort. Neue Flugzeuge kommen nur an freie Gates.
- Ein neues Spiel beginnt wie heute mit einem Flugzeug am Gate und einem im Anflug. Das ist die erste Runde.
- Das Banner sagt: „Der Flughafen ist wieder offen! 3 Flugzeuge sind im Anflug.“

### Anforderung 2: Ankunftsfenster

- In den ersten 15 Minuten Spielzeit kommen Flugzeuge wie heute: 7 Sekunden nach einem Start kommt ein neues, bis 3 da sind.
- Nach 15 Minuten Spielzeit kommen keine neuen Flugzeuge mehr. Das Kind fertigt die Flugzeuge ab, die noch da sind.

### Anforderung 3: Schnelle Kinder

- Hat das Kind alle Flugzeuge gestartet und sind noch keine 20 Minuten Spielzeit vorbei, kommt 1 neues Flugzeug.
- Das gilt nach jedem Start, bis 20 Minuten Spielzeit erreicht sind.
- Ab 20 Minuten Spielzeit kommt kein Flugzeug mehr.

**Abnahme:** Tests in `game/state.test.ts` prüfen:
- Bei 14 Minuten Spielzeit und 2 Flugzeugen darf ein Flugzeug kommen.
- Bei 16 Minuten Spielzeit und 1 Flugzeug darf keines kommen.
- Bei 16 Minuten Spielzeit und 0 Flugzeugen darf genau 1 kommen.
- Bei 21 Minuten Spielzeit und 0 Flugzeugen darf keines kommen.

### Anforderung 4: Die Uhr im Tower

- Im Tower ist unten rechts eine kleine runde Uhr mit Stundenzeiger und Minutenzeiger. Sie sieht aus wie die runden Knöpfe der Bedienung, ist aber kein Knopf.
- Die Uhr zeigt die Spielzeit der Runde. Jede Runde beginnt um 11:40. Nach 20 Minuten Spielzeit ist es 12 Uhr.
- Ist das Spiel zu oder unsichtbar, steht die Uhr. Nach einer kurzen Unterbrechung läuft sie dort weiter, wo sie stand.
- Die Zeit von jetzt bis 12 Uhr ist auf dem Zifferblatt ein farbiges Kuchenstück. Es wird kleiner, wie bei einer Küchenuhr. Um 12 Uhr ist es weg.
- Auf dem Zifferblatt gibt es keine Marke bei 11:55, also beim Ende des Ankunftsfensters. Das Spiel warnt nicht vor dem Ende.
- Braucht das Kind für die letzten Flugzeuge länger, läuft die Uhr über 12 Uhr hinaus, zum Beispiel bis 12:04.
- In der Pause steht die Uhr bei der Zeit, zu der das letzte Flugzeug gestartet ist.
- Der Minutenzeiger springt jede Minute einen Schritt weiter. Er bewegt sich nicht fließend.
- Bildschirmleser lesen die Uhr als „Flughafenuhr, 11:47 Uhr, noch 13 Minuten bis Mittag“.

**Abnahme:** Ein Test prüft: Bei 0 Minuten Spielzeit zeigt die Uhr 11:40, bei 20 Minuten 12:00, bei 24 Minuten 12:04.

### Anforderung 5: Ende einer Runde

- Die Runde endet, wenn nach dem Ankunftsfenster das letzte Flugzeug gestartet ist und kein neues mehr kommt.
- Es gibt ein Fenster: „Mittagspause am Flughafen!“ Darunter steht: „Du hast heute 7 Flugzeuge abgefertigt.“
- Das Fenster hat einen Knopf zur Weltkarte.

### Anforderung 6: Pause

- Die Pause dauert mindestens 20 Minuten.
- Die Pause zählt nach der Uhr des Geräts. Sie läuft auch, wenn das Spiel zu ist.
- Jede Unterbrechung ab 20 Minuten ist eine gültige Pause. Ein Kind spielt zum Beispiel 8 Minuten und kommt nach einer Stunde zurück. Dann beginnt eine neue Runde mit 3 Flugzeugen.
- Eine Unterbrechung unter 20 Minuten ist keine Pause. Die Runde läuft mit der alten Spielzeit weiter.
- Läuft die Uhr des Geräts rückwärts, beginnt die Pause neu.

**Abnahme:** Tests prüfen:
- 19 Minuten nach Rundenende ist noch Pause.
- 20 Minuten nach Rundenende beginnt eine neue Runde.
- Eine Unterbrechung von 20 Minuten mitten in der Runde setzt die Spielzeit auf 0.
- Eine Unterbrechung von 5 Minuten lässt die Spielzeit gleich.

### Anforderung 7: Was das Kind in der Pause sieht

- Das Vorfeld ist leer, bis auf Flugzeuge, die noch aus einer alten Runde am Gate stehen.
- Der Radar im Tower ist leer. Auf dem Radar ist eine schlafende Sonne mit „Zzz“.
- Die Leiste zeigt: „Mittagspause! Die Flugzeuge kommen in 12 Minuten wieder.“ Die Minuten sind immer ausgeschrieben, nie „Min.“.
- Ein Ring um die Sonne füllt sich in der Pause langsam. Ist er voll, kommen die Flugzeuge.
- Weltkarte, Sticker, Sommer und Winter, Ton und Nacht bleiben bedienbar.
- Bildschirmleser lesen den Text der Leiste. Der Ring hat keinen eigenen Text.
- Mit „Bewegung reduzieren“ füllt sich der Ring in Schritten von einer Minute statt fließend.

### Anforderung 8: Keine Abkürzung

- „Neu anfangen“ löscht Flüge und Sticker wie heute. Die Pause bleibt.
- Sommer und Winter ändern nichts an der Runde.
- Die Nacht aus PRD 004 bringt in der Pause kein Postflugzeug. Kommt die Nacht im Ankunftsfenster, zählt das Postflugzeug wie jedes andere Flugzeug.

### Anforderung 9: Eltern überspringen die Pause

- Ein Elternteil hält die Sonne im Tower 3 Sekunden lang gedrückt. Ein kurzes Antippen tut nichts.
- Ein Fenster „Für Eltern“ öffnet sich. Es zeigt eine Malaufgabe: eine Zahl von 12 bis 19 mal eine Zahl von 3 bis 9, zum Beispiel „14 mal 7“.
- Das Fenster hat große Zifferntasten, eine Taste zum Löschen und einen Knopf „Fertig“.
- Ist die Antwort richtig, endet die Pause sofort. Eine neue Runde beginnt wie in Anforderung 1.
- Ist die Antwort falsch, schließt sich das Fenster. Beim nächsten Versuch kommt eine neue Aufgabe.
- Das Fenster hat einen Knopf „Abbrechen“ und schließt sich auch mit der Escape-Taste.
- Mit der Tastatur öffnet sich das Fenster, wenn man auf der Sonne 3 Sekunden lang die Leertaste oder Enter gedrückt hält. Die Zifferntasten der Tastatur funktionieren im Fenster.
- Bildschirmleser lesen die Sonne als „Pause, für Eltern: gedrückt halten zum Überspringen“.

**Abnahme:** Ein Test prüft: Nach dem Überspringen beginnt sofort eine neue Runde mit Spielzeit 0.

### Anforderung 10: Spielstand

- Der Spielstand speichert die Spielzeit der Runde und den letzten Zeitpunkt, an dem gespielt wurde.
- Alte Spielstände laden ohne Änderung. Sie beginnen mit einer neuen Runde.
- Die Zeiten 15 Minuten, 20 Minuten Spielzeit und 20 Minuten Pause stehen als Konstanten in `game/state.ts`.

## 6. Prüfung

- Eine ganze Runde spielen und prüfen, dass nach 15 Minuten keine neuen Flugzeuge kommen.
- Die Uhr beobachten: Sie beginnt bei 11:40, steht bei geschlossenem Spiel und steht in der Pause still.
- Schnell spielen und prüfen, dass vor 20 Minuten Spielzeit noch einzelne Flugzeuge kommen.
- Die Pause abwarten und prüfen, dass 3 Flugzeuge im Tower sind.
- Das Spiel mitten in der Runde schließen und nach 20 Minuten öffnen. Es beginnt eine neue Runde.
- In der Pause „Neu anfangen“ drücken. Die Pause bleibt.
- Die Sonne 3 Sekunden halten, die Aufgabe falsch lösen, dann richtig lösen. Erst die richtige Antwort beendet die Pause.
- Einen alten Spielstand laden.
- `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build`.

## 7. Entschieden

- Die Uhr hat Zeiger und keine Ziffern. Das Kuchenstück zeigt die restliche Zeit auch Kindern, die die Uhr noch nicht lesen können.
- Die Pause heißt Mittagspause, weil die Uhr bei 12 Uhr endet. Darum zeigt die Pause eine schlafende Sonne und keinen Mond.
- Eltern überspringen die Pause mit einer Rechenaufgabe, nicht mit einer PIN. Eine PIN braucht Einrichtung und einen Weg zum Zurücksetzen, schützt hier aber kaum besser.
- Das Spiel kündigt das Ende des Ankunftsfensters nicht an.
- Es gibt keine Grenze für Runden pro Tag.
