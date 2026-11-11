# PRD 009: Parkplatz mit Schranke

| | |
|---|---|
| Status | Umgesetzt |
| Stand | 11. November 2026 |
| Anlass | Wunsch: Ein Parkplatz, auf dem ständig Autos ankommen. Das Kind öffnet die Schranke und parkt die Autos. Die Fluggäste aus den Autos fliegen später mit. |
| Betroffene Dateien | `game/data.ts`, `game/state.ts`, `game/state.test.ts`, `components/art.tsx`, `components/icons.tsx`, `components/scenes/Parking.tsx` (neu), `components/scenes/Apron.tsx`, `components/Game.tsx`, `components/scenes/BusGame.tsx`, `components/scenes/Finger.tsx`, `components/scenes/Baggage.tsx` |

## 1. Problem

Das Spiel zeigt nur die Seite des Flughafens mit den Flugzeugen: Tower, Gates, Vorfeld und Startbahn. Kinder kennen einen Flughafen zuerst von der anderen Seite. Sie kommen mit dem Auto, suchen einen Parkplatz und gehen mit dem Koffer ins Terminal. Diese Seite fehlt.

Die Fluggäste im Bus, im Finger und ihre Koffer im Gepäckspiel kommen heute aus dem Nichts. Das Kind sieht nicht, woher sie kommen.

## 2. Ziel

Es gibt einen Parkplatz vor dem Terminal. Dort kommen Autos mit Fluggästen an. Das Kind öffnet die Schranke und parkt jedes Auto auf einem passenden Platz. Die Familie geht mit ihrem Koffer ins Terminal. Später sieht das Kind dieselbe Familie im Bus und denselben Koffer im Gepäckspiel.

Der Parkplatz ist freiwillig. Kein Flugzeug wartet auf ein geparktes Auto.

**Erfolgskriterien**
- Ein Kind ab 5 Jahren parkt ein Auto ohne Erklärung.
- Das Kind erkennt die Familie aus dem Auto im Bus wieder.
- Kein Flugzeug braucht den Parkplatz, um zu starten.
- Der Parkplatz läuft auf einem mittleren Android-Tablet flüssig (Ziel aus PRD 001: 60 Bilder pro Sekunde).
- Die Pause aus PRD 007 gilt auch für den Parkplatz.
- Alte Spielstände laden weiter.

## 3. Nicht-Ziele

- Keine Gepäckwagen zum Einsammeln.
- Kein Lenken. Das Kind zieht das Auto auf den Platz. Es gibt kein Lenkrad und kein Rückwärtsfahren.
- Keine Strafe für falsches Parken und keine Punkte.
- Keine Ausfahrt, die das Kind bedient. Autos fahren selbst weg.
- Der Parkplatz ist nicht auf dem Vorfeld zu sehen. Er ist eine eigene Szene.
- Der Parkplatz ist keine Aufgabe in der Checkliste.
- Kein neuer Ton außer der vorhandenen Hupe.

## 4. Begriffe

| Begriff | Bedeutung |
|---|---|
| Parkplatz | Die neue Szene. Ein Platz mit Schranke, 10 Parkplätzen und dem Eingang des Terminals. |
| Stellplatz | Ein einzelner Platz für ein Auto. Ein Zeichen auf dem Boden zeigt, für welches Auto er ist. |
| Gast | Ein Auto mit Familie, das zu einem Flug gehört. Ein Gast hat eine Farbe. |
| Fremdes Auto | Ein Auto ohne Flug. Die Leute darin holen jemanden ab. |
| Besuch | Ein Mal auf dem Parkplatz: vom Öffnen der Szene bis zum Verlassen. |

## 5. Anforderungen

Die Umsetzung hat zwei Stufen. Stufe 1 ist für sich spielbar. Stufe 2 baut darauf auf.

### Stufe 1

#### Anforderung 1: Weg zum Parkplatz

- In der rechten Leiste ist ein neuer runder Knopf „Parkplatz“ mit einem Auto. Er steht unter dem Knopf „Weltkarte“.
- Der Knopf führt zur Szene Parkplatz. Der Knopf „Vorfeld“ führt zurück.
- Der Knopf pulsiert nicht.
- Die Hilfe hat eine neue Zeile: „Parkplatz: Öffne die Schranke und parke die Autos. Die Familien fliegen mit!“

