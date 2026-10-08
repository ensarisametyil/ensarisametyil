/* =============================================================================
 * DOSYA ADI    : js/app.js
 * NE İŞE YARAR : Uygulamanın "beyni": durumu (state) tutar, olayları dinler,
 *                veriyi api.js'ten ister, calc.js ile hesaplatır ve ui/* dosyalarına
 *                çizdirir. Başlatma (init) buradadır.
 * NEYİ ALIR    : Diğer tüm modüller (config, strings, storage, api, calc, ui/*).
 * NEYİ VERİR   : AcilRadar.app → { init, state } (hata ayıklama için konsoldan erişilebilir)
 * NEYİ DEĞİŞTİRMEK İÇİN BURAYA BAK:
 *   - Akış: init() → load() → recompute() → render()
 *   - Yeni bir filtre eklemek: 4 yer değişir:
 *       1) aşağıdaki state.filters'a alanı ekleyin (+ clearFilters),
 *       2) js/calc.js › filterRows() ve hasActiveFilters(),
 *       3) js/ui/controls.js › bindEvents() ve sync(),
 *       4) index.html'e denetimi, js/strings.js'e etiketini ekleyin.
 * NOT: Akış tek yönlüdür: olay → state değişir → render(). Çizim dosyaları
 *      state'i değiştirmez, veri getirmez.
 * ========================================================================== */
