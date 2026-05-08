import "./Controls.css";

export function Controls({ isPlaying, progress, onPlay, onPause, onReset, currentVisual }) {
  return (
    <div className="controls">
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress * 100}%` }} />
      </div>

      <div className="control-row">
        <button onClick={onReset}>↺</button>
        <button onClick={isPlaying ? onPause : onPlay}>
          {isPlaying ? "⏸" : "▶"}
        </button>

        {currentVisual && (
          <div className="stats">
            <span>{currentVisual.raw.pace.toFixed(1)}<small>/km</small></span>
            <span>{currentVisual.raw.bpm}<small>bpm</small></span>
            <span>{currentVisual.raw.distance.toFixed(1)}<small>km</small></span>
          </div>
        )}
      </div>
    </div>
  );
}