/* =============================================================================
 * DOSYA ADI    : js/ui/map.js
 * NE İŞE YARAR : Leaflet + OpenStreetMap haritası: listedeki sırayla aynı numaralı,
 *                yoğunluğa göre renkli işaretçiler, hesaplamada kullanılan nokta,
 *                "Hepsini göster" ve kart ↔ işaretçi karşılıklı vurgulama.
 * NEYİ ALIR    : Row[] (js/calc.js), başlangıç noktası, app.js'ten olay işleyicileri.
 *                Veri GETİRMEZ.
 * NEYİ VERİR   : AcilRadar.ui.map → init, isAvailable, update, highlight,
 *                focusHospital, fitAll
 * NEYİ DEĞİŞTİRMEK İÇİN BURAYA BAK:
 *   - Karo adresi, yakınlaştırma düzeyleri: js/config.js › MAP
 *   - İşaretçi renkleri/boyutu: css/components.css › .map-marker
 *   - Açılır kutu (popup) içeriği: buildPopup()
 * NOT: Leaflet (CDN) yüklenemezse harita alanında nazik bir ileti çıkar; liste
 *      ve hesaplar haritadan bağımsız çalışmaya devam eder.
 * NOT (GİZLİLİK): Kullanıcının konumu yalnızca haritada nokta olarak çizilir;
 *      hiçbir isteğe eklenmez.
 * ========================================================================== */
