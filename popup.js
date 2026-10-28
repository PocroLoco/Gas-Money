const G = GasMoney;
const $ = (id) => document.getElementById(id);
const DAY = 24 * 60 * 60 * 1000;
const STALE_AFTER_DAYS = 14;

let state = { ...G.DEFAULTS };

if (window.innerWidth > 480) document.body.classList.add('in-tab');

function num(el) {
  const v = G.parseNumber(el.value);
  return Number.isFinite(v) && v > 0 ? v : null;
}

function save() {
  chrome.storage.sync.set(state);
  renderSign();
  renderPriceHint();
}

// ---------- the sign: live "if it's X miles away" calculator ----------
function renderSign() {
  const miles = num($('miles'));
  const trip = miles ? G.tripCost(miles, state) : null;
  const label = state.roundTrip ? 'round trip' : 'one way';
  if (trip) {
    $('cost').textContent = G.money(trip.cost);
    $('costNote').textContent = `in gas, ${label}`;
  } else {
    $('cost').textContent = '$–.––';
    $('costNote').textContent = !state.mpg || !state.gasPrice
      ? 'Add your MPG and gas price below'
      : 'Enter a distance';
  }
}

function renderPriceHint() {
  const hint = $('priceHint');
  const link = '<a href="https://gasprices.aaa.com/" target="_blank" rel="noopener">Check local average</a>';
  hint.classList.remove('stale');
  if (!state.gasPrice || !state.priceUpdatedAt) {
    hint.innerHTML = `What a gallon costs near you. ${link}`;
    return;
  }
  const days = Math.floor((Date.now() - state.priceUpdatedAt) / DAY);
  const when = days === 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`;
  if (days >= STALE_AFTER_DAYS) {
    hint.classList.add('stale');
    hint.innerHTML = `Updated ${when}, prices may have moved. ${link}`;
  } else {
    hint.innerHTML = `Updated ${when}. ${link}`;
  }
}

// ---------- status: what the Maps tab found ----------
function setStatus(tone, text) {
  $('status').dataset.tone = tone;
  $('statusText').textContent = text;
}

function renderStatus() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs && tabs[0];
    if (!tab || tab.id == null) return setStatus('idle', 'Open driving directions on Google Maps to see costs there.');
    chrome.tabs.sendMessage(tab.id, { type: 'gm-status' }, (s) => {
      if (chrome.runtime.lastError || !s) {
        return setStatus('idle', 'Open driving directions on Google Maps to see costs there. Already open? Reload that tab.');
      }
      if (!s.onDirections) return setStatus('idle', 'Get directions on Google Maps to see costs there.');
      if (!s.driving) return setStatus('warn', 'Switch Google Maps to driving to see gas costs.');
      if (!s.routes) return setStatus('warn', "Can't find the distance on this page. Google may have changed its layout.");
      setStatus('ok', `Showing gas cost on ${s.routes} ${s.routes === 1 ? 'route' : 'routes'}.`);
    });
  });
}

// ---------- wire up ----------
$('mpg').addEventListener('input', () => { state.mpg = num($('mpg')); save(); });
$('price').addEventListener('input', () => {
  state.gasPrice = num($('price'));
  state.priceUpdatedAt = Date.now();
  save();
});
$('round').addEventListener('change', () => { state.roundTrip = $('round').checked; save(); });
$('miles').addEventListener('input', renderSign);

chrome.storage.sync.get(G.DEFAULTS, (s) => {
  state = s;
  $('mpg').value = s.mpg ?? '';
  $('price').value = s.gasPrice != null ? Number(s.gasPrice).toFixed(2) : '';
  $('round').checked = !!s.roundTrip;
  renderSign();
  renderPriceHint();
  renderStatus();
  if (!s.mpg) $('mpg').focus();
});
