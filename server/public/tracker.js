(function () {
  if (window.__tracker) return;
  window.__tracker = true;

  const script = document.currentScript;
  const ENDPOINT = script.dataset.endpoint || new URL(script.src).origin + "/api/events";

  const SESSION_IDLE_MS = 30 * 60 * 1000;
  const FLUSH_EVERY_MS = 5000;
  const MAX_QUEUE = 10;

  const storage = {
    get(key) {
      try { return localStorage.getItem(key); } catch { return null; }
    },
    set(key, value) {
      try { localStorage.setItem(key, value); } catch {}
    },
  };

  function newId() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  function getSessionId() {
    const now = Date.now();
    const lastSeen = Number(storage.get("t_last_seen"));
    let id = storage.get("t_session");

    // new session if actually new or last seen longer than idle time
    if (!id || now - lastSeen > SESSION_IDLE_MS) {
      id = newId();
      storage.set("t_session", id);
    }
    storage.set("t_last_seen", String(now));
    return id;
  }

  let queue = [];

  function track(type, data) {
    queue.push({
      session_id: getSessionId(),
      type,
      // url query and hash are dropped here so tokens/emails in URLs never leave the browser
      page_url: location.origin + location.pathname,
      ts: Date.now(),
      ...data,
    });

    if (queue.length >= MAX_QUEUE) flush();
  }

  function flush() {
    if (queue.length === 0) return;

    const body = JSON.stringify({ events: queue });
    queue = [];

    // text/plain keeps this a "simple" CORS request: no preflight, which sendBeacon can't do
    const blob = new Blob([body], { type: "text/plain" });
    if (navigator.sendBeacon && navigator.sendBeacon(ENDPOINT, blob)) return;

    fetch(ENDPOINT, { method: "POST", body, keepalive: true }).catch(() => {});
  }

  let lastPath = null;

  function trackPageView() {
    if (location.pathname === lastPath) return;
    lastPath = location.pathname;
    track("page_view");
  }

  // SPAs change the URL with history.pushState/replaceState instead of loading a new page,
  // and the browser fires no event for that. Wrap both so we get told.
  const originalPushState = history.pushState;
  history.pushState = function (...args) {
    originalPushState.apply(history, args);
    trackPageView();
  };

  const originalReplaceState = history.replaceState;
  history.replaceState = function (...args) {
    originalReplaceState.apply(history, args);
    trackPageView();
  };

  // back/forward buttons do fire an event
  window.addEventListener("popstate", trackPageView);

  const RAGE_WINDOW_MS = 600;
  const RAGE_RADIUS_PX = 30;
  const RAGE_MIN_CLICKS = 3;

  let recentClicks = [];

  function isRageClick(x, y, now) {
    recentClicks = recentClicks.filter(
      (c) => now - c.t < RAGE_WINDOW_MS && Math.hypot(c.x - x, c.y - y) < RAGE_RADIUS_PX
    );
    recentClicks.push({ x, y, t: now });
    return recentClicks.length >= RAGE_MIN_CLICKS;
  }

  function onClick(e) {
    // keyboard-triggered clicks (Enter on a button) have no real position
    if (e.detail === 0) return;

    const x = Math.round(e.pageX);
    const y = Math.round(e.pageY);
    const doc = document.documentElement;

    track("click", {
      x,
      y,
      vw: window.innerWidth,
      dw: doc.scrollWidth,
      dh: doc.scrollHeight,
      rage: isRageClick(x, y, Date.now()),
    });
  }

  // capture phase so clicks are seen even if the page calls stopPropagation
  document.addEventListener("click", onClick, true);

  setInterval(flush, FLUSH_EVERY_MS);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
  window.addEventListener("pagehide", flush);

  trackPageView();
})();