(function (AR) {
  'use strict';

  const dom = AR.dom;
  const text = AR.text;
  const format = AR.format;
  const cfg = AR.config;
  const MARKER_SIZE_PX = 36;
  const ORIGIN_SIZE_PX = 22;
  const HIGHLIGHT_Z_OFFSET = 1000;

  let map = null;
  let markerLayer = null;
  let originMarker = null;
  let handlers = { onMarkerSelect: function () {}, onMarkerHover: function () {} };
  const markersById = new Map();

  function isAvailable() {
    return map !== null;
  }

  function showUnavailable(container) {
    dom.clear(container);
    container.classList.add('map--unavailable');
    container.appendChild(dom.el('p', { className: 'map__fallback' }, [dom.icon('info'), dom.el('span', { text: text('map.unavailable') })]));
  }

  /**
   * @param {HTMLElement} container
   * @param {{lat:number, lng:number}} center
   * @param {{onMarkerSelect:function(string), onMarkerHover:function(?string)}} h
   * @returns {boolean} harita kurulabildi mi
   */
  function init(container, center, h) {
    handlers = h;
    if (typeof window.L === 'undefined') {
      console.warn(text('dev.leafletMissing'));
      showUnavailable(container);
      return false;
    }
    map = window.L.map(container, { scrollWheelZoom: false, keyboard: true });
    window.L.tileLayer(cfg.MAP.TILE_URL, { maxZoom: cfg.MAP.MAX_ZOOM, attribution: text('map.attribution') }).addTo(map);
    map.setView([center.lat, center.lng], cfg.MAP.DEFAULT_ZOOM);
    markerLayer = window.L.layerGroup().addTo(map);
    return true;
  }

  /* ---- İşaretçiler ------------------------------------------------------- */

  function buildMarkerElement(rank, level) {
    return dom.el('span', { className: 'map-marker map-marker--' + level }, [
      dom.el('span', { className: 'map-marker__number', text: format.number(rank) })
    ]);
  }

  function buildPopup(row, rank) {
    const status = AR.ui.cards.statusOf(row);
    const goToCard = dom.el('button', { className: 'btn btn--secondary btn--small', attrs: { type: 'button' }, text: text('map.popupGoToCard') });
    goToCard.addEventListener('click', function () { handlers.onMarkerSelect(row.id, { focusCard: true }); });
    return dom.el('div', { className: 'map-popup' }, [
      dom.el('p', { className: 'map-popup__title', text: format.number(rank) + '. ' + row.hospital.name }),
      dom.el('p', { className: 'map-popup__line', text: status.label }),
      row.totalMinutes ? dom.el('p', { className: 'map-popup__line', text: text('map.popupTotal', { range: format.minutesRange(row.totalMinutes) }) }) : null,
      goToCard
    ]);
  }

  function addHospitalMarker(row, rank) {
    const status = AR.ui.cards.statusOf(row);
    const label = text('map.markerLabel', { rank: format.number(rank), name: row.hospital.name, status: status.label });
    const marker = window.L.marker([row.hospital.lat, row.hospital.lng], {
      icon: window.L.divIcon({
        className: 'map-marker-host',
        html: buildMarkerElement(rank, status.level),
        iconSize: [MARKER_SIZE_PX, MARKER_SIZE_PX],
        iconAnchor: [MARKER_SIZE_PX / 2, MARKER_SIZE_PX / 2],
        popupAnchor: [0, -MARKER_SIZE_PX / 2]
      }),
      title: label,
      keyboard: true,
      riseOnHover: true
    });
    marker.bindPopup(function () { return buildPopup(row, rank); });
    marker.on('click', function () { handlers.onMarkerSelect(row.id, { focusCard: false }); });
    marker.on('mouseover', function () { handlers.onMarkerHover(row.id); });
    marker.on('mouseout', function () { handlers.onMarkerHover(null); });
    marker.addTo(markerLayer);
    const element = marker.getElement();
    if (element) element.setAttribute('aria-label', label);
    markersById.set(row.id, marker);
  }

  function drawOrigin(origin) {
    const label = origin.source === 'device'
      ? text('map.originDevice')
      : text('map.originDistrict', { district: text('districts.' + origin.districtId) });
    originMarker = window.L.marker([origin.lat, origin.lng], {
      icon: window.L.divIcon({
        className: 'map-origin-host',
        html: dom.el('span', { className: 'map-origin' }),
        iconSize: [ORIGIN_SIZE_PX, ORIGIN_SIZE_PX],
        iconAnchor: [ORIGIN_SIZE_PX / 2, ORIGIN_SIZE_PX / 2]
      }),
      title: label,
      keyboard: false,
      interactive: true
    }).bindTooltip(label).addTo(markerLayer);
  }

  /**
   * İşaretçileri baştan çizer.
   * @param {Row[]} rows  Listede görünen sırayla
   * @param {{lat:number, lng:number, source:string, districtId:string}} origin
   * @param {{fit:boolean}} options  fit=true ise tüm noktalar ekrana sığdırılır
   */
  function update(rows, origin, options) {
    if (!map) return;
    markerLayer.clearLayers();
    markersById.clear();
    rows.forEach(function (row, index) { addHospitalMarker(row, index + 1); });
    drawOrigin(origin);
    if (options && options.fit) fitAll();
  }

  /* ---- Vurgulama ve odak ------------------------------------------------- */

  function highlight(id) {
    markersById.forEach(function (marker, markerId) {
      const element = marker.getElement();
      const active = markerId === id;
      if (element) element.classList.toggle('is-highlighted', active);
      marker.setZIndexOffset(active ? HIGHLIGHT_Z_OFFSET : 0);
    });
  }

  /** Bir hastaneye yakınlaşır, açılır kutusunu açar ve vurgular. */
  function focusHospital(id) {
    const marker = markersById.get(id);
    if (!map || !marker) return;
    map.setView(marker.getLatLng(), Math.max(map.getZoom(), cfg.MAP.FOCUS_ZOOM), { animate: !dom.prefersReducedMotion() });
    marker.openPopup();
    highlight(id);
  }

  /** Tüm hastaneleri ve başlangıç noktasını ekrana sığdırır. */
  function fitAll() {
    if (!map) return;
    const points = [];
    markersById.forEach(function (marker) { points.push(marker.getLatLng()); });
    if (originMarker) points.push(originMarker.getLatLng());
    if (points.length === 0) return;
    const padding = cfg.MAP.FIT_PADDING_PX;
    map.fitBounds(window.L.latLngBounds(points), {
      padding: [padding, padding],
      maxZoom: cfg.MAP.MAX_FIT_ZOOM,
      animate: !dom.prefersReducedMotion()
    });
  }

  /** Kapsayıcının boyu değiştiğinde (ör. yazı boyutu) haritayı yeniden ölçer. */
  function refreshSize() {
    if (map) map.invalidateSize();
  }

  AR.ui = AR.ui || {};
  AR.ui.map = Object.freeze({
    init: init,
    isAvailable: isAvailable,
    update: update,
    highlight: highlight,
    focusHospital: focusHospital,
    fitAll: fitAll,
    refreshSize: refreshSize
  });
})(window.AcilRadar = window.AcilRadar || {});
