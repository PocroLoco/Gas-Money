// Gas Money: reads the route distance Google Maps already shows in the
// directions panel and drops a small gas-cost badge under it.
(() => {
  if (window.__gasMoneyLoaded) return;
  window.__gasMoneyLoaded = true;

  const G = GasMoney;
  const BADGE = 'gm-gas-badge';

  let settings = { ...G.DEFAULTS };
  let settingsLoaded = false;
  let autoOpened = false; // pop the settings card once per page, only if not set up
  let stats = { onDirections: false, driving: false, routes: 0, strategy: null };

  // "10.2 miles", "850 ft", "1,204 mi", "12,4 km"
  const NUM = String.raw`(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:[.,]\d+)?)`;
  const UNITS = 'miles|mile|mi|kilometers|kilometer|km|feet|ft|m';
  const DIST_ONLY = new RegExp(`^${NUM}\\s*(${UNITS})$`, 'i');
  // Route details header: "15 min (10.2 miles)"
  const DIST_IN_PARENS = new RegExp(`\\(${NUM}\\s*(miles|mile|mi|kilometers|km)\\)`, 'i');
  // No trailing \b: Google's text runs together ("21 min5.5 miles").
  const DURATION = /\d+\s*(min|mins|hr|hrs|h)(?![a-z])/i;
  const SIDE_PANEL_MAX_X = 560; // ignore the map itself (scale bar, route bubbles)

  const PUMP_SVG =
    '<svg class="gm-gas-icon" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M3 2.5A1.5 1.5 0 0 1 4.5 1h4A1.5 1.5 0 0 1 10 2.5V8h.5A1.5 1.5 0 0 1 12 9.5v2a.5.5 0 0 0 1 0V6.2l-1.35-1.35a.5.5 0 1 1 .7-.7l1.5 1.5a.5.5 0 0 1 .15.35v5.5a1.5 1.5 0 0 1-3 0v-2a.5.5 0 0 0-.5-.5H10v4.5h.5a.5.5 0 0 1 0 1h-8a.5.5 0 0 1 0-1H3zm1.5 0v3.5h4V2.5z"/></svg>';

  // ---------- settings ----------
  function loadSettings() {
    try {
      chrome.storage.sync.get(G.DEFAULTS, (s) => {
        settings = s;
        settingsLoaded = true;
        schedule();
      });
    } catch (_) { /* extension was reloaded; this old copy is dead */ }
  }
  chrome.storage.onChanged.addListener((_changes, area) => {
    if (area === 'sync') loadSettings();
  });

  // ---------- page state ----------
  const isDirections = () => location.pathname.includes('/maps/dir/');
  // Google encodes travel mode in the URL: !3e0 driving, 1 bike, 2 walk, 3 transit.
  const isDriving = () => {
    const m = location.href.match(/!3e(\d+)/);
    return !m || m[1] === '0';
  };

  function inSidePanel(el) {
    if (!el || !el.getBoundingClientRect) return false;
    const r = el.getBoundingClientRect();
    return r.left <= SIDE_PANEL_MAX_X;
  }

  function textNodes(root) {
    const out = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) =>
        n.parentElement && n.nodeValue.trim() && !n.parentElement.closest('.' + BADGE)
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT,
    });
    while (walker.nextNode()) out.push(walker.currentNode);
    return out;
  }

  function distanceHit(node, re) {
    const m = node.nodeValue.trim().match(re);
    if (!m) return null;
    const miles = G.toMiles(m[1], m[2]);
    return miles ? { el: node.parentElement, miles } : null;
  }

  // Smallest nearby container that also mentions a drive time = a route summary.
  function routeBox(el) {
    // On live Maps the time sits 2 levels up from the distance, so stay close.
    for (let box = el, i = 0; box && box !== document.body && i < 4; box = box.parentElement, i++) {
      const t = box.textContent || '';
      if (t.length > 240) return null;
      if (DURATION.test(t)) return box;
    }
    return null;
  }

  // ---------- finding routes (three strategies, most specific first) ----------
  function findRoutes() {
    // 1. Google's route option cards: [data-trip-index] (2026 layout),
    //    or #section-directions-trip-0, -1, ... (older layout).
    const cards = [...document.querySelectorAll('[data-trip-index], [id^="section-directions-trip-"]')]
      .filter((el) => el.hasAttribute('data-trip-index') || /^section-directions-trip-\d+$/.test(el.id))
      .filter((el, _i, all) => !all.some((o) => o !== el && o.contains(el))); // outermost only
    const fromCards = [];
    for (const card of cards) {
      for (const n of textNodes(card)) {
        const hit = distanceHit(n, DIST_ONLY);
        if (hit) { fromCards.push(hit); break; }
      }
    }
    if (fromCards.length) return { hits: fromCards, strategy: 'cards' };

    // 2. Layout changed: any "X miles" in the side panel sitting next to a drive time.
    const seen = new Set();
    const fromText = [];
    const nodes = textNodes(document.body);
    for (const n of nodes) {
      const hit = distanceHit(n, DIST_ONLY);
      if (!hit || !inSidePanel(hit.el)) continue;
      const box = routeBox(hit.el);
      if (!box || seen.has(box)) continue;
      seen.add(box);
      fromText.push(hit);
    }
    if (fromText.length) return { hits: fromText, strategy: 'text' };

    // 3. Single route details view: "15 min (10.2 miles)".
    for (const n of nodes) {
      const m = n.nodeValue.match(DIST_IN_PARENS);
      if (!m || !inSidePanel(n.parentElement)) continue;
      const miles = G.toMiles(m[1], m[2]);
      if (miles) return { hits: [{ el: n.parentElement, miles }], strategy: 'details' };
    }
    return { hits: [], strategy: null };
  }

  // ---------- badges ----------
  function badgeContent(miles) {
    const trip = G.tripCost(miles, settings);
    if (!trip) {
      return {
        setup: true,
        sig: 'setup',
        html: `${PUMP_SVG}<span class="gm-gas-cost">Set your MPG and gas price</span>`,
        title: 'Set up Gas Money',
      };
    }
    const label = settings.roundTrip ? 'round trip' : 'one way';
    const cost = G.money(trip.cost);
    return {
      setup: false,
      sig: `${cost}|${label}|${trip.miles}`,
      html: `${PUMP_SVG}<span class="gm-gas-cost">${cost}</span><span class="gm-gas-label">${label}</span>`,
      title:
        `${G.miles(trip.miles)} mi ${label} at ${settings.mpg} mpg = ` +
        `${G.gallons(trip.gallons)} gal at $${Number(settings.gasPrice).toFixed(2)}/gal`,
    };
  }

  // Clicking any sign opens the settings card right there on the map.
  function onBadgeClick(e) {
    e.preventDefault();
    e.stopPropagation();
    GasMoneyPanel.open(e.currentTarget);
  }

  function upsertBadge({ el, miles }) {
    let badge = el.nextElementSibling;
    if (!badge || !badge.classList.contains(BADGE)) {
      badge = document.createElement('div');
      badge.className = BADGE;
      badge.addEventListener('click', onBadgeClick, true);
      el.insertAdjacentElement('afterend', badge);
    }
    const c = badgeContent(miles);
    if (badge.dataset.sig !== c.sig) {
      badge.innerHTML = c.html;
      badge.title = c.title;
      badge.dataset.sig = c.sig;
      badge.dataset.setup = c.setup ? '1' : '0';
      badge.setAttribute('role', c.setup ? 'button' : 'note');
    }
    return badge;
  }

  function render() {
    if (!settingsLoaded) return;
    stats = { onDirections: isDirections(), driving: isDriving(), routes: 0, strategy: null };
    const keep = new Set();
    if (stats.onDirections && stats.driving) {
      const { hits, strategy } = findRoutes();
      stats.routes = hits.length;
      stats.strategy = strategy;
      for (const hit of hits) keep.add(upsertBadge(hit));
      const needsSetup = !(settings.mpg > 0 && settings.gasPrice > 0);
      if (needsSetup && keep.size && !autoOpened && !GasMoneyPanel.isOpen()) {
        autoOpened = true;
        GasMoneyPanel.open([...keep][0]);
      }
    }
    document.querySelectorAll('.' + BADGE).forEach((b) => { if (!keep.has(b)) b.remove(); });
  }

  // Maps is a single-page app that re-renders constantly; re-check after it settles.
  let timer = null;
  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(render, 250);
  }
  new MutationObserver(schedule).observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  // The popup asks what we found so it can show a status line.
  chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
    if (msg && msg.type === 'gm-status') {
      render();
      reply(stats);
    }
  });

  loadSettings();
})();
