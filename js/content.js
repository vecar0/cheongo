// 천고 — the game's content as plain data: 비급, weapon trees, weapons, 심법·서약·징조, 오의, stage names.
// game.js reads (and extends) these; nothing here depends on the engine.
"use strict";
// the three 관문 of a turn, named in hanja: into the mountain, up the cloud ladder, the terrace of 천고 itself
const STAGE = [{ han: "第一關", ko: "제1관문" }, { han: "第二關", ko: "제2관문" }, { han: "第三關", ko: "제3관문" }, { han: "第四關", ko: "제4관문" }, { han: "第五關", ko: "제5관문" }, { han: "天鼓臺", ko: "천고대" }];   // the gates are only counted; the last takes its guardian's name

// the last 관문 is named for the guardian waiting in it
const LAIR = { sumun: ["鐵門關", "철문관"], gumiho: ["狐月谷", "호월곡"], dokkaebi: ["鬼火林", "귀화림"], imugi: ["潛龍淵", "잠룡연"], wongwi: ["冤魂閣", "원혼각"],
jangseung: ["大將壇", "대장단"], cheongo: ["天鼓殿", "천고전"], shadow: ["影門", "영문"], haetae: ["鎭火臺", "진화대"], bulgasari: ["食鐵窟", "식철굴"], baekho: ["白虎嶺", "백호령"], talchum: ["假面臺", "가면대"] };

// 비급 (secret techniques): picked after each 마당; icons are frames of the rogue sheet (0 is 絶命, 1 the card paper)
// 비급: four kinds in five slots — one 일섬 (how the aimed dash cuts), one 방어 (what happens when a blow lands on you),
// one 간파 (what reading a blow gives back), two 이동. Each hangs on a system: 숨, 천고 기운, 연속 처치, 무아경 기력, 튕기기.
// Nothing adds damage or makes you untouchable; every attack lives in the aimed dash (hold dash in the air → time slows → release).
const CHOSIK = [
{ id: "sum", name: "숨", han: "息", kind: "생존", desc: "숨 하나를 되찾는다", icon: 8, repeat: true },
// 일섬 — pick one: what the aimed dash becomes
{ id: "d_far", name: "원섬", han: "遠閃", kind: "일섬", desc: "일섬이 1.8배 멀리, 두 배 넓게 벤다", icon: 201 },
{ id: "d_sunbo", name: "순보", han: "瞬步", kind: "일섬", desc: "무아경을 풀면 가까운 적의 등 뒤로 순간이동해 벤다", icon: 850 },
{ id: "d_sun", name: "연환", han: "連環", kind: "일섬", desc: "일섬으로 베면 공중 대시 +1, 곧바로 다시 무아경", icon: 4 },
{ id: "d_jeong", name: "정중동", han: "靜中動", kind: "일섬", desc: "무아경이 더 느리고 기력이 덜 닳으며, 겨냥이 적에게 붙는다", icon: 106 },
{ id: "d_pajuk", name: "파죽", han: "破竹", kind: "일섬", desc: "연속 처치가 오를수록 일섬이 길고 넓어진다 (최대 1.75배)", icon: 860 },
{ id: "d_hyeol", name: "혈섬", han: "血閃", kind: "일섬", desc: "숨이 적을수록 일섬이 길고 넓어진다 (숨 하나면 1.8배)", icon: 861 },
{ id: "d_giseom", name: "기섬", han: "氣閃", kind: "일섬", desc: "일섬 처치 시 천고 기운 2배, 오의가 10명까지 벤다", icon: 862 },
{ id: "d_dangong", name: "단공", han: "斷空", kind: "일섬", desc: "일섬이 지나간 길의 탄을 지운다 — 붉은 탄까지", icon: 863 },
{ id: "d_charge", name: "축기", han: "蓄氣", kind: "일섬", desc: "0.8초 꽉 모았다 놓으면 참격파가 날아가 일격으로 벤다", icon: 506 },
{ id: "d_bounce", name: "반섬", han: "反閃", kind: "일섬", desc: "일섬이 벽·바닥에 한 번 튕겨 계속 벤다", icon: 508 },
{ id: "d_chain", name: "뇌인", han: "雷引", kind: "일섬", desc: "일섬 처치 시 번개가 옆의 적 하나를 함께 벤다", icon: 606 },
// 무녀 일섬 — her aimed dash already turns back every shot it brushes
{ id: "m_wind", name: "회오리 길", han: "旋風路", kind: "일섬", only: "munyeo", desc: "일섬 길에 회오리가 남아 적을 베고 탄을 지운다 (탄마다 천고 기운)", icon: 604 },
{ id: "m_talis", name: "부적 세 장", han: "三符", kind: "일섬", only: "munyeo", desc: "무아경을 풀면 부적 세 장이 날아가 일격으로 벤다", icon: 705 },
{ id: "m_bell", name: "방울 굿", han: "鈴굿", kind: "일섬", only: "munyeo", desc: "일섬 끝에 방울이 울려 주변 적을 굳히고 기력을 채운다", icon: 707 },
{ id: "m_moon", name: "달맞이", han: "迎月", kind: "일섬", only: "munyeo", desc: "일섬 끝에 달빛 고리가 적을 베고 탄을 지운다 (지운 만큼 연속 처치)", icon: 708 },
{ id: "m_float", name: "강신", han: "降神", kind: "일섬", only: "munyeo", desc: "일섬 뒤 0.7초 떠서 다시 겨눌 수 있다", icon: 710 },
{ id: "m_soul", name: "넋 분신", han: "分魂", kind: "일섬", only: "munyeo", desc: "0.35초 뒤 넋이 같은 길을 한 번 더 벤다", icon: 712 },
// 포수 일섬 — releasing the aim fires the matchlock and the recoil throws him the other way (reloading: a bayonet lunge instead)
{ id: "p_slug", name: "대구경", han: "大口徑", kind: "일섬", only: "posu", desc: "일발이 굵어져 넓게 꿰뚫는다 (꿰뚫은 적마다 연속 처치)", icon: 753 },
{ id: "p_scatter", name: "산탄", han: "散彈", kind: "일섬", only: "posu", desc: "일발이 다섯 갈래로 퍼지고, 맞은 적은 밀려나 굳는다", icon: 754 },
{ id: "p_burst", name: "작렬탄", han: "炸裂彈", kind: "일섬", only: "posu", desc: "일발이 처음 닿은 곳에서 터져 주변 적과 탄을 지운다", icon: 758 },
{ id: "p_ricochet", name: "도탄", han: "跳彈", kind: "일섬", only: "posu", desc: "일발이 벽에 한 번 튕기고, 튕긴 탄은 일격이 된다", icon: 824 },
{ id: "p_quick", name: "속사", han: "速射", kind: "일섬", only: "posu", desc: "장전이 빨라지고, 처치·간파하면 바로 장전된다", icon: 794 },
{ id: "p_charge", name: "착검 돌격", han: "着劍突擊", kind: "일섬", only: "posu", desc: "쏜 뒤 물러나지 않고 총검으로 돌진한다 (처치 시 천고 기운 2배)", icon: 767 },
// 방어 — pick one: what happens when a blow finds you (every character)
{ id: "d_reflect", name: "역탄", han: "逆彈", kind: "방어", desc: "튕기기가 쉬워지고, 튕긴 탄은 일격으로 되돌아간다", icon: 864 },
{ id: "d_gihyeol", name: "기혈", han: "氣血", kind: "방어", desc: "천고 기운이 절반 넘으면, 맞을 때 숨 대신 기운을 잃는다", icon: 865 },
{ id: "d_gise", name: "기세", han: "氣勢", kind: "방어", desc: "연속 처치 3 이상이면, 맞을 때 숨 대신 연속 처치가 끊긴다", icon: 866 },
{ id: "d_nakbeop", name: "낙법", han: "落法", kind: "방어", desc: "구덩이·가시에 빠져도 숨을 잃지 않는다 (관문마다 두 번)", icon: 867 },
{ id: "d_ganggi", name: "호신강기", han: "護身罡氣", kind: "방어", desc: "숨을 잃으면 주변 탄이 사라지고 1.5초 탄을 막는다", icon: 868 },
{ id: "d_janmyeong", name: "잔명", han: "殘命", kind: "방어", desc: "죽을 일격을 관문마다 한 번 버틴다", icon: 869 },
// 간파 — pick one: what reading a blow gives back (every character)
{ id: "d_myeong", name: "명경지수", han: "明鏡止水", kind: "간파", desc: "간파 타이밍이 0.15초 넉넉해진다", icon: 842 },
{ id: "d_beat", name: "간섬", han: "看閃", kind: "간파", desc: "간파하면 공중 대시 +1, 천고 기운 2배", icon: 208 },
{ id: "d_zanshin", name: "잔심", han: "殘心", kind: "간파", desc: "간파하면 주변 적들도 잠깐 간파할 수 있게 된다", icon: 870 },
{ id: "d_tan", name: "탄베기", han: "斬彈", kind: "간파", desc: "간파하는 순간 주변 탄이 모두 사라진다", icon: 102 },
{ id: "d_freeze", name: "정지", han: "停止", kind: "간파", desc: "간파하면 1.2초 동안 모든 탄이 멈춘다", icon: 302 },
{ id: "d_ward", name: "검막", han: "劍幕", kind: "간파", desc: "간파 뒤 1.5초 동안 몸에 닿는 탄을 막는다", icon: 848 },
{ id: "d_breathe", name: "기공", han: "氣功", kind: "간파", desc: "간파하면 기력이 가득 차고 연속 처치 +2", icon: 871 },
{ id: "d_breath", name: "혈로", han: "血路", kind: "간파", desc: "간파 다섯 번마다 숨 하나 회복", icon: 104 },
{ id: "d_calm", name: "평정", han: "平靜", kind: "간파", desc: "숨이 하나 남으면 간파 타이밍과 무아경이 두 배", icon: 303 },
// 이동 — pick two
{ id: "d_air", name: "비연", han: "飛燕", kind: "이동", desc: "공중 대시 +1", icon: 207 },
{ id: "d_jump", name: "허공답보", han: "虛空踏步", kind: "이동", desc: "공중에서 한 번 더 뛴다", icon: 101 },
{ id: "d_hover", name: "부동", han: "不動", kind: "이동", desc: "공중 무아경 동안 그 자리에 멈춘다", icon: 6 },
{ id: "d_wall", name: "벽호공", han: "壁虎功", kind: "이동", desc: "벽을 두 배 오래 타고, 벽에서도 무아경에 든다", icon: 206 },
{ id: "d_bisang", name: "비상", han: "飛上", kind: "이동", desc: "벽차기 하면 공중 대시가 다시 차고 +1", icon: 844 },
{ id: "d_kite", name: "연 입경", han: "鳶入境", kind: "이동", desc: "연으로 솟구치면 바로 무아경에 든다", icon: 300 },
{ id: "d_jilbo", name: "질풍보", han: "疾風步", kind: "이동", desc: "연속 처치가 오를수록 빨리 달린다 (최대 1.4배)", icon: 872 },
{ id: "d_cheonbo", name: "천보", han: "天步", kind: "이동", desc: "천고 기운이 절반 넘으면 공중 대시 +1", icon: 873 },
{ id: "d_glide", name: "활공", han: "滑空", kind: "이동", desc: "떨어질 때 점프를 누르고 있으면 천천히 내려온다", icon: 205 },
{ id: "p_rocket", name: "포 반동", han: "砲反動", kind: "이동", only: "posu", desc: "반동이 1.4배 — 아래로 쏘면 높이 솟구친다", icon: 771 },
{ id: "m_cloud", name: "구름 걸음", han: "雲步", kind: "이동", only: "munyeo", desc: "공중 도약마다 다음 무아경이 0.3초 길어진다", icon: 721 },
{ id: "d_sasl", name: "연사슬", han: "鳶鎖", kind: "이동", desc: "연을 적에게 걸어 끌어당기고 굳힌다", icon: 845 }
];

