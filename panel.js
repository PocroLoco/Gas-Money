// Gas Money: opens the settings card on Google Maps.
// The card is an extension page inside an iframe, so anything typed into it
// stays inside it. (A plain in-page card let Maps grab the keystrokes and
// dump them into the origin search box.)
const GasMoneyPanel = (() => {
  const W = 296;
  const PAGE = chrome.runtime.getURL('panel.html');
  const ORIGIN = new URL(PAGE).origin;

  let frame = null;
  let anchor = null;
  let height = 440;

  function place() {
    if (!frame) return;
    const pad = 12;
    let left = 24;
    let top = 80;
    if (anchor && anchor.isConnected) {
      const r = anchor.getBoundingClientRect();
      left = r.right + pad; // beside the sign, over the map
      top = r.top - 60;
      if (left + W > innerWidth - pad) { // no room on the right: go below
        left = r.left;
        top = r.bottom + 8;
      }
    }
    frame.style.left = Math.max(pad, Math.min(left, innerWidth - W - pad)) + 'px';
    frame.style.top = Math.max(pad, Math.min(top, innerHeight - height - pad)) + 'px';
  }

  function onMessage(e) {
    if (!frame || e.source !== frame.contentWindow || !e.data) return;
    if (e.data.gasMoney === 'close') close();
    if (e.data.gasMoney === 'height' && e.data.h > 0) {
      height = e.data.h;
      frame.style.height = height + 'px';
      place();
    }
  }

  // Clicks inside the frame never reach this page, so any click here is "outside".
  function onOutside(e) {
    if (frame && e.target !== frame) close();
  }

  function open(anchorEl) {
    anchor = anchorEl || null;
    if (frame) { place(); return; }

    frame = document.createElement('iframe');
    frame.id = 'gas-money-panel';
    frame.title = 'Gas Money settings';
    frame.src = PAGE;
    Object.assign(frame.style, {
      position: 'fixed',
      zIndex: '2147483000',
      width: W + 'px',
      height: height + 'px',
      border: '0',
      borderRadius: '12px',
      boxShadow: '0 10px 30px rgba(0,0,0,.28), 0 0 0 1px rgba(0,0,0,.08)',
      background: '#eeefeb',
      colorScheme: 'light',
    });
    frame.addEventListener('load', () => {
      frame.focus();
      frame.contentWindow.postMessage({ gasMoney: 'focus' }, ORIGIN);
    });
    document.body.appendChild(frame);
    place();
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      frame.animate(
        [{ opacity: 0, transform: 'translateY(4px) scale(.98)' }, { opacity: 1, transform: 'none' }],
        { duration: 140, easing: 'ease-out' }
      );
    }
    window.addEventListener('message', onMessage);
    window.addEventListener('resize', place);
    setTimeout(() => document.addEventListener('mousedown', onOutside, true), 0);
  }

  function close() {
    window.removeEventListener('message', onMessage);
    window.removeEventListener('resize', place);
    document.removeEventListener('mousedown', onOutside, true);
    if (frame) frame.remove();
    frame = null;
  }

  const isOpen = () => !!(frame && frame.isConnected);

  return { open, close, isOpen };
})();
