import { useEffect, useRef, useCallback } from "react";
import { usePhysics } from "../../hooks/usePhysics";
import "./RunCanvas.css";

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

export function RunCanvas({ currentVisual, isPlaying, renderMode }) {
  const containerRef = useRef(null);
  const domNodesRef = useRef([]);   // 실제 DOM 노드 참조
  const rafRef = useRef(null);
  const blocksRef = useRef([]);
  const lastTimeRef = useRef(null);
  const prevCountRef = useRef(0);

  const { updateMouse, computeBlockState, applyClickShockwave } = usePhysics();

  // ── DOM 노드 생성/삭제 (블록 수 변화 시에만) ──────
  const syncDomNodes = useCallback((count) => {
    const container = containerRef.current;
    if (!container) return;

    const current = domNodesRef.current;

    // 부족하면 추가
    while (current.length < count) {
      const span = document.createElement("span");
      span.className = "text-block";
      container.appendChild(span);
      current.push(span);
    }

    // 넘치면 제거
    while (current.length > count) {
      const span = current.pop();
      span.remove();
    }

    // 텍스트·폰트 초기화
    blocksRef.current.forEach((block, i) => {
      if (current[i]) {
        current[i].textContent = block.text;
        current[i].style.fontSize = `${block.fontSize}px`;
        current[i].style.opacity = block.opacity;
      }
    });
  }, []);

  // ── 블록 초기화 ───────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const count = currentVisual?.blockCount ?? 30;

    if (count !== prevCountRef.current) {
      blocksRef.current = createBlocks(count, width, height);
      syncDomNodes(count);
      prevCountRef.current = count;
    }
  }, [currentVisual?.blockCount, syncDomNodes]);

  // ── 물리 루프 — React state 대신 직접 DOM transform ──
  useEffect(() => {
    if (!isPlaying) return;

    const loop = (timestamp) => {
      const delta = lastTimeRef.current
        ? Math.min(timestamp - lastTimeRef.current, 50) // 50ms 캡 (탭 전환 대비)
        : 16;
      lastTimeRef.current = timestamp;

      // 물리 계산
      blocksRef.current = blocksRef.current.map((block) =>
        computeBlockState(block, currentVisual, delta)
      );

      // DOM 직접 업데이트 (React 리렌더링 없음)
      blocksRef.current.forEach((block, i) => {
        const node = domNodesRef.current[i];
        if (node) {
          node.style.transform = `translate(${block.x}px, ${block.y}px)`;
        }
      });

      // 클라이맥스 클래스
      const container = containerRef.current;
      if (container) {
        container.classList.toggle("climax", currentVisual?.isClimax ?? false);
      }

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

  return (
    <div
      ref={containerRef}
      className="run-canvas"
      onMouseMove={handleMouseMove}
      onClick={handleClick}
    />
  );
}