#### Anforderung 2: Aussehen

- Der Parkplatz hat denselben Stil wie das Vorfeld: dicke Konturen, kräftige Farben, Blick schräg von oben.
- Die ganze Szene passt auf einen Bildschirm. Die Kamera steht still. Es gibt kein Verschieben und kein Zoomen.
- Links kommt eine Straße mit der Schranke und einem Ticketautomaten.
- In der Mitte sind 10 Stellplätze in zwei Reihen mit einer Fahrspur dazwischen.
- Rechts ist der Eingang des Terminals mit dem Schild „Abflug“.
- Auf dem Boden jedes Stellplatzes ist ein großes weißes Zeichen. Es gibt drei Arten:

| Art | Zeichen | Anzahl | Auto |
|---|---|---|---|
| Klein | Auto | 6 | Kleinwagen |
| Groß | Wohnmobil, Platz doppelt so breit | 2 | Wohnmobil |
| Strom | Stecker mit Ladesäule | 2 | Elektroauto |

- Die drei Autos sehen deutlich verschieden aus. Das Elektroauto hat einen grünen Blitz an der Seite.
- Neben der Einfahrt steht ein Schild. Es verdeckt weder Schranke noch Ticketautomat noch Straße. Es zeigt grün „FREI 2“ mit der Zahl der freien Plätze. Ist kein Platz frei, zeigt es rot „BESETZT“.

#### Anforderung 3: Ein Auto kommt

- Öffnet das Kind den Parkplatz, sind 1 bis 3 Plätze frei. Alle anderen Plätze sind besetzt. Während das Kind weg war, sind Autos gekommen und gegangen.
- Bei jedem Besuch kommen genau 3 Autos nacheinander. Danach ist der Parkplatz voll.
- 2 Sekunden nach dem dritten Parken kommt das Lob „Parkplatz voll!“ mit dem Knopf „Zum Vorfeld“. Die Leiste sagt: „Der Parkplatz ist voll! Jetzt warten die Flugzeuge auf dich.“
- Ab Minute 17 der Runde (Spielzeit aus PRD 007) bleibt der Parkplatz voll. Beim Öffnen ist kein Platz frei, und kein Auto kommt. Es gibt kein Lob. So kann sich das Kind vor dem Mittag um die Flugzeuge kümmern. Nach der Pause beginnt eine neue Runde, und die Autos kommen wieder.
- Ein Flug kann einen Gast haben, wenn er Fluggäste hat, noch nicht zum Start bereit ist und noch keinen Gast hat. Jeder Flug hat höchstens einen Gast.
- Das Postflugzeug hat keine Fluggäste. Für Postflüge kommen keine Gäste.
- Kann ein Flug einen Gast haben, ist das Auto ein Gast. Es gehört zu dem Flug ohne Gast, der zuerst da war.
- Sonst ist das Auto ein fremdes Auto. Es hat keine Sprechblase. Nach dem Parken geht eine Person ins Terminal. Die Leiste sagt: „Gut geparkt! Der Besuch holt jemanden vom Flugzeug ab.“
- Es wartet immer höchstens ein Auto an der Schranke.
- Das nächste Auto fährt 2 Sekunden nach dem letzten Parken vor.
- Über einem Gast ist eine Sprechblase mit der Flagge des Ziels und der Flugnummer.
- Das Banner zeigt links den Flug wie in den Mini-Spielen: „Flug LH 204 nach Berlin (BER)“ mit Flagge.
- In der Pause aus PRD 007 sind keine Flugzeuge da. Darum kommt auch kein Auto. Die Leiste zeigt den Text der Pause wie überall.

#### Anforderung 4: Schranke

- Das Auto hält vor der Schranke. Die Leiste sagt: „Tipp die Schranke!“
- Das Kind tippt auf die Schranke oder den Ticketautomaten. Der Automat gibt ein Ticket aus, die Schranke geht hoch, das Auto fährt auf die Fahrspur und hält.
- Die Schranke geht hinter dem Auto wieder zu.
- Wartet das Auto 8 Sekunden, hupt es einmal (`sfx.honk`). Danach hupt es nicht mehr.

