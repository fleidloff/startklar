# PRD 004: Nachtmodus mit Postflugzeug

| | |
|---|---|
| Status | Entwurf, noch nicht umgesetzt |
| Stand | 7. November 2026 |
| Anlass | Wunsch: Im Tower schaltet das Kind die Beleuchtung des Flughafens an. Dann wird es Nacht, und ein gelbes Postflugzeug landet. |
| Betroffene Dateien | `game/data.ts`, `game/state.ts`, `game/state.test.ts`, `components/Game.tsx`, `components/World.tsx`, `components/art.tsx`, `components/icons.tsx`, `components/scenes/Tower.tsx`, `components/scenes/Baggage.tsx`, `components/scenes/WorldMap.tsx`, `app/globals.css` |

## 1. Problem

Im Spiel ist es immer Tag. Das Kind kann nur zwischen Sommer und Winter wechseln.

An echten Flughäfen ist nachts viel los. Die Lichter auf den Bahnen, die blinkenden Flugzeuge und die leuchtenden Westen sind für Kinder spannend. Nachts fliegen auch Flugzeuge, die nur Post und Pakete tragen. Das Spiel zeigt beides heute nicht.

## 2. Ziel

Das Kind macht im Tower das Licht an. Der Flughafen wird dunkel und leuchtet wie ein echter Flughafen bei Nacht. In jeder Nacht landet genau ein knallgelbes Postflugzeug. Das Kind lädt dort Pakete statt Koffer ein.

**Erfolgskriterien**
- Ein Kind ab 8 Jahren findet den Lichtschalter im Tower ohne Erklärung.
- Alle Dinge, die das Kind antippen oder ziehen muss, sind in der Nacht so gut zu sehen wie am Tag.
- Die Nacht endet von allein nach 5 Minuten oder wenn das Kind das Licht ausschaltet.
- In jeder Nacht kommt genau ein Postflugzeug.
- Die Kamera auf dem Vorfeld bleibt in der Nacht so flüssig wie am Tag.
- Alte Spielstände laden weiter.

## 3. Nicht-Ziele

- Keine echte Uhrzeit. Die Nacht hängt nicht von der Uhr am Gerät ab.
- Keine Dämmerung, die man einstellen kann. Es gibt nur Tag und Nacht.
- Kein Logo einer echten Post- oder Paketfirma.
- Keine neuen Mini-Spiele. Das Postflugzeug nutzt die bekannten Mini-Spiele.
- Die Nacht wird nicht gespeichert. Nach dem Neuladen ist Tag.

## 4. Anforderungen

### Anforderung 1: Lichtschalter im Tower

- Im Tower steht ein großer Lichtschalter mit einer Lampe. Er ist neben dem Radar.
- Antippen schaltet das Licht an. Es klackt. Der Schalter zeigt „An“.
- Das Banner sagt: „Licht an! Es wird Nacht am Flughafen.“
- Nochmals antippen schaltet das Licht aus. Das Banner sagt: „Guten Morgen! Die Sonne geht auf.“
- Der Schalter ist mit der Tastatur bedienbar und hat einen Namen für Bildschirmleser: „Flughafenbeleuchtung“ mit dem Zustand an oder aus.

### Anforderung 2: Die Nacht beginnt und endet

- Nach dem Einschalten wird das Bild in etwa 2 Sekunden dunkel. Gleichzeitig gehen die Lichter an.
- Die Nacht ist dunkelblau, nicht schwarz. Das Kind sieht Flugzeuge, Fahrzeuge und Menschen noch gut.
- Gelbe Ringe, Hände, Pfeile und Ziele der Mini-Spiele werden nicht dunkler.
- Die Werkzeugleiste, das Banner und alle Fenster bleiben wie am Tag.
- Die Nacht endet nach 5 Minuten von allein. Das Bild wird in etwa 2 Sekunden wieder hell. Das Banner sagt: „Guten Morgen! Die Sonne geht auf.“
- Nacht und Jahreszeit sind unabhängig. Es gibt auch Winternächte mit Schnee.
- Die Nacht gilt für das Vorfeld, den Tower und alle Mini-Spiele. Die Weltkarte bleibt hell.

**Abnahme:** Ein Test in `game/state.test.ts` prüft: Die Nacht endet nach 5 Minuten. Ausschalten beendet sie sofort.

### Anforderung 3: Beleuchtung des Flughafens

| Ort | Licht |
|---|---|
| Rollbahn | Grüne Lichter auf der Mittellinie, blaue Lichter am Rand |
| Startbahn | Weiße Lichter am Rand und auf der Mittellinie, grüne Lichter am Anfang, rote Lichter am Ende |
| Vorfeld | Hohe Lichtmasten mit warmem Lichtkegel auf dem Boden |
| Gebäude | Fenster leuchten gelb |
| Finger | Die Kabine ist innen hell |
| Tower | Die Kanzel leuchtet. Oben blinkt langsam ein rotes Licht. |

### Anforderung 4: Beleuchtung der Flugzeuge

Jedes Flugzeug hat in der Nacht die Lichter eines echten Flugzeugs:

| Licht | Wo | Wie |
|---|---|---|
| Positionslicht | Linke Flügelspitze rot, rechte Flügelspitze grün, Heck weiß | Brennt immer |
| Blitzlicht | Beide Flügelspitzen, weiß | Blitzt zweimal kurz, dann eine Pause. Etwa alle 1,5 Sekunden. |
| Rundumlicht | Oben auf dem Rumpf, rot | Blinkt langsam, etwa einmal pro Sekunde |
| Logolicht | Auf das Seitenleitwerk gerichtet | Brennt immer, die Farbe der Airline leuchtet |
| Landescheinwerfer | Vorne | Nur beim Landen, Rollen und Starten |

Die Kabinenfenster leuchten bei Passagierflugzeugen schwach gelb.

### Anforderung 5: Beleuchtung der Fahrzeuge und des Personals

- Busse haben weiße Scheinwerfer, rote Rücklichter und eine orange Rundumleuchte.
- Tankwagen, Gepäckwagen, Förderband und Schlepper haben eine orange Rundumleuchte.
- Die Westen des Personals bekommen silberne Streifen. In der Nacht leuchten die Streifen hell auf.

### Anforderung 6: Blinken ist sicher

- Kein Licht blinkt schneller als zweimal pro Sekunde.
- Blinkende Lichter sind klein. Kein großer Teil des Bildes blinkt.
- Hat das Gerät „Bewegung reduzieren“ an, blinkt nichts. Alle Lichter brennen ruhig. Der Wechsel zwischen Tag und Nacht ist dann sofort.

### Anforderung 7: Das Postflugzeug

- In jeder Nacht kommt genau ein Postflugzeug.
- Das nächste neue Flugzeug nach dem Einschalten ist das Postflugzeug. Ist kein Gate frei, kommt es, sobald ein Gate frei wird.
- Endet die Nacht, bevor das Postflugzeug angekommen ist, kommt es nicht mehr.
- Passagierflugzeuge kommen in der Nacht wie am Tag.
- Das Postflugzeug ist knallgelb. Das Gelb ist kräftiger als das Gelb der Passagierflugzeuge.
- Es ist eine Boeing 737 als Frachter. Ein Frachter hat keine Fenster. Auf dem Seitenleitwerk ist ein Paket als Bild.
- Die Flugnummer beginnt mit „Post“, zum Beispiel „Post 712“.
- Das Ziel ist eine Stadt in Europa.
- Die Meldung beim Anflug sagt: „Das Postflugzeug kommt! Flug Post 712 aus Wien bringt Pakete.“

**Abnahme:** Ein Test prüft: Nach dem Einschalten ist das nächste neue Flugzeug ein Postflugzeug. Das übernächste ist ein Passagierflugzeug.

### Anforderung 8: Abfertigung des Postflugzeugs

- Das Postflugzeug wird wie jedes Flugzeug gelandet, eingewunken, zurückgeschoben und gestartet.
- Es hat keine Aufgabe „Einsteigen“. Bus und Finger sind für das Postflugzeug gesperrt.
- Die Aufgaben sind: Pakete einladen, Tanken und im Winter Enteisen.
- Die Checkliste zeigt „Pakete einladen“ statt „Gepäck einladen“.
- Endet die Nacht, während das Postflugzeug am Gate steht, bleibt es gelb. Das Kind fertigt es am Tag zu Ende ab.

**Abnahme:** Ein Test prüft: Das Postflugzeug ist ohne Bus und ohne Finger bereit zum Zurückschieben.

### Anforderung 9: Pakete statt Koffer

- Im Mini-Spiel „Gepäck“ liegen beim Postflugzeug nur Pakete auf den Wagen.
- Pakete sind braune Kartons mit Klebeband und einem weißen Aufkleber. Es gibt kleine, mittlere und große Pakete.
- Das Banner sagt: „Pakete einladen! (3 von 7)“.
- Das Fenster danach sagt: „Alle Pakete sind an Bord.“
- Alles andere im Mini-Spiel bleibt gleich.

### Anforderung 10: Sticker

- Das Postflugzeug ist ein eigener Sticker: „Boeing 737 Frachter“.
- Die Weltkarte zählt ihn mit: „von 11 Stickern“ statt „von 10 Stickern“.
- Der Text dazu: „Dieses Flugzeug hat keine Fenster. Es fliegt nachts Briefe und Pakete, damit sie am Morgen ankommen.“

### Anforderung 11: Spielstand

- Alte Spielstände laden ohne Änderung. Alle Flugzeuge darin sind Passagierflugzeuge.
- Ein Postflugzeug im Spielstand lädt weiter als Postflugzeug.
- Die Nacht selbst wird nicht gespeichert.

## 5. Prüfung

- Im Tower das Licht anschalten. Ein Postflugzeug ganz abfertigen.
- Alle Mini-Spiele einmal in der Nacht spielen und prüfen, dass Ringe und Ziele gut zu sehen sind.
- 5 Minuten warten und prüfen, dass es von allein Tag wird.
- Mit „Bewegung reduzieren“ prüfen, dass nichts blinkt.
- Auf dem Vorfeld in der Nacht die Kamera schieben und zoomen. Sie muss flüssig bleiben.
- Einen Winter-Spielstand und einen alten Spielstand laden.
- `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build`.

## 6. Offene Fragen

1. Soll es in der Nacht eigene Geräusche geben (zum Beispiel Grillen oder leiseres Brummen)?
2. Soll ein kleiner Mond oben in der Leiste zeigen, wie lange die Nacht noch dauert?
3. Soll das Licht auch außerhalb des Towers ausgeschaltet werden können, zum Beispiel neben dem Knopf für Sommer und Winter?
