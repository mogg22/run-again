import { useState, useRef, useCallback, useEffect } from "react";

const REPLAY_DURATION = 60000; // 60초 압축 재생

export function useReplay(visualPoints) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);        // 0 ~ 1
  const [currentVisual, setCurrentVisual] = useState(null);

  const rafRef = useRef(null);
  const startTimeRef = useRef(null);

  const tick = useCallback((timestamp) => {
    if (!startTimeRef.current) startTimeRef.current = timestamp;

    const elapsed = timestamp - startTimeRef.current;
    const t = Math.min(elapsed / REPLAY_DURATION, 1);

    setProgress(t);

    // 현재 시점에 해당하는 데이터 포인트 선택
    if (visualPoints.length > 0) {
      const idx = Math.floor(t * (visualPoints.length - 1));
      setCurrentVisual(visualPoints[idx]);
    }

    if (t < 1) {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      setIsPlaying(false);
    }
  }, [visualPoints]);

  const play = useCallback(() => {
    startTimeRef.current = null;
    setProgress(0);
    setIsPlaying(true);
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const pause = useCallback(() => {
    setIsPlaying(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  const reset = useCallback(() => {
    pause();
    setProgress(0);
    setCurrentVisual(visualPoints[0] ?? null);
  }, [pause, visualPoints]);

  // 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return { isPlaying, progress, currentVisual, play, pause, reset };
}