const TREES = {
hwando: { name: "환도", br: [
  { name: "반격", han: "反擊", nodes: [
    { id: "hw_a1", name: "역습", han: "逆襲", desc: "간파 뒤 0.8초 안에 또 간파하면 연쇄가 오르고, 연쇄마다 천고 기운이 더 찬다", icon: 208 },
    { id: "hw_a2", name: "연환반격", han: "連環反擊", desc: "연쇄 셋부터 받아치기가 두 배 멀리 넘어가고, 내려선 자리 주변 적을 벤다", icon: 850 },
    { id: "hw_a3", name: "일섬천격", han: "一閃千擊", desc: "오의 — 연쇄 다섯이 되는 순간 화면의 모든 적을 받아치며 벤다", icon: 875 } ] },
  { name: "잔상", han: "殘影", nodes: [
    { id: "hw_b1", name: "잔영", han: "殘影", desc: "받아치기로 넘어간 자리에 잔상이 남아 0.4초 뒤 한 번 더 벤다", icon: 860 },
    { id: "hw_b2", name: "잔영진", han: "殘影陣", desc: "잔상이 1.5초 남아 둘레로 오는 적 탄을 지운다", icon: 868 },
    { id: "hw_b3", name: "분신난무", han: "分身亂舞", desc: "오의 — 일섬이 끝날 때마다 잔상이 남고, 셋이 모이면 그 사이 적을 모두 벤다", icon: 870 } ] },
  { name: "섬광", han: "閃光", nodes: [
    { id: "hw_c1", name: "추섬", han: "追閃", desc: "튕겨 낸 탄이 가까운 적을 쫓아간다", icon: 864 },
    { id: "hw_c2", name: "폭섬", han: "爆閃", desc: "튕긴 탄이 적에 맞으면 터져 둘레까지 벤다", icon: 863 },
    { id: "hw_c3", name: "역류", han: "逆流", desc: "오의 — 무아경에 든 동안 오는 탄이 모두 저절로 튕겨 나간다 (기력이 두 배로 닳는다)", icon: 507 } ] } ] },
ssang: { name: "쌍검", br: [
  { name: "폭주", han: "暴走", nodes: [
    { id: "ss_a1", name: "폭주", han: "暴走", desc: "기세가 다섯이 되면 3초 폭주 — 베기가 두 번 들어가고, 더 빨리 달린다", icon: 866 },
    { id: "ss_a2", name: "광란", han: "狂亂", desc: "폭주 중 적을 쓰러뜨리면 폭주가 0.6초 늘어난다", icon: 861 },
    { id: "ss_a3", name: "난무", han: "亂舞", desc: "오의 — 폭주 중 일섬을 쓰면 가까운 적들에게 세 번 연달아 날아든다", icon: 875 } ] },
  { name: "선풍", han: "旋風", nodes: [
    { id: "ss_b1", name: "선풍", han: "旋風", desc: "공중에서 베면 몸을 돌려 둘레를 모두 벤다", icon: 604 },
    { id: "ss_b2", name: "회오리", han: "回旋風", desc: "공중 회전베기가 둘레 탄을 지우고 잠깐 떠오른다", icon: 872 },
    { id: "ss_b3", name: "용권", han: "龍卷", desc: "오의 — 기세 다섯에서 일섬하면 회오리가 따라가며 주변 적을 끌어당겨 벤다", icon: 862 } ] },
  { name: "쌍수", han: "雙手", nodes: [
    { id: "ss_c1", name: "쌍수", han: "雙手", desc: "베기마다 반 박자 뒤 두 번째 칼날이 한 번 더 벤다", icon: 202 },
    { id: "ss_c2", name: "기세유지", han: "氣勢維持", desc: "기세가 3초 동안 줄지 않고, 맞아도 절반만 잃는다", icon: 871 },
    { id: "ss_c3", name: "천인참", han: "千刃斬", desc: "오의 — 기세 다섯의 X자 일격이 앞쪽 일직선의 모든 적을 벤다", icon: 860 } ] } ] },
woldo: { name: "월도", br: [
  { name: "낙차", han: "落差", nodes: [
    { id: "wd_a1", name: "중력", han: "重力", desc: "높이 떨어질수록 충격파가 커진다 (최대 두 배)", icon: 205 },
    { id: "wd_a2", name: "지진", han: "地震", desc: "충격파에 맞은 적이 1초 떠올라 어떤 베기에도 쓰러진다", icon: 867 },
    { id: "wd_a3", name: "낙월", han: "落月", desc: "오의 — 높은 곳(네 칸 이상)에서 내리꽂으면 화면을 가로지르는 충격파가 땅 위 적을 모두 벤다", icon: 708 } ] },
  { name: "도약", han: "跳躍", nodes: [
    { id: "wd_b1", name: "도약", han: "跳躍", desc: "튕겨 오를 때 더 높이 뜨고 공중 대시가 하나 더 쌓인다", icon: 844 },
    { id: "wd_b2", name: "연속낙", han: "連續落", desc: "땅에 닿지 않고 연달아 튕길수록 내려베기가 넓어지고, 세 번째부터 일격", icon: 873 },
    { id: "wd_b3", name: "비월", han: "飛越", desc: "오의 — 튕길 때마다 1초 동안 시간이 느려지고 천고 기운이 찬다", icon: 207 } ] },
  { name: "장병", han: "長兵", nodes: [
    { id: "wd_c1", name: "장창세", han: "長槍勢", desc: "보통 베기가 더 멀리 닿고 더 세게 밀쳐낸다", icon: 201 },
    { id: "wd_c2", name: "참마", han: "斬馬", desc: "밀려난 적이 벽이나 다른 적에 부딪히면 1초 굳는다", icon: 302 },
    { id: "wd_c3", name: "만월", han: "滿月", desc: "오의 — 보통 베기마다 반달 참격파가 날아가 벤다", icon: 506 } ] } ] },
baldo: { name: "발도", br: [
  { name: "일도", han: "一刀", nodes: [
    { id: "bd_a1", name: "심도", han: "深刀", desc: "붉은 일격 돌진이 1.5배 길어진다", icon: 201 },
    { id: "bd_a2", name: "무념", han: "無念", desc: "붉어진 순간 0.2초 안에 놓으면 완벽 발도 — 공중 대시와 기력이 차고 곧바로 다시 모을 수 있다", icon: 874 },
    { id: "bd_a3", name: "무공참", han: "無空斬", desc: "오의 — 붉은 일격이 끝난 자리에서 참격이 날아가 일직선의 적을 모두 벤다", icon: 875 } ] },
  { name: "정", han: "靜", nodes: [
    { id: "bd_b1", name: "정좌", han: "靜坐", desc: "모으는 동안 앞에서 오는 탄을 칼집으로 막는다", icon: 848 },
    { id: "bd_b2", name: "명경", han: "明鏡", desc: "모으는 동안 시간이 더 느려지고 간파가 넉넉해진다", icon: 842 },
    { id: "bd_b3", name: "부동명왕", han: "不動明王", desc: "오의 — 모으는 동안 맞으면 숨 대신 그 적에게 붉은 일도가 저절로 나간다 (관문마다 세 번)", icon: 869 } ] },
  { name: "연", han: "連", nodes: [
    { id: "bd_c1", name: "속도", han: "速刀", desc: "모으는 시간이 30% 줄어든다", icon: 872 },
    { id: "bd_c2", name: "연도", han: "連刀", desc: "일도 직후 0.5초 안에 다시 베면 반대쪽으로 두 번째 일도", icon: 602 },
    { id: "bd_c3", name: "천섬", han: "千閃", desc: "오의 — 일도로 쓰러뜨릴 때마다 다음 일도가 길고 넓어진다 (관문 끝까지)", icon: 862 } ] } ] },
jochong: { name: "조총", br: [
  { name: "저격", han: "狙擊", nodes: [
    { id: "jc_a1", name: "정조준", han: "正照準", desc: "완전 조준까지 걸리는 시간이 절반이 된다", icon: 874 },
    { id: "jc_a2", name: "급소", han: "急所", desc: "완전 조준으로 쓰러뜨리면 한 발이 장전되고 천고 기운이 크게 찬다", icon: 861 },
    { id: "jc_a3", name: "일발필중", han: "一發必中", desc: "오의 — 완전 조준 탄이 적을 맞히면 다음 적으로 다섯 번까지 튀어 간다", icon: 862 } ] },
  { name: "반동", han: "反動", nodes: [
    { id: "jc_b1", name: "반동술", han: "反動術", desc: "반동이 1.5배 세지고, 공중에서 한 번은 탄과 대시를 쓰지 않고 쏜다", icon: 873 },
    { id: "jc_b2", name: "탄도약", han: "彈跳躍", desc: "아래로 쏘면 더 높이 솟구치고 한 발이 돌아온다", icon: 844 },
    { id: "jc_b3", name: "비조", han: "飛鳥", desc: "오의 — 공중에 떠 있는 동안 쏘는 탄은 모두 완전 조준이 된다", icon: 207 } ] },
  { name: "총검", han: "銃劍", nodes: [
    { id: "jc_c1", name: "착검", han: "着劍", desc: "총검 찌르기가 맞으면 두 발이 장전된다", icon: 767 },
    { id: "jc_c2", name: "백병", han: "白兵", desc: "찌르기로 쓰러뜨리면 다음 탄이 완전 조준이 된다", icon: 866 },
    { id: "jc_c3", name: "총검술", han: "銃劍術", desc: "오의 — 쏜 직후 0.4초 안에 베면 쏜 쪽으로 돌진하며 찔러 일격", icon: 860 } ] } ] },
seungja: { name: "승자총통", br: [
  { name: "근접", han: "近接", nodes: [
    { id: "sj_a1", name: "영거리", han: "零距離", desc: "아주 가까이(네 칸)서 쏘면 탄알이 모두 일격", icon: 754 },
    { id: "sj_a2", name: "밀쳐내기", han: "推擊", desc: "산탄에 맞은 적이 크게 밀려나고, 벽에 부딪히면 굳는다", icon: 867 },
    { id: "sj_a3", name: "포화", han: "砲火", desc: "오의 — 탄알이 일곱 갈래로 퍼지고, 쏠 때마다 앞의 적 탄을 지운다", icon: 863 } ] },
  { name: "기동", han: "機動", nodes: [
    { id: "sj_b1", name: "반추", han: "反推", desc: "반동이 더 세진다", icon: 771 },
    { id: "sj_b2", name: "연발", han: "連發", desc: "공중에서 잇따라 쏘면 두 번째부터 반동이 두 배", icon: 873 },
    { id: "sj_b3", name: "포탄비행", han: "砲彈飛行", desc: "오의 — 반동으로 날아가는 동안 몸에 닿는 적을 일격으로 벤다", icon: 207 } ] },
  { name: "화약", han: "火藥", nodes: [
    { id: "sj_c1", name: "화승", han: "火繩", desc: "탄알이 맞은 자리에 불길이 1초 남는다", icon: 865 },
    { id: "sj_c2", name: "유폭", han: "誘爆", desc: "산탄으로 쓰러뜨린 적이 터져 둘레를 벤다", icon: 758 },
    { id: "sj_c3", name: "연쇄유폭", han: "連鎖誘爆", desc: "오의 — 폭발로 쓰러진 적도 다시 터진다", icon: 875 } ] } ] },
singi: { name: "신기전", br: [
  { name: "유도", han: "誘導", nodes: [
    { id: "sg_a1", name: "추적", han: "追跡", desc: "화살이 적을 끝까지 쫓아간다", icon: 864 },
    { id: "sg_a2", name: "분열", han: "分裂", desc: "화살이 터질 때 작은 화살 셋으로 갈라진다", icon: 754 },
    { id: "sg_a3", name: "화차", han: "火車", desc: "오의 — 과열되는 순간 화살 열둘이 한꺼번에 쏟아진다", icon: 875 } ] },
  { name: "과열", han: "過熱", nodes: [
    { id: "sg_b1", name: "냉각", han: "冷却", desc: "열이 두 배 빨리 식는다", icon: 303 },
    { id: "sg_b2", name: "열기", han: "熱氣", desc: "열이 높을수록 화살이 빨라지고, 열 70 이상이면 일격", icon: 865 },
    { id: "sg_b3", name: "폭주열", han: "暴走熱", desc: "오의 — 과열돼도 쏠 수 있다 (대신 쏠 때마다 기력이 닳는다)", icon: 866 } ] },
  { name: "폭발", han: "爆發", nodes: [
    { id: "sg_c1", name: "작렬", han: "炸裂", desc: "폭발이 1.5배 넓어진다", icon: 758 },
    { id: "sg_c2", name: "화염지대", han: "火焰地帶", desc: "폭발한 자리에 불길이 1.5초 남는다", icon: 861 },
    { id: "sg_c3", name: "신기", han: "神機", desc: "오의 — 폭발이 두 배 넓어지고 둘레의 적 탄을 지운다", icon: 863 } ] } ] },
cheonja: { name: "천자총통", br: [
  { name: "포격", han: "砲擊", nodes: [
    { id: "cj_a1", name: "대포알", han: "大砲丸", desc: "폭발이 1.5배 넓어진다", icon: 758 },
    { id: "cj_a2", name: "도탄포", han: "跳彈砲", desc: "포탄이 땅에서 한 번 튀어 두 번 터진다", icon: 864 },
    { id: "cj_a3", name: "천지포", han: "天地砲", desc: "오의 — 폭발이 땅을 따라 양옆으로 퍼져 땅 위 적을 벤다", icon: 867 } ] },
  { name: "거치", han: "据置", nodes: [
    { id: "cj_b1", name: "거치", han: "据置", desc: "땅에 1초 서 있다 쏘면 폭발이 훨씬 넓다", icon: 870 },
    { id: "cj_b2", name: "철갑", han: "鐵甲", desc: "땅에 서서 겨누는 동안 앞에서 오는 탄을 막는다", icon: 848 },
    { id: "cj_b3", name: "요새", han: "要塞", desc: "오의 — 땅에 2초 서 있으면 1.5초마다 가까운 적에게 포를 쏜다", icon: 875 } ] },
  { name: "비행", han: "飛行", nodes: [
    { id: "cj_c1", name: "포반동", han: "砲反動", desc: "아래로 쏘면 아주 높이 솟구친다", icon: 771 },
    { id: "cj_c2", name: "낙하포", han: "落下砲", desc: "공중에서 한 번은 탄 없이 쏠 수 있다", icon: 873 },
    { id: "cj_c3", name: "유성", han: "流星", desc: "오의 — 높이 떨어져 땅에 닿으면 큰 폭발이 인다", icon: 862 } ] } ] }
};

