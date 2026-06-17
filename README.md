# LEVIANT

`LEVIANT`는 로컬 브라우저에서 바로 실행할 수 있는 HTML/CSS/JavaScript 기반 네온 아케이드 게임입니다. 고전 플래시게임처럼 가볍게 시작하고, 두 가지 모드에서 점수와 기록을 겨루는 구조입니다.

## 게임 소개

첫 화면에서 `START`를 누른 뒤 모드와 난이도를 선택해서 플레이합니다.

- `SHOOTING`: 화면 전체를 이동하며 자동 발사로 적과 보스를 상대하는 세로 스크롤 슈팅 모드
- `RUNNER`: 인간형 네온 슈트 캐릭터로 점프와 슬라이드를 사용하는 피지컬 러너 모드
- 난이도: `EASY`, `NORMAL`, `HARD`
- 월드 순서: 우주/네온 -> 판타지/마법 -> 심해 -> 사이버 도시
- 기록 저장: 브라우저 `localStorage`에 모드/난이도별 최고 기록 저장
- 사운드: BGM/SFX 기본 켜짐, 타이틀 화면에서 각각 끄고 켤 수 있음

## 조작법

### 공통

- 일시정지: `P`
- 메뉴로 돌아가기: `Esc`
- 전체화면: 타이틀 화면의 `FULLSCREEN`

### 슈팅 모드

- 이동: `WASD` 또는 방향키
- 발사: 자동 발사

### 러너 모드

- 점프: `Space`, `W`, `ArrowUp`
- 슬라이드: `S`, `ArrowDown`

## 실행 방법

별도 설치가 필요 없습니다. 최신 Chrome, Edge, Safari, Firefox 중 하나로 `index.html`을 열면 됩니다.

### macOS

Finder에서 프로젝트 폴더를 열고 `index.html`을 더블클릭합니다.

터미널에서는 프로젝트 폴더에서 다음 명령을 실행합니다.

```zsh
open index.html
```

다른 위치에서 실행할 경우:

```zsh
open /Users/songjinju/Downloads/오서현-게임/index.html
```

### Windows

파일 탐색기에서 프로젝트 폴더를 열고 `index.html`을 더블클릭합니다.

명령 프롬프트에서는 프로젝트 폴더에서 다음 명령을 실행합니다.

```bat
start index.html
```

PowerShell에서는:

```powershell
Start-Process .\index.html
```

### Linux

파일 관리자에서 프로젝트 폴더를 열고 `index.html`을 더블클릭합니다.

터미널에서는 프로젝트 폴더에서 다음 명령을 실행합니다.

```sh
xdg-open index.html
```

## 로컬 서버로 실행하기

일반 실행은 `index.html` 더블클릭으로 충분합니다. 브라우저 설정이나 배포 전 테스트 때문에 로컬 서버가 필요하면 프로젝트 폴더에서 아래 명령 중 하나를 사용할 수 있습니다.

Python 3:

```sh
python3 -m http.server 8000
```

브라우저에서 접속:

```text
http://localhost:8000
```

Windows에서 `python3` 명령이 없으면:

```bat
py -m http.server 8000
```

## 참고

- 사운드는 브라우저 정책상 첫 클릭이나 키 입력 이후 재생됩니다.
- 기록과 사운드 설정은 같은 브라우저의 `localStorage`에 저장됩니다.
- 배포 후 기록은 각 사용자의 브라우저에 개별 저장됩니다.
