/* =============================================================================
 * DOSYA ADI    : js/ui/controls.js
 * NE İŞE YARAR : "Seçimleriniz" bölümü: ilçe listesi + "Konumumu kullan",
 *                zaman seçici, arama, filtreler, sıralama ve otomatik yenileme.
 *                Seçenekleri config.js'ten üretir, kullanıcı bir şey değiştirince
 *                app.js'e haber verir. Durumu KENDİSİ tutmaz; sync() ile yansıtır.
 * NEYİ ALIR    : AcilRadar.config (listeler), app.js'ten olay işleyicileri ve görünüm durumu.
 * NEYİ VERİR   : AcilRadar.ui.controls → init, sync, setLocationStatus, setLocating,
 *                addDeviceOption, applyFeatures
 * NEYİ DEĞİŞTİRMEK İÇİN BURAYA BAK:
 *   - Seçeneklerin kendisi (ilçeler, zamanlar, sıralamalar): js/config.js
 *   - Etiketler: js/strings.js › controls, time, sort, crowding, refresh, districts
 *   - Yerleşim: index.html › "6. SEÇİMLER" ve css/layout.css › .controls
 * ========================================================================== */
(function (AR) {
  'use strict';

  const dom = AR.dom;
  const text = AR.text;
  const DEVICE_VALUE = '__device';
  const SECONDS_PER_MINUTE = 60;

  function byId(id) {
    return document.getElementById(id);
  }

  /* ---- Seçenekleri üret -------------------------------------------------- */

  function renderDistrictOptions(select, districts) {
    dom.clear(select);
    districts.forEach(function (district) {
      select.appendChild(dom.el('option', { attrs: { value: district.id }, text: text('districts.' + district.id) }));
    });
  }

  /** Radyo düğmeli bölüm (zaman ve sıralama) üretir: görünüşte bölümlü düğme grubu. */
  function renderRadioGroup(container, name, values, labelPrefix) {
    dom.clear(container);
    values.forEach(function (value) {
      const id = 'radio-' + name + '-' + value;
      container.appendChild(dom.el('div', { className: 'segmented__item' }, [
        dom.el('input', { className: 'segmented__input', attrs: { type: 'radio', name: name, id: id, value: value } }),
        dom.el('label', { className: 'segmented__label', attrs: { for: id }, text: text(labelPrefix + value) })
      ]));
    });
  }

  function renderCrowdingButtons(container, levels) {
    dom.clear(container);
    levels.forEach(function (level) {
      container.appendChild(dom.el('button', {
        className: 'chip chip--' + level,
        attrs: { type: 'button', 'aria-pressed': 'false' },
        data: { level: level }
      }, [dom.icon(level === 'low' ? 'check' : level === 'medium' ? 'medium' : 'alert'), dom.el('span', { text: text('crowding.' + level) })]));
    });
  }

  function refreshOptionLabel(seconds) {
    if (seconds === 0) return text('refresh.off');
    if (seconds < SECONDS_PER_MINUTE) return text('refresh.seconds', { value: AR.format.number(seconds) });
    return text('refresh.minutes', { value: AR.format.number(seconds / SECONDS_PER_MINUTE, 1) });
  }

  function renderRefreshOptions(select, options) {
    dom.clear(select);
    options.forEach(function (seconds) {
      select.appendChild(dom.el('option', { attrs: { value: String(seconds) }, text: refreshOptionLabel(seconds) }));
    });
  }

  /* ---- Olayları bağla ---------------------------------------------------- */

  function bindRadioGroup(container, handler) {
    container.addEventListener('change', function (event) {
      if (event.target.matches('input[type="radio"]')) handler(event.target.value);
    });
  }

  function bindSearch(input, handler) {
    let timer = null;
    input.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () { handler(input.value); }, AR.config.SEARCH_DEBOUNCE_MS);
    });
    // Enter ile formun gönderilmesini engelle (sayfa yenilenmesin).
    if (input.form) input.form.addEventListener('submit', function (event) { event.preventDefault(); });
  }

  function bindEvents(h) {
    byId('district-select').addEventListener('change', function (event) {
      if (event.target.value !== DEVICE_VALUE) h.onDistrict(event.target.value);
    });
    byId('locate-button').addEventListener('click', h.onUseLocation);
    bindRadioGroup(byId('time-group'), h.onTimeSlot);
    bindRadioGroup(byId('sort-group'), h.onSort);
    bindSearch(byId('search-input'), h.onSearch);
    byId('child-toggle').addEventListener('click', h.onToggleChild);
    byId('favorites-toggle').addEventListener('click', h.onToggleFavorites);
    byId('crowding-group').addEventListener('click', function (event) {
      const button = event.target.closest('[data-level]');
      if (button) h.onToggleLevel(button.dataset.level);
    });
    byId('clear-filters').addEventListener('click', h.onClearFilters);
    byId('refresh-select').addEventListener('change', function (event) { h.onRefreshInterval(Number(event.target.value)); });
    byId('refresh-now').addEventListener('click', h.onRefreshNow);
  }

  /**
   * @param {Object} cfg       AcilRadar.config
   * @param {Object} handlers  { onDistrict, onUseLocation, onTimeSlot, onSearch, onToggleChild,
   *                             onToggleLevel, onToggleFavorites, onClearFilters, onSort,
   *                             onRefreshInterval, onRefreshNow }
   */
  function init(cfg, handlers) {
    renderDistrictOptions(byId('district-select'), cfg.DISTRICTS);
    renderRadioGroup(byId('time-group'), 'time-slot', cfg.TIME_SLOTS, 'time.');
    renderRadioGroup(byId('sort-group'), 'sort', cfg.SORT_KEYS, 'sort.');
    renderCrowdingButtons(byId('crowding-group'), cfg.CROWDING_LEVELS);
    renderRefreshOptions(byId('refresh-select'), cfg.AUTO_REFRESH.OPTIONS_SECONDS);
    bindEvents(handlers);
  }

  /* ---- Durumu yansıt ----------------------------------------------------- */

  function checkRadio(container, value) {
    container.querySelectorAll('input[type="radio"]').forEach(function (input) { input.checked = input.value === value; });
  }

  /**
   * Görünümü uygulama durumuyla eşitler (tek yönlü: durum → arayüz).
   * @param {{districtId:string, originSource:string, timeSlot:string, sortKey:string,
   *          refreshSeconds:number, filters:Object, hasActiveFilters:boolean}} view
   */
  function sync(view) {
    byId('district-select').value = view.originSource === 'device' ? DEVICE_VALUE : view.districtId;
    checkRadio(byId('time-group'), view.timeSlot);
    checkRadio(byId('sort-group'), view.sortKey);
    const search = byId('search-input');
    if (search.value !== view.filters.query) search.value = view.filters.query;
    byId('child-toggle').setAttribute('aria-pressed', String(view.filters.childOnly));
    byId('favorites-toggle').setAttribute('aria-pressed', String(view.filters.favoritesOnly));
    byId('crowding-group').querySelectorAll('[data-level]').forEach(function (button) {
      button.setAttribute('aria-pressed', String(view.filters.levels.has(button.dataset.level)));
    });
    byId('clear-filters').hidden = !view.hasActiveFilters;
    byId('refresh-select').value = String(view.refreshSeconds);
    byId('time-forecast-note').hidden = view.timeSlot === 'now';
  }

  /** "Cihaz konumum" seçeneğini (bir kez) listeye ekler. */
  function addDeviceOption() {
    const select = byId('district-select');
    if (select.querySelector('option[value="' + DEVICE_VALUE + '"]')) return;
    select.insertBefore(dom.el('option', { attrs: { value: DEVICE_VALUE }, text: text('controls.deviceOption') }), select.firstChild);
  }

  /** @param {'info'|'warning'} tone */
  function setLocationStatus(message, tone) {
    const node = byId('location-status');
    node.textContent = message;
    node.className = 'field-status field-status--' + (tone || 'info');
  }

  function setLocating(isLocating) {
    const button = byId('locate-button');
    button.disabled = isLocating;
    button.setAttribute('aria-busy', String(isLocating));
  }

  /** config.FEATURES'ta kapalı olan özelliklerin denetimlerini gizler. */
  function applyFeatures(features) {
    byId('search-field').hidden = !features.search;
    byId('favorites-toggle').hidden = !features.favorites;
    byId('refresh-field').hidden = !features.autoRefresh;
  }

  AR.ui = AR.ui || {};
  AR.ui.controls = Object.freeze({
    init: init,
    sync: sync,
    addDeviceOption: addDeviceOption,
    setLocationStatus: setLocationStatus,
    setLocating: setLocating,
    applyFeatures: applyFeatures
  });
})(window.AcilRadar = window.AcilRadar || {});