// the longer tree: a root, then each branch runs 1단 → 2단 → 3단 (one of two) → 4단 → 오의 (given by 깨달음, never bought),
// and two 합류 nodes join neighbouring branches. 3단·4단·합류 must first be learned at the 서고 before a run will offer them.
// g: a shared mechanic granted (an existing 비급's effect), st: numbers added up by treeStat
const G = (id, name, han, desc, o = {}) => ({ id, name, han, desc, grant: o.g, stat: o.st, icon: o.icon || 862 });

const TREE_EXT = {
hwando: { r: G("hw_r", "환도 단련", "環刀鍛鍊", "날 +1", { st: { edge: 1 } }),
  a: [G("hw_a3x", "되받기", "還擊", "간파 판정 +0.06초", { st: { kanWin: .06 } }), G("hw_a3y", "간섬", "看閃", "간파하면 공중 대시 +1, 천고 기운 두 배", { g: "d_beat" }), G("hw_a4", "반격세", "反擊勢", "기세가 30% 빨리 찬다", { st: { gise: .3 } })],
  b: [G("hw_b3x", "잔영보", "殘影步", "무아경을 풀면 가까운 적 등 뒤로 넘어가 벤다", { g: "d_sunbo" }), G("hw_b3y", "연환", "連環", "일섬으로 베면 공중 대시 +1, 곧바로 다시 무아경", { g: "d_sun" }), G("hw_b4", "그림자 걸음", "影步", "이동 +12%", { st: { spd: .12 } })],
  c: [G("hw_c3x", "검막", "劍幕", "간파 뒤 1.5초 탄을 막는다", { g: "d_ward" }), G("hw_c3y", "탄베기", "斬彈", "간파하는 순간 주변 탄이 사라진다", { g: "d_tan" }), G("hw_c4", "섬광일도", "閃光一刀", "일섬이 지나간 길의 탄을 지운다", { g: "d_dangong" })],
  m: [G("hw_m1", "잔심", "殘心", "합류(반격·잔상) — 간파하면 주변 적도 잠깐 간파된다", { g: "d_zanshin" }), G("hw_m2", "명경지수", "明鏡止水", "합류(잔상·섬광) — 간파 판정 +0.15초", { g: "d_myeong" })] },
ssang: { r: G("ss_r", "쌍검 단련", "雙劍鍛鍊", "날 +2", { st: { edge: 2 } }),
  a: [G("ss_a3x", "혈세", "血勢", "기세가 30% 빨리 찬다", { st: { gise: .3 } }), G("ss_a3y", "질풍보", "疾風步", "연속 처치가 오를수록 빨리 달린다", { g: "d_jilbo" }), G("ss_a4", "광폭", "狂暴", "날이 40% 빨리 선다", { st: { edgeRate: .4 } })],
  b: [G("ss_b3x", "허공답보", "虛空踏步", "공중에서 한 번 더 뛴다", { g: "d_jump" }), G("ss_b3y", "활공", "滑空", "떨어질 때 점프를 누르면 천천히 내려온다", { g: "d_glide" }), G("ss_b4", "선풍각", "旋風脚", "공중 대시 +1", { g: "d_air" })],
  c: [G("ss_c3x", "연환", "連環", "일섬으로 베면 공중 대시 +1, 곧바로 다시 무아경", { g: "d_sun" }), G("ss_c3y", "파죽", "破竹", "연속 처치가 오를수록 일섬이 길고 넓어진다", { g: "d_pajuk" }), G("ss_c4", "기공", "氣功", "간파하면 기력이 가득, 연속 처치 +2", { g: "d_breathe" })],
  m: [G("ss_m1", "잔심", "殘心", "합류(폭주·선풍) — 간파하면 주변 적도 잠깐 간파된다", { g: "d_zanshin" }), G("ss_m2", "뇌인", "雷刃", "합류(선풍·쌍수) — 일섬 처치 때 번개가 옆 적도 벤다", { g: "d_chain" })] },
woldo: { r: G("wd_r", "월도 단련", "月刀鍛鍊", "날 +1, 기력 회복 +20%", { st: { edge: 1, ki: .2 } }),
  a: [G("wd_a3x", "철벽", "鐵壁", "숨을 잃으면 주변 탄이 사라지고 잠깐 막는다", { g: "d_ganggi" }), G("wd_a3y", "낙법", "落法", "구덩이·가시에 빠져도 숨을 잃지 않는다 (관문마다 둘)", { g: "d_nakbeop" }), G("wd_a4", "천근", "千斤", "충격·폭발 범위 +30%", { st: { blast: .3 } })],
  b: [G("wd_b3x", "비상", "飛上", "벽차기 하면 공중 대시가 차고 +1", { g: "d_bisang" }), G("wd_b3y", "부동", "不動", "공중 무아경 동안 그 자리에 멈춘다", { g: "d_hover" }), G("wd_b4", "비연", "飛燕", "공중 대시 +1", { g: "d_air" })],
  c: [G("wd_c3x", "원섬", "遠閃", "일섬이 1.8배 멀리, 두 배 넓게", { g: "d_far" }), G("wd_c3y", "축기", "蓄氣", "꽉 모았다 놓으면 참격파가 날아간다", { g: "d_charge" }), G("wd_c4", "반섬", "反閃", "일섬이 벽·바닥에 한 번 튕겨 계속 벤다", { g: "d_bounce" })],
  m: [G("wd_m1", "기혈", "氣血", "합류(낙차·도약) — 기운이 절반 넘으면 숨 대신 기운을 잃는다", { g: "d_gihyeol" }), G("wd_m2", "탄베기", "斬彈", "합류(도약·장병) — 간파하는 순간 주변 탄이 사라진다", { g: "d_tan" })] },
baldo: { r: G("bd_r", "발도 단련", "拔刀鍛鍊", "간파 판정 +0.04초", { st: { kanWin: .04 } }),
  a: [G("bd_a3x", "원섬", "遠閃", "일섬이 1.8배 멀리, 두 배 넓게", { g: "d_far" }), G("bd_a3y", "혈섬", "血閃", "숨이 적을수록 일섬이 길고 넓어진다", { g: "d_hyeol" }), G("bd_a4", "일도양단", "一刀兩斷", "날 +1, 날이 30% 빨리 선다", { st: { edge: 1, edgeRate: .3 } })],
  b: [G("bd_b3x", "명경지수", "明鏡止水", "간파 판정 +0.15초", { g: "d_myeong" }), G("bd_b3y", "평정", "平靜", "숨이 하나면 간파 판정과 무아경이 두 배", { g: "d_calm" }), G("bd_b4", "정중동", "靜中動", "무아경이 더 느리고 겨냥이 적에게 붙는다", { g: "d_jeong" })],
  c: [G("bd_c3x", "연환", "連環", "일섬으로 베면 공중 대시 +1, 곧바로 다시 무아경", { g: "d_sun" }), G("bd_c3y", "순보", "瞬步", "무아경을 풀면 가까운 적 등 뒤로 넘어가 벤다", { g: "d_sunbo" }), G("bd_c4", "뇌인", "雷刃", "일섬 처치 때 번개가 옆 적도 벤다", { g: "d_chain" })],
  m: [G("bd_m1", "잔명", "殘命", "합류(일도·정) — 죽을 일격을 관문마다 한 번 버틴다", { g: "d_janmyeong" }), G("bd_m2", "정지", "停止", "합류(정·연) — 간파하면 1.2초 모든 탄이 멈춘다", { g: "d_freeze" })] },
jochong: { r: G("jc_r", "조총 단련", "鳥銃鍛鍊", "탄 +1", { st: { mag: 1 } }),
  a: [G("jc_a3x", "명경지수", "明鏡止水", "간파 판정 +0.15초", { g: "d_myeong" }), G("jc_a3y", "정중동", "靜中動", "무아경이 더 느리고 겨냥이 적에게 붙는다", { g: "d_jeong" }), G("jc_a4", "화승 숙련", "火繩熟鍊", "장전이 30% 빠르다", { st: { reload: .3 } })],
  b: [G("jc_b3x", "비연", "飛燕", "공중 대시 +1", { g: "d_air" }), G("jc_b3y", "활공", "滑空", "떨어질 때 점프를 누르면 천천히 내려온다", { g: "d_glide" }), G("jc_b4", "부동", "不動", "공중 무아경 동안 그 자리에 멈춘다", { g: "d_hover" })],
  c: [G("jc_c3x", "간섬", "看閃", "간파하면 공중 대시 +1, 천고 기운 두 배", { g: "d_beat" }), G("jc_c3y", "검막", "劍幕", "간파 뒤 1.5초 탄을 막는다", { g: "d_ward" }), G("jc_c4", "기공", "氣功", "간파하면 기력이 가득, 연속 처치 +2", { g: "d_breathe" })],
  m: [G("jc_m1", "정지", "停止", "합류(저격·반동) — 간파하면 1.2초 모든 탄이 멈춘다", { g: "d_freeze" }), G("jc_m2", "호신강기", "護身罡氣", "합류(반동·총검) — 숨을 잃으면 주변 탄이 사라진다", { g: "d_ganggi" })] },
seungja: { r: G("sj_r", "승자 단련", "勝字鍛鍊", "탄 +1", { st: { mag: 1 } }),
  a: [G("sj_a3x", "탄베기", "斬彈", "간파하는 순간 주변 탄이 사라진다", { g: "d_tan" }), G("sj_a3y", "검막", "劍幕", "간파 뒤 1.5초 탄을 막는다", { g: "d_ward" }), G("sj_a4", "대구경", "大口徑", "폭발 범위 +25%", { st: { blast: .25 } })],
  b: [G("sj_b3x", "허공답보", "虛空踏步", "공중에서 한 번 더 뛴다", { g: "d_jump" }), G("sj_b3y", "비상", "飛上", "벽차기 하면 공중 대시가 차고 +1", { g: "d_bisang" }), G("sj_b4", "질풍보", "疾風步", "연속 처치가 오를수록 빨리 달린다", { g: "d_jilbo" })],
  c: [G("sj_c3x", "기혈", "氣血", "기운이 절반 넘으면 숨 대신 기운을 잃는다", { g: "d_gihyeol" }), G("sj_c3y", "잔명", "殘命", "죽을 일격을 관문마다 한 번 버틴다", { g: "d_janmyeong" }), G("sj_c4", "화승 숙련", "火繩熟鍊", "장전이 30% 빠르다", { st: { reload: .3 } })],
  m: [G("sj_m1", "간섬", "看閃", "합류(근접·기동) — 간파하면 공중 대시 +1, 기운 두 배", { g: "d_beat" }), G("sj_m2", "정지", "停止", "합류(기동·화약) — 간파하면 1.2초 모든 탄이 멈춘다", { g: "d_freeze" })] },
singi: { r: G("sg_r", "신기 단련", "神機鍛鍊", "냉각 +25%", { st: { heat: .25 } }),
  a: [G("sg_a3x", "정중동", "靜中動", "무아경이 더 느리고 겨냥이 적에게 붙는다", { g: "d_jeong" }), G("sg_a3y", "명경지수", "明鏡止水", "간파 판정 +0.15초", { g: "d_myeong" }), G("sg_a4", "천고화", "天鼓火", "천고 기운 +25%", { st: { qi: .25 } })],
  b: [G("sg_b3x", "냉각수", "冷却水", "냉각 +40%", { st: { heat: .4 } }), G("sg_b3y", "호신강기", "護身罡氣", "숨을 잃으면 주변 탄이 사라진다", { g: "d_ganggi" }), G("sg_b4", "화세", "火勢", "기세가 30% 빨리 찬다", { st: { gise: .3 } })],
  c: [G("sg_c3x", "대폭", "大爆", "폭발 범위 +30%", { st: { blast: .3 } }), G("sg_c3y", "탄베기", "斬彈", "간파하는 순간 주변 탄이 사라진다", { g: "d_tan" }), G("sg_c4", "정지", "停止", "간파하면 1.2초 모든 탄이 멈춘다", { g: "d_freeze" })],
  m: [G("sg_m1", "활공", "滑空", "합류(유도·과열) — 떨어질 때 점프를 누르면 천천히", { g: "d_glide" }), G("sg_m2", "잔명", "殘命", "합류(과열·폭발) — 죽을 일격을 관문마다 한 번 버틴다", { g: "d_janmyeong" })] },
cheonja: { r: G("cj_r", "천자 단련", "天字鍛鍊", "폭발 범위 +15%", { st: { blast: .15 } }),
  a: [G("cj_a3x", "대구경", "大口徑", "폭발 범위 +30%", { st: { blast: .3 } }), G("cj_a3y", "탄베기", "斬彈", "간파하는 순간 주변 탄이 사라진다", { g: "d_tan" }), G("cj_a4", "화승 숙련", "火繩熟鍊", "장전이 35% 빠르다", { st: { reload: .35 } })],
  b: [G("cj_b3x", "철벽", "鐵壁", "숨을 잃으면 주변 탄이 사라지고 잠깐 막는다", { g: "d_ganggi" }), G("cj_b3y", "기혈", "氣血", "기운이 절반 넘으면 숨 대신 기운을 잃는다", { g: "d_gihyeol" }), G("cj_b4", "정지", "停止", "간파하면 1.2초 모든 탄이 멈춘다", { g: "d_freeze" })],
  c: [G("cj_c3x", "활공", "滑空", "떨어질 때 점프를 누르면 천천히 내려온다", { g: "d_glide" }), G("cj_c3y", "부동", "不動", "공중 무아경 동안 그 자리에 멈춘다", { g: "d_hover" }), G("cj_c4", "비연", "飛燕", "공중 대시 +1", { g: "d_air" })],
  m: [G("cj_m1", "잔명", "殘命", "합류(포격·거치) — 죽을 일격을 관문마다 한 번 버틴다", { g: "d_janmyeong" }), G("cj_m2", "간섬", "看閃", "합류(거치·비행) — 간파하면 공중 대시 +1, 기운 두 배", { g: "d_beat" })] } };

