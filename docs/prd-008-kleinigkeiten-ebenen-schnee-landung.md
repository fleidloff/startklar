# PRD 008: Kleinigkeiten bei Nacht, Schnee und Landung, Flughafen Hamburg

| | |
|---|---|
| Status | Entwurf, noch nicht umgesetzt |
| Stand | 7. November 2026 |
| Anlass | Beim Spielen aufgefallen: Mond und Lichter der Startbahn sind vor dem Flugzeug. Im Tower schneit es. Ein zweites Flugzeug kann landen, bevor das erste eingewunken ist. Bei Nacht liegt das Licht des Terminals über den Gate-Schildern. Dazu ein Wunsch: Unser Flughafen ist Hamburg, und das darf am Gebäude stehen. |
| Betroffene Dateien | `components/art.tsx`, `components/World.tsx`, `components/scenes/Takeoff.tsx`, `components/scenes/Marshaller.tsx`, `components/scenes/Tower.tsx`, `components/Game.tsx`, `components/scenes/WorldMap.tsx`, `app/globals.css`, `game/data.ts`, `game/state.ts`, `game/state.test.ts` |

## 1. Problem

Vier kleine Fehler stören das Bild vom echten Flughafen. Dazu kommt ein Wunsch.

- Bei Nacht sind Mond, Sterne und die Lichter der Startbahn vor dem startenden Flugzeug. Das Flugzeug sieht aus, als ob es hinter dem Mond fliegt.
- Im Winter schneit es auch im Tower. Der Tower ist ein Raum mit Fenstern. Dort drin schneit es nicht.
- Im Tower kann das Kind ein zweites Flugzeug landen lassen, obwohl das erste noch nicht eingewunken ist. Dann stehen zwei Flugzeuge auf der Rollbahn. Das sieht aus wie ein Unfall. Auch an einem echten Flughafen ist das gefährlich.
- Bei Nacht liegt das gelbe Licht aus den Fenstern des Terminals über den Gate-Schildern. Die Schilder sind dann blass und schlecht zu lesen.
- Der Flughafen hat keinen Namen. Auf der Weltkarte heißt er nur „Unser Flughafen“. Die Lage auf der Karte ist heute Frankfurt. Der Flughafen soll Hamburg sein.

## 2. Ursache

Drei der vier Fehler haben dieselbe Ursache. Jedes Licht der Nacht kommt über `<Lamp>` in eine einzige Ebene. Diese Ebene liegt über allem anderen in der Szene. Darum sind Mond, Sterne, Lichter am Boden und das Licht des Terminals immer ganz vorne. Die Reihenfolge der Tiefe gilt für Lichter nicht.

Der Schnee ist eine Ebene über dem ganzen Spiel. Nur die Weltkarte hat keinen Schnee. Der Tower ist nicht ausgenommen.

Der Tower prüft beim Landen nicht, ob schon ein Flugzeug auf das Einwinken wartet.

Die Lage des Flughafens steht in `HOME` in `game/data.ts`. Der Name „Unser Flughafen“ steht dort und ein zweites Mal fest im Text der Weltkarte.

## 3. Ziel

Bei Nacht sind alle Dinge in der richtigen Reihenfolge: Was hinten ist, ist auch hinten zu sehen. Schnee gibt es nur draußen. Es landet immer nur ein Flugzeug nach dem anderen. Das Kind weiß, dass es in Hamburg spielt.

**Erfolgskriterien**
- Kein Licht ist vor einem Ding, das in Wirklichkeit davor steht.
- Im Tower fällt Schnee nur hinter den Fenstern.
- Es steht nie mehr als ein Flugzeug auf der Rollbahn und wartet auf das Einwinken.
- Das Kind versteht ohne Erklärung, warum ein Flugzeug gerade nicht landen darf.
- Die Gate-Schilder sind bei Nacht so gut zu lesen wie am Tag.
- Das Kind liest „Hamburg“ am Terminal und auf der Weltkarte.
- Die Kamera auf dem Vorfeld bleibt bei Nacht so flüssig wie heute.
- Alte Spielstände laden weiter.

## 4. Nicht-Ziele

- Keine neuen Lichter und keine neue Grafik.
- Keine echten Regeln für Abstände zwischen Flugzeugen. Es gibt nur eine Regel: erst einwinken, dann landen.
- Kein Schnee in anderen Räumen. Außer dem Tower gibt es heute keinen Raum.
- Kein Logo und kein echter Schriftzug des Hamburger Flughafens. Kein Nachbau echter Gebäude.
- Der Name des Spiels bleibt „Flughafen-Manager: Startklar!“.
- Hamburg wird kein Ziel auf der Weltkarte.

## 5. Anforderungen

### Anforderung 1: Lichter in der richtigen Ebene

