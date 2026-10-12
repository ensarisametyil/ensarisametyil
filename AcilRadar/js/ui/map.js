/* =============================================================================
 * js/ui/map.js
 * NE İŞE YARAR : Leaflet + OpenStreetMap haritası. Harita alanı görünür olunca ve
 *                tarayıcı boştayken yüklenir (ilk açılışı yavaşlatmaz). Numaralı,
 *                durum renkli işaretçiler; başlangıç noktası; "Hepsini göster";
 *                kart ↔ işaretçi vurgusu; mobilde daraltılabilir.
 * VERDİĞİ      : AcilRadar.UI.map → init, update, highlight, focusHospital, fitAll,
 *                refreshSize, isAvailable
 * NEYİ DEĞİŞTİRMEK İÇİN BURAYA BAK:
 *   - Leaflet dosya yolları, karo adresi, yakınlaştırma: config.js › MAP
 *   - İşaretçi görünümü: css/components.css › .marker
 * NOT: Leaflet yüklenemezse (ağ, engelleyici) harita yerine bilgi kutusu çıkar;
 *      liste ve hesaplar haritadan bağımsız çalışır.
 * NOT: İşaretçiler klavye sekme sırasına alınmaz (200 hastanede 200 durak olurdu);
 *      klavye kullanıcısı karttaki "Haritada göster" düğmesini kullanır.
 * ========================================================================== */
