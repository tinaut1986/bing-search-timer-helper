// i18n.js – traduce todo elemento con atributo [data-i18n]
// Modified to support dynamic language switching

window.i18nReady = (async () => {
  globalThis.browser = globalThis.browser || globalThis.chrome;

  let customMessages = null;

  // 1. Check for stored language preference
  try {
    const data = await browser.storage.local.get({ appLanguage: null });
    const lang = data.appLanguage;
    const sysLang = browser.i18n.getUILanguage().split('-')[0];

    // If preference exists and is different from system/browser language
    if (lang && lang !== sysLang) {
       try {
         const url = browser.runtime.getURL(`_locales/${lang}/messages.json`);
         const res = await fetch(url);
         if (res.ok) {
           customMessages = await res.json();
           console.log(`[i18n] Loaded custom language: ${lang}`);
         }
       } catch (e) {
         console.warn(`[i18n] Failed to load custom language ${lang}`, e);
       }
    }
  } catch (e) {
    console.error("[i18n] Storage access error", e);
  }

  // 2. Define translation helper
  window.t = (k, subs) => {
    // Try custom messages first
    if (customMessages && customMessages[k]) {
        let msg = customMessages[k].message;
        if (customMessages[k].placeholders && subs) {
             const subArr = Array.isArray(subs) ? subs : [subs];
             // Simple placeholder replacement
             for (const [pName, pDef] of Object.entries(customMessages[k].placeholders)) {
                 const content = pDef.content; // e.g. "$1"
                 const index = parseInt(content.replace('$', '')) - 1; // 0
                 if (!isNaN(index) && subArr[index] !== undefined) {
                     // Replace all occurrences of $PLACEHOLDER$
                     msg = msg.split(`$${pName}$`).join(subArr[index]);
                 }
             }
        }
        return msg;
    }
    // Fallback to native
    if (subs !== undefined) {
      if (Array.isArray(subs)) subs = subs.map(s => String(s));
      else subs = String(subs);
    }
    return browser.i18n.getMessage(k, subs) || k;
  };

  // 3. Helper to translate DOM
  function translateFragment(root = document) {
    const nodes = root.querySelectorAll('[data-i18n]');
    nodes.forEach(el => {
      const key = el.getAttribute('data-i18n');
      const msg = window.t(key);
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
  
  // 4. Run initial translation
  if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => translateFragment());
  } else {
      translateFragment();
  }

  return true;
})();