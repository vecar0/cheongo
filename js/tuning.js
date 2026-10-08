// 천고 — every balance number in one place. game.js reads these; change a value here, reload, play.
const TUNING = Object.freeze({
  // 몸: movement and timing (px, px/s, seconds)
  CLIMBV: 270, CLIMB_T: 0.5, GRAV: 1900, JUMPV: 640, MAXV: 300, DASHV: 1000, HOOK_R: 300, STRIKE_WIN: 0.15,
  TAP_T: 0.15,            // a dash released sooner than this is a tap (short dash / hip shot)
  FLASH_BASE: 0.3,        // the 간파 window before a blow lands
  FLASH_MAX: 0.6,         // all 간파 bonuses together never widen it past this (calm at one breath may still double it)
  HIT_INVULN: 1.2,        // seconds untouchable after losing a breath
  // 숨
  START_BREATH: 3, GATE_HEAL_TO: 3,   // a cleared gate gives one back while below this
  REST_BREATH: 2,                     // 쉼터 · 숨 고르기
  // walking in: foes near the start wait for your first move
  START_SLEEP_R: 520, START_SLEEP_T: 8, ENTRY_FIRE_DELAY: 3,
  // 적
  TYPE_HP: { d: 1, g: 1, s: 1, a: 1, p: 2, m: 2, r: 2, h: 3, k: 3 },
  BOSS_HP_MUL: 2.2, BOSS_HP_PER_CYCLE: 3, BOSS_GUARD_HITS: 3, BOSS_GUARD_T: 1.2,
  // 날: [notches, seconds per notch]
  EDGE: { hwando: [4, .55], ssang: [5, .45], woldo: [3, .75], baldo: [3, .7] },
  // 기세
  MOM_KILL: 12, MOM_KILL_MOVING: 16, MOM_KAN: 20, MOM_PERFECT: 35,
  // 보상
  HON_PER_GATE: 5, HON_PER_FLOOR: 9,
  SP_GAIN: { madang: 1, cycle: 2, bonus: 1, tower: 1, stage: 1 },
  TREE_OPEN_HON: [60, 100, 140],
  // 영물
  PET_NEED: [null, { fed: 5 }, { jeong: 60 }, { jeong: 200 }, { jeong: 400, fed: 15 }, { jeong: 800, fed: 35 }]
});
