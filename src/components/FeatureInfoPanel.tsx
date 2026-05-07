import { X } from "lucide-react";
import type { MapClickFeature } from "../types";
import { PLA_TYPE_COLORS } from "../map/overlayRegistry";

const PLA_ICONS: Record<string, string> = {
  PLAAF: "✈", PLAN: "⚓", PLARF: "🚀", PLAGF: "⚔", HQ: "★", RADAR: "📡",
};

function taiwanNow(): string {
  return new Date().toLocaleTimeString("en-US", { timeZone: "Asia/Taipei", hour: "2-digit", minute: "2-digit", hour12: false });
}

const CABLE_COLORS: Record<string, string> = {
  "國際幹線": "#2196F3", "海峽專線": "#F44336",
  "離島連接": "#4CAF50", "中國境內": "#FF9800", "規劃中": "#9E9E9E",
};

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ display: "flex", gap: 8, padding: "3px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <span style={{ fontSize: 10, color: "#607d8b", minWidth: 90 }}>{label}</span>
      <span style={{ fontSize: 11, color: "#e0e0e0" }}>{value}</span>
    </div>
  );
}

function renderContent(feature: MapClickFeature) {
  const p = feature.properties;
  const layer = feature.layerId;

  if (layer.startsWith("pla-bases")) {
    const t = String(p.type ?? "");
    const color = PLA_TYPE_COLORS[t] ?? "#9ca3af";
    const icon = PLA_ICONS[t] ?? "◉";
    return (
      <>
        <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 2 }}>
          {icon} {String(p.name_en ?? "PLA Installation")}
        </div>
        <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 6 }}>{String(p.name_zh ?? "")}</div>
        <Row label="Branch" value={t} />
        <Row label="Unit" value={String(p.unit ?? "")} />
        {p.dist_km && <Row label="Dist. to Taiwan" value={`~${p.dist_km} km`} />}
        {p.notes && (
          <div style={{ marginTop: 6, fontSize: 10, color: "#9ca3af", lineHeight: 1.4 }}>
            {String(p.notes)}
          </div>
        )}
        <div style={{ marginTop: 6, fontSize: 9, color: "#4b5563", borderTop: "1px solid #1f2937", paddingTop: 4 }}>
          Source: open-source intelligence (OSINT)
        </div>
      </>
    );
  }

  if (layer.startsWith("hsr-trains")) {
    const dir = Number(p.direction) === 0 ? "Southbound ↓" : "Northbound ↑";
    const color = Number(p.direction) === 0 ? "#fb923c" : "#60a5fa";
    return (
      <>
        <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 4 }}>
          🚄 HSR {String(p.trainNo ?? "")}
        </div>
        <Row label="Direction" value={dir} />
        <Row label="From" value={String(p.fromStation ?? "")} />
        <Row label="To" value={String(p.toStation ?? "")} />
        <Row label="Time (TPE)" value={taiwanNow()} />
      </>
    );
  }

  if (layer.startsWith("tra-trains")) {
    const dir = Number(p.direction) === 0 ? "Southbound ↓" : "Northbound ↑";
    const route = String(p.route ?? "") === "western" ? "縱貫線 Western" : "東部 East Coast";
    const color = String(p.color ?? "#ef4444");
    return (
      <>
        <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 4 }}>
          🚞 TRA {String(p.trainNo ?? "")}
        </div>
        <Row label="Route" value={route} />
        <Row label="Direction" value={dir} />
        <Row label="From" value={String(p.fromStation ?? "")} />
        <Row label="To" value={String(p.toStation ?? "")} />
        <Row label="Time (TPE)" value={taiwanNow()} />
      </>
    );
  }

  if (layer.startsWith("submarine-cables")) {
    const cable_type = String(p.cable_type ?? "");
    return (
      <>
        <div style={{ fontSize: 12, fontWeight: 600, color: CABLE_COLORS[cable_type] ?? "#fff", marginBottom: 6 }}>
          ⚡ {String(p.name ?? "Submarine Cable")}
        </div>
        <Row label="Type" value={cable_type} />
        {p.operators && <Row label="Operators" value={String(p.operators)} />}
        {p.length_km && <Row label="Length" value={`${p.length_km} km`} />}
      </>
    );
  }

  if (layer.startsWith("port-polygons")) {
    return (
      <>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#88bbff", marginBottom: 6 }}>
          ⚓ {String(p.name ?? "Port")}
        </div>
        {p.port_type && <Row label="Type" value={String(p.port_type)} />}
        {p.operator && <Row label="Operator" value={String(p.operator)} />}
      </>
    );
  }

  if (layer.startsWith("maritime-zones")) {
    return (
      <>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#26c6da", marginBottom: 6 }}>
          🌊 {String(p.name ?? "Maritime Zone")}
        </div>
        <Row label="Zone" value={String(p.zone_type ?? "")} />
        {p.name_zh && <Row label="名稱" value={String(p.name_zh)} />}
      </>
    );
  }

  if (layer.startsWith("landing-stations")) {
    return (
      <>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#26c6da", marginBottom: 6 }}>
          📡 {String(p.name ?? "Landing Station")}
        </div>
        {p.station_type && <Row label="Type" value={String(p.station_type)} />}
        {p.cables && <Row label="Cables" value={String(p.cables)} />}
      </>
    );
  }

  if (layer.startsWith("adiz")) {
    return (
      <>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#ff4444", marginBottom: 6 }}>
          ✈ ADIZ {layer.includes("incident") ? "Incursion" : "Boundary"}
        </div>
        {p.date && <Row label="Date" value={String(p.date)} />}
        {p.aircraft_count && <Row label="Aircraft" value={Number(p.aircraft_count)} />}
        {p.description && <Row label="Event" value={String(p.description)} />}
      </>
    );
  }

  // Generic fallback
  const entries = Object.entries(p).filter(([, v]) => v != null && v !== "");
  return (
    <>
      <div style={{ fontSize: 11, color: "#607d8b", marginBottom: 4 }}>{feature.layerId}</div>
      {entries.slice(0, 8).map(([k, v]) => (
        <Row key={k} label={k} value={String(v)} />
      ))}
    </>
  );
}

interface Props {
  feature: MapClickFeature;
  onClose: () => void;
}

export function FeatureInfoPanel({ feature, onClose }: Props) {
  return (
    <div style={{
      position: "fixed", bottom: 50, left: 12, zIndex: 200, width: 260,
      background: "rgba(6,14,22,0.94)", border: "1px solid #1e3a4a",
      borderRadius: 8, padding: "10px 12px", backdropFilter: "blur(10px)",
      boxShadow: "0 4px 24px rgba(0,0,0,0.6)", fontFamily: "'Inter','Segoe UI',sans-serif",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 10, color: "#455a64", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Layer Info
        </span>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#607d8b", padding: 0 }}>
          <X size={14} />
        </button>
      </div>
      {renderContent(feature)}
    </div>
  );
}