// shared 비급 come in three grades; pairs held together reveal a 조합
const RARITY = { d_janmyeong: 3, d_freeze: 3, d_breath: 3, d_cheonbo: 3, d_myeong: 2, d_beat: 2, d_zanshin: 2, d_tan: 2, d_ward: 2, d_breathe: 2, d_ganggi: 2, d_gihyeol: 2, d_jump: 2, d_bisang: 2, d_jilbo: 2, d_calm: 2 };

const RAR_NAME = ["", "일반", "희귀", "전설"];

const COMBOS = [
G("cb_musim", "무심", "無心", "조합(명경지수+평정) — 간파 판정 +0.08초 더", { st: { kanWin: .08 } }), G("cb_cheolbyeok", "철벽", "鐵壁", "조합(정지+검막) — 간파하는 순간 주변 탄이 사라진다", { g: "d_tan" }),
G("cb_bicheon", "비천", "飛天", "조합(간섬+비연) — 공중에서 한 번 더 뛴다", { g: "d_jump" }), G("cb_danjeon", "단전", "丹田", "조합(기공+혈로) — 기세가 40% 빨리 찬다", { st: { gise: .4 } }),
G("cb_ilmang", "일망타진", "一網打盡", "조합(잔심+탄베기) — 일섬 처치 때 번개가 옆 적도 벤다", { g: "d_chain" }), G("cb_chukji", "축지", "縮地", "조합(질풍보+천보) — 이동 +15%", { st: { spd: .15 } }),
G("cb_bulgul", "불굴", "不屈", "조합(호신강기+잔명) — 기운이 절반 넘으면 숨 대신 기운을 잃는다", { g: "d_gihyeol" }), G("cb_hakik", "학익", "鶴翼", "조합(허공답보+활공) — 공중 무아경 동안 멈춘다", { g: "d_hover" })];

