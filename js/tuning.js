// 천고 — every balance number in one place. game.js reads these; change a value here, reload, play.
const TUNING = Object.freeze({
  // 몸: movement and timing (px, px/s, seconds)
  CLIMBV: 270, CLIMB_T: 0.5, GRAV: 1900, JUMPV: 640, MAXV: 300, DASHV: 1000, HOOK_R: 300, STRIKE_WIN: 0.15,
  TAP_T: 0.15,            // a dash released sooner than this is a tap (short dash / hip shot)
  FLASH_BASE: 0.34,       // the 간파 window before a blow lands
  FLASH_MAX: 0.6,         // all 간파 bonuses together never widen it past this (calm at one breath may still double it)
  HIT_INVULN: 1.5,        // seconds untouchable after losing a breath
  RECOIL_V: 480,          // a shot's kick (px/s) before each gun's own weight
  RECOIL_GROUND_X: 0.55,  // standing, the feet take most of the push
  // 숨
  START_BREATH: 4, GATE_HEAL_TO: 4,   // a cleared gate gives one back while below this
  REST_BREATH: 2,                     // 쉼터 · 숨 고르기
  // walking in: foes near the start wait for your first move
  START_SLEEP_R: 520, START_SLEEP_T: 8, ENTRY_FIRE_DELAY: 3,
  // 적
  TYPE_HP: { d: 1, g: 1, s: 1, a: 1, p: 2, m: 2, r: 2, h: 3, k: 3 },
  BOSS_HP_MUL: 1.9, BOSS_HP_PER_CYCLE: 3, BOSS_GUARD_HITS: 3, BOSS_GUARD_T: 1.2,
  // 날: [notches, seconds per notch]
  EDGE: { hwando: [4, .55], ssang: [5, .45], woldo: [3, .75], baldo: [3, .7] },
  // 기세
  MOM_KILL: 12, MOM_KILL_MOVING: 16, MOM_KAN: 20, MOM_PERFECT: 35,
  // 보상
  HON_PER_GATE: 5, HON_PER_FLOOR: 9,
  SP_GAIN: { madang: 1, cycle: 2, bonus: 1, tower: 1, stage: 1 },
  TREE_OPEN_HON: [40, 90, 130],
  START_SP: 1,            // 수련점 a run starts with
  FREE_FALLS: 1,          // falls per gate that only send you back to where you stood
  // 매: how long it shows the dive (s), how fast it dives, beats it rests after
  HAWK_TELL: 0.7, HAWK_DIVE_V: 470, HAWK_REST_BEATS: 4,
  // 난이도: 숨, 간파 판정(초), 적이 다시 공격하기까지 걸리는 배수, 우두머리 체력, 혼
  DIFF: [{ name: "수월", desc: "숨 +2 · 간파가 넉넉하다 · 적이 느긋하다", breath: 2, kan: .08, fire: 1.4, bossHp: .8, hon: 1 },
         { name: "보통", desc: "의도한 장단", breath: 0, kan: 0, fire: 1, bossHp: 1, hon: 1 },
         { name: "험난", desc: "숨 −1 · 적이 몰아친다 · 우두머리가 질기다 · 혼 ×1.3", breath: -1, kan: -.03, fire: .85, bossHp: 1.2, hon: 1.3 }],
  // 영물
  PET_NEED: [null, { fed: 5 }, { jeong: 60 }, { jeong: 200 }, { jeong: 400, fed: 15 }, { jeong: 800, fed: 35 }]
});
