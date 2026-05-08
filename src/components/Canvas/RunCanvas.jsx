import { useEffect, useRef, useState, useCallback } from "react";
import { usePhysics } from "../../hooks/usePhysics";
import "./RunCanvas.css";

// 화면을 채울 텍스트 단어 풀
const TEXT_POOL = [
  "숨", "바닥", "버텨", "조금만", "달려", "심장", "리듬",
  "오르막", "내리막", "페이스", "호흡", "발걸음", "땀",
  "RUN", "PACE", "BPM", "KM", "AGAIN",
];

function createBlocks(count, width, height) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    text: TEXT_POOL[i % TEXT_POOL.length],
    baseX: Math.random() * (width - 80) + 40,
    baseY: Math.random() * (height - 80) + 40,
    x: Math.random() * (width - 80) + 40,
    y: Math.random() * (height - 80) + 40,
    velX: 0,
    velY: 0,
    fontSize: 12 + Math.random() * 16,
    opacity: 0.4 + Math.random() * 0.6,
  }));
}

export function RunCanvas({ currentVisual, isPlaying }) {
  const containerRef = useRef(null);
  const rafRef = useRef(null);
  const blocksRef = useRef([]);
  const lastTimeRef = useRef(null);
  const [renderBlocks, setRenderBlocks] = useState([]);

  const { updateMouse, computeBlockState, applyClickShockwave } = usePhysics();

  // 블록 초기화
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const count = currentVisual?.blockCount ?? 30;
    blocksRef.current = createBlocks(count, width, height);
    setRenderBlocks([...blocksRef.current]);
  }, [currentVisual?.blockCount]);

  // 물리 루프
  useEffect(() => {
    if (!isPlaying) return;

    const loop = (timestamp) => {
      const delta = lastTimeRef.current ? timestamp - lastTimeRef.current : 16;
      lastTimeRef.current = timestamp;

      blocksRef.current = blocksRef.current.map((block) =>
        computeBlockState(block, currentVisual, delta)
      );
      setRenderBlocks([...blocksRef.current]);

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastTimeRef.current = null;
    };
  }, [isPlaying, currentVisual, computeBlockState]);

  const handleMouseMove = useCallback((e) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    updateMouse(e.clientX - rect.left, e.clientY - rect.top);
  }, [updateMouse]);

  const handleClick = useCallback((e) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    blocksRef.current = applyClickShockwave(
      blocksRef.current,
      e.clientX - rect.left,
      e.clientY - rect.top
    );
  }, [applyClickShockwave]);

  // 클라이맥스 효과
  const isClimax = currentVisual?.isClimax ?? false;

  return (
    <div
      ref={containerRef}
      className={`run-canvas ${isClimax ? "climax" : ""}`}
      onMouseMove={handleMouseMove}
      onClick={handleClick}
    >
      {renderBlocks.map((block) => (
        <span
          key={block.id}
          className="text-block"
          style={{
            transform: `translate(${block.x}px, ${block.y}px)`,
            fontSize: `${block.fontSize}px`,
            opacity: block.opacity,
          }}
        >
          {block.text}
        </span>
      ))}
    </div>
  );
}