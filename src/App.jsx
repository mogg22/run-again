import { useState, useCallback } from "react";
import { useRunData } from "./hooks/useRunData";
import { useReplay } from "./hooks/useReplay";
import { DataLoader } from "./components/DataLoader/DataLoader";
import { Controls } from "./components/Controls/Controls";
import { RunCanvas } from "./components/Canvas/RunCanvas";
import { PerfHUD } from "./components/PerfHUD/PerfHUD";
import { monitor, setMonitorMode } from "./utils/performanceMonitor";
import "./App.css";

export default function App() {
  const { visualPoints, isLoaded, error, loadSample, loadFile } = useRunData();
  const { isPlaying, progress, currentVisual, play, pause, reset } = useReplay(visualPoints);

  const [renderMode, setRenderMode] = useState("dom");
  const [perfActive, setPerfActive] = useState(true);

  // ── DOM ↔ Pretext 전환 ───────────────────────────────
  const handleToggleMode = useCallback(() => {
    setRenderMode((prev) => {
      const next = prev === "dom" ? "pretext" : "dom";
      setMonitorMode(next);
      return next;
    });
  }, []);

  // ── 재생 시 측정 시작, 정지 시 스냅샷 콘솔 출력 ────
  const handlePlay = useCallback(() => {
    monitor.start();
    play();
  }, [play]);

  const handlePause = useCallback(() => {
    pause();
    const result = monitor.snapshot();
    if (result) {
      console.table({
        모드: result.label,
        "avg FPS": result.avgFps,
        "min FPS": result.minFps,
        "worst 1%": result.p1Fps,
        drops: result.dropCount,
        reflows: result.reflowCount,
        "mem (MB)": result.memory?.used ?? "N/A",
      });
    }
  }, [pause]);

  const handleReset = useCallback(() => {
    monitor.stop();
    reset();
  }, [reset]);

  // ── 로딩 전 화면 ─────────────────────────────────────
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
        onPlay={handlePlay}
        onPause={handlePause}
        onReset={handleReset}
        renderMode={renderMode}
        onToggleMode={handleToggleMode}
      />
      <PerfHUD active={perfActive} />
    </>
  );
}