(function (AR) {
  'use strict';

  const dom = AR.UI.dom;
  const t = AR.Strings.text;
  const format = AR.Strings.format;
  const cfg = AR.Config;
  const M = cfg.MAP;
  const MARKER_PX = 36;
  const ORIGIN_PX = 22;
  const HIGHLIGHT_Z = 1000;

  const view = {
    status: 'idle',           // idle | loading | ready | failed
    map: null,
    layer: null,
    markers: new Map(),
    origin: null,
    pending: null,            // { rows, origin, fit } — harita hazır olunca çizilir
    pendingFocusId: null,
    container: null,
    handlers: null
  };

  function isAvailable() {
    return view.status !== 'failed';
  }

  /* ---- Yükleme ------------------------------------------------------------ */

  function showUnavailable() {
    view.status = 'failed';
    dom.clear(view.container);
    view.container.classList.add('map--unavailable');
    view.container.appendChild(dom.el('div', { className: 'state state--neutral' }, [
      dom.el('span', { className: 'state__icon' }, [dom.icon('map')]),
      dom.el('div', { className: 'state__content' }, [dom.el('p', { className: 'state__body', text: t('map.unavailable') })])
    ]));
    document.getElementById('map-fit').hidden = true;
    console.warn(t('dev.prefix') + ' ' + t('dev.leafletFailed'));
    view.handlers.onAvailabilityChange();
  }

  function loadLeaflet() {
    return new Promise(function (resolve, reject) {
      if (window.L) { resolve(); return; }
      const style = dom.el('link', { attrs: { rel: 'stylesheet', href: M.LEAFLET_STYLE } });
      const script = dom.el('script', { attrs: { src: M.LEAFLET_SCRIPT } });
      const timer = setTimeout(function () { reject(new Error('timeout')); }, M.LOAD_TIMEOUT_MS);
      script.addEventListener('load', function () { clearTimeout(timer); if (window.L) resolve(); else reject(new Error('no-L')); });
      script.addEventListener('error', function () { clearTimeout(timer); reject(new Error('error')); });
      document.head.appendChild(style);
      document.head.appendChild(script);
    });
  }

  function createMap(center) {
    dom.clear(view.container);
    view.map = window.L.map(view.container, { scrollWheelZoom: false, keyboard: true });
    window.L.tileLayer(M.TILE_URL, { maxZoom: M.MAX_ZOOM, attribution: t('map.attribution') }).addTo(view.map);
    view.map.setView([center.lat, center.lng], M.DEFAULT_ZOOM);
    view.layer = window.L.layerGroup().addTo(view.map);
    view.status = 'ready';
    if (view.pending) {
      draw(view.pending);
      view.pending.fit = false;
    }
    if (view.pendingFocusId) focusHospital(view.pendingFocusId);
  }

  function start(center) {
    if (view.status !== 'idle') return;
    view.status = 'loading';
    loadLeaflet().then(function () { createMap(center); }).catch(showUnavailable);
  }

  /** Görünür olunca + tarayıcı boştayken başlat. */
  function whenVisibleAndIdle(callback) {
    const idle = function () {
      if (window.requestIdleCallback) window.requestIdleCallback(callback, { timeout: M.IDLE_TIMEOUT_MS });
      else setTimeout(callback, 0);
    };
    if (!('IntersectionObserver' in window)) { idle(); return; }
    const observer = new IntersectionObserver(function (entries) {
      if (entries.some(function (entry) { return entry.isIntersecting; })) {
        observer.disconnect();
        idle();
      }
    }, { rootMargin: M.VISIBLE_MARGIN });
    observer.observe(view.container);
  }

  /** Mobilde harita daraltılabilir (≥900 px'te düğme gizlidir, harita hep açıktır). */
  function setExpanded(expanded) {
    const toggle = document.getElementById('map-toggle');
    toggle.setAttribute('aria-expanded', String(expanded));
    toggle.querySelector('[data-role="label"]').textContent = t(expanded ? 'map.hide' : 'map.show');
    document.getElementById('map-panel').classList.toggle('is-collapsed', !expanded);
    if (expanded) refreshSize();
  }

  function bindToggle() {
    const toggle = document.getElementById('map-toggle');
    toggle.addEventListener('click', function () {
      setExpanded(toggle.getAttribute('aria-expanded') !== 'true');
    });
  }

  /**
   * @param {HTMLElement} container
   * @param {{lat:number, lng:number}} center
   * @param {{onSelect:function(string, boolean), onHover:function(?string), onAvailabilityChange:function()}} handlers
   */
  function init(container, center, handlers) {
    view.container = container;
    view.handlers = handlers;
    bindToggle();
    document.getElementById('map-fit').addEventListener('click', fitAll);
    whenVisibleAndIdle(function () { start(center); });
  }

  /* ---- Çizim -------------------------------------------------------------- */

  function popupContent(row, rank) {
    const status = AR.UI.cards.statusOf(row);
    const goToCard = dom.el('button', { className: 'btn btn--secondary btn--compact', attrs: { type: 'button' }, text: t('map.popupGoToCard') });
    goToCard.addEventListener('click', function () { view.handlers.onSelect(row.id, true); });
    return dom.el('div', { className: 'popup' }, [
      dom.el('p', { className: 'popup__title', text: format.number(rank) + '. ' + row.hospital.name }),
      dom.el('p', { text: status.label }),
      row.totalMinutes ? dom.el('p', { text: t('map.popupTotal', { range: format.minutesRange(row.totalMinutes) }) }) : null,
      goToCard
    ]);
  }

  function addMarker(row, rank) {
    const status = AR.UI.cards.statusOf(row);
    const label = t('map.markerLabel', { rank: format.number(rank), name: row.hospital.name, status: status.label });
    const marker = window.L.marker([row.hospital.lat, row.hospital.lng], {
      icon: window.L.divIcon({
        className: 'marker-host',
        html: dom.el('span', { className: 'marker marker--' + status.level, text: format.number(rank) }),
        iconSize: [MARKER_PX, MARKER_PX],
        iconAnchor: [MARKER_PX / 2, MARKER_PX / 2],
        popupAnchor: [0, -MARKER_PX / 2]
      }),
      title: label,
      keyboard: false,
      riseOnHover: true
    });
    marker.bindPopup(function () { return popupContent(row, rank); });
    marker.on('click', function () { view.handlers.onSelect(row.id, false); });
    marker.on('mouseover', function () { view.handlers.onHover(row.id); });
    marker.on('mouseout', function () { view.handlers.onHover(null); });
    marker.addTo(view.layer);
    view.markers.set(row.id, marker);
  }

  function addOrigin(origin) {
    const label = origin.source === 'device' ? t('map.originDevice') : t('map.originDistrict', { district: t('districts.' + origin.districtId) });
    view.origin = window.L.marker([origin.lat, origin.lng], {
      icon: window.L.divIcon({ className: 'marker-host', html: dom.el('span', { className: 'origin' }), iconSize: [ORIGIN_PX, ORIGIN_PX], iconAnchor: [ORIGIN_PX / 2, ORIGIN_PX / 2] }),
      title: label,
      keyboard: false
    }).bindTooltip(label).addTo(view.layer);
  }

  function draw(job) {
    view.layer.clearLayers();
    view.markers.clear();
    job.rows.forEach(function (row, index) { addMarker(row, index + 1); });
    addOrigin(job.origin);
    if (job.fit) fitAll();
  }

  /**
   * İşaretçileri listedeki sırayla çizer (harita henüz yüklenmediyse bekletir).
   * @param {Row[]} rows
   * @param {{lat:number, lng:number, source:string, districtId:string}} origin
   * @param {{fit:boolean}} options
   */
  function update(rows, origin, options) {
    // Harita henüz hazır değilse "sığdır" isteği ilk çizime kadar korunur.
    const carriedFit = view.pending ? view.pending.fit : false;
    view.pending = { rows: rows, origin: origin, fit: Boolean(options.fit) || carriedFit };
    if (view.status === 'ready') {
      draw(view.pending);
      view.pending.fit = false;
    }
  }

  /* ---- Vurgu ve odak ------------------------------------------------------ */

  function highlight(id) {
    view.markers.forEach(function (marker, markerId) {
      const element = marker.getElement();
      const active = markerId === id;
      if (element) element.classList.toggle('is-highlighted', active);
      marker.setZIndexOffset(active ? HIGHLIGHT_Z : 0);
    });
  }

  function focusHospital(id) {
    setExpanded(true);
    if (view.status !== 'ready') {
      view.pendingFocusId = id;
      if (view.status === 'idle') start(view.pending ? view.pending.origin : cfg.DISTRICTS[0]);
      return;
    }
    view.pendingFocusId = null;
    const marker = view.markers.get(id);
    if (!marker) return;
    view.map.setView(marker.getLatLng(), Math.max(view.map.getZoom(), M.FOCUS_ZOOM), { animate: !dom.prefersReducedMotion() });
    marker.openPopup();
    highlight(id);
  }

  function fitAll() {
    if (view.status !== 'ready') return;
    const points = [];
    view.markers.forEach(function (marker) { points.push(marker.getLatLng()); });
    if (view.origin) points.push(view.origin.getLatLng());
    if (points.length === 0) return;
    view.map.fitBounds(window.L.latLngBounds(points), {
      padding: [M.FIT_PADDING_PX, M.FIT_PADDING_PX],
      maxZoom: M.MAX_FIT_ZOOM,
      animate: !dom.prefersReducedMotion()
    });
  }

  function refreshSize() {
    if (view.status === 'ready') view.map.invalidateSize();
  }

  AR.UI = AR.UI || {};
  AR.UI.map = Object.freeze({
    init: init,
    update: update,
    highlight: highlight,
    focusHospital: focusHospital,
    fitAll: fitAll,
    refreshSize: refreshSize,
    isAvailable: isAvailable
  });
})(window.AcilRadar = window.AcilRadar || {});
