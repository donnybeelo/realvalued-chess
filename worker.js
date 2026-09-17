const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const TTL = 15 * 60 * 1000;
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
      await this.state.storage.put(id, { offer, at: Date.now() });
      return json({ code: id });
    }
    const room = await this.state.storage.get(code);
    if (!room || Date.now() - room.at > TTL) {
      if (room) await this.state.storage.delete(code);
      return json({ error: "no such game" }, 404);
    }
    if (action === "join") return json(room.offer);
    if (action === "answer" && req.method === "POST") {
      await this.state.storage.put(code, { ...room, answer: await req.json() });
      return json(null, 204);
    }
    if (action === "answer") return room.answer ? json(room.answer) : json(null, 204);
    return json({ error: "no" }, 400);
  }
}

export default {
  async fetch(req, env) {
    const path = new URL(req.url).pathname;
    if (req.method === "OPTIONS") return json(null, 204);
    if (path === "/api/ice") {
      const servers = [{ urls: "stun:stun.l.google.com:19302" }];
      if (env.TURN_APP && env.TURN_KEY) {
        try {
          const r = await fetch(`https://${env.TURN_APP}.metered.live/api/v1/turn/credentials?apiKey=${env.TURN_KEY}`);
          if (r.ok) servers.push(...await r.json());
        } catch {}
      }
      return json({ iceServers: servers });
    }
    if (!path.startsWith("/api/")) return new Response("not found", { status: 404 });
    return env.LOBBY.get(env.LOBBY.idFromName("lobby")).fetch(req);
  },
};
