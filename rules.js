export const N = 8, HALF = 0.5, BOX = 0.35;
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

export function region(p, dx, dy) {
  const ax = Math.abs(dx), ay = Math.abs(dy);
  if (ax < E && ay < E) return false;
  const gone = ax + ay >= 1 - E;
  switch (p.t) {
    case "r": return gone && Math.min(ax, ay) <= HALF;
    case "b": return gone && Math.abs(ax - ay) <= HALF;
    case "q": return gone && (Math.min(ax, ay) <= HALF || Math.abs(ax - ay) <= HALF);
    case "n": return Math.abs(ax + ay - 3) <= HALF && Math.min(ax, ay) >= HALF && Math.max(ax, ay) <= 2.5;
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
  let t0 = 0, t1 = 1;
  for (const [a, b, c] of [[ax, bx, q.x], [ay, by, q.y]]) {
    const d = b - a;
    if (Math.abs(d) < E) { if (a <= c - BOX || a >= c + BOX) return false; continue; }
    let s = (c - BOX - a) / d, e = (c + BOX - a) / d;
    if (s > e) [s, e] = [e, s];
    t0 = Math.max(t0, s); t1 = Math.min(t1, e);
    if (t0 >= t1) return false;
  }
  return true;
}

export function legal(ps, id, x, y) {
  const p = ps.find(q => q.id === id);
  if (!p) return null;
  if (x < BOX || x > N - BOX || y < BOX || y > N - BOX) return null;
  if (!region(p, x - p.x, y - p.y)) return null;

  let cap = null;
  for (const q of ps) {
    if (q.id === id) continue;
    if (Math.max(Math.abs(q.x - x), Math.abs(q.y - y)) >= BOX - E) continue;
    if (q.c === p.c || cap) return null;
    cap = q;
  }
  if (p.t === "p") {
    const takeable = cap && Math.abs(cap.x - p.x) >= HALF && fwd(p, cap.y - p.y) > 0;
    if (cap ? !takeable : Math.abs(x - p.x) > HALF) return null;
  }
  if (p.t !== "n") {
    for (const q of ps) {
      if (q.t !== "p" || q.id === id || q === cap) continue;
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
  ok(legal(ps, at(5.5, 0.5), 3.125, 3.0), "bishop slips past its own pawn into the open file");
  ok(!legal(ps, at(5.5, 0.5), 3.25, 2.3), "a steeper line still clips a pawn");
  apply(ps, at(4.5, 3.5), 4.5, 1.5);
  ok(legal(ps, at(1.5, 0.5), 0.5, 3), "knight jumps");
  ok(!legal(ps, at(1.5, 0.5), 1.5, 2.5), "knight region excludes straight");
  ok(!legal(ps, at(1.5, 0.5), 4.0, 3.0), "knight band excludes the far corner");
  const open = [{ id: 0, c: "w", t: "r", x: 4.5, y: 4.5 }, { id: 1, c: "w", t: "b", x: 2.5, y: 4.5 }];
  ok(!legal(open, 0, 4.8, 4.8), "rook cannot shuffle diagonally off its square");
  ok(legal(open, 0, 5.4, 4.9), "but may drift while travelling a square");
  ok(!legal(open, 1, 2.9, 4.6), "bishop cannot creep sideways off its square");
  ok(legal(open, 1, 3.4, 5.3), "bishop travels on the diagonal band");
  const near = [{ id: 0, c: "w", t: "n", x: 4.5, y: 4.5 }, { id: 1, c: "w", t: "r", x: 5.5, y: 6.5 }, { id: 2, c: "w", t: "p", x: 3.5, y: 6.5 }];
  ok(legal(near, 0, 6.2, 5.8), "point pieces may stand close together");
  ok(!legal(near, 0, 5.6, 6.6), "but not on top of each other");
  ok(!legal(near, 0, 3.6, 6.4), "and never inside a pawn box");
  const edge = [{ id: 0, c: "w", t: "r", x: 3.5, y: 2.0 }];
  ok(legal(edge, 0, 3.5, 0.35), "a piece may sit on the board edge");
  ok(!legal(edge, 0, 3.5, 0.2), "but not hang off it");
  const grab = [{ id: 0, c: "b", t: "p", x: 6.5, y: 6.5 }, { id: 1, c: "b", t: "p", x: 7.5, y: 6.5 }, { id: 2, c: "w", t: "b", x: 7.5, y: 5.5 }];
  ok(legal(grab, 0, 7.5, 5.5)?.cap?.t === "b", "pawn takes the piece on its diagonal");
  ok(legal(grab, 0, 7.2, 5.7)?.cap?.t === "b", "and has room beside it to land in");
  const line = [{ id: 0, c: "w", t: "r", x: 0.5, y: 0.5 }, { id: 1, c: "w", t: "q", x: 2.5, y: 0.5 }, { id: 2, c: "b", t: "k", x: 6.5, y: 0.5 }];
  ok(legal(line, 0, 4.0, 0.5), "rook passes through a non-pawn");
  line[1].t = "p";
  ok(!legal(line, 0, 4.0, 0.5), "rook blocked by a pawn");
  ok(!legal(ps, at(2.5, 0.5), 4.5, 2.5), "bishop blocked");
  apply(ps, at(4.5, 1.5), 4.6, 3.4);
  apply(ps, at(3.5, 6.5), 3.6, 4.6);
  const reach = [{ id: 0, c: "b", t: "p", x: 3.5, y: 4.5 }, { id: 1, c: "w", t: "p", x: 3.5, y: 3.4 }, { id: 2, c: "w", t: "p", x: 2.5, y: 3.37 }];
  ok(legal(reach, 0, 2.5, 3.5)?.cap?.id === 2, "pawn reaches a diagonal target sitting past a full square");
  ok(!legal(reach, 0, 3.5, 3.5), "the pawn ahead still blocks the push");
  const front = [{ id: 0, c: "w", t: "p", x: 4.5, y: 1.5 }, { id: 1, c: "b", t: "n", x: 4.5, y: 2.5 }];
  ok(!legal(front, 0, 5.1, 2.2), "a pawn cannot sidestep onto a piece straight ahead");
  ok(!legal(front, 0, 4.5, 2.5), "nor take it head-on");
  ok(legal(front, 0, 4.5, 2.1), "it may only close up to it");
  const ps2 = start();
  const at2 = (x, y) => ps2.find(q => Math.abs(q.x - x) < E && Math.abs(q.y - y) < E).id;
  apply(ps2, at2(3.5, 1.5), 3.5, 3.5);
  ok(legal(ps2, at2(2.5, 0.5), 4.5, 2.5), "bishop threads the opened file");
  ok(!legal(ps2, at2(2.5, 0.5), 4.75, 2.3), "too steep a line clips the pawn box");
  console.log("ok");
}