#### Anforderung 5: Parken

- Das Auto steht auf der Fahrspur. Die Leiste sagt zum Beispiel: „Das Wohnmobil braucht einen großen Platz!“
- Das Kind zieht das Auto mit dem Finger oder der Maus. Das Auto folgt dem Finger. Es fährt über andere Autos hinweg, ohne Zusammenstoß.
- Freie Stellplätze, die passen, haben einen grünen gestrichelten Rand, solange das Kind zieht.
- Das Kind lässt das Auto auf einem freien passenden Stellplatz los: Das Auto rollt gerade in den Platz und steht still.
- Das Kind lässt das Auto auf einem falschen Platz oder neben den Plätzen los: Das Auto rollt zurück auf die Fahrspur und wackelt kurz. Die Leiste sagt, welcher Platz passt. Es gibt keine Strafe.
- Ein Kleinwagen passt nur auf einen kleinen Platz, ein Wohnmobil nur auf einen großen, ein Elektroauto nur auf einen Platz mit Strom.

#### Anforderung 6: Die Familie geht ins Terminal

- Das Auto steht. 2 oder 3 Fluggäste steigen aus. Einer trägt einen Koffer in der Farbe des Autos.
- Sie gehen über den Fußweg zum Eingang des Terminals und verschwinden darin. Links und rechts außen neben den Reihen ist je ein Fußweg. Er führt bis zum Gehweg vor dem Terminal. Die Fußgänger gehen nie über die Fahrspur, auf der die Autos fahren.
- Die Leiste sagt: „Familie Rot fliegt nach Berlin!“ Die Farbe im Namen ist die Farbe des Autos.
- Der Flug hat jetzt seinen Gast.
- Das Kind kann schon das nächste Auto holen, während die Familie noch geht.

#### Anforderung 7: Platz schaffen

- Ist ein Platz frei, passt das Auto zu einem freien Platz. So füllt sich der Parkplatz.
- Ist kein Platz frei, fährt vorher ein anderes Auto weg, und das neue Auto passt auf dessen Platz. Bei 1 freien Platz am Anfang fahren also 2 Autos weg, bei 3 freien Plätzen keins.
- Möglich ist nur eine Art, für die ein Platz frei ist oder frei werden kann. Beispiel: Beide großen Plätze sind von Gästen wartender Flüge belegt. Dann kommt kein Wohnmobil.
- Das wegfahrende Auto ist zuerst ein fremdes Auto, dann das Auto des ältesten Gasts eines Flugs, der schon gestartet ist.
- Das Auto fährt hinten auf der anderen Seite der Schranke hinaus. Das Kind muss nichts tun.
- Autos von Flügen, die noch da sind, fahren nie weg.
- Autos, die das Kind bei diesem Besuch geparkt hat, fahren nie weg.

#### Anforderung 8: Farben der Gäste

- Jeder Gast hat eine Farbe aus der Liste der Koffer-Farben im Gepäckspiel.
- Zwei Gäste von Flügen, die gerade da sind, haben nie dieselbe Farbe.
- Jede Farbe hat einen Namen für die Leiste und für Bildschirmleser, zum Beispiel „Rot“, „Blau“, „Grün“.

#### Anforderung 9: Nacht

- Bei Nacht haben die Autos Scheinwerfer an. Die Laternen auf dem Parkplatz leuchten.
- Die Zeichen auf dem Boden sind bei Nacht gut zu lesen.
- Lichter folgen den Regeln aus PRD 008: Was davor steht, verdeckt das Licht.

#### Anforderung 10: Tastatur, Bildschirmleser und Bewegung

- Die Schranke ist ein Knopf: „Schranke öffnen“.
- Steht das Auto auf der Fahrspur, sind die freien passenden Stellplätze Knöpfe, zum Beispiel „Freier großer Platz 2“. Mit Enter oder Leertaste parkt das Auto dort.
- Bildschirmleser lesen die Texte der Leiste.
- Mit „Bewegung reduzieren“ springen Schranke, Autos und Familie ohne Fahrt an ihr Ziel.

#### Anforderung 11: Spielstand

