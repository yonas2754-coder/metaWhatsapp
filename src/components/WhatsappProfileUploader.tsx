// src/components/WhatsappProfileUploader.tsx
"use client";

import React, { useState } from "react";

export default function WhatsappProfileUploader() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setStatus({ type: "error", message: "File size exceeds Meta's 5MB maximum safe execution limit." });
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setStatus(null);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setLoading(true);
    setStatus(null);

    const payload = new FormData();
    payload.append("file", selectedFile);

    try {
      const response = await fetch("/api/bot-profile", {
        method: "POST",
        body: payload,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed network processing task.");
      }

      setStatus({ type: "success", message: data.message });
    } catch (error: any) {
      setStatus({ type: "error", message: error.message || "An unknown transmission issue occurred." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>WhatsApp Brand Configuration</h3>
      <p style={styles.subtitle}>Upload your bot's public profile picture across Meta networks instantly.</p>
      
      <form onSubmit={handleFormSubmit} style={styles.form}>
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Select Local Image Asset (Square, Max 5MB)</label>
          <input 
            type="file" 
            accept="image/jpeg, image/png" 
            onChange={handleFileSelection} 
            style={styles.fileInput}
          />
        </div>

        {previewUrl && (
          <div style={styles.previewContainer}>
            <p style={styles.previewLabel}>Circle Crop Preview:</p>
            <img src={previewUrl} alt="Upload Preview" style={styles.avatarPreview} />
          </div>
        )}

        <button type="submit" disabled={loading || !selectedFile} style={styles.button}>
          {loading ? "Uploading to Meta CDN..." : "Apply Profile Image"}
        </button>
      </form>

      {status && (
        <div style={{ 
          ...styles.alert, 
          backgroundColor: status.type === "success" ? "#e6f4ea" : "#fce8e6", 
          color: status.type === "success" ? "#137333" : "#c5221f" 
        }}>
          {status.message}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "500px",
    background: "#ffffff",
    border: "1px solid #edebe9",
    borderRadius: "4px",
    padding: "24px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  title: { margin: "0 0 4px 0", fontSize: "18px", fontWeight: 600, color: "#323130" },
  subtitle: { margin: "0 0 20px 0", fontSize: "13px", color: "#605e5c" },
  form: { display: "flex", flexDirection: "column" as const, gap: "16px" },
  fieldGroup: { display: "flex", flexDirection: "column" as const, gap: "6px" },
  label: { fontSize: "12px", fontWeight: 600, color: "#323130" },
  fileInput: { fontSize: "13px", color: "#605e5c" },
  previewContainer: { display: "flex", flexDirection: "column" as const, alignItems: "center" as const, gap: "8px", padding: "12px", background: "#faf9f8", borderRadius: "4px" },
  previewLabel: { fontSize: "11px", color: "#605e5c", margin: 0 },
  avatarPreview: { width: "96px", height: "96px", borderRadius: "50%", objectFit: "cover" as const, border: "2px solid #0078d4" },
  button: { padding: "10px 16px", background: "#0078d4", color: "#ffffff", border: "none", borderRadius: "2px", fontWeight: 600, fontSize: "13px", cursor: "pointer" },
  alert: { marginTop: "16px", padding: "12px", borderRadius: "4px", fontSize: "13px", fontWeight: 500 }
};