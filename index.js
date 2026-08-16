(() => {
  'use strict';
  if (window.__deflyOpacity) return;

  const LS = 'defly:opacity';
  const clamp = (n) => Math.min(100, Math.max(0, Math.round(+n || 0)));

  let st = { fps: 100, mates: 100 };
  try { const s = localStorage.getItem(LS); if (s) st = Object.assign(st, JSON.parse(s)); } catch (e) {}
  st.fps = clamp(st.fps); st.mates = clamp(st.mates);
  const save = () => { try { localStorage.setItem(LS, JSON.stringify(st)); } catch (e) {} };

  

  let styleEl = document.getElementById('dfo-style');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'dfo-style';
    document.head.appendChild(styleEl);
  }
  const UI_CSS =
    '#dfo-wrap .dfo-row{display:flex;align-items:center;gap:7px;margin:2px 0}' +
    '#dfo-wrap .dfo-lbl{flex:0 0 auto}' +
    '#dfo-wrap input[type=range]{flex:1 1 80px;min-width:70px;max-width:140px;' +
      'accent-color:currentColor;margin:0;vertical-align:middle}' +
    '#dfo-wrap input[type=number]{width:52px;font:inherit;font-size:.9em;text-align:right;margin:0}';

  const applyCss = () => {
    styleEl.textContent =
      '#fps{opacity:' + (st.fps / 100) + '!important;transition:opacity .12s}' + UI_CSS;
  };

  

  const markers = [];
  let pending = null;

  function applyMarkers() {
    const a = st.mates / 100;
    for (let i = markers.length - 1; i >= 0; i--) {
      const m = markers[i];
      if (!m || !m.parent) { markers.splice(i, 1); continue; }
      m.alpha = a;
      if (m.playerText) m.playerText.alpha = a;
    }
  }

  function hookPixi() {
    const P = window.PIXI;
    if (!P || !P.Container || !P.Container.prototype) return false;
    const proto = P.Container.prototype;
    if (proto.addChild && proto.addChild.__dfoOrig) return true;
    const orig = proto.addChild;
    if (typeof orig !== 'function') return false;
    const wrapped = function () {
      const r = orig.apply(this, arguments);
      const a = st.mates / 100;
      for (let i = 0; i < arguments.length; i++) {
        const c = arguments[i];
        if (!c) continue;
        if (c.playerId !== undefined) {
          markers.push(c); pending = c; c.alpha = a;
        } else if (pending && pending.playerText === c) {
          c.alpha = a; pending = null;
        }
      }
      return r;
    };
    wrapped.__dfoOrig = orig;
    proto.addChild = wrapped;
    return true;
  }

  

  function makeRow(key, text) {
    const d = document.createElement('div');
    d.className = 'dfo-row';

    const lbl = document.createElement('span');
    lbl.className = 'dfo-lbl';
    lbl.textContent = text;

    const rng = document.createElement('input');
    rng.type = 'range'; rng.min = '0'; rng.max = '100'; rng.step = '1';
    rng.id = 'dfo-r-' + key; rng.value = String(st[key]);
    rng.setAttribute('aria-label', text);

    const num = document.createElement('input');
    num.type = 'number'; num.min = '0'; num.max = '100'; num.step = '1';
    num.id = 'dfo-n-' + key; num.value = String(st[key]);
    num.setAttribute('aria-label', text + ' percent');

    const pct = document.createElement('span');
    pct.textContent = '%';

    rng.addEventListener('input', () => {
      st[key] = clamp(rng.value); num.value = String(st[key]); commit();
    });
    num.addEventListener('input', () => {
      if (num.value === '') return;
      st[key] = clamp(num.value); rng.value = String(st[key]); commit();
    });
    num.addEventListener('blur', () => { num.value = String(st[key]); });

    d.appendChild(lbl); d.appendChild(rng); d.appendChild(num); d.appendChild(pct);
    return d;
  }

  function buildRows() {
    if (document.getElementById('dfo-wrap')) return true;
    const a = document.getElementById('settings-chat-size1');
    if (!a) return false;
    const anchor = a.closest('div');
    if (!anchor || !anchor.parentNode) return false;

    const wrap = document.createElement('div');
    wrap.id = 'dfo-wrap';
    wrap.appendChild(makeRow('fps', 'Server info:'));
    wrap.appendChild(makeRow('mates', 'Teammate markers:'));
    anchor.parentNode.insertBefore(wrap, anchor.nextSibling);
    return true;
  }

  function sync() {
    ['fps', 'mates'].forEach(k => {
      const r = document.getElementById('dfo-r-' + k);
      const n = document.getElementById('dfo-n-' + k);
      if (r) r.value = String(st[k]);
      if (n) n.value = String(st[k]);
    });
  }

  function commit() { save(); applyCss(); applyMarkers(); }

  

  applyCss();
  buildRows();

  let tries = 0;
  const retry = setInterval(() => {
    if (hookPixi() || ++tries > 40) clearInterval(retry);
  }, 250);
  hookPixi();

  const mo = new MutationObserver(() => {
    if (!document.getElementById('dfo-wrap')) buildRows();
  });
  mo.observe(document.getElementById('settings-popup') || document.body,
             { childList: true, subtree: true });

  window.__deflyOpacity = {
    get values() { return { fps: st.fps, mates: st.mates }; },
    set(key, pct) { if (key in st) { st[key] = clamp(pct); commit(); sync(); } },
    remove() {
      clearInterval(retry);
      mo.disconnect();
      st.fps = 100; st.mates = 100;
      applyMarkers();
      const P = window.PIXI;
      if (P && P.Container && P.Container.prototype.addChild &&
          P.Container.prototype.addChild.__dfoOrig) {
        P.Container.prototype.addChild = P.Container.prototype.addChild.__dfoOrig;
      }
      styleEl.remove();
      const w = document.getElementById('dfo-wrap');
      if (w) w.remove();
      delete window.__deflyOpacity;
    }
  };

  console.log('[defly] opacity sliders added');
})();