- Ein Licht liegt in der Tiefe dort, wo sein Ding steht. Was davor steht, verdeckt das Licht.
- Das Licht bleibt hell. Der Schatten der Nacht liegt nicht darauf.
- Die eigenen Lichter eines Flugzeugs bleiben vor dem Flugzeug. Das gilt auch für Fahrzeuge.
- Das gilt in jeder Szene mit Nacht: Vorfeld, Tower, die Mini-Spiele auf dem Vorfeld, Einwinken und Start.

### Anforderung 2: Start bei Nacht

- Mond und Sterne sind ganz hinten. Wolken, Hügel, Tower, Terminal und Flugzeug sind davor.
- Die Lichter am hinteren Rand der Startbahn sind hinter dem Flugzeug.
- Die Lichter am vorderen Rand der Startbahn dürfen vor den Rädern sein. Sie sind näher am Betrachter als das Flugzeug.
- Die Lichter an Flügeln, Heck und Rumpf des Flugzeugs bleiben vor dem Flugzeug.
- Hebt das Flugzeug ab und fliegt vor dem Mond, verdeckt es den Mond.

### Anforderung 3: Vorfeld bei Nacht

- Die Lichter der Rollbahn und der Startbahn liegen auf dem Boden. Ein Flugzeug oder Fahrzeug darüber verdeckt sie.
- Die Lichtkegel der Masten dürfen auf Flugzeugen liegen. Sie beleuchten die Flugzeuge.
- Die Lampen oben an den Masten verdeckt nur, was in der Tiefe davor steht.

### Anforderung 4: Gate-Schilder bei Nacht

- Die Gate-Schilder sind vor dem Licht aus den Fenstern des Terminals.
- Die Schilder leuchten bei Nacht wie echte Schilder mit Licht dahinter. Der Schatten der Nacht liegt nicht darauf.
- Schrift und Farbe der Schilder sind bei Nacht wie am Tag.
- Ein Flugzeug oder eine Fluggastbrücke vor einem Schild verdeckt das Schild weiter.

### Anforderung 5: Kein Schnee im Tower

- Im Tower fällt Schnee nur draußen: im Himmel, über den Hügeln und über dem Vorfeld, das man durch die Fenster sieht.
- Fensterrahmen, Radar, Pult, Uhr, Lichtschalter und alle Knöpfe sind vor dem Schnee.
- Der Schnee bewegt sich wie heute. Mit „Bewegung reduzieren“ verhält er sich auch wie heute.
- In allen anderen Szenen bleibt der Schnee wie heute.

### Anforderung 6: Eine Landung nach der anderen

- Ein Flugzeug darf nur landen, wenn kein anderes Flugzeug gerade landet und keines auf das Einwinken wartet.
- Die anderen Flugzeuge bleiben auf dem Radar in der Warteschleife. Sie kreisen wie heute.
- In dieser Zeit zeigt der Radar keine Hand mit Hinweis.
- Will das Kind trotzdem eine Linie von einem wartenden Flugzeug ziehen, beginnt keine Linie. Es kommt der Ton für „falsch“, und die Leiste sagt: „Warte! Erst muss Flug LH 412 eingewunken werden.“ Die Flugnummer ist die des Flugzeugs auf der Rollbahn.
- Landet gerade ein Flugzeug, sagt die Leiste: „Warte! Flug LH 412 landet gerade.“
- Ist das Flugzeug eingewunken, darf das nächste landen. Die Leiste zeigt wieder den normalen Hinweis.
- Der Knopf zum Einwinken bleibt wie heute. So findet das Kind den Weg.
- Bildschirmleser lesen den Text der Leiste.
- Die Regel gilt auch im Spielstand: Die Aktion zum Landen ändert nichts, wenn schon ein anderes Flugzeug auf das Einwinken wartet.
- Ein alter Spielstand kann schon zwei Flugzeuge beim Einwinken haben. Er lädt ohne Änderung. Das nächste Flugzeug landet erst, wenn beide eingewunken sind.
- Das Postflugzeug der Nacht folgt derselben Regel.

**Abnahme:** Tests in `game/state.test.ts` prüfen:
- Wartet kein Flugzeug auf das Einwinken, landet ein Flugzeug.
- Wartet ein Flugzeug auf das Einwinken, bleibt ein zweites Flugzeug im Anflug.
- Nach dem Einwinken des ersten Flugzeugs landet das zweite.

### Anforderung 7: Unser Flughafen ist Hamburg

