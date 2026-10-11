# 천고 — Unity 프로젝트

웹 버전(저장소 루트의 `index.html`, `js/`)을 Unity로 옮기는 중입니다. 앞으로의 개발은 이 폴더에서 합니다.

## 여는 법
1. **Unity Hub**에서 **Unity 2022.3 LTS**를 설치합니다(2022.3.x 아무 버전이나 됩니다).
2. Unity Hub → **Add → Add project from disk** → 이 `unity` 폴더를 고릅니다.
3. 처음 열 때 그림·데이터를 가져오느라 몇 분 걸립니다.
4. 빈 씬(기본 `SampleScene`이나 새 씬) 그대로 **Play**를 누르면 게임이 시작됩니다.
   씬에 아무것도 둘 필요 없이 코드가 카메라·지형·주인공을 만듭니다(`GameRoot.Boot`).
5. 처음 연 뒤 생긴 `*.meta` 파일들은 커밋해 주세요(그림 설정과 참조가 여기에 저장됩니다).

## 조작 (지금 단계)
| 키 | 동작 |
|---|---|
| ← → / A D | 이동 |
| ↑ ↓ / W S | 대시 방향 |
| Space / Z | 점프 (짧게 누르면 낮게) · 벽에 붙어 누르면 벽차기 |
| K / C / Shift | 대시 |
| ↓ + Space | 발판 아래로 내려가기 |
| R | 같은 마당을 새로 깔기 |
| N | 다음 마당 |

## 구조
```
Assets/Cheongo/
  Resources/Data/      웹 게임에서 뽑은 데이터(json): 수치(tuning), 콘텐츠(비급·무기·트리…), 지형 조각(chunks), 표(game)
  Resources/Sprites/   그림(png)과 프레임 좌표(json)
  Scripts/Core/        데이터 읽기(GameData), 스프라이트 시트(Sheet)
  Scripts/World/       좌표·충돌·지형 생성(World), 지형 그리기(LevelView)
  Scripts/Player/      주인공 이동(Player — 웹의 stepPlayer를 그대로 옮김), 그림(PlayerView)
  Scripts/Game/        게임 조립·카메라·입력(GameRoot), 이펙트(Fx)
  Editor/              그림 가져오기 설정(크기 보존, 압축 없음)
Tests~/                Unity 없이 이동 물리를 시험하는 스크립트 (Unity는 ~ 붙은 폴더를 무시)
```
- 게임 안 좌표는 웹과 같습니다: **픽셀 단위, 32px = 1칸, 아래가 +y**. 그릴 때만 Unity 좌표(1칸 = 1유닛, 위가 +y)로 바꿉니다. 그래서 웹 코드의 수치를 그대로 옮길 수 있습니다.
- 수치를 바꿀 때는 웹과 마찬가지로 `js/tuning.js`를 고친 뒤 아래 변환을 다시 돌립니다(또는 `Resources/Data/tuning.json`을 직접 고칩니다).

## 데이터·그림 다시 뽑기
저장소 루트에서:
```
node tools/unity-export/export.js        # 데이터 + 지금 쓰는 그림
node tools/unity-export/export.js --all  # 데이터 + 모든 그림(보스·적·무기 등, 다음 단계에서 필요)
```
(webp → png 변환에 python3 + Pillow가 필요합니다.)

## 옮기는 순서
| 단계 | 내용 | 상태 |
|---|---|---|
| 1 | 프로젝트 뼈대, 데이터·그림 변환, 지형, 이동·점프·벽차기·대시, 카메라, 이동 이펙트 | **완료** |
| 2 | 베기·간파·리듬(장단 음악), 숨·피격·낙법 | 다음 |
| 3 | 적 9종 · 무아경 조준 대시 · 총 4종 | |
| 4 | 보스 12종 · 천고난무/오의 | |
| 5 | 비급·스킬 트리·길 고르기·쉼터/기연 | |
| 6 | 거점·영물·저장·설정·UI·모바일 조작 | |