const COMBO_NEED = { cb_musim: ["d_myeong", "d_calm"], cb_cheolbyeok: ["d_freeze", "d_ward"], cb_bicheon: ["d_beat", "d_air"], cb_danjeon: ["d_breathe", "d_breath"], cb_ilmang: ["d_zanshin", "d_tan"], cb_chukji: ["d_jilbo", "d_cheonbo"], cb_bulgul: ["d_ganggi", "d_janmyeong"], cb_hakik: ["d_jump", "d_glide"] };

// 징조: one rule chosen for each new turn of the tower, harder ones pay back
const OMENS = [
{ id: "angae", name: "안개", han: "霧", desc: "앞이 잘 보이지 않는다", gift: "비급 하나 더", bonus: true },
{ id: "geupbak", name: "급박", han: "急拍", desc: "장단이 한층 빨라진다", gift: "숨 하나" },
{ id: "yeokpung", name: "역풍", han: "逆風", desc: "앞에서 바람이 밀어낸다", gift: "비급 하나 더", bonus: true },
{ id: "hyeolmaeng", name: "피의 맹세", han: "血盟", desc: "적은 간파로만 쓰러진다", gift: "다섯을 벨 때마다 숨 하나" },
{ id: "gyeopjul", name: "겹금줄", han: "重繩", desc: "금줄이 훨씬 많아진다", gift: "비급 하나 더", bonus: true },
{ id: "gunse", name: "군세", han: "軍勢", desc: "적이 더 많이 나온다", gift: "비급 하나 더", bonus: true },
{ id: "goyo", name: "고요", han: "靜", desc: "간파의 원이 보이지 않는다 — 소리로 읽어라", gift: "비급 하나 더", bonus: true },
{ id: "pyeong", name: "평온", han: "平", desc: "아무 일도 일어나지 않는다", gift: "보상 없음", calm: true }
];

