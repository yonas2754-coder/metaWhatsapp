// src/app/admin/whatsapp/page.tsx
import React from "react";
import WhatsappProfileUploader from "@/components/WhatsappProfileUploader";

export const metadata = {
  title: "WhatsApp Core Configurations | Support Portal Admin",
};

export default function WhatsAppAdminPage() {
  return (
    <main style={{ minHeight: "100vh", backgroundColor: "#faf9f8", padding: "40px 24px" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 className="eth-text-hero" style={{ color: "#323130", margin: 0 }}>
          System Management Control Dashboard
        </h1>
        <p className="eth-text-subtitle-lg" style={{ color: "#605e5c", margin: "8px 0 0 0" }}>
          Configure active webhooks, telemetry channels, and front-facing customer brand assets.
        </p>
      </div>

      <hr style={{ border: "none", borderTop: "1px solid #edebe9", margin: "0 0 24px 0" }} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "32px" }}>
        <div>
          <WhatsappProfileUploader />
        </div>

        <div style={{ background: "#ffffff", border: "1px solid #edebe9", borderRadius: "4px", padding: "24px" }}>
          <h2 className="eth-text-heading" style={{ color: "#323130", margin: "0 0 16px 0" }}>
            Meta Branding Guidelines
          </h2>
          <ul style={{ margin: 0, paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <li className="eth-text-body-md" style={{ color: "#201f1e", lineHeight: 1.5 }}>
              <strong>Circled Crop Layer:</strong> Ensure your corporate logo or icon asset is centered inside the boundary grid layout. Meta systems will cut off corner details.
            </li>
            <li className="eth-text-body-md" style={{ color: "#201f1e", lineHeight: 1.5 }}>
              <strong>Sync Delay Buffer:</strong> Edge node CDNs take up to 2 hours to push profile changes to end customers with open chat threads.
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}