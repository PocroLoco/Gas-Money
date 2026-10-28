// Runs inside the settings card iframe. Keystrokes typed here never reach
// Google Maps, which is the whole point of putting the card in its own frame.
const G = GasMoney;
const DAY = 24 * 60 * 60 * 1000;
const AAA = 'https://gasprices.aaa.com/';
const $ = (sel) => document.querySelector(sel);

let state = { ...G.DEFAULTS };
const ready = () => state.mpg > 0 && state.gasPrice > 0;
const tell = (type, extra = {}) => parent.postMessage({ gasMoney: type, ...extra }, '*');

function num(el) {
  const v = G.parseNumber(el.value);
  return Number.isFinite(v) && v > 0 ? v : null;
}

function save(patch) {
  Object.assign(state, patch);
  chrome.storage.sync.set(patch);
  renderText();
}

function renderText() {
  $('.msg').textContent = ready()
    ? 'Every route updates as you type.'
    : 'Add your MPG and gas price to see what each route costs in gas.';
  const hint = $('.price-hint');
  const link = `<a href="${AAA}" target="_blank" rel="noopener">Check local average</a>`;
  hint.classList.remove('stale');
  if (!state.gasPrice || !state.priceUpdatedAt) {
    hint.innerHTML = `What a gallon costs near you. ${link}`;
    return;
  }
  const days = Math.floor((Date.now() - state.priceUpdatedAt) / DAY);
  const when = days === 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`;
  if (days >= 14) hint.classList.add('stale');
  hint.innerHTML = `Updated ${when}${days >= 14 ? ', prices may have moved' : ''}. ${link}`;
}

function focusFirstEmpty() {
  const el = !state.mpg ? $('#mpg') : !state.gasPrice ? $('#price') : null;
  if (el) el.focus();
}

$('#mpg').addEventListener('input', (e) => save({ mpg: num(e.target) }));
$('#price').addEventListener('input', (e) => save({ gasPrice: num(e.target), priceUpdatedAt: Date.now() }));
$('#round').addEventListener('change', (e) => save({ roundTrip: e.target.checked }));
$('.x').addEventListener('click', () => tell('close'));
$('.done').addEventListener('click', () => tell('close'));

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') tell('close');
  if (e.key === 'Enter' && e.target.tagName === 'INPUT' && ready()) tell('close');
});

// The Maps page asks us to grab focus right after it opens the card.
window.addEventListener('message', (e) => {
  if (e.source === parent && e.data && e.data.gasMoney === 'focus') focusFirstEmpty();
});

// Tell the Maps page how tall the card is so the frame fits it exactly.
new ResizeObserver(() => tell('height', { h: Math.ceil($('.panel').getBoundingClientRect().height) }))
  .observe($('.panel'));

chrome.storage.sync.get(G.DEFAULTS, (s) => {
  state = s;
  $('#mpg').value = s.mpg ?? '';
  $('#price').value = s.gasPrice != null ? Number(s.gasPrice).toFixed(2) : '';
  $('#round').checked = !!s.roundTrip;
  renderText();
  focusFirstEmpty();
});
