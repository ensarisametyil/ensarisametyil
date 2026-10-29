/* =============================================================================
 * js/app.js
 * NE İŞE YARAR : Uygulamanın akışı: tek state nesnesi, olaylar, veri yükleme,
 *                otomatik yenileme ve bölüm bölüm çizim. Başlatma buradadır.
 * VERDİĞİ      : AcilRadar.App → { state } (hata ayıklama için konsoldan okunabilir)
 * NEYİ DEĞİŞTİRMEK İÇİN BURAYA BAK:
 *   - Akış: init() → load() → recompute() → render*()
 *   - Hangi değişiklik neyi yeniden çizer: bölüm 7'deki işleyiciler.
 *   - Yeni filtre (4 yer): state.filters + Calc.filterRows/hasActiveFilters +
 *     UI.controls (bindEvents, sync) + index.html denetimi ve strings.js etiketi.
 * NOT: Akış tek yönlüdür: olay → state → render. Çizim dosyaları state'i değiştirmez.
 * ========================================================================== */
(function (AR) {
  'use strict';

  const cfg = AR.Config;
  const Calc = AR.Calc;
  const UI = AR.UI;
  const t = AR.Strings.text;
  const format = AR.Strings.format;
  const MS_PER_SECOND = 1000;

  /* ---- 1. Durum ------------------------------------------------------------ */

  function emptyFilters() {
    return { query: '', childOnly: false, levels: new Set() };
  }

  const state = {
    textSize: cfg.DEFAULT_TEXT_SIZE,
    districtId: cfg.DEFAULT_DISTRICT_ID,
    origin: null,                 // { lat, lng, source: 'district'|'device', districtId } — YALNIZ bellekte
    timeSlot: cfg.DEFAULT_TIME_SLOT,
    sortKey: cfg.DEFAULT_SORT,
    filters: emptyFilters(),
    response: null,               // ApiResponse (js/schema.js)
    simulated: false,             // örnek veri bandı görünür mü
    errorCode: null,
    retryAfterMs: 0,
    isLoading: false,
    requestSeq: 0,
    rows: [],                     // Row[] (tümü)
    visibleRows: [],              // süzülmüş + sıralı
    shortest: null,               // en kısa toplam süreli satır
    staleSignature: '',
    passedSlots: new Set(),
    expandedIds: new Set(),
    highlightedId: null,
    selectedId: null,
    isLocating: false
  };

  const timers = { refresh: null, tick: null };
  const els = {};

  /* ---- 2. Başlatma --------------------------------------------------------- */

  function cacheElements() {
    ['results-list', 'results-message', 'error-region', 'pick', 'results-status', 'last-updated', 'refresh-button', 'map', 'footer-copyright', 'search-input']
      .forEach(function (id) { els[id] = document.getElementById(id); });
  }

  function applyStaticContent() {
    UI.dom.applyStaticStrings(document);
    UI.dom.hydrateIcons(document);
    document.title = t('app.documentTitle');
    els['footer-copyright'].textContent = t('footer.copyright', { year: new Date().getFullYear() });
    UI.info.renderFormula(cfg);
    UI.info.renderDataSource('none');
  }

  function districtById(id) {
    return cfg.DISTRICTS.find(function (d) { return d.id === id; }) || cfg.DISTRICTS[0];
  }

  function originFromDistrict(id) {
    const district = districtById(id);
    return { lat: district.lat, lng: district.lng, source: 'district', districtId: district.id };
  }

  function init() {
    cacheElements();
    applyStaticContent();
    const prefs = AR.Storage.getPrefs();
    state.textSize = prefs.textSize;
    state.districtId = prefs.districtId;
    state.origin = originFromDistrict(prefs.districtId);
    UI.topbar.init(state.textSize, handleTextSize);
    UI.controls.init(cfg, controlHandlers);
    UI.dom.bindDisclosures(document);
    UI.cards.bind([els['results-list']], { onAction: handleCardAction, onHover: handleHover });
    UI.map.init(els.map, state.origin, { onSelect: handleMapSelect, onHover: handleHover, onAvailabilityChange: renderResults });
    bindGlobalEvents();
    updateSlotAvailability(Date.now());
    syncControls();
    updateLocationStatus();
    UI.states.setOfflineBanner(navigator.onLine === false);
    // Örnek veri bandı veri gelmeden gösterilir (örnek ortam ya da son açılış örnekti):
    // sonradan eklenip içeriği aşağı itmesin.
    state.simulated = cfg.ENVIRONMENT === 'mock' || prefs.lastSimulated;
    UI.states.setSimulationBanner(state.simulated);
    UI.hero.render(null);
    load({ announce: true });
    timers.tick = setInterval(handleClockTick, cfg.CLOCK_TICK_SECONDS * MS_PER_SECOND);
    document.documentElement.classList.add('app-ready');
  }

  /* ---- 3. Veri yükleme ve otomatik yenileme ------------------------------ */

  /**
   * Veriyi getirir. İlk yüklemede iskelet gösterir; sonrakilerde mevcut liste
   * yerinde kalır. Yeni çağrı eskisini iptal eder (en son istek kazanır).
   * @param {{announce:boolean}} options
   */
  async function load(options) {
    clearTimeout(timers.refresh);
    const seq = ++state.requestSeq;
    const firstData = !state.response;
    state.isLoading = true;
    if (firstData) showLoading(); else setRefreshing(true);
    try {
      const response = await AR.Api.getHospitals({ at: state.timeSlot, region: cfg.REGION_ID });
      if (seq !== state.requestSeq) return;
      state.response = response;
      state.errorCode = null;
      state.retryAfterMs = 0;
    } catch (error) {
      if (error.code === 'ABORTED' || seq !== state.requestSeq) return;
      state.errorCode = error.code;
      state.retryAfterMs = error.retryAfterMs || 0;
      console.warn(t('dev.prefix') + ' ' + t('dev.requestFailed', { code: error.code, status: error.status || '-' }));
    }
    state.isLoading = false;
    setRefreshing(false);
    recompute();
    renderAll({ animate: firstData, fit: firstData, announce: options.announce || firstData });
    scheduleRefresh();
  }

  function showLoading() {
    UI.states.showSkeleton(els['results-list'], cfg.SKELETON_CARD_COUNT);
    UI.states.hide(els['results-message']);
    UI.states.announce(t('a11y.loading'));
  }

  function setRefreshing(isRefreshing) {
    els['refresh-button'].disabled = isRefreshing;
    els['refresh-button'].setAttribute('aria-busy', String(isRefreshing));
  }

  /** Sekme gizliyken / çevrimdışıyken yenilenmez; 429'da Retry-After beklenir. */
  function scheduleRefresh() {
    clearTimeout(timers.refresh);
    if (document.hidden || navigator.onLine === false) return;
    const delay = Math.max(cfg.AUTO_REFRESH_SECONDS * MS_PER_SECOND, state.retryAfterMs);
    timers.refresh = setTimeout(function () { load({ announce: false }); }, delay);
  }

  function dataAgeMs() {
    return state.response ? Date.now() - state.response.receivedAtMs : Infinity;
  }

  function handleVisibilityChange() {
    if (document.hidden) {
      clearTimeout(timers.refresh);
      return;
    }
    if (dataAgeMs() >= cfg.AUTO_REFRESH_SECONDS * MS_PER_SECOND && !state.isLoading) load({ announce: false });
    else scheduleRefresh();
  }

  /** Saat tıkı: göreli zaman yazıları, veri eskimesi, saati geçen zaman seçeneği. */
  function handleClockTick() {
    const nowMs = Date.now();
    renderLastUpdated(nowMs);
    if (updateSlotAvailability(nowMs)) return;
    if (!state.response) return;
    const previous = state.staleSignature;
    recompute();
    if (state.staleSignature !== previous) {
      renderHero();
      renderResults({ animate: false, fit: false, announce: false });
    }
  }

  /* ---- 4. Hesap ------------------------------------------------------------ */

  function recompute() {
    const hospitals = state.response ? state.response.hospitals : [];
    const timing = state.response || { generatedAtMs: Date.now(), receivedAtMs: Date.now() };
    state.rows = Calc.buildRows(hospitals, state.origin, timing, Date.now(), cfg);
    state.visibleRows = Calc.sortRows(Calc.filterRows(state.rows, state.filters), state.sortKey);
    state.shortest = Calc.pickShortest(state.visibleRows);
    state.staleSignature = state.rows.filter(function (r) { return r.isStale; }).map(function (r) { return r.id; }).join('|');
  }

  /** Şimdiki an: yanıt varsa sunucu saatine göre (yanlış cihaz saatine karşı). */
  function referenceNowMs(nowMs) {
    return state.response ? Calc.serverNowMs(state.response, nowMs) : nowMs;
  }

  /**
   * Saati geçen seçenekleri işaretler. Seçili seçenek geçtiyse "Şimdi"ye döner.
   * @returns {boolean} yeniden yükleme başlatıldıysa true
   */
  function updateSlotAvailability(nowMs) {
    const minute = Calc.minutesOfDay(referenceNowMs(nowMs), cfg.TIME_ZONE);
    state.passedSlots = new Set(cfg.TIME_SLOTS.filter(function (slot) { return Calc.isSlotPassed(slot, minute); }).map(function (slot) { return slot.id; }));
    UI.controls.setSlotAvailability(state.passedSlots);
    if (!state.passedSlots.has(state.timeSlot)) return false;
    UI.states.announce(t('controls.timeSlotExpired', { label: t('time.' + state.timeSlot) }));
    state.timeSlot = cfg.DEFAULT_TIME_SLOT;
    syncControls();
    load({ announce: false });
    return true;
  }

  /* ---- 5. Çizim (bölüm bölüm) --------------------------------------------- */

  function renderAll(options) {
    const response = state.response;
    // Yanıt yoksa (hata, yükleniyor) bant olduğu gibi kalır; gidip gelmez.
    if (response && response.isSimulated !== state.simulated) {
      state.simulated = response.isSimulated;
      AR.Storage.savePrefs({ lastSimulated: state.simulated });
    }
    UI.states.setSimulationBanner(state.simulated);
    UI.states.setNotice(response ? response.notice : null);
    UI.info.renderDataSource(response ? response.dataSource : 'none');
    renderHero();
    renderResults(options);
  }

  function renderHero() {
    UI.hero.render(state.response ? Calc.summarize(state.rows) : null);
  }

  function renderLastUpdated(nowMs) {
    const r = state.response;
    els['last-updated'].textContent = r
      ? t('results.lastUpdated', { time: format.clock(r.generatedAtMs), relative: format.ago(format.minutesBetween(r.receivedAtMs, nowMs)) })
      : t('results.notUpdated');
  }

  function cardContext(animate) {
    return {
      expandedIds: state.expandedIds,
      highlightedId: state.highlightedId,
      shortestId: state.shortest ? state.shortest.id : null,
      mapAvailable: UI.map.isAvailable(),
      directionsTemplate: cfg.DIRECTIONS_URL_TEMPLATE,
      registrationMinutes: cfg.REGISTRATION_MINUTES,
      timeSlot: state.timeSlot,
      animate: animate,
      maxAnimated: cfg.MAX_ANIMATED_CARDS
    };
  }

  /** Sonuç alanı: hata, boş durum, öneri, liste, harita, sayı. Odak korunur. */
  function renderResults(options) {
    const opts = options || { animate: false, fit: false, announce: false };
    const focusKey = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.focusKey : null;
    if (state.errorCode) UI.states.renderError(els['error-region'], state.errorCode, Boolean(state.response), handleRetry);
    else UI.states.hide(els['error-region']);
    renderLastUpdated(Date.now());
    if (!state.response) {
      UI.dom.clear(els['results-list']);
      els['results-list'].setAttribute('aria-busy', 'false');
      UI.pick.hide(els.pick);
      els['results-status'].textContent = '';
      return;
    }
    renderEmptyState();
    UI.cards.renderList(els['results-list'], state.visibleRows, cardContext(opts.animate));
    renderPick();
    UI.map.update(state.visibleRows, state.origin, { fit: opts.fit });
    UI.map.highlight(state.highlightedId);
    els['results-status'].textContent = resultCountText();
    restoreFocus(focusKey);
    if (opts.announce) UI.states.announce(resultCountText());
  }

  function renderPick() {
    if (state.rows.length === 0) {
      UI.pick.hide(els.pick);
      return;
    }
    UI.pick.render(els.pick, state.shortest, state.visibleRows.indexOf(state.shortest) + 1, cfg.DIRECTIONS_URL_TEMPLATE);
  }

  function renderEmptyState() {
    if (state.visibleRows.length > 0) {
      UI.states.hide(els['results-message']);
      return;
    }
    if (state.rows.length === 0) UI.states.renderEmpty(els['results-message'], 'noData', null);
    else UI.states.renderEmpty(els['results-message'], 'noMatch', Calc.hasActiveFilters(state.filters) ? handleClearFilters : null);
  }

  function resultCountText() {
    if (state.visibleRows.length === 0) return t('results.countZero');
    return t('results.count', { count: format.number(state.visibleRows.length), sort: t('sort.' + state.sortKey) });
  }

  /** Yeniden çizimden sonra klavye odağı aynı düğmeye döner. */
  function restoreFocus(focusKey) {
    if (!focusKey || (document.activeElement && document.activeElement !== document.body)) return;
    const target = document.querySelector('[data-focus-key="' + CSS.escape(focusKey) + '"]');
    if (target) target.focus({ preventScroll: true });
  }

  function syncControls() {
    UI.controls.sync({
      districtId: state.districtId,
      originSource: state.origin.source,
      timeSlot: state.timeSlot,
      sortKey: state.sortKey,
      filters: state.filters,
      hasActiveFilters: Calc.hasActiveFilters(state.filters)
    });
  }

  /* ---- 6. Seçim değişiklikleri: yalnız ilgili bölümler -------------------- */

  /** Filtre/sıralama: özet değişmez; yalnız sonuç alanı yeniden çizilir. */
  function applyListChange() {
    recompute();
    syncControls();
    renderResults({ animate: false, fit: false, announce: true });
  }

  /** Başlangıç noktası: mesafeler değişir → özet + sonuçlar. */
  function applyOriginChange() {
    recompute();
    syncControls();
    updateLocationStatus();
    renderHero();
    renderResults({ animate: false, fit: true, announce: true });
  }

  function handleTextSize(size) {
    state.textSize = size;
    AR.Storage.savePrefs({ textSize: size });
    UI.topbar.setTextSize(size);
    UI.map.refreshSize();
  }

  function handleDistrict(id) {
    state.districtId = districtById(id).id;
    state.origin = originFromDistrict(state.districtId);
    AR.Storage.savePrefs({ districtId: state.districtId });
    applyOriginChange();
  }

  function updateLocationStatus() {
    if (state.origin.source === 'device') UI.controls.setLocationStatus(t('controls.locationDevice') + ' ' + t('controls.locationPrivacy'), 'info');
    else UI.controls.setLocationStatus(t('controls.locationDistrict', { district: t('districts.' + state.origin.districtId) }), 'info');
  }

  const GEO_ERROR_KEYS = { 1: 'controls.locationDenied', 2: 'controls.locationUnavailable', 3: 'controls.locationTimeout' };

  function onLocationFailed(key) {
    state.isLocating = false;
    UI.controls.setLocating(false);
    UI.controls.setLocationStatus(t(key), 'warning');
  }

  /** "Konumumu kullan": konum YALNIZ bellekte tutulur; saklanmaz, gönderilmez. */
  function handleUseLocation() {
    if (state.isLocating) return;
    if (!('geolocation' in navigator)) {
      onLocationFailed('controls.locationUnsupported');
      return;
    }
    state.isLocating = true;
    UI.controls.setLocating(true);
    UI.controls.setLocationStatus(t('controls.locating'), 'info');
    navigator.geolocation.getCurrentPosition(function (position) {
      state.isLocating = false;
      UI.controls.setLocating(false);
      state.origin = { lat: position.coords.latitude, lng: position.coords.longitude, source: 'device', districtId: state.districtId };
      UI.controls.addDeviceOption();
      applyOriginChange();
    }, function (error) {
      onLocationFailed(GEO_ERROR_KEYS[error.code] || 'controls.locationUnavailable');
    }, { enableHighAccuracy: cfg.GEOLOCATION.HIGH_ACCURACY, timeout: cfg.GEOLOCATION.TIMEOUT_MS, maximumAge: cfg.GEOLOCATION.MAX_AGE_MS });
  }

  function handleTimeSlot(id) {
    if (id === state.timeSlot || state.passedSlots.has(id)) return;
    state.timeSlot = id;
    syncControls();
    load({ announce: true });
  }

  function handleSort(key) {
    state.sortKey = cfg.SORT_KEYS.indexOf(key) !== -1 ? key : cfg.DEFAULT_SORT;
    applyListChange();
  }

  function handleSearch(query) {
    state.filters.query = query;
    applyListChange();
  }

  function handleToggleChild() {
    state.filters.childOnly = !state.filters.childOnly;
    applyListChange();
  }

  function handleToggleLevel(level) {
    if (state.filters.levels.has(level)) state.filters.levels.delete(level);
    else state.filters.levels.add(level);
    applyListChange();
  }

  function handleClearFilters() {
    state.filters = emptyFilters();
    applyListChange();
    els['search-input'].focus();
  }

  function handleRetry() {
    if (!state.isLoading) load({ announce: true });
  }

  const controlHandlers = {
    onDistrict: handleDistrict,
    onUseLocation: handleUseLocation,
    onTimeSlot: handleTimeSlot,
    onSort: handleSort,
    onSearch: handleSearch,
    onToggleChild: handleToggleChild,
    onToggleLevel: handleToggleLevel,
    onClearFilters: handleClearFilters
  };

  /* ---- 7. Kart ↔ harita --------------------------------------------------- */

  function handleCardAction(action, id, button) {
    if (action === 'details') {
      const open = !state.expandedIds.has(id);
      if (open) state.expandedIds.add(id); else state.expandedIds.delete(id);
      UI.dom.setExpanded(button, open);
    } else if (action === 'map') {
      state.selectedId = id;
      setHighlight(id);
      document.getElementById('map-panel').scrollIntoView({ behavior: UI.dom.scrollBehavior(), block: 'nearest' });
      UI.map.focusHospital(id);
    }
  }

  function setHighlight(id) {
    state.highlightedId = id;
    UI.cards.setHighlight(els['results-list'], id);
    UI.map.highlight(id);
  }

  /** Fare/odak ayrılınca seçili hastaneye dönülür. */
  function handleHover(id) {
    const target = id || state.selectedId;
    if (target !== state.highlightedId) setHighlight(target);
  }

  function handleMapSelect(id, focusCard) {
    state.selectedId = id;
    setHighlight(id);
    const card = UI.cards.setHighlight(els['results-list'], id);
    if (!card) return;
    card.scrollIntoView({ behavior: UI.dom.scrollBehavior(), block: 'nearest' });
    if (focusCard) card.focus({ preventScroll: true });
  }

  /* ---- 8. Genel olaylar ---------------------------------------------------- */

  function bindGlobalEvents() {
    window.addEventListener('online', function () {
      UI.states.setOfflineBanner(false);
      load({ announce: false });
    });
    window.addEventListener('offline', function () {
      UI.states.setOfflineBanner(true);
      clearTimeout(timers.refresh);
    });
    document.addEventListener('visibilitychange', handleVisibilityChange);
    // Geri/ileri tuşuyla önbellekten dönülürse bilgiler tazelenir.
    window.addEventListener('pageshow', function (event) {
      if (event.persisted) load({ announce: false });
    });
    els['refresh-button'].addEventListener('click', handleRetry);
  }

  AR.App = Object.freeze({ state: state });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.AcilRadar = window.AcilRadar || {});
