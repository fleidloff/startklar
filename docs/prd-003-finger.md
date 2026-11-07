# PRD 003: Einsteigen mit dem Finger

| | |
|---|---|
| Status | Umgesetzt |
| Stand | 7. November 2026 |
| Anlass | Wunsch: Die Passagiere sollen auch über den Finger (die Fluggastbrücke) einsteigen können, nicht nur mit dem Bus. |
| Betroffene Dateien | `game/data.ts`, `game/state.ts`, `game/state.test.ts`, `components/Game.tsx`, `components/World.tsx`, `components/icons.tsx`, `components/scenes/Apron.tsx`, `components/scenes/Finger.tsx` (neu), `app/globals.css` |

## 1. Problem

Heute gibt es nur einen Weg, wie Passagiere ins Flugzeug kommen: den Vorfeldbus. Der Finger am Gebäude ist zwar gezeichnet, dockt aber von allein an, sobald ein Flugzeug parkt. Das Kind kann damit nichts tun.

An echten Flughäfen gibt es beides. Kinder kennen den Finger oft vom eigenen Urlaub. Er ist ein guter Anlass für ein eigenes Mini-Spiel.

## 2. Ziel

Das Kind entscheidet selbst, wie die Passagiere einsteigen: mit dem Bus oder mit dem Finger. Das Spiel bevorzugt keinen der beiden Wege.

**Erfolgskriterien**
- Nach dem Einwinken stehen beide Wege gleichwertig zur Wahl: über dem Flugzeug, im Fenster nach dem Einwinken, in der Checkliste und in der Werkzeugleiste.
- Ist ein Weg erledigt, verschwinden beide Knöpfe. Die Aufgabe „Einsteigen“ zählt als erledigt.
- Das Mini-Spiel mit dem Finger ist für ein Kind ab 8 Jahren ohne Erklärung lösbar.
- Alte Spielstände laden weiter.

## 3. Nicht-Ziele

- Kein Zwang, beide Wege auszuprobieren. Es gibt keine Belohnung für „beides gemacht“.
- Keine weiteren Finger pro Gate und keine Gates ohne Finger.
- Keine neue Zeichnung für das Flugzeug (zum Beispiel eine offene Tür).

## 4. Anforderungen

### Anforderung 1: Eine Aufgabe, zwei Wege

Die Aufgabe „Einsteigen“ kann mit zwei Werkzeugen erledigt werden: Vorfeldbus oder Finger.

- Über dem Flugzeug auf dem Vorfeld stehen beide runden Knöpfe nebeneinander.
- Das Banner oben sagt: „Vorfeldbus oder Finger? Du hast die Wahl!“
- Das Fenster nach dem Einwinken zeigt zwei große Knöpfe, einen für jeden Weg.
- Die Checkliste zeigt eine Zeile mit beiden Wegen und dem Wort „oder“ dazwischen. Nach dem Einsteigen steht dort nur noch der gewählte Weg mit Haken.
- Die Zahl an der Checkliste oben zählt „Einsteigen“ als eine Aufgabe, nicht als zwei.
- Ist einer der Wege erledigt, ist der andere gesperrt. Ein zweites Einsteigen gibt es nicht.

**Abnahme:** Ein Test in `game/state.test.ts` prüft: Nach dem Bus ist der Finger nicht mehr offen und umgekehrt. Ein zweiter Weg ändert den Spielstand nicht.

### Anforderung 2: Mini-Spiel „Finger andocken“

1. Der Finger steht eingefahren und schräg vom Flugzeug weggedreht am Gebäude.
2. Über der Kabine vorne am Finger pulsiert ein gelber Ring. Eine Hand zeigt den Weg zur grünen Tür am Flugzeug.
3. Das Kind zieht die Kabine mit dem Finger. Der Finger dreht sich um den runden Turm am Gebäude und fährt dabei aus oder ein.
4. Je näher die Kabine an der Tür ist, desto mehr passt sie ihre Höhe an die Tür an. Das Kind muss die Höhe nicht selbst einstellen.
5. Der Finger kann nicht in das Flugzeug hinein gezogen werden.
6. Lässt das Kind nahe der Tür los, rastet die Kabine ein. Es zischt.
7. Danach laufen acht Passagiere vom Gebäude durch den Finger ins Flugzeug.
8. Lässt das Kind zu weit weg los, bleibt der Finger stehen. Das Banner sagt: „Fast! Zieh die Kabine bis an die grüne Tür.“ Das Kind kann weiterziehen.

Der erste Hinweis erklärt das Wort: „Der Finger ist eine Brücke ins Flugzeug. Zieh ihn an die grüne Tür!“

**Abnahme:** Mini-Spiel einmal mit dem kleinsten Flugzeug (ATR 72) und einmal mit dem größten (Airbus A380) durchspielen.

### Anforderung 3: Der Finger zeigt die Wahl

- Der Finger dockt auf dem Vorfeld nur an, wenn das Kind den Finger gewählt hat. Sonst bleibt er eingefahren.
- Der wartende Bus am Gate fährt weg, sobald die Passagiere eingestiegen sind, egal auf welchem Weg.
- Beim Zurückschieben fährt der Finger wie bisher ein.

### Anforderung 4: Werkzeugleiste und Hilfe

- Die Werkzeugleiste links bekommt einen Knopf „Finger“ direkt unter dem Vorfeldbus.
- Alle Knöpfe der Leiste werden etwas kleiner, damit neun Knöpfe auf ein 16:10-Tablet passen.
- Die Hilfe nennt beide Wege.

### Anforderung 5: Spielstand

Alte Spielstände mit erledigtem Bus laden ohne Änderung. Ein Spielstand mit erledigtem Finger lädt ebenso.

## 5. Prüfung

- Zwei Flugzeuge abfertigen: eines mit Bus, eines mit Finger.
- Prüfen, dass nach dem einen Weg der andere Knopf überall verschwindet: Vorfeld, Werkzeugleiste, Checkliste.
- `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build`.

## 6. Offene Fragen

1. Soll die Höhe der Kabine ein eigener Schritt werden (zum Beispiel mit zwei Pfeil-Knöpfen)? Das wäre näher an der Wirklichkeit, aber ein Schritt mehr für das Kind.
2. Soll die Treppe am Flugzeug wegfahren, wenn der Finger angedockt ist? Heute steht sie bei beiden Wegen da.
