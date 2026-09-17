export const N = 8, HALF = 0.5, BOX = 0.35, PAWN = HALF;
const body = q => q.t === "p" ? PAWN : BOX;
const dia = q => q.t === "p";
const inside = (q, x, y) => {
  const a = Math.abs(q.x - x), b = Math.abs(q.y - y);
  return (dia(q) ? a + b : Math.max(a, b)) < body(q) - E;
};
const E = 1e-9;
const ORDER = ["r", "n", "b", "q", "k", "b", "n", "r"];

export function start() {
  const ps = [];
  let id = 0;
  for (let i = 0; i < N; i++) {
    ps.push({ id: id++, c: "w", t: ORDER[i], x: i + 0.5, y: 0.5 });
    ps.push({ id: id++, c: "w", t: "p", x: i + 0.5, y: 1.5 });
    ps.push({ id: id++, c: "b", t: "p", x: i + 0.5, y: 6.5 });
    ps.push({ id: id++, c: "b", t: ORDER[i], x: i + 0.5, y: 7.5 });
  }
  return ps;
}

const fwd = (p, dy) => p.c === "w" ? dy : -dy;

export function attacks(p, dx, dy) {
  const f = fwd(p, dy), ax = Math.abs(dx);
  return f >= HALF && f <= 1.5 && ax >= HALF && ax <= 1.5;
}

export function region(p, dx, dy) {
  const ax = Math.abs(dx), ay = Math.abs(dy);
  if (Math.max(ax, ay) < HALF - E) return false;
  switch (p.t) {
    case "r": return Math.min(ax, ay) <= HALF;
    case "b": return Math.abs(ax - ay) <= HALF;
    case "q": return Math.min(ax, ay) <= HALF || Math.abs(ax - ay) <= HALF;
    case "n": return Math.min(ax, ay) >= HALF && ax + ay >= 2 - E && ax + ay <= 3 + E;
    case "k": return Math.max(ax, ay) <= 1;
    case "p": {
      const f = fwd(p, dy);
      const far = p.c === "w" ? p.y <= 2 : p.y >= N - 2;
      if (f <= 0) return false;
      return ax <= HALF ? f <= (far ? 2 : 1) : ax <= 1.5 && f <= 1;
    }
  }
  return false;
}

function hits(ax, ay, bx, by, q) {
  const h = body(q);
  const axes = dia(q)
    ? [[ax + ay, bx + by, q.x + q.y], [ax - ay, bx - by, q.x - q.y]]
    : [[ax, bx, q.x], [ay, by, q.y]];
  let t0 = 0, t1 = 1;
  for (const [a, b, c] of axes) {
    const d = b - a;
    if (Math.abs(d) < E) { if (a <= c - h || a >= c + h) return false; continue; }
    let s = (c - h - a) / d, e = (c + h - a) / d;
    if (s > e) [s, e] = [e, s];
    t0 = Math.max(t0, s); t1 = Math.min(t1, e);
    if (t1 - t0 <= E) return false;
  }
  return true;
}

export function legal(ps, id, x, y) {
  const p = ps.find(q => q.id === id);
  if (!p) return null;
  if (x < HALF - E || x > N - HALF + E || y < HALF - E || y > N - HALF + E) return null;
  if (!region(p, x - p.x, y - p.y)) return null;

  let cap = null;
  for (const q of ps) {
    if (q.id === id) continue;
    if (!inside(q, x, y)) continue;
    if (q.c === p.c || cap) return null;
    cap = q;
  }
  if (cap && p.t !== "p" && !region(p, cap.x - p.x, cap.y - p.y)) return null;
  if (p.t === "p" && (cap ? !attacks(p, cap.x - p.x, cap.y - p.y) : Math.abs(x - p.x) > HALF)) return null;
  for (const q of ps) {
    if (q.id === id || q === cap) continue;
    if (q.c !== p.c && !(p.t === "p" && q.t === "p")) continue;
    if (Math.max(Math.abs(q.x - x), Math.abs(q.y - y)) < HALF - E) return null;
  }
  if (p.t !== "n") {
    for (const q of ps) {
      if (q.id === id || q === cap) continue;
      if (hits(p.x, p.y, x, y, q)) return null;
    }
  }
  return { cap };
}

export function apply(ps, id, x, y, cap) {
  const p = ps.find(q => q.id === id);
  if (cap) ps.splice(ps.indexOf(cap), 1);
  p.x = x; p.y = y;
  if (p.t === "p" && (p.c === "w" ? y >= N - 1 : y <= 1)) p.t = "q";
  return !!cap && cap.t === "k";
}