const SEASON = [{ name: "여름", line: "장맛비가 그치지 않는다." }, { name: "가을", line: "단풍이 진다. 천고가 다시 울린다." }, { name: "겨울", line: "눈이 내린다. 장단이 얼어붙듯 빠르다." }, { name: "봄", line: "꽃잎이 날린다. 탑은 다시 처음이다." }];

// 무녀·포수: the same 비급 read through their own hands — new names, and for many a different working
const PV = {
munyeo: {
  pacheon: ["장군 누르기", "鎭將", "우두머리에게 일격 피해가 하나 더 들어간다"],
   },
posu: {
  d_tan: ["탄막 사격", "斬彈", "간파하는 순간 둘레의 적 탄을 모두 쏘아 지운다"], d_ward: ["연막", "煙幕", "간파한 뒤 1.5초 동안 몸 둘레로 날아드는 탄이 연기에 사라진다"],
  pacheon: ["철퇴탄", "鐵槌彈", "우두머리에게 일격 피해가 하나 더 들어간다"],
   } };

// 계열(流派): every 비급 belongs to one school; two, four and six of a school wake its 공명
const SCHOOLS = {
noe: { name: "뇌", han: "雷", col: "#3a64a8", tiers: ["일격 판정이 넓어진다", "일격으로 벤 적에게서 번개가 튀어 가까운 적을 굳힌다", "일격 세 번마다 다음 대시가 번개 돌진이 된다"] },
hwa: { name: "화", han: "火", col: "#c8461a", tiers: ["대시가 더 빨리 찬다", "대시가 끝나면 불꽃이 터진다", "대시로 벤 적은 일격을 맞고, 불꽃이 크게 터진다"] },
pung: { name: "풍", han: "風", col: "#2f8a78", tiers: ["연을 더 멀리서 잡는다", "공중에서 적을 베면 공중 도약과 대시가 되살아난다", "공중에서의 베기는 모두 일격"] },
hyeol: { name: "혈", han: "血", col: "#9a1424", tiers: ["적 열다섯을 벨 때마다 숨 하나", "벤 적의 피가 가시가 되어 가까운 적에게 날아간다", "적을 벨 때마다 잠깐 무적, 피 가시가 세 갈래"] },
yeong: { name: "영", han: "影", col: "#544a66", tiers: ["대시가 끝나도 잠깐 무적이 이어진다", "대시 끝에 그림자 분신이 남아 한 번 더 벤다", "관문마다 한 번, 치명상을 그림자로 흘려보낸다"] } };

