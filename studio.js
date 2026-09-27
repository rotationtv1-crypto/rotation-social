const KEY = "rtv.studio.v1";
const channel = "BroadcastChannel" in window ? new BroadcastChannel("rtv-studio") : null;

const seed = {
  rev: 0,
  pane: "display",
  api: "checking",
  live: { on: true, room: "I-RIS", viewers: 12 },
  pk: {
    host: "Poly Kingdom",
    guest: "Nova Reign",
    left: 54,
    right: 46,
    stars: 2480,
    last: "Round open",
  },
  llm: { prompt: "", reply: "Ask the studio. The stage shows the same answer.", status: "idle" },
};

function read() {
  try {
    return { ...seed, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    return { ...seed };
  }
}

function write(patch) {
  const prev = read();
  const next = {
    ...prev,
    ...patch,
    live: { ...prev.live, ...(patch.live || {}) },
    pk: { ...prev.pk, ...(patch.pk || {}) },
    llm: { ...prev.llm, ...(patch.llm || {}) },
    rev: prev.rev + 1,
    at: Date.now(),
  };
  localStorage.setItem(KEY, JSON.stringify(next));
  channel?.postMessage(next);
  render(next);
  return next;
}

function paneFromUrl() {
  const q = new URLSearchParams(location.search).get("pane");
  return ["live", "pk", "llm", "display"].includes(q) ? q : read().pane || "display";
}

function stageCopy(s) {
  if (s.pane === "pk") {
    return {
      kicker: "PK display",
      title: `${s.pk.host}  ${s.pk.left}  ·  ${s.pk.right}  ${s.pk.guest}`,
      body: s.pk.last,
    };
  }
  if (s.pane === "llm") {
    return {
      kicker: "LLM display",
      title: s.llm.status === "running" ? "Listening" : "Studio reply",
      body: s.llm.reply || "No answer yet.",
    };
  }
  return {
    kicker: s.live.on ? "Live display" : "Live idle",
    title: s.live.room,
    body: s.live.on
      ? `${s.live.viewers} viewers on the same clock as PK and the LLM.`
      : "Room is dark. Turn it on and the other panes follow.",
  };
}

function render(s) {
  const stage = stageCopy(s);
  document.querySelector("#kicker").textContent = stage.kicker;
  document.querySelector("#title").textContent = stage.title;
  document.querySelector("#body").textContent = stage.body;
  document.querySelector("#rev").textContent = `sync ${s.rev}`;
  document.querySelector("#api").textContent = s.api;
  document.querySelector("#api").className = "chip" + (s.api.startsWith("offline") ? " bad" : " on");
  document.querySelector("#liveFlag").className = "chip" + (s.live.on ? " on" : "");
  document.querySelectorAll(".tabs button").forEach((b) => {
    b.setAttribute("aria-selected", String(b.dataset.pane === s.pane));
  });
  document.querySelector("#viewers").value = s.live.viewers;
  document.querySelector("#prompt").value = s.llm.prompt;
  document.querySelector("#hostScore").textContent = s.pk.left;
  document.querySelector("#guestScore").textContent = s.pk.right;
  document.querySelector("#stars").textContent = s.pk.stars.toLocaleString();
  document.querySelector("#barL").style.width = `${s.pk.left}%`;
  document.querySelector("#barR").style.width = `${s.pk.right}%`;
  document.querySelector("#go").disabled = s.llm.status === "running";
  document.querySelector("#go").textContent = s.llm.status === "running" ? "Sending" : "Send to display";
}

async function probe() {
  try {
    const res = await fetch("/api/health", { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    write({ api: data.llm === "ready" ? "LLM ready" : "LLM offline", pane: read().pane });
  } catch {
    const cur = read();
    write({ api: "offline · display only", pane: cur.pane });
  }
}

async function ask() {
  const prompt = document.querySelector("#prompt").value.trim();
  if (!prompt) return;
  write({
    pane: "llm",
    llm: { prompt, status: "running", reply: "Sending to the studio model…" },
  });
  try {
    const res = await fetch("/api/query", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: prompt.slice(0, 2000), surface: "display" }),
    });
    const data = await res.json();
    write({
      pane: "llm",
      llm: {
        prompt,
        status: data.offline ? "offline" : "ready",
        reply: data.text || "No text returned.",
      },
      api: data.offline ? "offline · display only" : `LLM ${data.provider || "ready"}`,
    });
  } catch (err) {
    write({
      pane: "llm",
      llm: { prompt, status: "offline", reply: "Gateway unreachable. The prompt is still on this display." },
      api: "offline · display only",
    });
  }
}

function gift(name, cost) {
  const s = read();
  if (s.pk.stars < cost) {
    write({ pane: "pk", pk: { last: `${name} needs ${cost} stars. Balance stays ${s.pk.stars}.` } });
    return;
  }
  const left = Math.min(92, s.pk.left + 4);
  write({
    pane: "pk",
    pk: {
      stars: s.pk.stars - cost,
      left,
      right: 100 - left,
      last: `${name} locked ${cost} stars on ${s.pk.host}.`,
    },
  });
  fetch("/api/coach", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      durationSec: 30,
      totalViewers: read().live.viewers,
      validViewers: Math.max(0, read().live.viewers - 2),
      gifters: 1,
    }),
  })
    .then((r) => r.json())
    .then((data) => {
      const tip = data?.tip?.text;
      if (tip) write({ pane: "pk", pk: { last: `${read().pk.last} Coach: ${tip}` } });
    })
    .catch(() => {});
}

function bind() {
  document.querySelectorAll(".tabs button").forEach((b) => {
    b.onclick = () => write({ pane: b.dataset.pane });
  });
  document.querySelector("#air").onclick = () => write({ pane: "live", live: { on: !read().live.on } });
  document.querySelector("#viewers").onchange = (e) => {
    const viewers = Math.max(0, Number(e.target.value) || 0);
    write({ pane: "live", live: { viewers, on: true } });
  };
  document.querySelector("#prompt").oninput = (e) => {
    const cur = read();
    const next = { ...cur, llm: { ...cur.llm, prompt: e.target.value } };
    localStorage.setItem(KEY, JSON.stringify(next));
  };
  document.querySelector("#go").onclick = ask;
  document.querySelectorAll("[data-gift]").forEach((b) => {
    b.onclick = () => gift(b.dataset.gift, Number(b.dataset.cost));
  });
}

channel?.addEventListener("message", (ev) => render(ev.data));
window.addEventListener("storage", (ev) => {
  if (ev.key === KEY) render(read());
});

const initial = read();
write({ ...initial, pane: paneFromUrl(), rev: Math.max(0, initial.rev - 1) });
bind();
probe();
