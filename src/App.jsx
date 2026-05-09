import { useState } from "react";
import { useRunData } from "./hooks/useRunData";
import { useReplay } from "./hooks/useReplay";
import { DataLoader } from "./components/DataLoader/DataLoader";
import { Controls } from "./components/Controls/Controls";
import { RunCanvas } from "./components/Canvas/RunCanvas";
import { PerfHUD } from "./components/PerfHUD/PerfHUD";
import "./App.css";

export default function App() {
  const { visualPoints, isLoaded, error, loadSample, loadFile } = useRunData();
  const { isPlaying, progress, currentVisual, play, pause, reset } = useReplay(visualPoints);

  // Sprint 3에서 "pretext"로 전환 — 지금은 "dom" 고정
  const [renderMode, setRenderMode] = useState("dom");
  const [perfActive, setPerfActive] = useState(true);

  if (!isLoaded) {
    return (
      <>
        <DataLoader onLoadSample={loadSample} onLoadFile={loadFile} />
        {error && <div className="error-toast">{error}</div>}
      </>
    );
  }

  return (
    <>
      <RunCanvas
        currentVisual={currentVisual}
        isPlaying={isPlaying}
        renderMode={renderMode}
      />
      <Controls
        isPlaying={isPlaying}
        progress={progress}
        currentVisual={currentVisual}
        onPlay={play}
        onPause={pause}
        onReset={reset}
        renderMode={renderMode}
        onToggleMode={() =>
          setRenderMode((m) => (m === "dom" ? "pretext" : "dom"))
        }
      />
      <PerfHUD active={perfActive} />
    </>
  );
}