- `HOME` in `game/data.ts` liegt bei Hamburg: Breite 53,63, Länge 9,99.
- `HOME` hat den Namen „Hamburg“. Die Weltkarte nimmt den Namen aus `HOME` und schreibt ihn nicht selbst.
- Auf dem Dach des Terminals stehen große Buchstaben: „FLUGHAFEN HAMBURG“. Sie zeigen zum Vorfeld.
- Die Buchstaben sind in der Tiefe richtig. Was davor steht, verdeckt sie.
- Bei Nacht leuchten die Buchstaben wie die Gate-Schilder. Der Schatten der Nacht liegt nicht darauf.
- Ist die Kamera weit weg, darf die Schrift klein sein. Sie darf aber nicht über andere Dinge ragen.
- Beim Start steht dasselbe Wort auf dem Terminal im Hintergrund.
- Auf der Weltkarte zeigt das rote Schild beim Stern „Hamburg“. Darunter steht klein „Unser Flughafen“.
- Bildschirmleser lesen den Stern auf der Karte als „Unser Flughafen: Hamburg“. Das Vorfeld heißt für Bildschirmleser „Vorfeld am Flughafen Hamburg“.
- Flugzeiten und Entfernungen auf der Weltkarte rechnen ab Hamburg. Die Werte ändern sich ein wenig. Zum Beispiel dauert der Flug nach Zürich jetzt 1 Stunde 22 Minuten statt 51 Minuten.
- Kairo ist ab Hamburg 3132 Kilometer weit. Damit ist Kairo ein Langstreckenziel. Flüge nach Kairo bekommen jetzt ein Langstreckenflugzeug.
- Alte Spielstände laden ohne Änderung. Ein Flugzeug, das schon da ist, behält sein Ziel und seinen Typ.

**Abnahme:** Ein Test prüft: Ein Flug nach Kairo ist ein Langstreckenflug, ein Flug nach Berlin nicht.

## 6. Hinweise zur Umsetzung

- Die eine Ebene für Lichter reicht nicht. Lichter brauchen eine Tiefe wie alle anderen Dinge. Ein möglicher Weg: Dinge vor einem Licht schneiden ihre Form aus der Ebene der Lichter aus. `Cover` und `Bright` in `components/art.tsx` machen das heute schon für den Schatten der Nacht.
- Der Mond in `Takeoff.tsx` und die Sterne brauchen vielleicht keine Lampe. Sie können ganz hinten liegen und einfach nicht abgedunkelt werden.
- Für den Schnee im Tower kann der Himmel in eine eigene Ebene unter dem Schnee. Fenster, Rahmen und Pult liegen darüber.
- Die Regel für die Landung gehört einmal in `game/state.ts`. Der Tower fragt sie dort ab und rechnet sie nicht selbst nach.
- Für die Schrift am Terminal gibt es `FaceText` in `components/art.tsx`. Die Gate-Schilder nutzen es schon.

## 7. Prüfung

- Bei Nacht starten und prüfen: Das Flugzeug ist vor Mond und Sternen und vor den Lichtern am hinteren Rand der Startbahn.
- Bei Nacht auf dem Vorfeld ein Flugzeug zur Startbahn rollen lassen. Es verdeckt die Lichter am Boden.
- Bei Nacht die Gate-Schilder ansehen und nah heranzoomen. Sie sind hell und gut zu lesen.
- Bei Nacht jedes Mini-Spiel und das Einwinken öffnen und auf Lichter vor Dingen achten.
- Im Winter den Tower öffnen. Schnee fällt nur hinter den Fenstern.
- Ein Flugzeug landen und nicht einwinken. Ein zweites Flugzeug kann nicht landen, und die Leiste sagt warum. Nach dem Einwinken kann es landen.
- Während einer Landung ein zweites Flugzeug ziehen. Es kann nicht landen.
- Das Vorfeld bei Tag und bei Nacht ansehen. „FLUGHAFEN HAMBURG“ steht auf dem Terminal und ist gut zu lesen.
- Ein Flugzeug starten. Auf dem Terminal im Hintergrund steht Hamburg.
- Die Weltkarte öffnen. Der Stern liegt bei Hamburg, und das Schild sagt „Hamburg“.
- Einen alten Spielstand laden.
- Die Kamera auf dem Vorfeld bei Nacht schnell bewegen und auf Ruckeln achten.
- `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build`.

## 8. Entschieden

- Auch während einer Landung darf kein zweites Flugzeug landen. Beide würden sonst gleich danach zusammen auf der Rollbahn stehen.
- Die Flugzeuge kreisen in der Warteschleife. So ist es auch an echten Flughäfen.
- Die Lichtkegel der Masten dürfen auf Flugzeugen liegen. Das ist richtig, denn die Masten beleuchten die Flugzeuge.
- Die Lichter am vorderen Rand der Startbahn dürfen vor dem Flugzeug sein. Sie stehen näher am Betrachter.
- Am Terminal steht „Flughafen Hamburg“ und nicht „Hamburg Airport“. Das Spiel ist auf Deutsch, und ein echter Schriftzug wird nicht nachgebaut.
- Die Schrift steht auf dem Dach. Dort ist sie aus jeder Szene auf dem Vorfeld zu sehen und stört die Gate-Schilder nicht.
