import { useEffect, useRef, useState } from "react";
import { useParkStore } from "./store";
import { PIECE_TYPES, PIECE_LABELS, type PieceType } from "./types";
import { resetPark } from "./api";

const COLORS = ["#e63946", "#2a9d8f", "#f4a261", "#457b9d", "#e9c46a", "#9d4edd", "#ff6d00", "#ffffff"];

export default function Palette() {
  const {
    selectedType,
    selectedRotation,
    selectedZ,
    selectedColor,
    identity,
    connected,
    peers,
    setSelectedType,
    rotateSelection,
    setSelectedZ,
    setSelectedColor,
    setIdentityName,
  } = useParkStore();

  const [confirmingReset, setConfirmingReset] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
  }, []);

  function handleResetClick() {
    if (!confirmingReset) {
      setConfirmingReset(true);
      resetTimer.current = setTimeout(() => setConfirmingReset(false), 4000);
      return;
    }
    if (resetTimer.current) clearTimeout(resetTimer.current);
    setConfirmingReset(false);
    resetPark().catch(() => {
      /* the ws "reset" broadcast covers success; a failed request just leaves the park as-is */
    });
  }

  return (
    <div className="hud">
      <div className="hud-section">
        <div className="hud-title">
          <span className={`dot ${connected ? "dot-on" : "dot-off"}`} />
          {connected ? "Connected" : "Reconnecting…"} · {peers.size} builder{peers.size === 1 ? "" : "s"} online
        </div>
        <input
          className="name-input"
          value={identity.name}
          maxLength={20}
          onChange={(e) => setIdentityName(e.target.value)}
        />
      </div>

      <div className="hud-section">
        <div className="hud-title">Pieces</div>
        <div className="piece-grid">
          {PIECE_TYPES.map((t: PieceType) => (
            <button
              key={t}
              className={`piece-btn ${selectedType === t ? "piece-btn-active" : ""}`}
              onClick={() => setSelectedType(t)}
            >
              {PIECE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      <div className="hud-section hud-row">
        <button className="ghost-btn" onClick={rotateSelection}>
          ⟳ Rotate ({selectedRotation * 90}°)
        </button>
        <div className="height-control">
          <span>Height {selectedZ}</span>
          <button className="ghost-btn" onClick={() => setSelectedZ(selectedZ - 1)}>
            −
          </button>
          <button className="ghost-btn" onClick={() => setSelectedZ(selectedZ + 1)}>
            +
          </button>
        </div>
      </div>

      <div className="hud-section">
        <div className="hud-title">Color</div>
        <div className="color-row">
          {COLORS.map((c) => (
            <button
              key={c}
              className={`swatch ${selectedColor === c ? "swatch-active" : ""}`}
              style={{ background: c }}
              onClick={() => setSelectedColor(c)}
            />
          ))}
        </div>
      </div>

      <div className="hud-section hint">
        Left-click: place · Right-click: remove your piece · Drag: pan · Scroll: zoom
      </div>

      <div className="hud-section">
        <button
          className={`reset-btn ${confirmingReset ? "reset-btn-confirm" : ""}`}
          onClick={handleResetClick}
        >
          {confirmingReset ? "Click again to wipe the park" : "Reset Park"}
        </button>
      </div>
    </div>
  );
}