if (import.meta.main) {
  const ok = (c, m) => { if (!c) throw new Error(m); };
  const ps = start();
  const at = (x, y) => ps.find(q => Math.abs(q.x - x) < E && Math.abs(q.y - y) < E).id;
  ok(legal(ps, at(4.5, 1.5), 4.5, 2.5), "pawn push");
  ok(legal(ps, at(4.5, 1.5), 4.9, 3.4), "pawn double, off-axis");
  ok(!legal(ps, at(4.5, 1.5), 4.5, 4.5), "pawn too far");
  ok(!legal(ps, at(4.5, 1.5), 5.5, 2.5), "pawn diagonal without capture");
  ok(!legal(ps, at(0.5, 0.5), 0.5, 3), "rook blocked by own pawn");
  apply(ps, at(4.5, 1.5), 4.5, 3.5);
  ok(legal(ps, at(5.5, 0.5), 3.0, 3.0), "bishop slips past its own pawn into the open file");
  ok(legal(ps, at(5.5, 0.5), 3.25, 2.3), "a steeper line slips past the diamond corners");
  apply(ps, at(4.5, 3.5), 4.5, 1.5);
  ok(legal(ps, at(1.5, 0.5), 0.7, 2.6), "knight jumps");
  ok(!legal(ps, at(1.5, 0.5), 0.5, 3), "but not past the far edge of its triangle");
  ok(!legal(ps, at(1.5, 0.5), 2.2, 1.2), "nor into the near corner it skips over");
  ok(!legal(ps, at(1.5, 0.5), 1.5, 2.5), "knight region excludes straight");
  ok(!legal(ps, at(1.5, 0.5), 4.0, 3.0), "knight band excludes the far corner");
  const open = [{ id: 0, c: "w", t: "r", x: 4.5, y: 4.5 }, { id: 1, c: "w", t: "b", x: 2.5, y: 4.5 }];
  ok(!legal(open, 0, 4.8, 4.8), "rook cannot shuffle diagonally off its square");
  ok(legal(open, 1, 3.25, 5.25), "a short move along the true diagonal is fine");
  ok(!legal(open, 1, 3.25, 4.7), "but the diagonal band is the same width at any range");
  ok(!legal(open, 1, 5.5, 6.0), "including far down the board");
  ok(legal(open, 0, 5.5, 4.9), "but may drift while travelling a square");
  ok(!legal(open, 1, 2.9, 4.6), "bishop cannot creep sideways off its square");
  ok(legal(open, 1, 3.5, 5.3), "bishop travels on the diagonal band");
  const near = [{ id: 0, c: "w", t: "n", x: 4.5, y: 4.5 }, { id: 1, c: "w", t: "r", x: 5.5, y: 6.5 }, { id: 2, c: "w", t: "p", x: 3.5, y: 6.5 }];
  ok(legal(near, 0, 6.2, 5.8), "point pieces may stand close together");
  ok(!legal(near, 0, 5.6, 6.6), "but not on top of each other");
  ok(!legal(near, 0, 3.6, 6.4), "and never inside a pawn box");
  const close = [{ id: 0, c: "w", t: "r", x: 0.5, y: 0.5 }, { id: 1, c: "b", t: "r", x: 0.5, y: 1.4 }];
  ok(legal(close, 0, 0.5, 1.4)?.cap?.id === 1, "a rook takes an enemy that has crept closer than a square");
  ok(!legal(close, 0, 1.1, 1.1), "but still cannot step diagonally to do it");
  const snipe = [{ id: 0, c: "w", t: "b", x: 5.5, y: 0.5 }, { id: 1, c: "b", t: "p", x: 0.5, y: 6.5 }];
  ok(!legal(snipe, 0, 0.35, 6.1), "bishop cannot settle in the margin beside the board edge");
  ok(legal(snipe, 0, 0.5, 5.5), "the same diagonal reaches the square below it");
  const edge = [{ id: 0, c: "w", t: "r", x: 3.5, y: 2.0 }];
  ok(legal(edge, 0, 3.5, 0.5), "a piece may sit half a square from the edge");
  ok(!legal(edge, 0, 3.5, 0.4), "but no closer");
  const grab = [{ id: 0, c: "b", t: "p", x: 6.5, y: 6.5 }, { id: 1, c: "b", t: "p", x: 7.5, y: 6.5 }, { id: 2, c: "w", t: "b", x: 7.5, y: 5.5 }];
  ok(legal(grab, 0, 7.5, 5.5)?.cap?.t === "b", "pawn takes the piece on its diagonal");
  ok(legal(grab, 0, 7.2, 5.7)?.cap?.t === "b", "and has room beside it to land in");
  const line = [{ id: 0, c: "w", t: "r", x: 0.5, y: 0.5 }, { id: 1, c: "w", t: "q", x: 2.5, y: 0.5 }, { id: 2, c: "b", t: "k", x: 6.5, y: 0.5 }];
  ok(!legal(line, 0, 4.0, 0.5), "rook blocked by the queen in its way");
  ok(!legal(line, 0, 4.0, 0.95), "and cannot weave around her inside its band");
  line.splice(1, 1);
  ok(legal(line, 0, 4.0, 0.5), "clear rank, clear move");
  ok(!legal(ps, at(2.5, 0.5), 4.5, 2.5), "bishop blocked");
  apply(ps, at(4.5, 1.5), 4.6, 3.4);
  apply(ps, at(3.5, 6.5), 3.6, 4.6);
  const reach = [{ id: 0, c: "b", t: "p", x: 3.5, y: 4.5 }, { id: 1, c: "w", t: "p", x: 3.5, y: 3.4 }, { id: 2, c: "w", t: "p", x: 2.5, y: 3.37 }];
  ok(legal(reach, 0, 2.5, 3.5)?.cap?.id === 2, "pawn reaches a diagonal target sitting past a full square");
  ok(!legal(reach, 0, 3.5, 3.5), "the pawn ahead still blocks the push");
  const beside = [{ id: 0, c: "w", t: "p", x: 4.5, y: 1.5 }, { id: 1, c: "b", t: "n", x: 5.5, y: 1.5 }];
  ok(!legal(beside, 0, 5.5, 1.5), "a pawn cannot take the piece standing beside it");
  beside[1].y = 1.75;
  ok(!legal(beside, 0, 5.5, 1.75), "nor one only slightly ahead of its shoulder");
  beside[1].y = 2.2;
  ok(legal(beside, 0, 5.5, 2.2)?.cap, "but takes it once it is properly forward-diagonal");
  ok(!legal(beside, 0, 3.9, 1.7), "and a wide step with nothing to take is not a push");
  const front = [{ id: 0, c: "w", t: "p", x: 4.5, y: 1.5 }, { id: 1, c: "b", t: "n", x: 4.5, y: 2.5 }];
  ok(!legal(front, 0, 5.1, 2.2), "a pawn cannot sidestep onto a piece straight ahead");
  ok(!legal(front, 0, 4.5, 2.5), "nor take it head-on");
  ok(legal(front, 0, 4.5, 2.1), "it may only close up to it");
  const ps2 = start();
  const at2 = (x, y) => ps2.find(q => Math.abs(q.x - x) < E && Math.abs(q.y - y) < E).id;
  apply(ps2, at2(3.5, 1.5), 3.5, 3.5);
  ok(legal(ps2, at2(2.5, 0.5), 4.5, 2.5), "bishop threads the opened file");
  ok(legal(ps2, at2(2.5, 0.5), 4.75, 2.3), "a steeper line threads the gap the diamond leaves");
  const drift = [{ id: 0, c: "w", t: "p", x: 4.5, y: 3.4 }, { id: 1, c: "b", t: "p", x: 5.4, y: 4.55 }];
  ok(legal(drift, 0, 5.4, 4.35)?.cap?.id === 1, "a drifted pawn still takes what it attacks");
  const walk = [{ id: 0, c: "w", t: "k", x: 4.5, y: 7.5 }, { id: 1, c: "b", t: "p", x: 3.5, y: 6.5 }];
  ok(legal(walk, 0, 4.2, 6.5), "a king may step a square in any direction");
  ok(!legal(walk, 0, 4.2, 6.2), "but not a square and a half");
  ok(legal(walk, 0, 3.5, 6.5)?.cap?.id === 1, "and takes its diagonal neighbour");
  const step = [{ id: 0, c: "w", t: "k", x: 4.5, y: 4.5 }, { id: 1, c: "w", t: "r", x: 0.5, y: 0.5 }];
  ok(!legal(step, 0, 4.8, 4.7), "no piece may shuffle within half a square of where it stands");
  ok(legal(step, 0, 5.0, 4.5), "half a square is far enough");
  ok(!legal(step, 1, 0.5, 0.9), "and the rule holds down the rank");
  const crowd = [{ id: 0, c: "w", t: "p", x: 4.5, y: 1.5 }, { id: 1, c: "b", t: "p", x: 5.2, y: 2.3 }];
  ok(!legal(crowd, 0, 4.8, 2.1), "a pawn cannot crowd within half a square of another pawn");
  ok(legal(crowd, 0, 5.2, 2.3)?.cap?.id === 1, "but may take it");
  const pals = [{ id: 0, c: "w", t: "r", x: 4.5, y: 4.5 }, { id: 1, c: "w", t: "n", x: 4.5, y: 6.5 }, { id: 2, c: "b", t: "n", x: 6.5, y: 4.5 }];
  ok(!legal(pals, 0, 4.5, 6.2), "no piece may crowd a friend");
  ok(legal(pals, 0, 6.2, 4.5), "but may crowd an enemy");
  const graze = [{ id: 0, c: "w", t: "q", x: 7.0, y: 5.6 }, { id: 1, c: "b", t: "p", x: 3.0, y: 5.0 }];
  ok(!legal(graze, 0, 3.2, 5.2)?.cap, "a queen cannot take a pawn whose centre sits outside her band");
  graze[1].y = 5.4;
  ok(legal(graze, 0, 3.0, 5.4)?.cap?.id === 1, "but takes it once its centre is on her line");
  const nudge = [{ id: 0, c: "w", t: "b", x: 6.5, y: 6.5 }, { id: 1, c: "b", t: "r", x: 6.5, y: 7.5 }];
  ok(!legal(nudge, 0, 6.8, 7.2)?.cap, "a bishop cannot lean off its diagonal to take the piece above it");
  console.log("ok");
}
