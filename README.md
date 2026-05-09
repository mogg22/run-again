# Run-Again
> Pretext 기술 분석을 기반으로 한 인터랙티브 타이포그래피 웹 아트 설계

러닝 기록 데이터(GPX / Apple Health XML)를 입력하면,  
페이스·심박·고도의 흐름이 **Pretext 기반 텍스트 블록의 물리적 움직임**으로 재생되고,  
사용자의 커서가 그 세계에 바람처럼 개입하는 인터랙티브 웹 아트.

```
과거의 데이터  →  텍스트가 몸으로 기억한다
현재의 커서    →  바람처럼 그 기억을 흩트린다
```

---

## 목차

- [프로젝트 개요](#프로젝트-개요)
- [기술 스택](#기술-스택)
- [아키텍처](#아키텍처)
- [데이터 → 시각 매핑](#데이터--시각-매핑)
- [성능 비교: DOM vs Pretext](#성능-비교-dom-vs-pretext)
- [스프린트 기록](#스프린트-기록)

---

## 프로젝트 개요

대부분의 러닝 앱은 데이터를 **숫자와 그래프**로만 소비한다.  
페이스 4:32/km, 심박 156bpm — 정확하지만, 그 순간의 감각은 없다.

**Run Again**은 그 데이터를 다시 감각으로 번역한다.

| 기존 러닝 앱 | Run Again |
|---|---|
| 데이터 분석·기록 열람 | 경험 재현·감각 번역 |
| 선 그래프·숫자 대시보드 | Pretext 기반 움직이는 텍스트 |
| 없음 (조회 중심) | 워밍업 → 본페이스 → 스퍼트 드라마 |
| 필터·기간 선택 | 커서로 실시간 바람 방향 개입 |

### 두 레이어 구조

```
Layer 1 — 러닝 리플레이 시스템
  GPX / Health XML 로드 → 60초 압축 재생
  각 프레임: 페이스·심박·고도 → 텍스트 물리 파라미터로 변환

Layer 2 — 커서 바람 시스템
  커서 위치·속도 → 현재 페이스 비례 반발 강도
  클릭 → 충격파 방출 → 텍스트 폭발 후 복귀
```

---

## 기술 스택

| 역할 | 도구 | 선택 이유 |
|---|---|---|
| 프레임워크 | React + Vite | 빠른 HMR, rAF 루프에 유리 |
| 텍스트 레이아웃 | **Pretext** | DOM 측정 없는 사전 계산, ~500배 빠름 |
| 렌더링 | CSS transform (GPU) | Reflow 없이 위치 갱신 |
| 물리 | Vanilla JS | 외부 의존 없이 반발·스프링·드리프트 구현 |
| 데이터 파싱 | DOMParser (내장) | GPX·XML 서버 없이 클라이언트 파싱 |
| 배포 | Vercel | 정적 사이트, 서버 불필요 |

### Pretext를 선택한 이유

```
DOM 방식:  텍스트 블록 이동 → getBoundingClientRect() 호출
           → 브라우저 Layout 강제 → Reflow 발생
           → 매 프레임 누적 → 성능 저하

Pretext:   폰트 메트릭스 사전 분석 → 순수 산술 계산
           → DOM 측정 없음 → Reflow 0
           → 수십만 블록도 120fps 유지
```

러닝 리플레이는 60초 동안 **초당 수십 회** 텍스트 위치를 재계산해야 한다.  
이 조건에서 Pretext의 사전 계산 모델은 선택이 아닌 필수다.

---

## 아키텍처

```
src/
├── components/
│   ├── Canvas/
│   │   └── RunCanvas.jsx       # 텍스트 렌더링 메인 영역
│   │                           # DOM 직접 조작으로 React 리렌더링 없음
│   ├── DataLoader/
│   │   └── DataLoader.jsx      # 파일 업로드 + 샘플 선택 UI
│   ├── Controls/
│   │   └── Controls.jsx        # 재생/정지 + DOM↔Pretext 전환 버튼
│   └── PerfHUD/
│       └── PerfHUD.jsx         # 실시간 FPS·drops·reflows 모니터
│
├── hooks/
│   ├── useRunData.js           # 러닝 데이터 파싱 & 상태 관리
│   ├── usePhysics.js           # 반발·스프링·드리프트·충격파 계산
│   └── useReplay.js            # 60초 압축 타임라인 재생
│
├── data/
│   └── sampleRun.js            # 내장 샘플 (워밍업→본페이스→스퍼트)
│
└── utils/
    ├── parseGPX.js             # Strava GPX 파서 + Haversine 거리 계산
    ├── parseHealthXML.js       # Apple Health XML 파서
    ├── dataMapper.js           # 러닝 수치 → 시각 파라미터 변환
    └── performanceMonitor.js   # FPS·drops·reflows 측정 시스템
```

### 렌더링 루프 흐름

```
requestAnimationFrame
  │
  ├─ useReplay: 현재 진행률 t → visualPoints[idx] 선택
  │
  ├─ usePhysics.computeBlockState()
  │   ├─ 커서 반발 벡터 계산 (repulsionRadius = f(pace))
  │   ├─ 스프링 복귀 (spring=0.12, damping=0.75)
  │   ├─ 심박 진동 sin파 (period = 60/bpm * 1000ms)
  │   ├─ 고도 drift (elevation delta → Y bias)
  │   └─ 케이던스 수평 진동 (60/spm → sin x-offset)
  │
  └─ DOM 직접 업데이트
      node.style.transform = `translate(${x}px, ${y}px)`
      (React setState 없음 → Reflow 없음)
```

---

## 데이터 → 시각 매핑

| 러닝 데이터 | 시각 변수 | 수식 | 체감 효과 |
|---|---|---|---|
| 페이스 (min/km) | 커서 반발 반경 | `80 + (1 - norm(pace)) * 320` px | 빠를수록 텍스트가 강하게 날아간다 |
| 심박수 (bpm) | 진동 주기·진폭 | `60/bpm * 1000` ms | 텍스트가 심장처럼 뛴다 |
| 고도 변화 (m) | Y축 drift 방향 | `elevation delta * -0.4` px/frame | 오르막=상승, 내리막=낙하 |
| 케이던스 (spm) | 수평 진동 주파수 | `60/spm * 2π` rad/s | 발걸음 리듬이 전해진다 |
| 누적 거리 (km) | 텍스트 블록 수 | `10 + ratio * 70` | 멀리 달릴수록 화면이 풍성해진다 |
| 클라이맥스 감지 | 배경·이펙트 강화 | `bpm ≥ 185 && pace ≤ 5.0` | 라스트 스퍼트 폭발 |

### 클릭 충격파

```
클릭 지점 기준 반경 200px 내 모든 블록에
방사형 벡터 적용: force = (1 - dist/radius) * 15
이후 스프링 감쇠로 원위치 복귀
```

---

## 성능 비교: DOM vs Pretext

> Pretext 연결 전후 동일 조건(블록 수·물리 연산·측정 시간)에서 측정

### 측정 항목

| 항목 | 설명 |
|---|---|
| avg FPS | 측정 구간 평균 프레임레이트 |
| min FPS | 측정 구간 최저 프레임레이트 |
| worst 1% FPS | 하위 1% 프레임 (체감 끊김 지표) |
| drops | 16.67ms(60fps 기준) 초과 프레임 수 |
| reflows | layout-shift 발생 횟수 |
| mem | JS 힙 메모리 사용량 |

### Sprint 2 완료 시점 — DOM 방식 베이스라인

> 측정 환경: Chrome / 텍스트 블록 30개 / 60초 재생 중 커서 이동

| 항목 | DOM 방식 | Pretext 방식 |
|---|---|---|
| avg FPS | **59.7** | 측정 예정 |
| min FPS | 20 | 측정 예정 |
| worst 1% FPS | 55.6 | 측정 예정 |
| drops | 1134 | 측정 예정 |
| reflows | **0** | 측정 예정 |
| mem | 10MB | 측정 예정 |

> reflows 0은 `node.style.transform` 직접 조작으로 Reflow를 완전히 제거한 결과.  
> drops 1134는 물리 연산(반발·진동·드리프트) 자체의 부하 — Pretext 연결 후 비교 예정.

#### 초기 측정 문제 및 해결

| 문제 | 원인 | 해결 |
|---|---|---|
| avg FPS = Infinity | 첫 프레임 delta 계산 타이밍 오류 | 워밍업 10프레임 제외 + 500ms 이상 delta 필터 |
| drops = 2604 | React setState 매 프레임 → 전체 리렌더링 | DOM 직접 조작으로 교체, React 리렌더링 제거 |
| reflows = 117 | longtask 포함으로 과다 계상 | layout-shift만 측정 + value > 0.01 필터 |

---

## 스프린트 기록

### ✅ Sprint 1 — 기본 환경 구축 (완료)

**목표:** 프로젝트 세팅 + React 구조 설계 + 기본 UI 레이아웃

**완료 항목:**
- Vite + React 프로젝트 세팅, Pretext 패키지 설치
- 폴더 구조 설계 (components / hooks / utils / data)
- `sampleRun.js` — 워밍업·본페이스·오르막·스퍼트 5km 샘플 데이터
- `dataMapper.js` — 러닝 수치 → 시각 파라미터 변환 함수
- `useRunData` — 데이터 로드·파싱·상태 관리
- `useReplay` — 60초 압축 타임라인 재생 (rAF 기반)
- `usePhysics` — 커서 반발·스프링 복귀·심박 진동·고도 드리프트·충격파
- `DataLoader` — 파일 드래그앤드롭 + 샘플 선택 UI
- `RunCanvas` — 텍스트 블록 렌더링 (초기: React state 방식)
- `Controls` — 재생/정지/리셋 + 프로그레스바

**결과:** 샘플 버튼 → 텍스트 블록 등장 → 재생 → 커서 반발 동작 확인

---

### ✅ Sprint 2 — 데이터 파서 + 성능 측정 인프라 (완료)

**목표:** GPX/XML 파서 완성 + DOM 방식 베이스라인 측정

**완료 항목:**
- `parseGPX.js` — Strava GPX 파서 (Haversine 거리 계산 포함)
- `parseHealthXML.js` — Apple Health XML 파서 (HR 샘플 시간 매칭)
- `useRunData` 업데이트 — 파일 확장자별 파서 자동 분기
- `PerformanceMonitor` 클래스 — FPS·drops·reflows·메모리 측정
- `PerfHUD` — 실시간 성능 HUD (우상단, 0.5초 갱신)
- `RunCanvas` 리팩토링 — React state → DOM 직접 조작으로 교체
- Controls에 DOM ↔ Pretext 전환 버튼 추가 (Sprint 3 연결 예정)

**성능 측정 결과 (DOM 베이스라인):**

```
avg FPS  : 59.7   ✅ 정상
min FPS  : 20
worst 1% : 55.6
drops    : 1134   ← 물리 연산 부하 (Pretext 비교 예정)
reflows  : 0      ✅ DOM 직접 조작으로 완전 제거
mem      : 10MB
```

---

### 🔄 Sprint 3 — Pretext 연결 (진행 중)

**목표:** Pretext 연결 + DOM 방식과 동시 구현 + 전환 시스템 완성

**예정 항목:**
- `pretextLayout.js` — Pretext 래핑 유틸
- `usePretextBlocks.js` — Pretext 기반 블록 관리 훅
- `RunCanvas` — `renderMode` prop으로 DOM/Pretext 분기
- `PerformanceMonitor` — 모드별 스냅샷 저장 기능
- Pretext 방식 베이스라인 측정 및 DOM 결과와 비교

---

### ⏳ Sprint 4 — 성능 비교 리포트 뷰 (예정)

**목표:** DOM vs Pretext 정량 비교 결과를 화면에 표시

**예정 항목:**
- `PerfReport` 컴포넌트 — 두 방식 수치 나란히 비교
- 블록 수 슬라이더 (10 / 30 / 100 / 500개) — 규모별 성능 차이 측정
- 비교 결과 JSON 내보내기

---

### ⏳ Sprint 5 — 물리·시각 이펙트 강화 (예정)

**목표:** 클라이맥스 이펙트 + 시각 완성도

**예정 항목:**
- 라스트 1km 클라이맥스 파티클 폭발 이펙트
- 텍스트 콘텐츠 큐레이션 (수치 + 감각 단어 혼합)
- 구간별 배경 색온도 변화

---

### ⏳ Sprint 6 — 최적화 + 마무리 (예정)

**목표:** Vercel 배포 + 최종 시연 준비

**예정 항목:**
- 웹폰트 고정 + font-display: block (Pretext 오차 방지)
- 모바일 대응 여부 결정
- Vercel 배포
- 최종 DOM vs Pretext 성능 리포트 확정
