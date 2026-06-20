import { ImageResponse } from "@vercel/og";
import React from "react";

export const config = { runtime: "edge" };

const h = React.createElement;

export default function handler(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const ogType = searchParams.get("type") || "job";

    if (ogType === "hospital") {
      const name = (searchParams.get("name") || "Healthcare Facility").slice(0, 60);
      const city = (searchParams.get("city") || "India").slice(0, 40);
      const openings = searchParams.get("openings") || "0";

      const hospitalElement = h(
        "div",
        {
          style: {
            width: "100%", height: "100%", display: "flex",
            flexDirection: "column", justifyContent: "space-between",
            backgroundColor: "#0A0F0E", padding: "56px 64px",
            fontFamily: "sans-serif", position: "relative",
          },
        },
        h("div", { style: { display: "flex", alignItems: "center", gap: "10px" } },
          h("div", {
            style: {
              width: "36px", height: "36px", borderRadius: "8px",
              backgroundColor: "#00D4AA", display: "flex",
              alignItems: "center", justifyContent: "center",
            },
          },
            h("div", { style: { width: "18px", height: "18px", backgroundColor: "#0A0F0E", borderRadius: "4px" } }),
          ),
          h("span", { style: { color: "#00D4AA", fontSize: "22px", fontWeight: 700 } }, "MediBricks"),
        ),
        h("div", { style: { display: "flex", flexDirection: "column", gap: "12px" } },
          h("div", {
            style: {
              display: "flex", width: "fit-content",
              backgroundColor: "rgba(0,212,170,0.12)",
              border: "1px solid rgba(0,212,170,0.3)",
              borderRadius: "6px", padding: "4px 14px",
            },
          },
            h("span", { style: { color: "#00D4AA", fontSize: "16px", fontWeight: 600 } }, "Healthcare Facility"),
          ),
          h("div", {
            style: { color: "#F5F5F5", fontSize: "52px", fontWeight: 800, lineHeight: 1.15 },
          }, name),
          h("div", { style: { color: "#9CA3AF", fontSize: "26px" } }, city),
        ),
        h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-end" } },
          h("div", { style: { display: "flex", flexDirection: "column" } },
            h("span", {
              style: {
                color: "#6B7280", fontSize: "13px", fontWeight: 600,
                textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px",
              },
            }, "Open Shifts"),
            h("span", { style: { color: "#00D4AA", fontSize: "36px", fontWeight: 700 } }, openings),
          ),
          h("div", { style: { color: "#4B5563", fontSize: "16px" } }, "medibrick.com"),
        ),
        h("div", {
          style: {
            position: "absolute", top: 0, right: 0, bottom: 0, width: "320px",
            backgroundImage:
              "linear-gradient(rgba(0,212,170,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,170,0.03) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          },
        }),
      );

      return new ImageResponse(hospitalElement, { width: 1200, height: 630 });
    }

    const title    = (searchParams.get("title")    || "Healthcare Shift").slice(0, 80);
    const hospital = (searchParams.get("hospital") || "Hospital").slice(0, 60);
    const city     = (searchParams.get("city")     || "India").slice(0, 40);
    const pay      = searchParams.get("pay")  || "";
    const date     = searchParams.get("date") || "";

    const formattedDate = date
      ? new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
      : "";

    const formattedPay = pay
      ? `₹${Number(pay).toLocaleString("en-IN")} / shift`
      : "";

    const element = h(
      "div",
      {
        style: {
          width: "100%", height: "100%", display: "flex",
          flexDirection: "column", justifyContent: "space-between",
          backgroundColor: "#0A0F0E", padding: "56px 64px",
          fontFamily: "sans-serif", position: "relative",
        },
      },

      // ── Top: brand ───────────────────────────────────────────
      h("div", { style: { display: "flex", alignItems: "center", gap: "10px" } },
        h("div", {
          style: {
            width: "36px", height: "36px", borderRadius: "8px",
            backgroundColor: "#00D4AA", display: "flex",
            alignItems: "center", justifyContent: "center",
          },
        },
          h("div", { style: { width: "18px", height: "18px", backgroundColor: "#0A0F0E", borderRadius: "4px" } }),
        ),
        h("span", {
          style: { color: "#00D4AA", fontSize: "22px", fontWeight: 700, letterSpacing: "0.5px" },
        }, "MediBricks"),
      ),

      // ── Middle: job info ──────────────────────────────────────
      h("div", { style: { display: "flex", flexDirection: "column", gap: "12px" } },
        // category pill
        h("div", {
          style: {
            display: "flex", width: "fit-content",
            backgroundColor: "rgba(0,212,170,0.12)",
            border: "1px solid rgba(0,212,170,0.3)",
            borderRadius: "6px", padding: "4px 14px",
          },
        },
          h("span", { style: { color: "#00D4AA", fontSize: "16px", fontWeight: 600 } }, "Open Shift"),
        ),
        // job title
        h("div", {
          style: {
            color: "#F5F5F5", fontSize: "56px", fontWeight: 800,
            lineHeight: 1.15, letterSpacing: "-1px",
          },
        }, title),
        // hospital · city
        h("div", {
          style: {
            display: "flex", alignItems: "center", gap: "12px",
            color: "#9CA3AF", fontSize: "26px", fontWeight: 400,
          },
        },
          h("span", null, hospital),
          h("span", { style: { color: "#374151" } }, "·"),
          h("span", null, city),
        ),
      ),

      // ── Bottom row: pay + date + tagline ─────────────────────
      h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-end" } },
        h("div", { style: { display: "flex", gap: "32px", alignItems: "center" } },
          formattedPay
            ? h("div", { style: { display: "flex", flexDirection: "column" } },
                h("span", {
                  style: {
                    color: "#6B7280", fontSize: "13px", fontWeight: 600,
                    textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px",
                  },
                }, "Compensation"),
                h("span", { style: { color: "#00D4AA", fontSize: "28px", fontWeight: 700 } }, formattedPay),
              )
            : null,
          formattedDate
            ? h("div", { style: { display: "flex", flexDirection: "column" } },
                h("span", {
                  style: {
                    color: "#6B7280", fontSize: "13px", fontWeight: 600,
                    textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px",
                  },
                }, "Shift Date"),
                h("span", { style: { color: "#D1D5DB", fontSize: "28px", fontWeight: 600 } }, formattedDate),
              )
            : null,
        ),
        h("div", { style: { color: "#4B5563", fontSize: "16px" } }, "medibrick.com"),
      ),

      // ── Subtle grid texture overlay ───────────────────────────
      h("div", {
        style: {
          position: "absolute", top: 0, right: 0, bottom: 0, width: "320px",
          backgroundImage:
            "linear-gradient(rgba(0,212,170,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,170,0.03) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        },
      }),
    );

    return new ImageResponse(element, { width: 1200, height: 630 });
  } catch (err) {
    console.error("[og] error generating image:", err);
    return new Response("Failed to generate OG image", { status: 500 });
  }
}