- Der Spielstand speichert die Belegung der 10 Stellplätze: Art, Farbe und Flug jedes Autos.
- Jeder Flug speichert seine Gäste als Liste von Farben.
- Ein neues Spiel beginnt mit 5 fremden Autos auf dem Parkplatz.
- „Neu anfangen“ setzt den Parkplatz auf den Anfang zurück.
- Alte Spielstände laden ohne Änderung. Ihr Parkplatz beginnt wie ein neuer. Ihre Flüge haben keine Gäste.

**Abnahme:** Tests in `game/state.test.ts` prüfen:
- Ein geparktes Auto gibt seinem Flug seinen Gast.
- Ein Flug mit einem Gast bekommt kein Auto mehr. Ein Postflug bekommt nie eines.
- Ein Auto auf einem falschen Stellplatz ändert nichts.
- Ist kein passender Platz frei, macht das fremde Auto Platz, nicht das Auto eines wartenden Flugs.
- Sind beide großen Plätze von Gästen wartender Flüge belegt, kommt kein Wohnmobil.
- Ein alter Spielstand ohne Parkplatz lädt.
- Ein Besuch beginnt mit 1 bis 3 freien Plätzen. Nach 3 Autos ist der Parkplatz voll. Ein Auto, das bei diesem Besuch geparkt wurde, fährt nicht weg.
- Ab Minute 17 bleibt der Parkplatz voll, und kein Auto kommt.
- Kann kein Flug einen Gast haben, kommt ein fremdes Auto. Ohne Flugzeug kommt kein Auto.

### Stufe 2

#### Anforderung 12: Gäste im Bus und im Finger

- Hat ein Flug Gäste, sind ihre Familien die ersten Fluggäste in der Reihe am Bus oder am Finger.
- Die Fluggäste einer Familie tragen Kleidung in der Farbe ihres Autos. Einer trägt den Koffer in dieser Farbe.
- Die übrigen Fluggäste sehen aus wie heute.
- Hat ein Flug keine Gäste, ist alles wie heute.

#### Anforderung 13: Koffer im Gepäckspiel

- Hat ein Flug Gäste, liegt für jeden Gast ein Koffer in seiner Farbe ganz vorne auf dem Gepäckwagen.
- Die Zahl der Koffer bleibt wie heute. Die Koffer der Gäste ersetzen andere Koffer.
- Lädt das Kind einen solchen Koffer ein, sagt die Leiste: „Der Koffer von Familie Rot ist an Bord!“

#### Anforderung 14: Schnee

- Im Winter liegt Schnee auf allen freien Stellplätzen. Auf einem Platz mit Schnee kann kein Auto parken.
- In der leeren Ecke hinter der hinteren Reihe steht ein kleiner Schneepflug. Das Kind zieht ihn über einen Stellplatz. Der Schnee ist dann weg.
- Bei jedem Besuch im Winter liegt neuer Schnee auf den freien Plätzen.
- Ein Auto fährt weg und macht Platz: Der Platz darunter ist frei von Schnee.
- Sind alle passenden Plätze voll Schnee, sagt die Leiste: „Erst Schnee räumen!“ Ein passender Platz blinkt.
- Der Schneepflug ist mit der Tastatur bedienbar: Die verschneiten Plätze sind dann Knöpfe „Schnee räumen auf Platz 3“.
- Im Sommer ist kein Schnee da und der Schneepflug steht nicht da.

**Abnahme:** Ein Test prüft: Ein Auto kann nicht auf einem Platz mit Schnee parken. Nach dem Räumen kann es dort parken.

## 6. Hinweise zur Umsetzung

- Die Szene ist eine neue Datei `components/scenes/Parking.tsx`. Das Ziehen auf ein Ziel gibt es schon in `Finger.tsx` und `Baggage.tsx`.
- `Screen` in `components/scenes/Apron.tsx` bekommt `"parkplatz"`. `Game.tsx` zeigt die Szene wie `weltkarte`. Die Szene braucht keinen ausgewählten Flug, denn das Auto bestimmt den Flug.
- Arten der Autos und die Lage der Stellplätze stehen in `game/data.ts`.
- `GameState` bekommt die Belegung der Stellplätze, `Plane` die Liste der Gäste. `parseSave` füllt beides für alte Spielstände. Die Version `v` bleibt 1.
- Eine neue Aktion im Reducer parkt ein Auto. Welcher Flug das nächste Auto bekommt und welches Auto Platz macht, sind reine Funktionen in `game/state.ts`. So sind sie testbar.
- Das wartende Auto steht nicht im Spielstand. Es entsteht neu, wenn die Szene öffnet.
- Für die Fluggäste gibt es `Passenger` in `components/art.tsx`. Er braucht einen Parameter für die Farbe der Kleidung und des Koffers.
- Die Koffer-Farben stehen heute in `Baggage.tsx` als `COLORS`. Sie ziehen nach `game/data.ts`, damit Parkplatz und Gepäckspiel dieselbe Liste nutzen.
- Das Icon „Auto“ kommt neu nach `components/icons.tsx`.

