import { useState, useCallback } from "react";
import { sampleRun } from "../data/sampleRun";
import { mapPointToVisuals } from "../utils/dataMapper";

export function useRunData() {
  const [runData, setRunData] = useState(null);
  const [visualPoints, setVisualPoints] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // 데이터 → 시각 파라미터 배열로 변환
  const processData = useCallback((data) => {
    const mapped = data.points.map((point, i) =>
      mapPointToVisuals(point, data.points[i - 1] ?? null)
    );
    setRunData(data);
    setVisualPoints(mapped);
    setIsLoaded(true);
  }, []);

  // 샘플 데이터 로드
  const loadSample = useCallback(() => {
    processData(sampleRun);
  }, [processData]);

  // GPX/JSON 파일 업로드 (Sprint 2에서 파서 연결 예정)
  const loadFile = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        // 현재는 JSON만 지원, GPX는 Sprint 2에서 추가
        const parsed = JSON.parse(e.target.result);
        processData(parsed);
      } catch {
        console.warn("JSON 파싱 실패 — GPX 파서는 Sprint 2에서 연결됩니다");
      }
    };
    reader.readAsText(file);
  }, [processData]);

  return { runData, visualPoints, isLoaded, loadSample, loadFile };
}