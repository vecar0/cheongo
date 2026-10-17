# 로컬(Unity MCP) 세션에 넘기는 안내

이 파일은 클라우드 세션이 작업한 Unity 부스판을 **Unity 에디터와 연결된 로컬 Claude Code 세션**이 이어받기 위한 안내입니다.
로컬 세션은 이 파일을 먼저 읽고 아래 순서대로 진행합니다.

## 0. 규칙
- 사용자에게는 **한국어로**, 짧지만 오해 없게 답합니다. 요청은 무조건 받아들이지 말고 평가해서 더 나은 안이 있으면 말합니다.
- 저장소는 `vecar0/cheongo`(예전 이름 `vecar0/akane`)이고 **master**에서 작업합니다. 클라우드 세션도 같은 브랜치에 푸시하므로 **작업 전에 항상 `git pull`** 합니다.
- CLAUDE.md는 새로 만들지 않습니다.
- 그림 생성(Higgsfield) 크레딧은 아껴 씁니다. 새 그림이 꼭 필요할 때만 쓰고, 먼저 기존 에셋으로 해결합니다.
- 커밋에 모델 이름은 넣지 않습니다.

## 1. 최신 코드가 Unity에 들어왔는지 확인
1. 저장소 루트에서 `git pull` 후 `git log --oneline -1`을 실행합니다. 결과는 `7222716` 또는 그보다 최신이어야 합니다.
2. Unity 에디터가 **이 저장소의 `unity/` 폴더**를 프로젝트로 열고 있는지 확인합니다(MCP로 프로젝트 경로 확인). 다른 복사본이면 사용자에게 알립니다.
3. 에디터에서 Assets를 새로 고칩니다(Refresh / 필요하면 `Assets/Cheongo` Reimport). **Console에 컴파일 오류가 하나라도 있으면 Play가 막히고 옛 코드가 남은 것처럼 보입니다.** 오류부터 고칩니다.
   - 클라우드에서는 `Assets/Cheongo/Editor/*.cs`(Editor 스크립트)를 컴파일 검사하지 못했습니다. 특히 `CheongoPlayer.cs`(앱 아이콘·제품 이름 설정, `PlayerSettings.GetIcons/SetIcons(NamedBuildTarget.Unknown, …)`)가 Unity 6에서 오류를 내면 고치거나 지워도 됩니다.
4. Play를 누릅니다. 타이틀 맨 아래 순위 옆에 **`부스판 2026-10-17 · 연·마우스 무아경`**이 보여야 하고, Console에는 `[천고] 부스판 … · 웹 관문 56개`가 찍혀야 합니다.
   - 0개면 `Resources/Data/maps.json`이 Import되지 않은 것입니다(TextAsset인지 확인).

## 2. 프로젝트 구조
- 씬: `Assets/Cheongo/Main.unity`(비어 있어도 됨). `GameRoot.Boot`이 코드로 카메라·지형·주인공·메뉴를 만듭니다.
- 코드: `Assets/Cheongo/Scripts/`
  - `Core/`: `GameData.cs`(DB·표), `Sheet.cs`(스프라이트 시트 로더), `Music.cs`(장단·효과음 합성), `Icons.cs`
  - `Game/`
    - `GameRoot.cs`: 메뉴·입력·HUD(OnGUI)
    - `GameRoot.Booth.cs`: 부스판 흐름·순위·`Booth` 상수
    - `Sim*.cs`: 전투·지형·보스·총·연
    - `FightView.cs`·`Fx.cs`: 그리기
    - `Run.cs`: 한 판의 상태와 트리
  - `Player/`: `Player.cs`(웹 stepPlayer 이식), `PlayerView.cs`(애니메이션·무아경 조준선)
  - `World/`: `World.cs`(Level, 웹 맵 파싱 `FromRows`/`Maps.Pick`), `LevelView.cs`(바위·소품), `TerrainView.cs`(발판·기와·바위·상자·깃대·결진 문·출구 결계)
- 임포트 규칙: `Assets/Cheongo/Editor/CheongoImport.cs`. `Resources/Sprites` 그림은 원래 픽셀 크기를 유지하고, 압축·밉맵을 쓰지 않습니다(프레임 좌표가 픽셀에 묶여 있음).

## 3. 에셋 (모두 웹 버전에서 뽑은 것)
`Assets/Cheongo/Resources/Sprites/` 안의 `이름.png`와 `이름.json`(프레임 사각형 `{"f":[…]}`)이 한 쌍입니다. 코드에서는 `Sheet.Get("이름")`, 단일 그림은 `Sheet.Image("이름")`로 씁니다.

