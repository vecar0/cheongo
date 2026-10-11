#!/bin/sh
# 이동 물리 시험 (Unity 없이): mono로 Player·World를 돌려 웹 게임과 같은 수치가 나오는지 본다.
# 필요: mono (apt install mono-mcs mono-runtime). 실행: sh unity/Tests~/run.sh
set -e; D=$(cd "$(dirname "$0")" && pwd); S="$D/../Assets/Cheongo/Scripts"; O=$(mktemp -d)
mcs -target:library -nowarn:618,169,649 -out:"$O/Cheongo.dll" "$D/Shim.cs" "$S/Core/GameData.cs" "$S/World/World.cs" "$S/Player/Player.cs"
mcs -nowarn:618 -out:"$O/sim.exe" -r:"$O/Cheongo.dll" "$D/Sim.cs"
cd "$O" && mono sim.exe
