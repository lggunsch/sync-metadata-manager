import { useState } from "react";

export default function NewPitch() {
  const [brief, setBrief] = useState("");
  const [parsed, setParsed] = useState(false);

  const handleParse = () => {
    if (!brief.trim()) return;
    setParsed(true);
  };

  return (
    <div style={{ padding: "24px", maxWidth: "800px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "28px", marginBottom: "16px" }}>
        New Pitch
      </h1>

      {!parsed && (
        <>
          <textarea
            placeholder="Paste sync brief here..."
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            style={{
              width: "100%",
              height: "160px",
              padding: "12px",
              fontSize: "14px",
              borderRadius: "8px",
              border: "1px solid #ccc",
              marginBottom: "12px",
            }}
          />

          <button
            onClick={handleParse}
            style={{
              padding: "10px 16px",
              borderRadius: "8px",
              border: "none",
              background: "black",
              color: "white",
              cursor: "pointer",
            }}
          >
            Parse Brief
          </button>
        </>
      )}

      {parsed && (
        <div style={{ marginTop: "24px" }}>
          <h2 style={{ marginBottom: "12px" }}>Top Matches</h2>

          {/* Mock results for now */}
          {[
            { title: "Midnight Drive", tags: "moody, dark pop" },
            { title: "Golden Hour", tags: "uplifting, indie" },
            { title: "Run Fast", tags: "energetic, electronic" },
          ].map((song, index) => (
            <div
              key={index}
              style={{
                padding: "12px",
                border: "1px solid #eee",
                borderRadius: "8px",
                marginBottom: "8px",
              }}
            >
              <strong>{song.title}</strong>
              <div style={{ fontSize: "12px", color: "#666" }}>
                {song.tags}
              </div>
            </div>
          ))}

          <button
            style={{
              marginTop: "16px",
              padding: "10px 16px",
              borderRadius: "8px",
              border: "none",
              background: "black",
              color: "white",
              cursor: "pointer",
            }}
          >
            Generate Pitch
          </button>
        </div>
      )}
    </div>
  );
}