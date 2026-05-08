import { useRunData } from "./hooks/useRunData";
import { useReplay } from "./hooks/useReplay";
import { DataLoader } from "./components/DataLoader/DataLoader";
import { Controls } from "./components/Controls/Controls";
import { RunCanvas } from "./components/Canvas/RunCanvas";
import "./App.css";

export default function App() {
  const { visualPoints, isLoaded, loadSample, loadFile } = useRunData();
  const { isPlaying, progress, currentVisual, play, pause, reset } = useReplay(visualPoints);

  if (!isLoaded) {
    return <DataLoader onLoadSample={loadSample} onLoadFile={loadFile} />;
  }

  return (
    <>
      <RunCanvas currentVisual={currentVisual} isPlaying={isPlaying} />
      <Controls
        isPlaying={isPlaying}
        progress={progress}
        currentVisual={currentVisual}
        onPlay={play}
        onPause={pause}
        onReset={reset}
      />
    </>
  );
}