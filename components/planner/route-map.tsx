"use client";

import { useEffect, useMemo } from "react";
import L from "leaflet";
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet";
import { PLACE_BY_ID } from "@/lib/data/places";
import type { Stop } from "@/lib/planner/types";

function pin(n: number, active: boolean) {
  return L.divIcon({
    className: "",
    html: `<div class="tm-pin ${active ? "tm-pin--active" : ""}">${n}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

function FitBounds({ points, focus }: { points: [number, number][]; focus?: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    if (focus) {
      map.flyTo(focus, 9, { duration: 0.8 });
      return;
    }
    if (points.length === 1) map.setView(points[0], 8);
    else if (points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [48, 48] });
  }, [map, points, focus]);
  return null;
}

export default function RouteMap({ stops, activePlaceId }: { stops: Stop[]; activePlaceId?: string }) {
  const points = useMemo(() => stops.map((s) => PLACE_BY_ID[s.placeId].coords), [stops]);
  const focus = activePlaceId ? PLACE_BY_ID[activePlaceId]?.coords : undefined;
  return (
    <MapContainer center={[-1.29, 36.82]} zoom={6} scrollWheelZoom className="h-full w-full" zoomControl={false} attributionControl>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      <Polyline positions={points} pathOptions={{ color: "#C8102E", weight: 3, dashArray: "6 8", opacity: 0.85 }} />
      {stops.map((s, i) => {
        const p = PLACE_BY_ID[s.placeId];
        return (
          <Marker key={s.id} position={p.coords} icon={pin(i + 1, p.id === activePlaceId)}>
            <Tooltip direction="top" offset={[0, -14]}>
              <strong>{p.name}</strong> · {s.nights} night{s.nights === 1 ? "" : "s"}
            </Tooltip>
          </Marker>
        );
      })}
      <FitBounds points={points} focus={focus} />
    </MapContainer>
  );
}
