import { useEffect } from "react";
import type { RefObject } from "react";
import { Popup } from "mapbox-gl";
import type { Map as MapboxMap, MapLayerMouseEvent } from "mapbox-gl";

const HOVER_LAYER = "pla-bases-glow";

function injectStyles() {
  if (document.getElementById("pla-popup-css")) return;
  const s = document.createElement("style");
  s.id = "pla-popup-css";
  s.textContent = `
    .pla-popup .mapboxgl-popup-content {
      background: rgba(0,6,3,0.97);
      border: 1px solid rgba(0,255,65,0.55);
      border-radius: 3px;
      padding: 0;
      box-shadow: 0 0 18px rgba(0,255,65,0.12), 0 6px 28px rgba(0,0,0,0.95);
      font-family: 'JetBrains Mono','Fira Code','Cascadia Code','Courier New',monospace;
    }
    .pla-popup .mapboxgl-popup-tip { border-top-color: rgba(0,6,3,0.97); }
    .pla-popup .mapboxgl-popup-close-button { display: none; }
  `;
  document.head.appendChild(s);
}

const BRANCH_NAMES: Record<string, string> = {
  PLAAF: "AIR FORCE",
  PLAN:  "NAVY",
  PLARF: "ROCKET FORCE",
  PLAGF: "GROUND FORCE",
  HQ:    "THEATER COMMAND",
  RADAR: "SIGINT / EW",
};

const TYPE_ICONS: Record<string, string> = {
  PLAAF: "✈", PLAN: "⚓", PLARF: "↑", PLAGF: "⊕", HQ: "★", RADAR: "◎",
};

const TYPE_COLORS: Record<string, string> = {
  PLAAF: "#f59e0b", PLAN: "#3b82f6", PLARF: "#ef4444",
  PLAGF: "#22c55e", HQ: "#d946ef",  RADAR: "#06b6d4",
};

function threatLevel(type: string, dist: number): { label: string; color: string; bars: number } {
  if (type === "PLARF")                   return { label: "CRITICAL", color: "#ff1744", bars: 10 };
  if (type === "HQ")                      return { label: "HIGH",     color: "#ff5722", bars: 8 };
  if (dist > 0 && dist < 200)             return { label: "CRITICAL", color: "#ff1744", bars: 10 };
  if (dist > 0 && dist < 350)             return { label: "HIGH",     color: "#ff5722", bars: 8 };
  if (dist > 0 && dist < 600)             return { label: "ELEVATED", color: "#ff9800", bars: 6 };
  return                                         { label: "MODERATE", color: "#ffd600", bars: 4 };
}

function threatBar(bars: number, color: string): string {
  const filled = "█".repeat(bars);
  const empty  = "░".repeat(10 - bars);
  return `<span style="color:${color}">${filled}</span><span style="color:#1a3a20">${empty}</span>`;
}

function row(label: string, value: string): string {
  return `
    <div style="display:flex;gap:10px;padding:3px 0;border-bottom:1px solid rgba(0,255,65,0.06)">
      <span style="font-size:8.5px;color:#00884a;min-width:64px;letter-spacing:0.08em;flex-shrink:0">${label}</span>
      <span style="font-size:9.5px;color:#a0ffb0;line-height:1.4">${value}</span>
    </div>`;
}

function buildHTML(p: Record<string, unknown>): string {
  const type   = String(p.type   ?? "");
  const nameEn = String(p.name_en ?? "Unknown");
  const nameZh = String(p.name_zh ?? "");
  const unit   = String(p.unit   ?? "");
  const dist   = Number(p.dist_km ?? 0);
  const notes  = String(p.notes  ?? "");
  const coords = p._lng != null
    ? `${Number(p._lng).toFixed(2)}°E · ${Number(p._lat).toFixed(2)}°N`
    : "";

  const color   = TYPE_COLORS[type] ?? "#9ca3af";
  const icon    = TYPE_ICONS[type]  ?? "●";
  const branch  = BRANCH_NAMES[type] ?? type;
  const { label: tLabel, color: tColor, bars } = threatLevel(type, dist);

  return `
    <div style="padding:11px 14px;min-width:292px;max-width:340px">
      <div style="font-size:7.5px;color:rgba(0,255,65,0.55);letter-spacing:0.16em;margin-bottom:7px">
        ▶ PLA INSTALLATION · OSINT INTERCEPT
      </div>
      <div style="font-size:13px;font-weight:700;color:${color};letter-spacing:0.03em;margin-bottom:2px">
        ${icon}&nbsp;&nbsp;${nameEn}
      </div>
      ${nameZh ? `<div style="font-size:10px;color:#00884a;margin-bottom:9px">${nameZh}</div>` : ""}
      <div style="height:1px;background:linear-gradient(to right,rgba(0,255,65,0.4),transparent);margin-bottom:7px"></div>
      <div>
        ${row("BRANCH", `${branch}`)}
        ${row("UNIT",   unit)}
        ${dist ? row("RANGE", `~${dist} km from Taiwan`) : ""}
        ${coords ? row("COORD", coords) : ""}
        ${row("THREAT", `${threatBar(bars, tColor)} <span style="color:${tColor};font-size:9px;font-weight:700;margin-left:4px">${tLabel}</span>`)}
      </div>
      ${notes ? `
        <div style="margin-top:8px;font-size:9px;color:#4dae7c;line-height:1.55;border-top:1px solid rgba(0,255,65,0.1);padding-top:6px">${notes}</div>
      ` : ""}
      <div style="margin-top:7px;font-size:7.5px;color:#00441a;letter-spacing:0.09em">
        SRC: DoD CMPR · CSIS CHINA POWER · OSINT
      </div>
    </div>`;
}

export function usePlaPopup(
  mapRef: RefObject<MapboxMap | null>,
  visible: boolean,
  mapVersion: number,
) {
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !visible) return;

    injectStyles();
    const popup = new Popup({
      closeButton: false, closeOnClick: false,
      className: "pla-popup", maxWidth: "none",
    });

    const onMove = (e: MapLayerMouseEvent) => {
      map.getCanvas().style.cursor = "crosshair";
      const f = e.features?.[0];
      if (!f) return;
      const props = (f.properties ?? {}) as Record<string, unknown>;
      const [lng, lat] = (f.geometry as GeoJSON.Point).coordinates;
      popup
        .setLngLat(e.lngLat)
        .setHTML(buildHTML({ ...props, _lng: lng, _lat: lat }))
        .addTo(map);
    };
    const onLeave = () => {
      map.getCanvas().style.cursor = "";
      popup.remove();
    };

    const attach = () => {
      if (!map.getLayer(HOVER_LAYER)) return;
      map.on("mousemove", HOVER_LAYER, onMove);
      map.on("mouseleave", HOVER_LAYER, onLeave);
    };

    if (map.isStyleLoaded()) {
      attach();
    } else {
      map.once("style.load", attach);
    }

    return () => {
      map.off("style.load", attach);
      map.off("mousemove", HOVER_LAYER, onMove);
      map.off("mouseleave", HOVER_LAYER, onLeave);
      popup.remove();
    };
  }, [mapRef, visible, mapVersion]);
}
