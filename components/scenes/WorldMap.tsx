"use client";
import { useMemo, useState } from "react";
import { geoInterpolate, geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { FeatureCollection } from "geojson";
import world from "world-atlas/countries-110m.json";
import { OUT, SidePlane } from "../art";
import { Flag, Modal } from "../ui";
import { AIRCRAFT, COUNTRIES, DESTINATIONS, HOME, destination, distanceKm, flightTime, type AircraftType, type Destination } from "@/game/data";
import type { GameState } from "@/game/state";

const PALETTE = ["#8fd16a", "#f5d75a", "#f4a95a", "#f29bb5", "#b59cf0", "#6fd1c2", "#9fd36f", "#f7c46b"];

const topo = world as unknown as Topology<{ countries: GeometryCollection }>;
const countries = (feature(topo, topo.objects.countries) as unknown as FeatureCollection).features.filter((f) => f.id !== "010");
const projection = geoNaturalEarth1().fitExtent([[130, 150], [1150, 985]], { type: "FeatureCollection", features: countries });
const path = geoPath(projection);
const COUNTRY_PATHS = countries.map((f, i) => ({ d: path(f) ?? "", fill: PALETTE[(i * 5 + (Number(f.id) || 0)) % PALETTE.length] }));
const proj = (lon: number, lat: number) => projection([lon, lat]) ?? [0, 0];

export function WorldMap({ state }: { state: GameState }) {
  const [info, setInfo] = useState<Destination | null>(null);
  const [fact, setFact] = useState<AircraftType | null>(null);

  const visited = useMemo(() => {
    const m = new Map<string, { count: number; livery: string; flightNo: string; type: string }>();
    for (const f of state.log) m.set(f.dest, { count: (m.get(f.dest)?.count ?? 0) + 1, livery: f.livery, flightNo: f.flightNo, type: f.type });
    return m;
  }, [state.log]);

  const home = proj(HOME.lon, HOME.lat);
  const route = (d: Destination) => path({ type: "LineString", coordinates: [[HOME.lon, HOME.lat], [d.lon, d.lat]] }) ?? "";
  const planeOnRoute = (d: Destination, t: number) => {
    const i = geoInterpolate([HOME.lon, HOME.lat], [d.lon, d.lat]);
    const a = proj(...i(t));
    const b = proj(...i(Math.min(1, t + 0.02)));
    return { x: a[0], y: a[1], angle: (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI };
  };

  return (
    <div className="scene map-scene">
      <svg className="fill" viewBox="0 0 1600 1000" role="img" aria-label="Weltkarte mit den Zielen deiner Flugzeuge">
        <defs>
          <pattern id="waves" width="80" height="40" patternUnits="userSpaceOnUse">
            <path d="M10,20 q6,-6 12,0 t12,0" fill="none" stroke="#5fb8d6" strokeWidth="2" strokeLinecap="round" />
          </pattern>
        </defs>
        <rect width={1600} height={1000} fill="#7fd0ea" />
        <rect width={1600} height={1000} fill="url(#waves)" />
        <g stroke={OUT} strokeWidth={1.2} strokeLinejoin="round">
          {COUNTRY_PATHS.map((c, i) => (
            <path key={i} d={c.d} fill={c.fill} />
          ))}
        </g>
        <text x={proj(-42, 22)[0]} y={proj(-42, 22)[1]} textAnchor="middle" fill="#2f7fa0" fontSize={18} fontWeight={700}>Atlantischer Ozean</text>
        <text x={proj(-150, 10)[0]} y={proj(-150, 10)[1]} textAnchor="middle" fill="#2f7fa0" fontSize={18} fontWeight={700}>Pazifischer Ozean</text>
        <text x={proj(78, -22)[0]} y={proj(78, -22)[1]} textAnchor="middle" fill="#2f7fa0" fontSize={18} fontWeight={700}>Indischer Ozean</text>

        {state.planes.map((p) => {
          const d = destination(p.dest);
          return <path key={p.id} d={route(d)} fill="none" stroke="#ffffff" strokeWidth={3} strokeDasharray="4 8" strokeLinecap="round" opacity={0.9} />;
        })}
        {[...visited.entries()].map(([id, v]) => {
          const d = destination(id);
          const pl = planeOnRoute(d, 0.62);
          return (
            <g key={id}>
              <path d={route(d)} fill="none" stroke={OUT} strokeWidth={6} strokeDasharray="14 10" strokeLinecap="round" opacity={0.5} />
              <path d={route(d)} fill="none" stroke={v.livery} strokeWidth={4} strokeDasharray="14 10" strokeLinecap="round" className="dash-move" />
              <g transform={`translate(${pl.x},${pl.y}) rotate(${pl.angle}) scale(1.1)`}>
                <path d="M14,0 L4,-2 L-2,-14 L-6,-14 L-3,-2 L-10,-2 L-13,-6 L-15,-6 L-14,0 L-15,6 L-13,6 L-10,2 L-3,2 L-6,14 L-2,14 L4,2 Z" fill={v.livery} stroke={OUT} strokeWidth={1.6} strokeLinejoin="round" />
              </g>
            </g>
          );
        })}

        {DESTINATIONS.map((d) => {
          const [x, y] = proj(d.lon, d.lat);
          const v = visited.get(d.id);
          return (
            <g key={d.id} role="button" tabIndex={0} aria-label={`${d.city}, ${COUNTRIES[d.flag].name}`} onClick={() => setInfo(d)} onKeyDown={(e) => e.key === "Enter" && setInfo(d)} style={{ cursor: "pointer" }}>
              <circle cx={x} cy={y} r={22} fill="transparent" />
              <circle cx={x} cy={y} r={v ? 9 : 6} fill={v ? "#fff" : "#e9edf2"} stroke={OUT} strokeWidth={2.5} />
              {v && <circle cx={x} cy={y} r={4} fill={v.livery} />}
              {v && (
                <g transform={`translate(${x + 12},${y - 34})`}>
                  <rect width={d.city.length * 10 + 30} height={26} rx={7} fill="#fbf0cf" stroke={OUT} strokeWidth={2} />
                  <text x={8} y={18} fontSize={15} fontWeight={700} fill={OUT}>{d.city}</text>
                  {v.count > 1 && <text x={d.city.length * 10 + 22} y={18} fontSize={13} fontWeight={700} fill="#e8574a" textAnchor="end">×{v.count}</text>}
                </g>
              )}
            </g>
          );
        })}
        <g role="img" aria-label={`Unser Flughafen: ${HOME.name}`}>
          <g transform={`translate(${home[0]},${home[1]})`}>
            <circle r={13} fill="#e8574a" stroke="#fff" strokeWidth={4} />
            <path d="M0,-7 L2,-2 L7,-2 L3,1 L5,6 L0,3 L-5,6 L-3,1 L-7,-2 L-2,-2 Z" fill="#fff" />
          </g>
          <g transform={`translate(${home[0] - 140},${home[1] + 22})`} aria-hidden="true">
            <rect width={130} height={44} rx={8} fill="#e8574a" stroke={OUT} strokeWidth={2} />
            <text x={65} y={21} textAnchor="middle" fontSize={18} fontWeight={800} fill="#fff">{HOME.name}</text>
            <text x={65} y={37} textAnchor="middle" fontSize={12} fontWeight={600} fill="#fff">Unser Flughafen</text>
          </g>
        </g>
      </svg>

      <aside className="facts-panel" aria-label="Flugzeug-Fakten">
        <h3>Flugzeug-Fakten</h3>
        <p className="facts-count">{state.collected.length} von {AIRCRAFT.length} Stickern</p>
        <ul>
          {AIRCRAFT.map((a) => {
            const has = state.collected.includes(a.id);
            return (
              <li key={a.id}>
                <button type="button" className={has ? "has" : ""} onClick={() => setFact(a)} aria-label={has ? a.name : "Noch nicht entdecktes Flugzeug"}>
                  <span className="check" aria-hidden="true">{has ? "✓" : ""}</span>
                  <SidePlane type={a} color={has ? state.log.findLast((f) => f.type === a.id)?.livery ?? "#3aa3e8" : null} />
                  <span className="facts-name">{has ? a.name.replace(" Jumbo-Jet", "").replace(" Dreamliner", "") : "???"}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      {state.log.length === 0 && (
        <div className="map-empty">Schick dein erstes Flugzeug los – dann siehst du hier seine Route!</div>
      )}

      {info && <DestinationInfo d={info} visits={visited.get(info.id)?.count ?? 0} onClose={() => setInfo(null)} />}
      {fact && (
        <Modal label={fact.name} onClose={() => setFact(null)}>
          {state.collected.includes(fact.id) ? (
            <>
              <h2>{fact.name}</h2>
              <div className="fact-plane"><SidePlane type={fact} color={state.log.findLast((f) => f.type === fact.id)?.livery ?? "#3aa3e8"} width={300} /></div>
              <p className="modal-text">{fact.fact}</p>
              <dl className="fact-grid">
                <dt>Hersteller</dt><dd>{fact.maker}</dd>
                <dt>Länge</dt><dd>{fact.length.toLocaleString("de-DE")} m</dd>
                <dt>Spannweite</dt><dd>{fact.span.toLocaleString("de-DE")} m</dd>
                <dt>Sitzplätze</dt><dd>{fact.seats}</dd>
                <dt>Tempo</dt><dd>{fact.speed} km/h</dd>
                <dt>Antrieb</dt><dd>{fact.engines} {fact.props ? "Propeller" : "Triebwerke"}</dd>
              </dl>
            </>
          ) : (
            <>
              <h2>Noch ein Geheimnis!</h2>
              <div className="fact-plane"><SidePlane type={fact} color={null} width={300} /></div>
              <p className="modal-text">Dieses Flugzeug hast du noch nicht abgefertigt. Wenn es bei dir landet und du es losschickst, bekommst du den Sticker!</p>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}

function DestinationInfo({ d, visits, onClose }: { d: Destination; visits: number; onClose: () => void }) {
  const km = distanceKm(HOME.lat, HOME.lon, d.lat, d.lon);
  return (
    <Modal label={d.city} onClose={onClose}>
      <h2 className="with-flag">
        {d.city} ({d.iata}) <Flag code={d.flag} height={32} />
      </h2>
      <p className="modal-sub">{COUNTRIES[d.flag].name}</p>
      <p className="modal-text">{d.fact}</p>
      <dl className="fact-grid">
        <dt>Entfernung</dt><dd>{km.toLocaleString("de-DE")} km</dd>
        <dt>Flugzeit</dt><dd>etwa {flightTime(km)}</dd>
        <dt>Deine Flüge</dt><dd>{visits === 0 ? "noch keiner" : visits === 1 ? "1 Flug" : `${visits} Flüge`}</dd>
      </dl>
    </Modal>
  );
}
