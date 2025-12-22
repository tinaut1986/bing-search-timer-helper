// i18n.js – traduce todo elemento con atributo [data-i18n]
(() => {
  globalThis.browser = globalThis.browser || globalThis.chrome;

  function translateFragment(root = document) {
    const nodes = root.querySelectorAll('[data-i18n]');
    nodes.forEach(el => {
      const key = el.getAttribute('data-i18n');
      const msg = browser.i18n.getMessage(key);
      if (msg) {
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          if (el.placeholder) el.placeholder = msg;
          else el.value = msg;
        } else {
          el.textContent = msg;
        }
      }
    });
  }
  // translate static DOM now
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => translateFragment());
  } else translateFragment();
  // expose helper
  // expose helper
  window.t = (k, subs) => {
    if (subs !== undefined) {
      if (Array.isArray(subs)) subs = subs.map(s => String(s));
      else subs = String(subs);
    }
    return browser.i18n.getMessage(k, subs) || k;
  };
})();