// 심법(心法): chosen at the start of a run — a school's first 비급 and a gift of its own
const SIMBEOP = [
{ id: "noe", name: "뇌심법", han: "雷", start: "d_myeong", desc: "간파의 원이 0.1초 더 오래 맞물려 있다" },
{ id: "hwa", name: "화심법", han: "火", start: "d_air", desc: "대시를 잇따라 두 번 쓸 수 있다" },
{ id: "pung", name: "풍심법", han: "風", start: "d_glide", desc: "공중 대시가 하나 더", hon: 120 },
{ id: "hyeol", name: "혈심법", han: "血", start: "d_breath", desc: "숨이 둘 이하일 때 무아경이 두 배 오래 이어진다", hon: 120 },
{ id: "yeong", name: "영심법", han: "影", start: "d_tan", desc: "무아경에 든 동안 적 탄이 절반 속도로 난다", hon: 120 }]

// 무기: chosen when a run starts; each changes how the basic cut works
const WEAPONS = {
hwando: { name: "환도", han: "環刀", desc: "받아치기 — 보통 베기로 간파하면 적의 등 뒤로 넘어가며 벤다. 탄 튕기기가 쉽다", R: 1, reach: 0, cd: .2, dur: .14 },
ssang: { name: "쌍검", han: "雙劍", desc: "몰아치기 — 이어 벨수록 기세가 쌓이고, 다섯 번째 베기는 X자 일격. 연속 처치가 오래 간다", R: .82, reach: -2, cd: .11, dur: .1 },
woldo: { name: "월도", han: "月刀", desc: "낙월 — 공중에서 아래로 베면 내리꽂힌다. 치면 튕겨 오르고, 땅에 꽂히면 충격파", R: 1.55, reach: 16, cd: .4, dur: .22 },
baldo: { name: "발도", han: "拔刀", desc: "일도 — 베기를 누르고 있거나 무아경을 오래 유지하면 모인다. 꽉 모아 놓으면 붉은 일격 돌진", R: .72, reach: 0, cd: .25, dur: .14 },
// 총 — 무명의 화기: the aimed release fires, the recoil carries you; bayonet cuts (and reads) reload
jochong: { gun: true, mag: 3, name: "조총", han: "鳥銃", desc: "정밀 — 무아경에서 오래 겨눌수록 관통 일격. 탄 셋, 총검으로 찌르거나 간파하면 장전", R: .8, reach: 22, cd: .2, dur: .13, fx: "thrust" },
seungja: { gun: true, mag: 2, name: "승자총통", han: "勝字銃筒", desc: "산탄 — 가까이 부채꼴로 퍼져 여럿을 한 번씩 친다. 반동이 크다. 탄 둘", R: .8, reach: 18, cd: .2, dur: .13, fx: "thrust", cost: 120 },
singi: { gun: true, heat: true, name: "신기전", han: "神機箭", desc: "연발 — 터지는 화살 둘을 쏜다. 탄 대신 열이 오르고, 과열되면 잠깐 못 쏜다", R: .8, reach: 18, cd: .2, dur: .13, fx: "thrust", cost: 200 },
cheonja: { gun: true, mag: 1, name: "천자총통", han: "天字銃筒", desc: "중포 — 포물선으로 날아가 터지는 포탄. 한가운데만 일격. 반동이 아주 크다. 탄 하나", R: .8, reach: 18, cd: .25, dur: .14, fx: "thrust", cost: 280 },
// 무녀의 무구 — her own hand, her own reach (kind: which sword's rules it borrows)
buchae: { ch: "munyeo", name: "부채", han: "扇", desc: "받아치기 — 부채로 넓게 쓸어 탄을 되받아친다. 간파하면 적의 등 뒤로 넘어간다", R: 1.12, reach: -4, cd: .2, dur: .16, fx: "fan" },
bangul: { ch: "munyeo", kind: "ssang", ring: true, name: "방울", han: "鈴", desc: "몰아치기 — 흔들 때마다 방울 소리가 주변을 벤다. 다섯 번째는 X자 일격", R: 1.05, reach: 0, cd: .11, dur: .14, fx: "bell", cost: 150 },
singal: { ch: "munyeo", kind: "woldo", name: "신칼", han: "神刀", desc: "낙월 — 공중에서 아래로 내려치면 내리꽂힌다. 땅에 꽂히면 충격파", R: 1.5, reach: 14, cd: .38, dur: .22, fx: "streamer", cost: 180 },
// 포수의 병기
chonggeom: { ch: "posu", name: "총검", han: "銃劍", desc: "받아치기 — 총검으로 길게 찌른다. 간파하면 적의 등 뒤로 넘어간다", R: 1, reach: 0, cd: .2, dur: .13, fx: "thrust" },
gakgung: { ch: "posu", kind: "baldo", bow: true, name: "각궁", han: "角弓", desc: "일도 — 시위를 당기는 동안 시간이 느려진다. 꽉 당기면 꿰뚫는 일격 화살", R: .8, reach: 0, cd: .22, dur: .13, fx: "thrust", cost: 150 },
chang: { ch: "posu", kind: "woldo", name: "창", han: "槍", desc: "낙월 — 멀리 닿는 찌르기. 아래로 찌르면 내리꽂히고, 땅에 꽂히면 충격파", R: .85, reach: 44, cd: .32, dur: .18, fx: "spear", cost: 180 }
};

