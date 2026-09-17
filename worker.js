const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const TTL = 6 * 60 * 60 * 1000;
const json = (body, status = 200) => new Response(body === null ? null : JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json", "access-control-allow-origin": "*", "access-control-allow-headers": "*" },
});

export class Lobby {
  constructor(state) { this.state = state; }

  async fetch(req) {
    const [, , action, code] = new URL(req.url).pathname.split("/");
    if (action === "new") {
      const offer = await req.json();
      let id;
      do { id = Array.from({ length: 4 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join(""); }
      while (await this.state.storage.get(id));
      await this.state.storage.put(id, { offer, at: Date.now(), gen: 0 });
      return json({ code: id });
    }
    const room = await this.state.storage.get(code);
    if (!room || Date.now() - room.at > TTL) {
      if (room) await this.state.storage.delete(code);
      return json({ error: "no such game" }, 404);
    }
    if (action === "join") return json({ offer: room.offer, gen: room.gen });
    if (action === "offer" && req.method === "POST") {
      const gen = room.gen + 1;
      await this.state.storage.put(code, { offer: await req.json(), at: Date.now(), gen });
      return json({ gen });
    }
    if (action === "answer" && req.method === "POST") {
      const { answer, gen } = await req.json();
      await this.state.storage.put(code, { ...room, answer, answerGen: gen, at: Date.now() });
      return json(null, 204);
    }
    if (action === "answer") return room.answer ? json({ answer: room.answer, gen: room.answerGen }) : json(null, 204);
    return json({ error: "no" }, 400);
  }
}

export default {
  async fetch(req, env) {
    const path = new URL(req.url).pathname;
    if (req.method === "OPTIONS") return json(null, 204);
    if (path === "/api/ice") {
      const servers = [{ urls: "stun:stun.l.google.com:19302" }];
      const app = (env.TURN_APP || "").trim().split(".")[0];
      if (app && env.TURN_KEY) {
        try {
          const r = await fetch(`https://${app}.metered.live/api/v1/turn/credentials?apiKey=${env.TURN_KEY.trim()}`);
          if (r.ok) servers.push(...await r.json());
        } catch {}
      }
      return json({ iceServers: servers });
    }
    if (!path.startsWith("/api/")) return new Response("not found", { status: 404 });
    return env.LOBBY.get(env.LOBBY.idFromName("lobby")).fetch(req);
  },
};

if (import.meta.main) {
  const ok = (c, m) => { if (!c) throw new Error(m); };
  const store = new Map();
  const lobby = new Lobby({ storage: { get: k => store.get(k), put: (k, v) => store.set(k, v), delete: k => store.delete(k) } });
  const call = (path, body) => lobby.fetch(new Request("https://x" + path, body === undefined ? {} : { method: "POST", body: JSON.stringify(body) }));
  const { code } = await (await call("/api/new", { sdp: "offer-1" })).json();
  const first = await (await call(`/api/join/${code}`)).json();
  ok(first.offer.sdp === "offer-1" && first.gen === 0, "joiner reads the first offer");
  await call(`/api/answer/${code}`, { answer: { sdp: "answer-1" }, gen: 0 });
  const back = await (await call(`/api/answer/${code}`)).json();
  ok(back.answer.sdp === "answer-1" && back.gen === 0, "host reads the matching answer");
  const { gen } = await (await call(`/api/offer/${code}`, { sdp: "offer-2" })).json();
  ok(gen === 1, "a fresh offer bumps the generation");
  const again = await (await call(`/api/join/${code}`)).json();
  ok(again.offer.sdp === "offer-2" && again.gen === 1, "joiner sees the new offer, not the old one");
  ok((await call(`/api/answer/${code}`)).status === 204, "the old answer is cleared with the new offer");
  await call(`/api/answer/${code}`, { answer: { sdp: "answer-2" }, gen: 1 });
  ok((await (await call(`/api/answer/${code}`)).json()).gen === 1, "the reconnect answer lands");
  ok((await call("/api/join/ZZZZ")).status === 404, "unknown rooms 404");
  console.log("ok");
}
