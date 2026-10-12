/* =============================================================================
 * js/ui/dom.js
 * NE İŞE YARAR : Çizim dosyalarının ortak küçük yardımcıları: öğe oluşturma,
 *                SVG simgeler, sabit metinleri index.html'e yerleştirme,
 *                aç/kapa (disclosure) düğmeleri.
 * VERDİĞİ      : AcilRadar.UI.dom
 * NEYİ DEĞİŞTİRMEK İÇİN BURAYA BAK:
 *   - Yeni simge: ICONS'a 24×24, 2 px çizgili yol ekleyin. HTML'de
 *     <span data-icon="ad"></span>, JS'te dom.icon('ad').
 * NOT (GÜVENLİK): Metinler her zaman textContent ile yazılır; bu dosya ve diğer
 *      çizim dosyaları innerHTML KULLANMAZ. Sunucu metni HTML olarak yorumlanamaz.
 * ========================================================================== */
(function (AR) {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const t = AR.Strings.text;

  // Tek simge seti: 24×24 görünüm kutusu, 2 px çizgi, yuvarlak uçlar.
  const ICONS = {
    phone: 'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z',
    alert: 'M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01',
    chevron: 'M6 9l6 6 6-6',
    pin: 'M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
    locate: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v3M12 19v3M2 12h3M19 12h3',
    clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
    car: 'M5 17H3v-5l2-5h14l2 5v5h-2M5 12h14M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM9 17h6',
    hourglass: 'M6 2h12M6 22h12M7 2v4a5 5 0 0 0 10 0V2M7 22v-4a5 5 0 0 1 10 0v4',
    doctor: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
    child: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM8.5 14.5s1.3 1.5 3.5 1.5 3.5-1.5 3.5-1.5M9 9.5h.01M15 9.5h.01',
    info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16v-4M12 8h.01',
    directions: 'M3 11l19-9-9 19-2-8-8-2z',
    search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
    refresh: 'M21 12a9 9 0 1 1-2.6-6.4M21 3v6h-6',
    expand: 'M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7',
    map: 'M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14',
    check: 'M22 11.1V12a10 10 0 1 1-5.9-9.1M22 4L12 14l-3-3',
    medium: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM8 12h8',
    offline: 'M2 2l20 20M8.5 16.5a5 5 0 0 1 7 0M5 12.9a10 10 0 0 1 5.2-2.7M19 12.9a10 10 0 0 0-2.4-1.6M12 20h.01',
    shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
    calculator: 'M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM8 6h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 19h.01M12 19h4',
    database: 'M12 8c4.4 0 8-1.3 8-3s-3.6-3-8-3-8 1.3-8 3 3.6 3 8 3zM4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
    list: 'M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01',
    star: 'M12 2.8l2.8 5.8 6.4.9-4.6 4.5 1.1 6.3L12 17.3l-5.7 3 1.1-6.3-4.6-4.5 6.4-.9z'
  };

  /** Dış kaynaklı kimliği id özniteliğinde güvenle kullanılır hale getirir. */
  function safeDomId(prefix, rawId) {
    return prefix + String(rawId).replace(/[^A-Za-z0-9_-]/g, '_');
  }

  function append(parent, children) {
    (Array.isArray(children) ? children : [children]).forEach(function (child) {
      if (child == null || child === false) return;
      parent.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    });
    return parent;
  }

  /**
   * Öğe oluşturur. Metin her zaman textContent ile yazılır.
   * @param {string} tag
   * @param {{className?:string, text?:*, attrs?:Object, data?:Object, style?:Object}} [options]
   * @param {(Node|string|Array)} [children]
   */
  function el(tag, options, children) {
    const node = document.createElement(tag);
    const opts = options || {};
    if (opts.className) node.className = opts.className;
    if (opts.text != null) node.textContent = String(opts.text);
    Object.keys(opts.attrs || {}).forEach(function (name) {
      const value = opts.attrs[name];
      if (value === false || value == null) return;
      node.setAttribute(name, value === true ? '' : String(value));
    });
    Object.keys(opts.data || {}).forEach(function (name) { node.dataset[name] = String(opts.data[name]); });
    // NOT: style özniteliği değil CSSOM kullanılır; CSP (style-src 'self') ile uyumludur.
    Object.keys(opts.style || {}).forEach(function (name) { node.style.setProperty(name, String(opts.style[name])); });
    if (children != null) append(node, children);
    return node;
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  /** Süs simgesi (ekran okuyuculardan gizli). */
  function icon(name, className) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.setAttribute('class', 'icon' + (className ? ' ' + className : ''));
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', ICONS[name] || ICONS.info);
    svg.appendChild(path);
    return svg;
  }

  /**
   * index.html'deki sabit metinleri strings.js'ten doldurur:
   *   data-text="anahtar"                  → içerik
   *   data-text-attr="aria-label:anahtar"  → öznitelik (birden çoksa ; ile)
   *   data-text-list="anahtar"             → <ul>/<ol> içine <li>'ler
   */
  function applyStaticStrings(root) {
    root.querySelectorAll('[data-text]').forEach(function (node) {
      node.textContent = t(node.dataset.text);
    });
    root.querySelectorAll('[data-text-attr]').forEach(function (node) {
      node.dataset.textAttr.split(';').forEach(function (pair) {
        const parts = pair.split(':').map(function (part) { return part.trim(); });
        if (parts[0] && parts[1]) node.setAttribute(parts[0], t(parts[1]));
      });
    });
    root.querySelectorAll('[data-text-list]').forEach(function (node) {
      clear(node);
      AR.Strings.list(node.dataset.textList).forEach(function (item) { node.appendChild(el('li', { text: item })); });
    });
  }

  /** <span data-icon="ad"> yer tutucularını SVG ile değiştirir. */
  function hydrateIcons(root) {
    root.querySelectorAll('[data-icon]').forEach(function (placeholder) {
      placeholder.replaceWith(icon(placeholder.dataset.icon, placeholder.className));
    });
  }

  /** aria-expanded ve hedef bölgenin görünürlüğü birlikte güncellenir. */
  function setExpanded(button, expanded) {
    button.setAttribute('aria-expanded', String(expanded));
    const target = document.getElementById(button.getAttribute('aria-controls'));
    if (target) target.hidden = !expanded;
  }

  /** data-disclosure taşıyan sabit aç/kapa düğmelerini bağlar. */
  function bindDisclosures(root) {
    root.querySelectorAll('button[data-disclosure][aria-controls]').forEach(function (button) {
      setExpanded(button, button.getAttribute('aria-expanded') === 'true');
      button.addEventListener('click', function () {
        setExpanded(button, button.getAttribute('aria-expanded') !== 'true');
      });
    });
  }

  function prefersReducedMotion() {
    return Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  /** Kaydırma: hareket azaltıldıysa anında. */
  function scrollBehavior() {
    return prefersReducedMotion() ? 'auto' : 'smooth';
  }

  AR.UI = AR.UI || {};
  AR.UI.dom = Object.freeze({
    el: el,
    append: append,
    clear: clear,
    icon: icon,
    safeDomId: safeDomId,
    applyStaticStrings: applyStaticStrings,
    hydrateIcons: hydrateIcons,
    setExpanded: setExpanded,
    bindDisclosures: bindDisclosures,
    prefersReducedMotion: prefersReducedMotion,
    scrollBehavior: scrollBehavior
  });
})(window.AcilRadar = window.AcilRadar || {});
