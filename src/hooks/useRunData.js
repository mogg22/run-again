import { useState, useCallback } from "react";
import { sampleRun } from "../data/sampleRun";
import { mapPointToVisuals } from "../utils/dataMapper";
import { parseGPX } from "../utils/parseGPX";
import { parseHealthXML } from "../utils/parseHealthXML";

export function useRunData() {
  const [runData, setRunData] = useState(null);
  const [visualPoints, setVisualPoints] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(null);

  const processData = useCallback((data) => {
    const mapped = data.points.map((point, i) =>
      mapPointToVisuals(point, data.points[i - 1] ?? null)
    );
    setRunData(data);
    setVisualPoints(mapped);
    setIsLoaded(true);
    setError(null);
  }, []);

  const loadSample = useCallback(() => {
    processData(sampleRun);
  }, [processData]);

  const loadFile = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      try {
        if (file.name.endsWith(".gpx")) {
          processData(parseGPX(text));
        } else if (file.name.endsWith(".xml")) {
          processData(parseHealthXML(text));
        } else {
          // JSON fallback
          processData(JSON.parse(text));
        }
      } catch (err) {
        setError(`파일 파싱 실패: ${err.message}`);
        console.error(err);
      }
    };
    reader.readAsText(file);
  }, [processData]);

  return { runData, visualPoints, isLoaded, error, loadSample, loadFile };
}