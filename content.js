// ESPN and Yahoo hard-code their colors and generate hashed class names, and their
// own dark theme classes change next to nothing, so a hand-written stylesheet would
// miss most of the page. Instead this reads every rule the page has loaded and writes
// a second stylesheet with the same selectors and dark colors. Hover states and media
// queries keep working because the selectors are the page's own.

(() => {
  const { mapValue } = globalThis.FantasyDarkColors;

  const ROLES = {
    color: 'text',
    fill: 'text',
    stroke: 'text',
    'caret-color': 'text',
    'text-decoration-color': 'text',
    'background-color': 'background',
    'background-image': 'background',
    'border-top-color': 'border',
    'border-right-color': 'border',
    'border-bottom-color': 'border',
    'border-left-color': 'border',
    'outline-color': 'border',
    'box-shadow': 'shadow',
  };
  // These stay unparsed in the CSSOM when they use var(), so their longhands read as empty.
  const SHORTHANDS = {
    background: 'background',
    border: 'border',
    'border-top': 'border',
    'border-right': 'border',
    'border-bottom': 'border',
    'border-left': 'border',
    'border-color': 'border',
    outline: 'border',
  };
  const INLINE_PROPERTIES = Object.keys(ROLES).filter(
    (name) => name !== 'background-image' && name !== 'box-shadow',
  );

  // What the page leaves to browser defaults, so there is no rule of its own to rewrite.
  const BASE_CSS = `
    html { color: #e6e7e8; scrollbar-color: #48494a #121314; }
    html body { background-color: #121314 !important; }
    :where(a:link, a:visited) { color: #7aa1ea; }
    input, select, textarea { color-scheme: dark; }
    :where(input, select, textarea) { background-color: #1d1e1f; color: #e6e7e8; }
    ::selection { background-color: #305bc8; color: #fff; }
  `;

  const FLAG = 'data-fantasy-dark';
  // Each site has its own stylesheets, so each keeps its own cached result.
  const CACHE_KEY = `cachedCss:${location.hostname}`;
  const styleEl = document.createElement('style');
  styleEl.id = 'fantasy-dark-mode';

  // Yahoo ships a full dark palette for its color tokens but never turns it on, so
  // there these attributes do that work and only hard-coded colors get rewritten.
  const NATIVE_DARK = location.hostname.endsWith('.yahoo.com');
  const SCHEME = 'data-color-scheme';
  const THEME_ENABLED = 'data-color-theme-enabled';
  const LIGHT_SCHEMES = `[${SCHEME}="light"], [${SCHEME}="auto"]`;

  const localSheets = new WeakMap(); // sheet -> { ruleCount, css }
  const remoteSheets = new Map(); // href -> css, empty until its fetch returns
  const inlineOriginals = new WeakMap(); // element -> { property: { original, priority, mapped } }
  const schemeOriginals = new WeakMap(); // element -> its scheme attribute before we changed it

  let enabled = false;
  let observer = null;
  let refreshTimer = null;
  let cacheTimer = null;
  let pendingInline = new Set();
  let inlineFrame = null;

  function customPropertyRole(name) {
    if (/dark|immersive/i.test(name)) return null;
    if (/background|surface/i.test(name)) return 'background';
    if (/border|outline|divider/i.test(name)) return 'border';
    if (/text|foreground|label/i.test(name)) return 'text';
    return null;
  }

  function convertValue(name, value) {
    if (name === 'background-image') {
      if (value === 'none') return value;
      if (!value.includes('gradient(') || value.includes('url(')) return null;
    }
    return mapValue(value, ROLES[name]);
  }

  function convertStyle(style, selector) {
    const declarations = [];
    for (const name of style) {
      const value = style.getPropertyValue(name);
      if (!value) continue;
      let converted = null;
      if (name.startsWith('--')) {
        // A site's own dark theme blocks already hold dark values.
        const role = NATIVE_DARK || /dark/i.test(selector) || value.includes('url(') ? null : customPropertyRole(name);
        if (role) converted = mapValue(value, role);
      } else if (ROLES[name]) {
        // Unchanged values go in too: with every rule here !important, leaving one
        // out would let a less specific rule override it.
        converted = convertValue(name, value);
      }
      if (converted) declarations.push(`${name}:${converted}!important`);
    }
    for (const [name, role] of Object.entries(SHORTHANDS)) {
      const value = style.getPropertyValue(name);
      if (value.includes('var(') && !value.includes('url(')) {
        declarations.push(`${name}:${mapValue(value, role)}!important`);
      }
    }
    return declarations.join(';');
  }

  function convertRules(rules) {
    let css = '';
    for (const rule of rules) {
      if (rule.selectorText !== undefined) {
        const declarations = convertStyle(rule.style, rule.selectorText);
        if (declarations) css += `${rule.selectorText}{${declarations}}\n`;
      } else if (rule.conditionText !== undefined && rule.conditionText !== 'print') {
        const inner = convertRules(rule.cssRules);
        const atRule = rule.media ? '@media' : rule.containerQuery !== undefined ? '@container' : '@supports';
        if (inner) css += `${atRule} ${rule.conditionText}{\n${inner}}\n`;
      }
    }
    return css;
  }

  function convertText(cssText) {
    const scratch = document.implementation.createHTMLDocument('');
    const style = scratch.createElement('style');
    style.textContent = cssText;
    scratch.head.append(style);
    return convertRules(style.sheet.cssRules);
  }

  async function fetchRemoteSheet(href) {
    remoteSheets.set(href, '');
    const cssText = await chrome.runtime.sendMessage({ type: 'fetch-css', url: href });
    remoteSheets.set(href, cssText ? convertText(cssText) : '');
    scheduleRefresh();
  }

  function refreshStylesheet() {
    if (!enabled) return;
    let generated = '';
    for (const sheet of document.styleSheets) {
      if (sheet.ownerNode === styleEl) continue;
      let rules;
      try {
        rules = sheet.cssRules;
      } catch {
        if (!sheet.href) continue;
        if (!remoteSheets.has(sheet.href)) fetchRemoteSheet(sheet.href);
        generated += remoteSheets.get(sheet.href);
        continue;
      }
      // styled-jsx adds rules with insertRule, which no DOM observer can see, so
      // the rule count is how a changed sheet shows itself.
      let entry = localSheets.get(sheet);
      if (!entry || entry.ruleCount !== rules.length) {
        entry = { ruleCount: rules.length, css: convertRules(rules) };
        localSheets.set(sheet, entry);
      }
      generated += entry.css;
    }
    if (generated) writeStylesheet(generated);
    // Last in the document, so it wins ties against rules the page marks !important.
    if (document.readyState !== 'loading' && document.documentElement.lastElementChild !== styleEl) {
      document.documentElement.append(styleEl);
    }
  }

  function writeStylesheet(generated) {
    const css = generated + BASE_CSS;
    if (styleEl.textContent === css) return;
    styleEl.textContent = css;
    clearTimeout(cacheTimer);
    cacheTimer = setTimeout(() => chrome.storage.local.set({ [CACHE_KEY]: generated }), 3000);
  }

  function scheduleRefresh() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(refreshStylesheet, 150);
  }

  function applyInline(element) {
    const style = element.style;
    if (!style?.length) return;
    let record = inlineOriginals.get(element);
    for (const name of INLINE_PROPERTIES) {
      const value = style.getPropertyValue(name);
      if (!value || record?.[name]?.mapped === value) continue;
      const priority = style.getPropertyPriority(name);
      // !important because the generated stylesheet's rules are too.
      style.setProperty(name, mapValue(value, ROLES[name]), 'important');
      record ??= {};
      record[name] = { original: value, priority, mapped: style.getPropertyValue(name) };
      inlineOriginals.set(element, record);
    }
  }

  function restoreInline() {
    for (const element of document.querySelectorAll('[style]')) {
      const record = inlineOriginals.get(element);
      if (!record) continue;
      for (const [name, { original, priority, mapped }] of Object.entries(record)) {
        if (element.style.getPropertyValue(name) === mapped) {
          element.style.setProperty(name, original, priority);
        }
      }
      inlineOriginals.delete(element);
    }
  }

  function applyScheme(element) {
    schemeOriginals.set(element, element.getAttribute(SCHEME));
    element.setAttribute(SCHEME, 'dark');
  }

  function restoreSchemes() {
    document.documentElement.removeAttribute(THEME_ENABLED);
    for (const element of document.querySelectorAll(`[${SCHEME}="dark"]`)) {
      if (!schemeOriginals.has(element)) continue;
      const original = schemeOriginals.get(element);
      if (original === null) element.removeAttribute(SCHEME);
      else element.setAttribute(SCHEME, original);
      schemeOriginals.delete(element);
    }
  }

  function flushInline() {
    inlineFrame = null;
    const elements = pendingInline;
    pendingInline = new Set();
    for (const element of elements) {
      applyInline(element);
      for (const child of element.querySelectorAll('[style]')) applyInline(child);
      if (!NATIVE_DARK) continue;
      if (element.matches(LIGHT_SCHEMES)) applyScheme(element);
      for (const child of element.querySelectorAll(LIGHT_SCHEMES)) applyScheme(child);
    }
  }

  function onMutations(mutations) {
    for (const mutation of mutations) {
      if (mutation.type === 'attributes') pendingInline.add(mutation.target);
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) pendingInline.add(node);
      }
    }
    if (pendingInline.size && inlineFrame === null) inlineFrame = requestAnimationFrame(flushInline);
    scheduleRefresh();
  }

  function enable(cachedCss) {
    if (enabled) return;
    enabled = true;
    document.documentElement.removeAttribute(FLAG);
    // Last visit's result, so colors are right before the fresh pass finishes.
    if (cachedCss && !styleEl.textContent) styleEl.textContent = cachedCss + BASE_CSS;
    document.documentElement.append(styleEl);
    if (NATIVE_DARK) {
      document.documentElement.setAttribute(THEME_ENABLED, '');
      applyScheme(document.documentElement);
    }
    observer = new MutationObserver(onMutations);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', SCHEME],
    });
    pendingInline.add(document.documentElement);
    inlineFrame ??= requestAnimationFrame(flushInline);
    scheduleRefresh();
  }

  function disable() {
    if (!enabled) return;
    enabled = false;
    document.documentElement.setAttribute(FLAG, 'off');
    observer.disconnect();
    clearTimeout(refreshTimer);
    cancelAnimationFrame(inlineFrame);
    inlineFrame = null;
    pendingInline.clear();
    styleEl.remove();
    restoreInline();
    if (NATIVE_DARK) restoreSchemes();
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes.enabled) return;
    if (changes.enabled.newValue === false) disable();
    else enable();
  });

  chrome.storage.local.get(['enabled', CACHE_KEY]).then(({ enabled: wanted = true, [CACHE_KEY]: cachedCss }) => {
    if (wanted) enable(cachedCss);
    else document.documentElement.setAttribute(FLAG, 'off');
  });
})();
