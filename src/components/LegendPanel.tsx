import type { LayerVisibility } from "../types";
import { VESSEL_COLORS } from "../types";

interface Props {
  layerVisibility: LayerVisibility;
}

export function LegendPanel({ layerVisibility }: Props) {
  if (!layerVisibility.ships) return null;

  return (
    <div style={{
      position: "fixed", bottom: 50, right: 12, zIndex: 90,
      background: "rgba(6,14,22,0.88)", border: "1px solid #1e3a4a",
      borderRadius: 8, padding: "8px 12px", backdropFilter: "blur(8px)",
      fontFamily: "'Inter','Segoe UI',sans-serif",
    }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: "#455a64", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
        Vessel Types
      </div>
      {(Object.entries(VESSEL_COLORS) as [string, string][]).map(([cat, color]) => (
        <div key={cat} style={{ display: "flex", alignItems: "center", gap: 6, padding: "2px 0" }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block" }} />
          <span style={{ fontSize: 10, color: "#90a4ae", textTransform: "capitalize" }}>{cat}</span>
        </div>
      ))}
    </div>
  );
}
