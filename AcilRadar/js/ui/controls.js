/* =============================================================================
 * js/ui/controls.js
 * NE İŞE YARAR : "Seçimleriniz" bölümü: (1) bulunduğunuz yer, (2) zaman,
 *                (3) sıralama ve filtre. Seçenekleri config.js'ten üretir; değişiklikleri
 *                app.js'e bildirir. Durumu kendisi TUTMAZ; sync() ile yansıtır.
 * VERDİĞİ      : AcilRadar.UI.controls → init, sync, setSlotAvailability,
 *                addDeviceOption, setLocationStatus, setLocating
 * NEYİ DEĞİŞTİRMEK İÇİN BURAYA BAK:
 *   - Seçenekler: config.js (DISTRICTS, TIME_SLOTS, SORT_KEYS, CROWDING_LEVELS)
 *   - Etiketler: strings.js › controls, districts, time, sort, crowding
 * ========================================================================== */
(function (AR) {
  'use strict';

  const dom = AR.UI.dom;
  const t = AR.Strings.text;
  const DEVICE_VALUE = 'device';
  const LEVEL_ICONS = { low: 'check', medium: 'medium', high: 'alert' };

  function byId(id) {
    return document.getElementById(id);
  }

  /* ---- Seçenekleri üret -------------------------------------------------- */

  function renderDistricts(select, districts) {
    dom.clear(select);
    districts.forEach(function (district) {
      select.appendChild(dom.el('option', { attrs: { value: district.id }, text: t('districts.' + district.id) }));
    });
  }

  /** Radyo düğmelerinden bölümlü seçici (görünüşte segment kontrol, davranışta radyo). */
  function renderRadios(container, name, ids, labelPrefix) {
    dom.clear(container);
    ids.forEach(function (id) {
      const inputId = 'opt-' + name + '-' + id;
      container.appendChild(dom.el('div', { className: 'segment__item' }, [
        dom.el('input', { className: 'segment__input', attrs: { type: 'radio', name: name, id: inputId, value: id } }),
        dom.el('label', { className: 'segment__label', attrs: { for: inputId }, data: { label: t(labelPrefix + id) }, text: t(labelPrefix + id) })
      ]));
    });
  }

  function renderLevelChips(container, levels) {
    dom.clear(container);
    levels.forEach(function (level) {
      container.appendChild(dom.el('button', {
        className: 'chip chip--' + level,
        attrs: { type: 'button', 'aria-pressed': 'false' },
        data: { level: level }
      }, [dom.icon(LEVEL_ICONS[level]), dom.el('span', { text: t('crowding.' + level) })]));
    });
  }

  /* ---- Olaylar ------------------------------------------------------------ */

  function onRadioChange(container, handler) {
    container.addEventListener('change', function (event) {
      if (event.target.type === 'radio') handler(event.target.value);
    });
  }

  function bindSearch(input, handler, delayMs) {
    let timer = null;
    input.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () { handler(input.value); }, delayMs);
    });
  }

  function bindEvents(h, cfg) {
    byId('controls-form').addEventListener('submit', function (event) { event.preventDefault(); });
    byId('district-select').addEventListener('change', function (event) {
      if (event.target.value !== DEVICE_VALUE) h.onDistrict(event.target.value);
    });
    byId('locate-button').addEventListener('click', h.onUseLocation);
    onRadioChange(byId('time-group'), h.onTimeSlot);
    onRadioChange(byId('sort-group'), h.onSort);
    bindSearch(byId('search-input'), h.onSearch, cfg.SEARCH_DEBOUNCE_MS);
    byId('child-toggle').addEventListener('click', h.onToggleChild);
    byId('crowding-group').addEventListener('click', function (event) {
      const chip = event.target.closest('[data-level]');
      if (chip) h.onToggleLevel(chip.dataset.level);
    });
    byId('clear-filters').addEventListener('click', h.onClearFilters);
  }

  /**
   * @param {Object} cfg       AcilRadar.Config
   * @param {Object} handlers  { onDistrict, onUseLocation, onTimeSlot, onSort, onSearch,
   *                             onToggleChild, onToggleLevel, onClearFilters }
   */
  function init(cfg, handlers) {
    renderDistricts(byId('district-select'), cfg.DISTRICTS);
    renderRadios(byId('time-group'), 'time', cfg.TIME_SLOTS.map(function (slot) { return slot.id; }), 'time.');
    renderRadios(byId('sort-group'), 'sort', cfg.SORT_KEYS, 'sort.');
    renderLevelChips(byId('crowding-group'), cfg.CROWDING_LEVELS);
    bindEvents(handlers, cfg);
  }

  /* ---- Durumu yansıt ------------------------------------------------------ */

  function checkRadio(container, value) {
    container.querySelectorAll('input[type="radio"]').forEach(function (input) { input.checked = input.value === value; });
  }

  /**
   * Durum → arayüz (tek yönlü).
   * @param {{districtId:string, originSource:string, timeSlot:string, sortKey:string,
   *          filters:{query:string, childOnly:boolean, levels:Set<string>}, hasActiveFilters:boolean}} view
   */
  function sync(view) {
    byId('district-select').value = view.originSource === 'device' ? DEVICE_VALUE : view.districtId;
    checkRadio(byId('time-group'), view.timeSlot);
    checkRadio(byId('sort-group'), view.sortKey);
    const search = byId('search-input');
    if (search.value !== view.filters.query) search.value = view.filters.query;
    byId('child-toggle').setAttribute('aria-pressed', String(view.filters.childOnly));
    byId('crowding-group').querySelectorAll('[data-level]').forEach(function (chip) {
      chip.setAttribute('aria-pressed', String(view.filters.levels.has(chip.dataset.level)));
    });
    byId('clear-filters').hidden = !view.hasActiveFilters;
    byId('time-forecast-note').hidden = view.timeSlot === 'now';
  }

  /** Saati geçmiş seçenekler devre dışı ve "bugün için geçti" yazılı. */
  function setSlotAvailability(passedIds) {
    byId('time-group').querySelectorAll('.segment__input').forEach(function (input) {
      const passed = passedIds.has(input.value);
      const label = input.nextElementSibling;
      input.disabled = passed;
      label.textContent = passed ? t('controls.timePassed', { label: label.dataset.label }) : label.dataset.label;
    });
  }

  function addDeviceOption() {
    const select = byId('district-select');
    if (select.querySelector('option[value="' + DEVICE_VALUE + '"]')) return;
    select.insertBefore(dom.el('option', { attrs: { value: DEVICE_VALUE }, text: t('controls.deviceOption') }), select.firstChild);
  }

  /** @param {'info'|'warning'} tone */
  function setLocationStatus(message, tone) {
    const node = byId('location-status');
    node.textContent = message;
    node.className = 'field-status field-status--' + tone;
  }

  function setLocating(isLocating) {
    const button = byId('locate-button');
    button.disabled = isLocating;
    button.setAttribute('aria-busy', String(isLocating));
  }

  AR.UI = AR.UI || {};
  AR.UI.controls = Object.freeze({
    init: init,
    sync: sync,
    setSlotAvailability: setSlotAvailability,
    addDeviceOption: addDeviceOption,
    setLocationStatus: setLocationStatus,
    setLocating: setLocating
  });
})(window.AcilRadar = window.AcilRadar || {});
