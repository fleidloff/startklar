export type TaskId = "bus" | "finger" | "gepaeck" | "tanken" | "enteisung";
export type ToolId = TaskId | "pushback" | "start" | "einwinker" | "checkliste";

export interface Destination {
  id: string;
  city: string;
  iata: string;
  flag: CountryCode;
  lat: number;
  lon: number;
  fact: string;
}

export interface AircraftType {
  id: string;
  name: string;
  maker: string;
  length: number;
  span: number;
  seats: string;
  speed: number;
  engines: 2 | 4;
  props?: boolean;
  /** carries parcels only: no windows, no passengers */
  freighter?: boolean;
  longHaul: boolean;
  fact: string;
  /** cartoon size in game metres */
  gameLength: number;
  gameSpan: number;
  radius: number;
  bags: number;
}

export const HOME = { name: "Hamburg", lat: 53.63, lon: 9.99 };

export const COUNTRIES = {
  DE: { name: "Deutschland", continent: "Europa", people: "84 Millionen" },
  FR: { name: "Frankreich", continent: "Europa", people: "68 Millionen" },
  GB: { name: "Großbritannien", continent: "Europa", people: "69 Millionen" },
  IT: { name: "Italien", continent: "Europa", people: "59 Millionen" },
  ES: { name: "Spanien", continent: "Europa", people: "49 Millionen" },
  AT: { name: "Österreich", continent: "Europa", people: "9 Millionen" },
  CH: { name: "Schweiz", continent: "Europa", people: "9 Millionen" },
  NO: { name: "Norwegen", continent: "Europa", people: "6 Millionen" },
  IS: { name: "Island", continent: "Europa", people: "400 Tausend" },
  TR: { name: "Türkei", continent: "Europa und Asien", people: "86 Millionen" },
  EG: { name: "Ägypten", continent: "Afrika", people: "116 Millionen" },
  KE: { name: "Kenia", continent: "Afrika", people: "57 Millionen" },
  ZA: { name: "Südafrika", continent: "Afrika", people: "64 Millionen" },
  AE: { name: "Vereinigte Arabische Emirate", continent: "Asien", people: "11 Millionen" },
  IN: { name: "Indien", continent: "Asien", people: "1,5 Milliarden" },
  TH: { name: "Thailand", continent: "Asien", people: "72 Millionen" },
  CN: { name: "China", continent: "Asien", people: "1,4 Milliarden" },
  JP: { name: "Japan", continent: "Asien", people: "124 Millionen" },
  AU: { name: "Australien", continent: "Australien", people: "27 Millionen" },
  US: { name: "USA", continent: "Nordamerika", people: "340 Millionen" },
  CA: { name: "Kanada", continent: "Nordamerika", people: "41 Millionen" },
  MX: { name: "Mexiko", continent: "Nordamerika", people: "130 Millionen" },
  BR: { name: "Brasilien", continent: "Südamerika", people: "212 Millionen" },
  AR: { name: "Argentinien", continent: "Südamerika", people: "46 Millionen" },
} satisfies Record<string, { name: string; continent: string; people: string }>;

export type CountryCode = keyof typeof COUNTRIES;

