import { useCallback } from "react";
import "./DataLoader.css";

export function DataLoader({ onLoadSample, onLoadFile }) {
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) onLoadFile(file);
  }, [onLoadFile]);

  const handleFileInput = useCallback((e) => {
    const file = e.target.files[0];
    if (file) onLoadFile(file);
  }, [onLoadFile]);

  return (
    <div className="data-loader">
      <div className="loader-title">Run Again</div>
      <p className="loader-sub">당신이 달렸던 그 순간을, 텍스트가 다시 달립니다</p>

      <div
        className="drop-zone"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => document.getElementById("file-input").click()}
      >
        <span>GPX 또는 JSON 파일을 드래그하거나 클릭하세요</span>
        <input
          id="file-input"
          type="file"
          accept=".gpx,.json,.xml"
          style={{ display: "none" }}
          onChange={handleFileInput}
        />
      </div>

      <button className="sample-btn" onClick={onLoadSample}>
        샘플 러닝으로 시작하기
      </button>
    </div>
  );
}