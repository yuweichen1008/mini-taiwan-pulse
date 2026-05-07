import { useState } from "react";
import type { LayerVisibility, VesselCategory } from "../types";
import { VESSEL_COLORS } from "../types";

interface Props {
  layerVisibility: LayerVisibility;
  onToggle: (key: keyof LayerVisibility) => void;
  shipCount: number;
  adsbCount: number;
}

interface CatRow {
  key: keyof LayerVisibility;
  cat: VesselCategory;
  label: string;
  sublabel: string;
}

const CAT_ROWS: CatRow[] = [
  { key: "showMilitary",  cat: "military",   label: "Military",     sublabel: "Warships · Submarines" },
  { key: "showCG",        cat: "coastguard", label: "Coast Guard",  sublabel: "Patrol · Enforcement" },
  { key: "showTanker",    cat: "tanker",     label: "Tanker / LNC", sublabel: "Petroleum · LNG · Chemical" },
  { key: "showCargo",     cat: "cargo",      label: "Cargo",        sublabel: "Container · Bulk · General" },
  { key: "showPassenger", cat: "passenger",  label: "Passenger",    sublabel: "Cruise · Ferry" },
  { key: "showFishing",   cat: "fishing",    label: "Fishing",      sublabel: "Fishing vessels" },
  { key: "showTug",       cat: "tug",        label: "Tug / Work",   sublabel: "Tugs · Workboats" },
  { key: "showOther",     cat: "other",      label: "Other",        sublabel: "Unclassified" },
];

function Row({
  label, sublabel, active, dot, onClick,
}: {
  label: string; sublabel?: string; active: boolean; dot?: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 8,
        width: "100%", padding: "5px 0",
        background: "none", border: "none", cursor: "pointer",
        opacity: active ? 1 : 0.35, transition: "opacity 0.15s",
      }}
    >
      {dot && (
        <span style={{
          width: 9, height: 9, borderRadius: "50%", background: dot, flexShrink: 0,
          boxShadow: active ? `0 0 5px ${dot}` : "none",
        }} />
      )}
      <span style={{ textAlign: "left" }}>
        <span style={{ display: "block", fontSize: 12, color: "#e0e0e0", fontWeight: 500 }}>{label}</span>
        {sublabel && <span style={{ display: "block", fontSize: 9, color: "#607d8b" }}>{sublabel}</span>}
      </span>
    </button>
  );
}

function Section({ title }: { title: string }) {
  return (
    <div style={{
      fontSize: 9, fontWeight: 700, letterSpacing: "0.09em", color: "#455a64",
      textTransform: "uppercase", marginTop: 10, marginBottom: 3,
      paddingBottom: 3, borderBottom: "1px solid #1a2a35",
    }}>
      {title}
    </div>
  );
}

export function LayerSidebar({ layerVisibility: v, onToggle, shipCount, adsbCount }: Props) {
  const [open, setOpen] = useState(true);

  return (
    <div style={{ position: "fixed", top: 12, right: 12, zIndex: 100, fontFamily: "'Inter','Segoe UI',sans-serif" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 6, marginLeft: "auto", marginBottom: 6,
          padding: "5px 10px", background: "rgba(8,18,28,0.90)", border: "1px solid #1e3a4a",
          borderRadius: 6, color: "#90caf9", fontSize: 11, cursor: "pointer", backdropFilter: "blur(8px)",
        }}
      >
        ⚓ {open ? "Hide Layers" : "Layers"}
      </button>

      {open && (
        <div style={{
          width: 200, padding: "10px 12px",
          background: "rgba(6,14,22,0.93)", border: "1px solid #1e3a4a",
          borderRadius: 8, backdropFilter: "blur(10px)", boxShadow: "0 4px 24px rgba(0,0,0,0.6)",
        }}>
          {/* Live counts */}
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            {[
              { val: shipCount.toLocaleString(), label: "VESSELS", color: "#4fc3f7" },
              { val: String(adsbCount), label: "AIRCRAFT", color: "#ffd54f" },
            ].map(({ val, label, color }) => (
              <div key={label} style={{
                flex: 1, padding: "4px 6px", background: "rgba(255,255,255,0.04)",
                borderRadius: 4, textAlign: "center",
              }}>
                <div style={{ fontSize: 15, fontWeight: 700, color }}>{val}</div>
                <div style={{ fontSize: 9, color: "#455a64" }}>{label}</div>
              </div>
            ))}
          </div>

          <Section title="Vessels" />
          <Row label="All Vessels" active={v.ships} dot="#4fc3f7" onClick={() => onToggle("ships")} />
          {v.ships && (
            <div style={{ paddingLeft: 10, borderLeft: "1px solid #1a2a35" }}>
              {CAT_ROWS.map(({ key, cat, label, sublabel }) => (
                <Row
                  key={key} label={label} sublabel={sublabel}
                  active={v[key] as boolean} dot={VESSEL_COLORS[cat]}
                  onClick={() => onToggle(key)}
                />
              ))}
            </div>
          )}

          <Section title="Air Picture" />
          <Row label="ADS-B Aircraft" sublabel="30s refresh · OpenSky" active={v.liveAdsb} dot="#ffd54f" onClick={() => onToggle("liveAdsb")} />

          <Section title="ADIZ" />
          <Row label="ADIZ Boundary" sublabel="Taiwan air defense perimeter" active={v.adizBoundary} dot="#ff4444" onClick={() => onToggle("adizBoundary")} />
          <Row label="Incursion Events" sublabel="PLA intrusion log" active={v.adizIncursions} dot="#ff7043" onClick={() => onToggle("adizIncursions")} />

          <Section title="Maritime Zones" />
          <Row label="EEZ / Territorial Waters" sublabel="12nm · 24nm · 200nm" active={v.maritimeZones} dot="#26c6da" onClick={() => onToggle("maritimeZones")} />

          <Section title="PLA Forces (OSINT)" />
          <Row label="PLA Bases" sublabel="Air · Naval · Rocket · Ground · EW" active={v.plaBases} dot="#ef4444" onClick={() => onToggle("plaBases")} />

          <Section title="Rail" />
          <Row label="HSR 高鐵" sublabel="Schedule-based · updates 10s" active={v.hsr} dot="#f97316" onClick={() => onToggle("hsr")} />
          <Row label="TRA 台鐵" sublabel="自強/普悠瑪 · schedule-based" active={v.tra} dot="#ef4444" onClick={() => onToggle("tra")} />

          <Section title="Infrastructure" />
          <Row label="Ports" active={v.ports} dot="#88bbff" onClick={() => onToggle("ports")} />
          <Row label="Airports" active={v.airports} dot="#aaa" onClick={() => onToggle("airports")} />
          <Row label="Submarine Cables" active={v.submarineCables} dot="#2196F3" onClick={() => onToggle("submarineCables")} />
          <Row label="Cable Landing Stations" active={v.landingStations} dot="#26c6da" onClick={() => onToggle("landingStations")} />
        </div>
      )}
    </div>
  );
}