| 묶음 | 이름 |
|---|---|
| 주인공 | `hero` `hero2` `hero3` `herofx` `mv0` `mv1` `mv2` **`mvrun`**(양발 8프레임 달리기) `grun2` `gun1` `gun2` `muz` `arms` `weapons` `swm` |
| 적·우두머리 | `foes` `foes2` `foes3` `bossA`~`bossF` **`bwalk`**(우두머리 7종 걷기 4프레임씩) `bossfx` `bfx2` `bfx3` `bvfx` `bcal` `bname` |
| 효과 | `fx` `gfx` `kfx` `kring` `mfx` `pfx` `perkfx` `slashfx` `wfx` `vis` `ogA` `ogB`(오의) `calli` |
| 땅·배경 | `far` `mid` `md0`~`md4`(마당별) `pillars` `pines` `slabs` `rocks` `props` `props2` **`mapobj`**(장단 발판·기와·금 간 바위·상자·열린 상자·바람 깃대·결진 문) `objects`(청사초롱 0·1, **연 2**, 가시 3 …) `tex-*`(타일 질감) |
| UI | `ui` **`ui-plate`**(한지 패 9-slice) `hud` `hudsolid` `ic0`~`ic16`(비급·오의 아이콘) **`it-*`**(엽전·혼·환약·부적 등 아이템 아이콘) `title` `load-wide` `sealmap` `guide` `lore` `mu` `misc` `po` |
| 거점·NPC·영물 | `hub` `hubground` `hubscene` `npc` `pet` `chars` `rogue*` `mech` |
| 앱 아이콘 | `Assets/Cheongo/Icons/icon-512.png` |

데이터는 `Assets/Cheongo/Resources/Data/`에 있습니다.
- `tuning.json`(수치), `content.json`, `game.json`, `chunks.json`(긴 판 조각), `tree.json`(수련 트리)
- `maps.json`: 웹 생성기로 만든 부스판 관문 42개와 천고대 14개. 연 `o` 포함, 금줄은 지움.

새로 추가된 png·json 일부는 `.meta` 없이 올라왔습니다. Unity가 열 때 만들어 주니, 만들어진 `.meta`도 함께 커밋합니다.

## 4. 에셋을 다시 뽑을 때 (웹을 고친 뒤)
저장소 루트에서 실행합니다.
```
python3 -m http.server 8765 &
node tools/unity-export/export.js --all     # 시트·그림·아이콘·tree.json
node tools/unity-export/maps.js             # maps.json (Playwright 필요)
```
웹 원본 그림은 `assets/`(webp)에 있습니다. 새 그림은 `assets/sources.json`에 URL을 넣고 푸시하면 GitHub Action "Fetch generated assets"가 `assets/raw/`로 받아 옵니다.

## 5. 부스판에서 지금 정해진 것 (`GameRoot.Booth.cs`의 `Booth` 상수)
- 진행: 관문 2개 → 천고대. 우두머리 체력 0.6배, 시작 숨 6, 부활 1회, 제한 5분, 출구 결계는 적 5할, 천고 기운 1.6배.
- 조작
  - 키보드: ←→ 이동, Space 점프, J 베기(왼쪽 클릭은 커서 쪽), K 대시
  - **K를 누르고 있으면 무아경. 마우스 쪽으로 겨누고, 놓으면 일섬.** 톡 누르면 방향키 쪽으로 대시. 오른쪽 클릭도 무아경.
  - L 연, Q 천고난무
  - 패드: A 점프, X 베기, B·RB 대시, LB 연, Y 천고난무
- 연: 닿는 거리의 연에 쪽빛 원이 뜨고, L/LB로 잡습니다. 공중에서 더 뛸 수 없을 때 점프를 눌러도 잡힙니다.

## 6. 로컬 세션이 MCP로 직접 확인해 줄 것 (클라우드에서는 못 본 것)
1. 컴파일 오류 0, Play 진입, 위 빌드 표시.
2. 무아경 마우스 조준: 조준선이 커서를 정확히 따라가는지. 카메라가 흔들리거나 확대된 상태에서도 맞는지(`GameRoot.ReadInput`의 `cam.ScreenToWorldPoint`).
3. 연 그림(`objects` 프레임 2)의 크기·위치·흔들림, 쪽빛 원과 줄.
4. `TerrainView`가 그리는 땅 그림의 위치·크기: 발판, 기와, 금 간 바위, 상자, 깃대, 결진 문, 출구 결계.
5. 한지 패 HUD, 카드 아이콘, 아이템 아이콘이 깨지지 않는지.
6. 주인공 양발 달리기(`mvrun`)와 우두머리 걷기(`bwalk`)가 실제로 양발로 보이는지.
7. 한 판(약 3분)을 끝까지: 비급 카드 → 오의 카드 → 우두머리 → 결과 → 이름 → 순위.

문제를 고치면 Unity 없이 하는 검사(`sh unity/Tests~/run.sh`, mono 필요)도 통과시키고 master에 푸시합니다.
