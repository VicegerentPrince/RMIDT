"use client";

import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import { useMemo } from "react";
import "leaflet/dist/leaflet.css";
import type { RegimeRow } from "@/hooks/useRegimes";
import { REGIME_COLORS } from "@/lib/utils";

// Country ISO → economy key
const ISO_TO_ECONOMY: Record<string, string> = {
  USA: "US",
  DEU: "EU", FRA: "EU", ITA: "EU", ESP: "EU", NLD: "EU", BEL: "EU",
  AUT: "EU", PRT: "EU", GRC: "EU", FIN: "EU", IRL: "EU", LUX: "EU",
  CHN: "CN",
  PAK: "PK",
};

interface Props {
  regimes: RegimeRow[];
}

// Minimal GeoJSON of our tracked countries for the choropleth
// We embed small simplified polygons so the map works offline / without a key
const COUNTRY_FEATURES = {
  type: "FeatureCollection" as const,
  features: [
    { type: "Feature" as const, properties: { ISO_A3: "USA", name: "United States" }, geometry: { type: "Polygon" as const, coordinates: [[[-125, 24], [-66, 24], [-66, 49], [-125, 49], [-125, 24]]] } },
    { type: "Feature" as const, properties: { ISO_A3: "CHN", name: "China" }, geometry: { type: "Polygon" as const, coordinates: [[[73, 18], [135, 18], [135, 53], [73, 53], [73, 18]]] } },
    { type: "Feature" as const, properties: { ISO_A3: "DEU", name: "EU (Germany)" }, geometry: { type: "Polygon" as const, coordinates: [[[6, 47], [15, 47], [15, 55], [6, 55], [6, 47]]] } },
    { type: "Feature" as const, properties: { ISO_A3: "PAK", name: "Pakistan" }, geometry: { type: "Polygon" as const, coordinates: [[[61, 24], [77, 24], [77, 37], [61, 37], [61, 24]]] } },
  ],
};

export default function RegimeMap({ regimes }: Props) {
  const regimeMap = useMemo(() => {
    const m: Record<string, RegimeRow> = {};
    regimes.forEach(r => { m[r.economy] = r; });
    return m;
  }, [regimes]);

  function styleFeature(feature: { properties: { ISO_A3: string } }) {
    const iso = feature.properties.ISO_A3;
    const economy = ISO_TO_ECONOMY[iso];
    const regime = economy ? regimeMap[economy]?.regime : undefined;
    const color = regime ? REGIME_COLORS[regime] : "#1f2937";
    return {
      fillColor: color,
      weight: 1,
      opacity: 0.6,
      color: "#0a0e1a",
      fillOpacity: regime ? 0.55 : 0.15,
    };
  }

  function onEachFeature(feature: { properties: { ISO_A3: string; name: string } }, layer: L.Layer) {
    const iso = feature.properties.ISO_A3;
    const economy = ISO_TO_ECONOMY[iso];
    const r = economy ? regimeMap[economy] : undefined;

    if (r) {
      (layer as L.Path).bindPopup(`
        <div style="font-family:system-ui;color:#f9fafb;font-size:13px;min-width:180px">
          <div style="font-weight:700;margin-bottom:6px">${r.economy} — ${feature.properties.name}</div>
          <div style="color:${REGIME_COLORS[r.regime]};font-weight:600;margin-bottom:4px">${r.regime}</div>
          <div style="color:#9ca3af;font-size:11px">Confidence: ${(r.confidence * 100).toFixed(0)}%</div>
          ${r.feature_snapshot ? `
            <hr style="border-color:#1f2937;margin:6px 0"/>
            <div style="font-size:11px;color:#9ca3af">GDP Growth: ${r.feature_snapshot.gdp_growth?.toFixed(1) ?? "—"}%</div>
            <div style="font-size:11px;color:#9ca3af">CPI: ${r.feature_snapshot.cpi_yoy?.toFixed(1) ?? "—"}%</div>
            <div style="font-size:11px;color:#9ca3af">Unemployment: ${r.feature_snapshot.unemployment?.toFixed(1) ?? "—"}%</div>
          ` : ""}
        </div>
      `);
    } else {
      (layer as L.Path).bindPopup(`<div style="color:#9ca3af;font-size:12px">${feature.properties.name}</div>`);
    }
  }

  return (
    <MapContainer
      center={[20, 0]}
      zoom={2}
      style={{ height: 420, width: "100%", borderRadius: "1rem" }}
      scrollWheelZoom={false}
      zoomControl={true}
      attributionControl={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://carto.com">CARTO</a>'
      />
      <GeoJSON
        key={JSON.stringify(regimes.map(r => r.regime))}
        data={COUNTRY_FEATURES as unknown as GeoJSON.FeatureCollection}
        style={styleFeature as unknown as () => object}
        onEachFeature={onEachFeature as unknown as (feature: GeoJSON.Feature, layer: L.Layer) => void}
      />
    </MapContainer>
  );
}
