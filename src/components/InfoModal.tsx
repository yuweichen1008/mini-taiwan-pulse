import { useState } from "react";

export function InfoModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          position: "fixed", bottom: 16, left: 12, zIndex: 100,
          background: "rgba(6,14,22,0.88)", border: "1px solid #1e3a4a",
          borderRadius: "50%", width: 32, height: 32,
          color: "#607d8b", fontSize: 14, cursor: "pointer",
          backdropFilter: "blur(8px)", fontFamily: "'Inter','Segoe UI',sans-serif",
        }}
        title="About"
      >
        ?
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 500,
            background: "rgba(0,0,0,0.6)", display: "flex",
            alignItems: "center", justifyContent: "center",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 340, padding: 24,
              background: "rgba(8,18,28,0.97)", border: "1px solid #1e3a4a",
              borderRadius: 12, backdropFilter: "blur(12px)",
              fontFamily: "'Inter','Segoe UI',sans-serif",
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 700, color: "#90caf9", marginBottom: 4 }}>
              ⚓ Taiwan Maritime Pulse
            </div>
            <div style={{ fontSize: 11, color: "#455a64", marginBottom: 16 }}>
              Real-time maritime intelligence dashboard
            </div>

            {[
              ["Vessels", "AIS ship tracks from Supabase · colored by vessel type"],
              ["Aircraft", "ADS-B live feed via OpenSky Network · 30s refresh"],
              ["ADIZ", "Taiwan Air Defense Identification Zone · PLA incursion log"],
              ["Maritime Zones", "Territorial waters (12nm) · Contiguous (24nm) · EEZ (200nm)"],
              ["Cables", "Submarine cable routes and landing stations"],
            ].map(([title, desc]) => (
              <div key={title} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#e0e0e0" }}>{title}</div>
                <div style={{ fontSize: 11, color: "#607d8b" }}>{desc}</div>
              </div>
            ))}

            <button
              onClick={() => setOpen(false)}
              style={{
                marginTop: 8, width: "100%", padding: "8px 0",
                background: "rgba(144,202,249,0.1)", border: "1px solid #1e3a4a",
                borderRadius: 6, color: "#90caf9", cursor: "pointer", fontSize: 12,
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