export const DESTINATIONS: Destination[] = [
  { id: "BER", city: "Berlin", iata: "BER", flag: "DE", lat: 52.36, lon: 13.5, fact: "Berlin ist die Hauptstadt von Deutschland. Dort steht das Brandenburger Tor." },
  { id: "HND", city: "Tokio", iata: "HND", flag: "JP", lat: 35.55, lon: 139.78, fact: "Tokio ist eine der größten Städte der Welt. Bei klarem Wetter sieht man den Berg Fuji." },
  { id: "CDG", city: "Paris", iata: "CDG", flag: "FR", lat: 49.01, lon: 2.55, fact: "In Paris steht der Eiffelturm. Er ist 330 Meter hoch." },
  { id: "LHR", city: "London", iata: "LHR", flag: "GB", lat: 51.47, lon: -0.45, fact: "In London fahren rote Doppeldeckerbusse durch die Straßen." },
  { id: "FCO", city: "Rom", iata: "FCO", flag: "IT", lat: 41.8, lon: 12.25, fact: "Rom ist fast 3000 Jahre alt. Dort steht das riesige Kolosseum." },
  { id: "MAD", city: "Madrid", iata: "MAD", flag: "ES", lat: 40.49, lon: -3.57, fact: "Madrid ist die Hauptstadt von Spanien und liegt genau in der Mitte des Landes." },
  { id: "PMI", city: "Palma de Mallorca", iata: "PMI", flag: "ES", lat: 39.55, lon: 2.74, fact: "Mallorca ist eine Insel im Mittelmeer. Perfekt zum Baden!" },
  { id: "VIE", city: "Wien", iata: "VIE", flag: "AT", lat: 48.11, lon: 16.57, fact: "In Wien gibt es den ältesten Zoo der Welt: den Tiergarten Schönbrunn." },
  { id: "ZRH", city: "Zürich", iata: "ZRH", flag: "CH", lat: 47.46, lon: 8.55, fact: "Die Schweiz ist berühmt für hohe Berge, Käse und Schokolade." },
  { id: "OSL", city: "Oslo", iata: "OSL", flag: "NO", lat: 60.19, lon: 11.1, fact: "In Norwegen gibt es Fjorde. Das sind lange, tiefe Meeresarme zwischen Bergen." },
  { id: "KEF", city: "Reykjavík", iata: "KEF", flag: "IS", lat: 63.99, lon: -22.62, fact: "Auf Island gibt es Vulkane, Gletscher und heiße Quellen." },
  { id: "IST", city: "Istanbul", iata: "IST", flag: "TR", lat: 41.26, lon: 28.74, fact: "Istanbul liegt auf zwei Kontinenten: in Europa und in Asien!" },
  { id: "CAI", city: "Kairo", iata: "CAI", flag: "EG", lat: 30.12, lon: 31.41, fact: "Ganz in der Nähe von Kairo stehen die Pyramiden von Gizeh." },
  { id: "NBO", city: "Nairobi", iata: "NBO", flag: "KE", lat: -1.32, lon: 36.93, fact: "Direkt neben Nairobi ist ein Nationalpark mit Giraffen, Zebras und Löwen." },
  { id: "CPT", city: "Kapstadt", iata: "CPT", flag: "ZA", lat: -33.97, lon: 18.6, fact: "Über Kapstadt steht der flache Tafelberg. Am Strand leben Pinguine!" },
  { id: "DXB", city: "Dubai", iata: "DXB", flag: "AE", lat: 25.25, lon: 55.36, fact: "In Dubai steht das höchste Haus der Welt: der Burj Khalifa mit 828 Metern." },
  { id: "BOM", city: "Mumbai", iata: "BOM", flag: "IN", lat: 19.09, lon: 72.87, fact: "In Mumbai ist Bollywood zu Hause. Hier entstehen sehr viele Filme." },
  { id: "BKK", city: "Bangkok", iata: "BKK", flag: "TH", lat: 13.69, lon: 100.75, fact: "In Bangkok gibt es schwimmende Märkte. Dort verkaufen die Leute Obst von Booten aus." },
  { id: "PEK", city: "Peking", iata: "PEK", flag: "CN", lat: 40.08, lon: 116.58, fact: "Nicht weit von Peking kann man auf der Chinesischen Mauer wandern." },
  { id: "SYD", city: "Sydney", iata: "SYD", flag: "AU", lat: -33.95, lon: 151.18, fact: "In Sydney steht ein Opernhaus, das wie Segel aussieht. In Australien leben Kängurus." },
  { id: "JFK", city: "New York", iata: "JFK", flag: "US", lat: 40.64, lon: -73.78, fact: "In New York steht die Freiheitsstatue. Sie ist grün, weil sie aus Kupfer ist." },
  { id: "YYZ", city: "Toronto", iata: "YYZ", flag: "CA", lat: 43.68, lon: -79.63, fact: "Kanada hat ein rotes Ahornblatt auf der Flagge." },
  { id: "MEX", city: "Mexiko-Stadt", iata: "MEX", flag: "MX", lat: 19.44, lon: -99.07, fact: "Mexiko-Stadt liegt über 2000 Meter hoch zwischen Bergen und Vulkanen." },
  { id: "GIG", city: "Rio de Janeiro", iata: "GIG", flag: "BR", lat: -22.81, lon: -43.25, fact: "In Rio steht auf einem Berg eine riesige Christus-Statue." },
  { id: "EZE", city: "Buenos Aires", iata: "EZE", flag: "AR", lat: -34.82, lon: -58.54, fact: "In Argentinien tanzt man Tango." },
];