// 서약: a big trade made at the start of a run
const OATHS = [
{ id: "gonggung", name: "공중의 서약", han: "空中誓", desc: "공중에서 무아경이 두 배 오래 이어진다", cost: "땅에서 베이면 숨 둘을 잃는다" },
{ id: "goyo2", name: "고요의 서약", han: "靜寂誓", desc: "일섬이 두 배 멀리 간다", cost: "보통 베기는 피해를 주지 못한다 (일섬과 간파만 통한다)" },
{ id: "jangdan", name: "장단의 서약", han: "長短誓", desc: "천고 기운이 두 배 빨리 찬다", cost: "숨은 셋을 넘지 못한다" },
{ id: "pi", name: "피의 서약", han: "血誓", desc: "어떤 베기로 적을 쓰러뜨려도 공중 대시가 다시 찬다", cost: "숨은 둘을 넘지 못한다" },
{ id: "hyeon", name: "현의 서약", han: "玄誓", desc: "더 높이 뛰고, 두 배 빠르게 넓게 벤다", cost: "대시를 쓸 수 없다" },
{ id: "jilpung2", name: "질풍의 서약", han: "疾風誓", desc: "더 빨리 달린다", cost: "베기 범위가 30% 줄어든다" },
{ id: "geommu", name: "칼춤의 서약", han: "劍舞誓", desc: "쉬지 않고 이어 벨수록 베기가 커진다 (최대 두 배)", cost: "한 박자 넘게 쉬면 베기가 반으로 줄어든다" },
{ id: "godok", name: "고독의 서약", han: "孤獨誓", desc: "비급 카드가 한 장 더 나온다", cost: "숨 비급이 나오지 않고, 관문을 넘어도 숨이 차지 않는다" }
]

// 오의: the full drum looses the weapon's own secret art — each hand ends a fight its own way
const OUGI = {
hwando: { name: "일섬천격", han: "一閃千擊", art: ["ogA", 0], tip: "시간이 멈추고 가까운 적을 차례로 이어 벤다" },
ssang: { name: "난무", han: "亂舞", art: ["ogA", 3], tip: "적 하나하나를 X자로 엇갈아 벤다" },
woldo: { name: "낙월", han: "落月", art: ["ogA", 6], tip: "하늘에서 달이 떨어지듯 적마다 내리찍는다" },
baldo: { name: "무공참", han: "無空斬", art: ["ogA", 9], tip: "표식을 새긴 뒤 단 한 줄로 모두 벤다" },
jochong: { name: "일발필중", han: "一發必中", art: ["ogB", 0], tip: "한 발이 적에서 적으로 튀며 모두 꿰뚫는다" },
seungja: { name: "포화", han: "砲火", art: ["ogB", 3], tip: "사방으로 산탄을 퍼붓고 적 탄을 지운다" },
singi: { name: "화차", han: "火車", art: ["ogB", 6], tip: "불화살 열여섯이 쏟아져 적을 쫓는다" },
cheonja: { name: "천지포", han: "天地砲", art: ["ogB", 9], tip: "발밑에 포를 터뜨려 땅 위 적을 모두 쓸고 높이 솟는다" }
};

// 새 검객 (after the ending): different hands on the same tower
const CHARS = [
{ id: "mumyeong", name: "무명", han: "無名", desc: "이름 없는 검객. 모든 무기를 쓴다" },
{ id: "munyeo", name: "무녀", han: "巫女", desc: "일섬이 스친 탄을 되받아친다. 공중 점프 +1, 베는 범위는 좁다" },
];