(function (AR) {
  'use strict';

  const cfg = AR.config;
  const calc = AR.calc;
  const ui = AR.ui;
  const text = AR.text;
  const MS_PER_SECOND = 1000;
  const MAX_STAGGER_CARDS = 8;

  /* ---- 1. Durum (state) -------------------------------------------------- */

  const state = {
    prefs: null,                       // { textSize, theme, districtId } (storage.js)
    favorites: new Set(),              // favori hastane kimlikleri
    origin: null,                      // { lat, lng, source: 'district'|'device', districtId }
    timeSlot: cfg.DEFAULT_TIME_SLOT,
    filters: { query: '', childOnly: false, levels: new Set(), favoritesOnly: false },
    sortKey: cfg.DEFAULT_SORT,
    refreshSeconds: cfg.FEATURES.autoRefresh ? cfg.AUTO_REFRESH.DEFAULT_SECONDS : 0,
    response: null,                    // ApiResponse (api.js)
    error: null,                       // { message, detail }
    isLoading: false,
    rows: [],                          // Row[] (tümü)
    visibleRows: [],                   // Row[] (süzülmüş + sıralı)
    expandedIds: new Set(),            // ayrıntısı açık kartlar
    highlightedId: null,               // şu an vurgulanan (fare/odak ya da seçim)
    selectedId: null,                  // işaretçiye/"Haritada göster"e tıklanarak seçilen
    requestSeq: 0,                     // eski isteklerin yanıtını yok saymak için
    lastLoadAt: 0,
    staleSignature: ''
  };

  const timers = { refresh: null, tick: null };
  const els = {};

  /* ---- 2. Başlatma ------------------------------------------------------- */

  function cacheElements() {
    ['results-list', 'recommendation', 'results-message', 'error-region', 'results-status', 'map', 'map-fit', 'privacy-clear', 'footer-copyright']
      .forEach(function (id) { els[id] = document.getElementById(id); });
  }

  function applyDocumentStrings() {
    AR.dom.applyStaticStrings(document);
    AR.dom.hydrateIcons(document);
    document.title = text('app.documentTitle');
    const description = document.querySelector('meta[name="description"]');
    if (description) description.setAttribute('content', text('app.metaDescription'));
    els['footer-copyright'].textContent = text('footer.copyright', { year: new Date().getFullYear() });
    renderFormula();
  }

  /** "Süre nasıl hesaplanıyor?" metinlerini config'teki gerçek katsayılarla doldurur. */
  function renderFormula() {
    const t = cfg.TRAVEL;
    const fill = {
      'formula-travel': text('formula.travel', { roadFactor: AR.format.number(t.ROAD_FACTOR, 2), speed: AR.format.number(t.AVERAGE_SPEED_KMH), traffic: AR.format.number(t.TRAFFIC_FACTOR_MAX, 2), minTravel: AR.format.number(t.MIN_TRAVEL_MINUTES) }),
      'formula-registration': text('formula.registration', { min: cfg.REGISTRATION_MINUTES[0], max: cfg.REGISTRATION_MINUTES[1] }),
      'formula-stale': text('formula.stale', { minutes: AR.format.number(cfg.STALE_AFTER_MINUTES) })
    };
    Object.keys(fill).forEach(function (id) {
      const node = document.getElementById(id);
      if (node) node.textContent = fill[id];
    });
  }

  function districtById(id) {
    return cfg.DISTRICTS.find(function (district) { return district.id === id; }) || cfg.DISTRICTS[0];
  }

  function originFromDistrict(id) {
    const district = districtById(id);
    return { lat: district.lat, lng: district.lng, source: 'district', districtId: district.id };
  }

  function loadPreferences() {
    state.prefs = AR.storage.getPrefs();
    state.favorites = cfg.FEATURES.favorites ? AR.storage.getFavorites() : new Set();
    state.origin = originFromDistrict(state.prefs.districtId);
  }

  function init() {
    cacheElements();
    applyDocumentStrings();
    loadPreferences();
    ui.header.init(state.prefs, { onTextSize: handleTextSize, onTheme: handleTheme });
    ui.controls.init(cfg, controlHandlers);
    ui.controls.applyFeatures(cfg.FEATURES);
    ui.cards.bind([els['results-list'], els.recommendation], { onAction: handleCardAction, onHover: handleHover });
    ui.map.init(els.map, state.origin, { onMarkerSelect: handleMarkerSelect, onMarkerHover: handleHover });
    AR.dom.bindDisclosures(document);
    bindGlobalEvents();
    syncControls();
    updateLocationStatus();
    updateOnlineState();
    load({ userInitiated: false });
    timers.tick = setInterval(handleClockTick, cfg.CLOCK_TICK_SECONDS * MS_PER_SECOND);
  }

  /* ---- 3. Veri yükleme ve otomatik yenileme ----------------------------- */

  /**
   * Veriyi getirir. İlk yüklemede iskelet gösterir; sonrakilerde eski liste
   * yerinde kalır ve yalnızca "Güncelleniyor…" görünür.
   * @param {{userInitiated:boolean}} options
   */
  async function load(options) {
    const seq = ++state.requestSeq;
    const firstLoad = !state.response;
    state.isLoading = true;
    clearTimeout(timers.refresh);
    if (firstLoad) showLoading(); else ui.summary.setRefreshing(true);
    try {
      const response = await AR.api.fetchHospitals(state.timeSlot);
      if (seq !== state.requestSeq) return;          // daha yeni bir istek başladı
      state.response = response;
      state.error = null;
      state.lastLoadAt = Date.now();
    } catch (error) {
      if (seq !== state.requestSeq) return;
      state.error = { message: error.message || text('error.network'), detail: error.detail || '' };
    }
    state.isLoading = false;
    ui.summary.setRefreshing(false);
    recompute();
    render({ animate: firstLoad, fitMap: firstLoad, announce: options.userInitiated || firstLoad });
    scheduleRefresh();
  }

  function showLoading() {
    ui.states.setBusy(els['results-list'], true);
    ui.states.showSkeleton(els['results-list'], cfg.SKELETON_CARD_COUNT);
    els['results-message'].hidden = true;
    ui.summary.render(null);
    ui.states.announce(text('a11y.loading'));
  }

  function scheduleRefresh() {
    clearTimeout(timers.refresh);
    if (!cfg.FEATURES.autoRefresh || state.refreshSeconds <= 0) return;
    if (document.hidden || !navigator.onLine) return;   // gizli sekmede/çevrimdışıyken durur
    timers.refresh = setTimeout(function () { load({ userInitiated: false }); }, state.refreshSeconds * MS_PER_SECOND);
  }

  /** Sekme yeniden görünür olunca: süre dolduysa hemen yenile, yoksa kalan süreyi bekle. */
  function handleVisibilityChange() {
    if (document.hidden) {
      clearTimeout(timers.refresh);
      return;
    }
    const due = state.refreshSeconds > 0 && Date.now() - state.lastLoadAt >= state.refreshSeconds * MS_PER_SECOND;
    if (due && cfg.FEATURES.autoRefresh && !state.isLoading) load({ userInitiated: false });
    else scheduleRefresh();
  }

  /** Her CLOCK_TICK_SECONDS'ta: "5 dakika önce" yazılarını ve veri eskimesini yenile. */
  function handleClockTick() {
    ui.summary.renderLastUpdated(lastUpdatedMs(), Date.now());
    if (!state.response) return;
    const previous = state.staleSignature;
    recompute();
    if (state.staleSignature !== previous) render({ animate: false, fitMap: false, announce: false });
  }

  /* ---- 4. Hesap ---------------------------------------------------------- */

  function recompute() {
    const hospitals = state.response ? state.response.hospitals : [];
    state.rows = calc.buildRows(hospitals, state.origin, Date.now(), cfg);
    state.visibleRows = calc.sortRows(calc.filterRows(state.rows, state.filters, state.favorites), state.sortKey);
    state.staleSignature = state.rows.filter(function (row) { return row.isStale; }).map(function (row) { return row.id; }).join('|');
  }

  function lastUpdatedMs() {
    if (!state.response) return 0;
    return state.response.generatedAt ? Date.parse(state.response.generatedAt) : state.response.receivedAt;
  }

  /* ---- 5. Çizim ---------------------------------------------------------- */

  function cardContext(animate) {
    return {
      favorites: state.favorites,
      expandedIds: state.expandedIds,
      features: cfg.FEATURES,
      nowMs: Date.now(),
      highlightedId: state.highlightedId,
      directionsTemplate: cfg.DIRECTIONS_URL_TEMPLATE,
      registrationMinutes: cfg.REGISTRATION_MINUTES,
      mapAvailable: ui.map.isAvailable(),
      animate: animate,
      maxStagger: MAX_STAGGER_CARDS
    };
  }

  /**
   * Tüm sonuç alanını durumdan yeniden çizer. Odaktaki düğme korunur.
   * @param {{animate:boolean, fitMap:boolean, announce:boolean}} options
   */
  function render(options) {
    const focusKey = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.focusKey : null;
    ui.states.setBanner('simulation', Boolean(state.response && state.response.isSimulated));
    ui.states.setBusy(els['results-list'], false);
    renderErrorRegion();
    if (!state.response) {
      AR.dom.clear(els['results-list']);
      AR.dom.clear(els.recommendation);
      els.recommendation.hidden = true;
      return;
    }
    ui.summary.render(calc.summarize(state.rows));
    ui.summary.renderLastUpdated(lastUpdatedMs(), Date.now());
    renderResults(options);
    syncControls();
    restoreFocus(focusKey);
    if (options.announce) ui.states.announce(resultStatusText());
  }

  function renderErrorRegion() {
    if (state.error) ui.states.renderError(els['error-region'], state.error, Boolean(state.response), handleRetry);
    else ui.states.clearError(els['error-region']);
  }

  function renderResults(options) {
    const ctx = cardContext(options.animate);
    const rows = state.visibleRows;
    renderEmptyState();
    ui.cards.renderList(els['results-list'], rows, ctx);
    const recommended = calc.pickRecommendation(rows);
    els.recommendation.hidden = rows.length === 0;
    ui.cards.renderRecommendation(els.recommendation, recommended, rows.indexOf(recommended) + 1, ctx);
    ui.map.update(rows, state.origin, { fit: options.fitMap });
    ui.map.highlight(state.highlightedId);
    els['results-status'].textContent = resultStatusText();
  }

  function renderEmptyState() {
    const message = els['results-message'];
    if (state.visibleRows.length > 0) {
      message.hidden = true;
      return;
    }
    message.hidden = false;
    if (state.rows.length === 0) ui.states.renderEmpty(message, 'noData', null);
    else ui.states.renderEmpty(message, 'noMatch', calc.hasActiveFilters(state.filters) ? handleClearFilters : null);
  }

  function resultStatusText() {
    if (state.visibleRows.length === 0) return text('status.resultCountZero');
    return text('status.resultCount', { count: AR.format.number(state.visibleRows.length), sort: text('sort.' + state.sortKey) });
  }

  /** Yeniden çizimden sonra klavye odağını aynı düğmeye geri verir. */
  function restoreFocus(focusKey) {
    if (!focusKey || (document.activeElement && document.activeElement !== document.body)) return;
    const target = document.querySelector('[data-focus-key="' + CSS.escape(focusKey) + '"]');
    if (target) target.focus({ preventScroll: true });
  }

  function syncControls() {
    ui.controls.sync({
      districtId: state.prefs.districtId,
      originSource: state.origin.source,
      timeSlot: state.timeSlot,
      sortKey: state.sortKey,
      refreshSeconds: state.refreshSeconds,
      filters: state.filters,
      hasActiveFilters: calc.hasActiveFilters(state.filters)
    });
  }

  /** Yalnızca filtre/sıralama/konum değiştiğinde: veri yeniden getirilmez. */
  function rerender(fitMap) {
    recompute();
    render({ animate: false, fitMap: Boolean(fitMap), announce: true });
  }

  /* ---- 6. Olay işleyicileri: görünüm ------------------------------------ */

  function handleTextSize(size) {
    state.prefs.textSize = size;
    AR.storage.savePrefs({ textSize: size });
    ui.header.setTextSize(size);
    ui.map.refreshSize();
  }

  function handleTheme(theme) {
    state.prefs.theme = theme;
    AR.storage.savePrefs({ theme: theme });
    ui.header.setTheme(theme);
  }

  /* ---- 7. Olay işleyicileri: seçimler ----------------------------------- */

  function handleDistrict(id) {
    state.prefs.districtId = districtById(id).id;
    state.origin = originFromDistrict(state.prefs.districtId);
    AR.storage.savePrefs({ districtId: state.prefs.districtId });
    updateLocationStatus();
    rerender(true);
  }

  function updateLocationStatus() {
    if (state.origin.source === 'device') ui.controls.setLocationStatus(text('controls.locationDevice'), 'info');
    else ui.controls.setLocationStatus(text('controls.locationDistrict', { district: text('districts.' + state.origin.districtId) }), 'info');
  }

  const GEO_ERROR_KEYS = { 1: 'controls.locationDenied', 2: 'controls.locationUnavailable', 3: 'controls.locationTimeout' };

  /** "Konumumu kullan": konum YALNIZCA bellekte tutulur; saklanmaz, gönderilmez. */
  function handleUseLocation() {
    if (!('geolocation' in navigator)) {
      ui.controls.setLocationStatus(text('controls.locationUnsupported'), 'warning');
      return;
    }
    ui.controls.setLocating(true);
    ui.controls.setLocationStatus(text('controls.locationLocating'), 'info');
    navigator.geolocation.getCurrentPosition(function (position) {
      ui.controls.setLocating(false);
      state.origin = { lat: position.coords.latitude, lng: position.coords.longitude, source: 'device', districtId: state.prefs.districtId };
      ui.controls.addDeviceOption();
      updateLocationStatus();
      rerender(true);
    }, function (error) {
      ui.controls.setLocating(false);
      ui.controls.setLocationStatus(text(GEO_ERROR_KEYS[error.code] || 'controls.locationUnavailable'), 'warning');
    }, { enableHighAccuracy: cfg.GEOLOCATION.HIGH_ACCURACY, timeout: cfg.GEOLOCATION.TIMEOUT_MS, maximumAge: cfg.GEOLOCATION.MAX_AGE_MS });
  }

  function handleTimeSlot(slot) {
    if (slot === state.timeSlot) return;
    state.timeSlot = slot;
    syncControls();
    load({ userInitiated: true });
  }

  function handleSearch(query) {
    state.filters.query = query;
    rerender(false);
  }

  function toggleFilter(name) {
    state.filters[name] = !state.filters[name];
    rerender(false);
  }

  function handleToggleLevel(level) {
    if (state.filters.levels.has(level)) state.filters.levels.delete(level);
    else state.filters.levels.add(level);
    rerender(false);
  }

  function handleClearFilters() {
    state.filters = { query: '', childOnly: false, levels: new Set(), favoritesOnly: false };
    rerender(false);
    document.getElementById('search-input').focus();
  }

  function handleSort(key) {
    state.sortKey = cfg.SORT_KEYS.indexOf(key) !== -1 ? key : cfg.DEFAULT_SORT;
    rerender(false);
  }

  function handleRefreshInterval(seconds) {
    state.refreshSeconds = cfg.AUTO_REFRESH.OPTIONS_SECONDS.indexOf(seconds) !== -1 ? seconds : 0;
    scheduleRefresh();
  }

  function handleRetry() {
    load({ userInitiated: true });
  }

  const controlHandlers = {
    onDistrict: handleDistrict,
    onUseLocation: handleUseLocation,
    onTimeSlot: handleTimeSlot,
    onSearch: handleSearch,
    onToggleChild: function () { toggleFilter('childOnly'); },
    onToggleFavorites: function () { toggleFilter('favoritesOnly'); },
    onToggleLevel: handleToggleLevel,
    onClearFilters: handleClearFilters,
    onSort: handleSort,
    onRefreshInterval: handleRefreshInterval,
    onRefreshNow: handleRetry
  };

  /* ---- 8. Olay işleyicileri: kartlar ve harita -------------------------- */

  function rowById(id) {
    return state.rows.find(function (row) { return row.id === id; }) || null;
  }

  function handleCardAction(action, id, button) {
    const row = rowById(id);
    if (!row) return;
    if (action === 'favorite') toggleFavorite(row);
    else if (action === 'toggle-details') toggleDetails(row, button);
    else if (action === 'show-on-map') showOnMap(row);
    else if (action === 'share') shareRow(row);
  }

  function toggleFavorite(row) {
    const adding = !state.favorites.has(row.id);
    if (adding) state.favorites.add(row.id); else state.favorites.delete(row.id);
    AR.storage.saveFavorites(state.favorites);
    ui.states.toast(text(adding ? 'favorite.added' : 'favorite.removed', { name: row.hospital.name }));
    recompute();
    render({ animate: false, fitMap: false, announce: false });
  }

  /** Ayrıntıları yeniden çizmeden aç/kapa (odak ve kaydırma yerinde kalsın). */
  function toggleDetails(row, button) {
    const expanded = !state.expandedIds.has(row.id);
    if (expanded) state.expandedIds.add(row.id); else state.expandedIds.delete(row.id);
    AR.dom.setExpanded(button, expanded);
  }

  function showOnMap(row) {
    state.selectedId = row.id;
    state.highlightedId = row.id;
    ui.cards.setHighlight(els['results-list'], row.id);
    els.map.scrollIntoView({ behavior: AR.dom.prefersReducedMotion() ? 'auto' : 'smooth', block: 'nearest' });
    ui.map.focusHospital(row.id);
  }

  /** Fare/odak bir karttan ya da işaretçiden ayrılınca seçili hastaneye geri dönülür. */
  function handleHover(id) {
    const target = id || state.selectedId;
    if (target === state.highlightedId) return;
    state.highlightedId = target;
    ui.cards.setHighlight(els['results-list'], target);
    ui.map.highlight(target);
  }

  /** İşaretçiye tıklanınca ilgili kartı vurgula ve görünür yap. */
  function handleMarkerSelect(id, options) {
    state.selectedId = id;
    state.highlightedId = id;
    ui.map.highlight(id);
    const card = ui.cards.setHighlight(els['results-list'], id);
    if (!card) return;
    card.scrollIntoView({ behavior: AR.dom.prefersReducedMotion() ? 'auto' : 'smooth', block: 'nearest' });
    if (options && options.focusCard) card.focus({ preventScroll: true });
  }

  /** Web Share API; yoksa panoya kopyala. Konum paylaşılmaz. */
  async function shareRow(row) {
    const h = row.hospital;
    const message = row.totalMinutes
      ? text('share.text', { name: h.name, district: h.district, range: AR.format.minutesRange(row.totalMinutes) })
      : text('share.textStale', { name: h.name, district: h.district });
    const url = calc.buildDirectionsUrl(cfg.DIRECTIONS_URL_TEMPLATE, h.lat, h.lng);
    if (navigator.share) {
      try {
        await navigator.share({ title: text('share.title', { name: h.name }), text: message, url: url });
        return;
      } catch (error) {
        if (error && error.name === 'AbortError') return;     // kullanıcı vazgeçti
      }
    }
    await copyToClipboard(message + ' ' + url);
  }

  async function copyToClipboard(value) {
    try {
      await navigator.clipboard.writeText(value);
      ui.states.toast(text('share.copied'));
    } catch (error) {
      ui.states.toast(text('share.failed'));
    }
  }

  /* ---- 9. Genel olaylar -------------------------------------------------- */

  function updateOnlineState() {
    ui.states.setBanner('offline', !navigator.onLine);
  }

  function handleOnline() {
    updateOnlineState();
    load({ userInitiated: false });
  }

  function handleOffline() {
    updateOnlineState();
    clearTimeout(timers.refresh);
  }

  function handlePrivacyClear() {
    AR.storage.clearAll();
    state.favorites = new Set();
    ui.states.toast(text('privacy.cleared'));
    recompute();
    render({ animate: false, fitMap: false, announce: false });
  }

  function bindGlobalEvents() {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    els['map-fit'].addEventListener('click', function () { ui.map.fitAll(); });
    els['map-fit'].hidden = !ui.map.isAvailable();
    els['privacy-clear'].addEventListener('click', handlePrivacyClear);
  }

  AR.app = Object.freeze({ init: init, state: state });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.AcilRadar = window.AcilRadar || {});