export const AIRCRAFT: AircraftType[] = [
  { id: "A320", name: "Airbus A320", maker: "Airbus (Europa)", length: 37.6, span: 35.8, seats: "150 bis 180", speed: 840, engines: 2, longHaul: false, fact: "Eines der meistgebauten Flugzeuge der Welt. Es fliegt vor allem kurze Strecken in Europa.", gameLength: 34, gameSpan: 32, radius: 2.1, bags: 7 },
  { id: "B737", name: "Boeing 737", maker: "Boeing (USA)", length: 39.5, span: 35.8, seats: "160 bis 190", speed: 840, engines: 2, longHaul: false, fact: "Das meistverkaufte Passagierflugzeug aller Zeiten. Es fliegt schon seit 1968!", gameLength: 35, gameSpan: 32, radius: 2.0, bags: 7 },
  { id: "A220", name: "Airbus A220", maker: "Airbus (Kanada)", length: 38.7, span: 35.1, seats: "100 bis 150", speed: 830, engines: 2, longHaul: false, fact: "Ein besonders leises Flugzeug. Das freut alle, die nah am Flughafen wohnen.", gameLength: 32, gameSpan: 30, radius: 1.9, bags: 6 },
  { id: "E190", name: "Embraer E190", maker: "Embraer (Brasilien)", length: 36.2, span: 28.7, seats: "um die 100", speed: 830, engines: 2, longHaul: false, fact: "Dieses Flugzeug kommt aus Brasilien. Es hat nur 2 Sitze links und 2 Sitze rechts vom Gang.", gameLength: 30, gameSpan: 27, radius: 1.8, bags: 6 },
  { id: "ATR72", name: "ATR 72", maker: "ATR (Frankreich & Italien)", length: 27.2, span: 27.1, seats: "um die 70", speed: 510, engines: 2, props: true, longHaul: false, fact: "Ein Propellerflugzeug! Seine Flügel sind oben am Rumpf. Es fliegt gern kurze Strecken.", gameLength: 27, gameSpan: 28, radius: 1.7, bags: 5 },
  { id: "A350", name: "Airbus A350", maker: "Airbus (Europa)", length: 66.8, span: 64.8, seats: "300 bis 350", speed: 900, engines: 2, longHaul: true, fact: "Sein Rumpf ist zum großen Teil aus Kohlefaser. Das ist leicht und sehr stabil!", gameLength: 44, gameSpan: 42, radius: 2.7, bags: 9 },
  { id: "B787", name: "Boeing 787 Dreamliner", maker: "Boeing (USA)", length: 56.7, span: 60.1, seats: "um die 250", speed: 900, engines: 2, longHaul: true, fact: "Er hat besonders große Fenster. Man dunkelt sie per Knopfdruck ab, ganz ohne Rollo!", gameLength: 42, gameSpan: 41, radius: 2.6, bags: 8 },
  { id: "B777", name: "Boeing 777", maker: "Boeing (USA)", length: 73.9, span: 64.8, seats: "300 bis 400", speed: 900, engines: 2, longHaul: true, fact: "Seine Triebwerke sind riesig: fast so dick wie der Rumpf eines kleinen Passagierflugzeugs.", gameLength: 46, gameSpan: 42, radius: 2.8, bags: 9 },
  { id: "B747", name: "Boeing 747 Jumbo-Jet", maker: "Boeing (USA)", length: 70.7, span: 64.4, seats: "um die 400", speed: 910, engines: 4, longHaul: true, fact: "Der Jumbo-Jet! Vorne hat er einen Buckel. Dort oben ist ein zweites Stockwerk.", gameLength: 47, gameSpan: 44, radius: 2.9, bags: 10 },
  { id: "A380", name: "Airbus A380", maker: "Airbus (Europa)", length: 72.7, span: 79.8, seats: "über 500", speed: 900, engines: 4, longHaul: true, fact: "Das größte Passagierflugzeug der Welt. Es hat zwei ganze Stockwerke für Passagiere!", gameLength: 48, gameSpan: 47, radius: 3.2, bags: 10 },
  { id: "B737F", name: "Boeing 737 Frachter", maker: "Boeing (USA)", length: 39.5, span: 35.8, seats: "keine, nur Pakete", speed: 840, engines: 2, freighter: true, longHaul: false, fact: "Dieses Flugzeug hat keine Fenster. Es fliegt nachts Briefe und Pakete, damit sie am Morgen ankommen.", gameLength: 35, gameSpan: 32, radius: 2.0, bags: 7 },
];

