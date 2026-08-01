<div align="center">

# 숫자블록 미니게임

**숫자블록 친구들과 세고, 더하고, 길을 찾고, 지하철을 갈아타는 네다섯 살의 첫 웹 게임**

[![놀이](https://img.shields.io/badge/놀이-6종-4DB6E2?style=flat-square)](#여섯-가지-놀이)
[![테스트](https://img.shields.io/badge/테스트-323개-7BC67B?style=flat-square)](#테스트)
[![의존성](https://img.shields.io/badge/의존성-0-F2A65A?style=flat-square)](#어떻게-만들어졌나)
[![음성](https://img.shields.io/badge/한국어·영어_음성-410개-C79BE0?style=flat-square)](#소리와-음성)
[![안내방송](https://img.shields.io/badge/실제_지하철_안내방송-62개_역-9BB7E0?style=flat-square)](#지하철-안내방송-정리)
[![배포](https://img.shields.io/badge/GitHub_Pages-배포중-6FC7B6?style=flat-square)](https://bliss-forge.github.io/numberblocks-minigame/)

**▶ [지금 놀아보기](https://bliss-forge.github.io/numberblocks-minigame/)**

</div>

> [!IMPORTANT]
> 이 게임은 **네 살에서 여섯 살 아이가 혼자 조작한다**는 전제로 만들어졌습니다.
> 숫자키와 방향키, 스페이스바만으로 전부 조작되고, 틀려도 벌점이나 실패 화면이 없습니다.
> 화면을 고칠 때 이 두 가지는 깨뜨리지 않아야 합니다.

---

## 빠른 시작

빌드도 설치도 없습니다. 정적 파일이라 아무 정적 서버에나 얹으면 됩니다.

```bash
git clone https://github.com/bliss-forge/numberblocks-minigame.git
cd numberblocks-minigame

python3 -m http.server 8000     # 아무 정적 서버나 괜찮습니다
open http://localhost:8000

npm test                        # 테스트 323개
```

`file://` 로 직접 열면 ES 모듈이 막히니 꼭 서버로 띄워 주세요.

---

## 여섯 가지 놀이

홈에서 숫자키 하나로 고릅니다. 카드 번호와 캐릭터 번호는 항상 같습니다.

| 키 | 놀이 | 하는 일 | 캐릭터 |
| --- | --- | --- | --- |
| <kbd>1</kbd> | **몇 개일까?** | 블록을 눈으로 세어 답합니다 | 1 |
| <kbd>2</kbd> | **더하기 합체** | 두 친구를 모아 하나로 만듭니다 | 2 |
| <kbd>3</kbd> | **빼기 블록** | 친구를 덜어내고 남은 수를 셉니다 | 3 |
| <kbd>4</kbd> | **곱하기 블록** | 줄과 칸을 세어 곱을 구합니다 | 4 |
| <kbd>5</kbd> | **안전한 길찾기** | 신호등과 차를 피해 친구를 만나러 갑니다 | 5 |
| <kbd>6</kbd> | **지하철 여행** | 노선을 갈아타며 목적지까지 갑니다 | 6 |

난이도는 <kbd>7</kbd> 쉬움 · <kbd>8</kbd> 차근차근 · <kbd>9</kbd> 도전 세 단계이고, 고른 값은 다음에 켤 때도 남습니다.

```mermaid
flowchart LR
    home([홈<br/>숫자키 1~6]) --> math[숫자 놀이<br/>세기·덧셈·뺄셈·곱셈]
    home --> safety[안전한 길찾기<br/>신호등·횡단보도·버스]
    home --> subway[지하철 여행<br/>9개 노선·66개 역]
    safety -->|도전| srt[SRT 부산행<br/>좌석 찾아 앉기]
    subway --> place[목적지 10곳<br/>동물원·놀이공원·경복궁…]
    math --> star([별 모으기])
    srt --> star
    place --> star

    classDef hub fill:#D6ECFA,stroke:#7FB2D4,color:#20404F
    classDef lesson fill:#E4F3E0,stroke:#95C48D,color:#28401F
    classDef ride fill:#FDECD8,stroke:#E5B27A,color:#4A3016
    classDef prize fill:#F0E4F7,stroke:#BB99CE,color:#3D2447
    class home,star hub
    class math,safety lesson
    class subway,srt ride
    class place prize
```

### 안전한 길찾기

옆에서 본 동네를 걸어 다니며 신호등을 보고 건너고, 버스를 타고, 친구를 만납니다.
지도는 쉬움·차근차근·도전 세 가지이고, **도전 지도만 SRT 부산행으로 이어집니다** —
수서에서 출발해 동탄·대전·대구를 지나 부산까지, 다섯 칸짜리 열차에서 자기 좌석을 찾아 앉는 여정입니다.

### 지하철 여행

서울 지하철 1~9호선을 옮겨 그린 노선도 위에서 실제로 갈아타며 목적지까지 갑니다.

| | |
| --- | --- |
| 노선 | 9개 (1~9호선, 실제 노선 색) |
| 역 | 66개, 이 중 환승역 27개 |
| 목적지 | 10곳 — 동물원·놀이공원·야구장·경복궁·남산타워·한강공원·하늘공원·어린이대공원·석촌호수·국회의사당 |
| 조작 | 방향키로 걷고, <kbd>Space</kbd>로 타고 내림 |

개찰구를 지나 계단을 내려가고, 승강장에서 열차를 기다렸다가, 노선도를 보며 내릴 역을 고릅니다.
창밖 풍경은 노선마다 다릅니다 — 1·9호선은 지상, 2·3·4호선은 한강을 건너고, 5~8호선은 지하를 달립니다.
내릴 때는 승강장 틈을 폴짝 뛰어넘는 짧은 놀이가 있고, 네 번째까지 놓치면 그냥 건너가게 해 줍니다.

---

## 소리와 음성

| 종류 | 내용 |
| --- | --- |
| 안내 음성 | 한국어 210개 · 영어 200개 (`assets/audio/voice/`) |
| 지하철 안내방송 | 실제 서울 지하철 도착 안내 62개 역 + 발빠짐 주의·출입문 예고·도착 멜로디 |
| 음소거 | 화면 오른쪽 위 **소리** 버튼 하나로 전부 끕니다 |

음성이 없는 역에서는 소리가 조용히 넘어가고 안내 문구만 뜹니다.
현재 국회의사당 한 곳이 여기에 해당합니다 — 9호선 안내방송 묶음을 아직 구하지 못했습니다.

### 지하철 안내방송 정리

내려받은 안내방송 묶음을 `subway_sound/` 아래 게임이 찾는 이름으로 정리해 주는 도구가 있습니다.
CP949로 압축된 zip을 그대로 넣어도 되고, 한 역에 여러 녹음이 있으면 한국어 도착 안내 중 가장 짧은 것을 고릅니다.

```bash
node scripts/import_station_sounds.mjs subway_sound/original_subway_sound            # 미리보기
node scripts/import_station_sounds.mjs subway_sound/original_subway_sound --apply    # 실제 정리
```

출발·행선 안내와 외국어 안내는 도착 음성이 아니라서 걸러내고, 옮길 때 64kbps 모노로 다시 인코딩합니다.
원본을 그대로 넣으려면 `--raw` 를 붙이면 됩니다.

---

## 어떻게 만들어졌나

의존성이 없습니다. 브라우저가 바로 읽는 ES 모듈과 CSS, 그리고 인라인 SVG로 그린 그림뿐입니다.
캐릭터만 미리 렌더한 PNG를 쓰고, 나머지 그림 — 지하철 승강장, 동네 골목, 도착지 열 곳 — 은 전부 코드가 그립니다.

<details>
<summary><b>파일 구성</b></summary>

```
index.html                  홈 카드와 화면 뼈대
styles.css                  홈·게임 전체 시각 스타일
src/
  app.mjs                   게임 상태와 입력 처리
  game-model.mjs            문제 생성과 채점
  audio-manager.mjs         음성·효과음 재생과 음소거
  audio-manifest.mjs        음성 키 목록
  character-*.mjs           숫자블록 캐릭터 배치와 배율
  safety-route-*.mjs        안전한 길찾기 — 지도·이동·신호등·미니맵·그림
  srt-journey*.mjs          SRT 부산행 — 좌석 찾기와 열차 그림
  subway-*.mjs              지하철 여행 — 노선도·여정·장면·역 그림·도착지 그림
  station-sound-import.mjs  안내방송 파일명 해석
assets/
  characters/               숫자블록 캐릭터 161장
  audio/voice/{ko,en}/      안내 음성
subway_sound/               실제 지하철 안내방송
scripts/                    캐릭터 렌더·음성 생성·안내방송 정리
tests/                      테스트 32개 파일
docs/                       설계 문서와 작업 계획
```

</details>

### 아이가 쓰는 화면이라 지키는 것들

- 숫자키·방향키·스페이스바만으로 전부 조작됩니다. 마우스가 없어도 됩니다.
- 모든 버튼은 최소 44×44px이고 포커스 테두리가 뚜렷합니다.
- `prefers-reduced-motion`을 켜면 깜박임과 흐르는 배경이 멈춥니다.
- 오답에 벌점이 없습니다. 다시 해 보라고만 말합니다.
- PC 1280×720에서 카드 여섯 장이 한눈에 들어오고, 모바일 390×844에서 가로 스크롤이 없습니다.

---

## 테스트

```bash
npm test        # node --test tests/*.test.mjs
```

브라우저 없이 도는 순수 노드 테스트입니다. DOM이 필요한 곳은 가짜 엘리먼트로 대신합니다.
문제 생성과 채점, 안전길 이동과 신호등, 지하철 경로와 환승, 장면 렌더 계약, 홈 카드 계약,
반응형 스타일, 음성 자산 존재 여부까지 **323개**가 확인합니다.

---

## 배포

`main`에 올라가면 GitHub Pages가 그대로 서빙합니다 — 빌드 단계가 없습니다.

**https://bliss-forge.github.io/numberblocks-minigame/**
