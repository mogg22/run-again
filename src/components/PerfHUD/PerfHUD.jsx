import { useEffect, useState } from "react";
import { monitor } from "../../utils/performanceMonitor";
import "./PerfHUD.css";

export function PerfHUD({ active }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!active) {
      monitor.stop();
      return;
    }
    monitor.start();

    const interval = setInterval(() => {
      setStats(monitor.getResult());
    }, 500); // 0.5초마다 갱신

    return () => {
      clearInterval(interval);
      monitor.stop();
    };
  }, [active]);

  if (!active || !stats) return null;

  const fpsColor =
    stats.avgFps >= 55 ? "#4ade80" :
    stats.avgFps >= 40 ? "#facc15" : "#f87171";

  return (
    <div className="perf-hud">
      <div className="hud-label">{stats.label} MODE</div>
      <div className="hud-fps" style={{ color: fpsColor }}>
        {stats.avgFps} <span>fps avg</span>
      </div>
      <div className="hud-row">
        <span>min</span><strong>{stats.minFps}</strong>
      </div>
      <div className="hud-row">
        <span>worst 1%</span><strong>{stats.p1Fps}</strong>
      </div>
      <div className="hud-row">
        <span>drops</span><strong>{stats.dropCount}</strong>
      </div>
      <div className="hud-row">
        <span>reflows</span><strong>{stats.reflowCount}</strong>
      </div>
      {stats.memory && (
        <div className="hud-row">
          <span>mem</span><strong>{stats.memory.used}MB</strong>
        </div>
      )}
    </div>
  );
}