export const AIRLINES = ["LH", "JP", "ST", "KA", "FX", "SO"];

export const LIVERIES = ["#3aa3e8", "#f6c02c", "#e8574a", "#4cbb6c", "#9a6ee8", "#f39a35"];

export const POST_LIVERY = "#ffd400";

export const GATE_COLORS = ["#a46ee0", "#ef6fae", "#2fb7a8"];

export interface ToolMeta {
  id: ToolId;
  label: string;
  color: string;
  todo: string;
}

export const TOOLS: ToolMeta[] = [
  { id: "bus", label: "Vorfeldbus", color: "#e8574a", todo: "Passagiere bringen!" },
  { id: "finger", label: "Finger", color: "#3cc0d8", todo: "Finger andocken!" },
  { id: "pushback", label: "Pushback-Schlepper", color: "#4cbb6c", todo: "Zurückschieben!" },
  { id: "start", label: "Start", color: "#ef6fae", todo: "Ab zur Startbahn!" },
  { id: "tanken", label: "Betankung", color: "#f06a3c", todo: "Auftanken!" },
  { id: "gepaeck", label: "Gepäckdienst", color: "#3aa3e8", todo: "Gepäck einladen!" },
  { id: "enteisung", label: "Enteisung", color: "#33b36b", todo: "Schnee entfernen!" },
  { id: "einwinker", label: "Einwinker", color: "#f39a35", todo: "Einwinken!" },
  { id: "checkliste", label: "Checkliste", color: "#a46ee0", todo: "" },
];

export const tool = (id: ToolId) => TOOLS.find((t) => t.id === id)!;

export const PRAISE = ["Super gemacht!", "Klasse!", "Spitze!", "Toll gemacht!", "Wie ein Profi!", "Prima!", "Wunderbar!"];

export const destination = (id: string) => DESTINATIONS.find((d) => d.id === id) ?? DESTINATIONS[0];
export const aircraft = (id: string) => AIRCRAFT.find((a) => a.id === id) ?? AIRCRAFT[0];

export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const rad = Math.PI / 180;
  const a =
    Math.sin(((lat2 - lat1) * rad) / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lon2 - lon1) * rad) / 2) ** 2;
  return Math.round(6371 * 2 * Math.asin(Math.sqrt(a)));
}

export function flightTime(km: number) {
  const minutes = Math.round((km / 800) * 60 + 30);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const hours = `${h} ${h === 1 ? "Stunde" : "Stunden"}`;
  const mins = `${m} ${m === 1 ? "Minute" : "Minuten"}`;
  return h === 0 ? mins : m === 0 ? hours : `${hours} ${mins}`;
}
