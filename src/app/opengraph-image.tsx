import { ImageResponse } from "next/og";

export const alt =
  "123 Laundry — modern laundromat in Deer Park & Spokane Valley, WA";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background:
            "linear-gradient(135deg, #053341 0%, #0b6479 55%, #118fab 100%)",
          color: "white",
          padding: "70px 80px",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              fontSize: 28,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: "#b9e3ec",
              fontWeight: 700,
            }}
          >
            123 Laundry
          </div>
          <div
            style={{
              height: 4,
              width: 80,
              background: "#b9e3ec",
              borderRadius: 4,
            }}
          />
        </div>

        <div
          style={{
            marginTop: 50,
            fontSize: 92,
            lineHeight: 1.02,
            fontWeight: 900,
            letterSpacing: -2,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div>The cleanest laundromat</div>
          <div style={{ color: "#b9e3ec" }}>in town.</div>
        </div>

        <div
          style={{
            marginTop: "auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          <div
            style={{
              fontSize: 30,
              fontWeight: 600,
              color: "white",
              lineHeight: 1.3,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div>Deer Park · Spokane Valley</div>
            <div style={{ color: "#b9e3ec", fontSize: 24, marginTop: 6 }}>
              1 — Wash · 2 — Dry · 3 — Fold
            </div>
          </div>

          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: "white",
              padding: "14px 22px",
              border: "2px solid #b9e3ec",
              borderRadius: 999,
            }}
          >
            (509) 951-8534
          </div>
        </div>
      </div>
    ),
    size,
  );
}
