export class PerformanceMonitor {
  constructor(label = "unnamed") {
    this.label = label;
    this.samples = [];
    this.dropCount = 0;
    this.reflowCount = 0;

    this._lastTime = null;
    this._rafId = null;
    this._observer = null;
    this._running = false;
    this._warmup = 10; // 첫 10프레임 제외 (초기화 노이즈 제거)
    this._frameCount = 0;
  }

  start() {
    if (this._running) return;
    this._running = true;
    this.samples = [];
    this.dropCount = 0;
    this.reflowCount = 0;
    this._lastTime = null;
    this._frameCount = 0;

    const tick = (timestamp) => {
      if (!this._running) return;

      if (this._lastTime !== null) {
        const delta = timestamp - this._lastTime;

        // 워밍업 구간 제외 + 비정상 delta 필터 (500ms 이상은 탭 전환 등)
        if (this._frameCount > this._warmup && delta < 500) {
          const fps = 1000 / delta;
          this.samples.push(fps);
          if (delta > 16.67) this.dropCount++;
        }
        this._frameCount++;
      }

      this._lastTime = timestamp;
      this._rafId = requestAnimationFrame(tick);
    };

    this._rafId = requestAnimationFrame(tick);

    // Reflow 관찰
    try {
      this._observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === "layout-shift" && entry.value > 0.01) {
            this.reflowCount++;
          }
        }
      });
      this._observer.observe({ entryTypes: ["layout-shift"] });
    } catch {
      // 미지원 환경 무시
    }
  }

  stop() {
    this._running = false;
    if (this._rafId) cancelAnimationFrame(this._rafId);
    if (this._observer) this._observer.disconnect();
  }

  getResult() {
    if (this.samples.length < 5) return null;

    const avg = this.samples.reduce((a, b) => a + b, 0) / this.samples.length;
    const sorted = [...this.samples].sort((a, b) => a - b);
    const min = sorted[0];
    const p1 = sorted[Math.floor(sorted.length * 0.01)] ?? min;

    const memory = performance.memory
      ? {
          used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
          total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
        }
      : null;

    return {
      label: this.label,
      avgFps: Math.round(avg * 10) / 10,
      minFps: Math.round(min * 10) / 10,
      p1Fps: Math.round(p1 * 10) / 10,
      dropCount: this.dropCount,
      reflowCount: this.reflowCount,
      sampleCount: this.samples.length,
      memory,
    };
  }

  // 현재까지 결과를 스냅샷으로 저장 (DOM/Pretext 비교용)
  snapshot() {
    const result = this.getResult();
    if (!result) return null;
    return { ...result, timestamp: Date.now() };
  }
}

export const monitor = new PerformanceMonitor("DOM");

// 모드 전환 시 label 갱신
export function setMonitorMode(mode) {
  monitor.label = mode === 'pretext' ? 'Pretext' : 'DOM';
  monitor.stop();
  monitor.start();
}