## 7. Prüfung

Alle Prüfungen mit Ton aus. Nur die Hupe einmal mit Ton an prüfen.

- Den Parkplatz über die rechte Leiste öffnen und zum Vorfeld zurückgehen.
- Ein Auto mit Schranke und Ziehen auf den passenden Platz bringen. Die Familie geht ins Terminal.
- Ein Wohnmobil auf einen kleinen Platz ziehen. Es rollt zurück, und die Leiste nennt den passenden Platz.
- Den Parkplatz öffnen. 3 Autos parken. Danach zeigt das Schild „BESETZT“, das Lob erscheint, und kein Auto kommt mehr. Den Parkplatz neu öffnen: Wieder sind 1 bis 3 Plätze frei.
- Nach Minute 17 den Parkplatz öffnen. Er ist voll, und kein Auto kommt.
- Die Familien gehen auf den Fußwegen außen, nicht über die Fahrspur.
- Ein Postflugzeug abwarten. Für den Postflug kommt kein Auto.
- So lange parken, bis kein passender Platz mehr frei ist. Ein fremdes Auto fährt weg.
- In der Pause den Parkplatz öffnen. Es kommt kein Auto.
- Bei Nacht den Parkplatz ansehen. Zeichen und Autos sind gut zu sehen.
- Nur mit der Tastatur ein Auto parken.
- Mit „Bewegung reduzieren“ ein Auto parken.
- Auf einem Android-Tablet den Parkplatz öffnen und auf Ruckeln achten.
- Einen alten Spielstand laden.
- Stufe 2: Ein Auto parken, dann Bus und Gepäck für diesen Flug spielen. Familie und Koffer haben die Farbe des Autos.
- Stufe 2: Im Winter einen Platz räumen und dort parken.
- `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build`.

## 8. Entschieden

- Der Parkplatz ist freiwillig. Ein Flug ohne Gäste startet wie heute. Der Lohn für das Parken ist, die Familie später wiederzusehen.
- Das Auto wird gezogen, nicht gelenkt. Lenken ist auf einem kleinen Bildschirm für kleine Kinder zu schwer.
- Die Plätze passen nur genau zu ihrem Auto, auch wenn ein Kleinwagen in Wirklichkeit auf einen großen Platz passt. Die klare Regel ist leichter zu verstehen.
- Gepäckwagen zum Einsammeln gibt es nicht. Sie haben keine Wirkung auf das Spiel.
- Ein Gast pro Flug und 3 Autos pro Besuch. Mit 3 Gästen pro Flug war der Parkplatz nie fertig. Mit nur einem Auto pro Flug war er beim Öffnen oft schon fertig. Jetzt hat jeder Besuch etwas zu tun und ein klares Ende: Der Parkplatz ist voll.
- Fremde Autos füllen die Besuche auf, wenn kein Flug einen Gast haben kann. Gäste kommen immer zuerst.
- Eine Abflugtafel auf dem Parkplatz war zu viel. Das Schild „FREI / BESETZT“ zeigt genug.
- Der Parkplatz ist eine eigene Szene und nicht auf dem Vorfeld. Das schützt das Ziel von 60 Bildern pro Sekunde auf dem Vorfeld.
- Ein Tipp auf einen freien passenden Platz parkt das Auto auch. Das ist derselbe Weg wie mit der Tastatur und hilft Kindern, die noch nicht ziehen können.
- Geparkte Autos haben bei Nacht kein Licht an. Nur Autos, die fahren, haben Scheinwerfer.
