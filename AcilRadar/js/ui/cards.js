/* =============================================================================
 * DOSYA ADI    : js/ui/cards.js
 * NE İŞE YARAR : Hastane kartlarını ve üstteki öneri kutusunu çizer; karttaki
 *                düğmelerin (favori, ayrıntılar, haritada göster, paylaş) tıklamalarını
 *                tek bir dinleyiciyle yakalayıp app.js'e iletir.
 * NEYİ ALIR    : Row[] (js/calc.js) ve çizim bağlamı (favoriler, açık ayrıntılar, saat).
 *                Veri GETİRMEZ, hesap YAPMAZ; yalnızca çizer.
 * NEYİ VERİR   : AcilRadar.ui.cards → renderList, renderRecommendation, setHighlight,
 *                bind, statusOf
 * NEYİ DEĞİŞTİRMEK İÇİN BURAYA BAK:
 *   - Karta YENİ BİR ALAN eklemek (ör. "MR var"): 2 yer değişir:
 *       1) js/api.js › normalizeHospital() içine alanı ekleyin,
 *       2) bu dosyada buildTags() (etiket) ya da buildDetails() (ayrıntı satırı)
 *          içine bir satır ekleyin; metnini js/strings.js'e yazın.
 *   - Kartın görünümü (renk, boşluk): css/components.css › .card
 *   - Kart metinleri: js/strings.js › card, details
 * NOT (GÜVENLİK): Sunucudan gelen her metin dom.el(..., { text }) ile yani
 *      textContent üzerinden yazılır; HTML olarak yorumlanmaz.
 * NOT (YASAL): Süre her zaman ARALIK ve "tahmini" ifadesiyle gösterilir; veri eskiyse
 *      süre/yoğunluk hiç gösterilmez.
 * ========================================================================== */
(function (AR) {
  'use strict';

  const dom = AR.dom;
  const text = AR.text;
  const format = AR.format;
  const el = dom.el;

  const STATUS_ICONS = { low: 'check', medium: 'medium', high: 'alert', stale: 'clock' };

  /**
   * Bir satırın durum bilgisi: renk sınıfı + yazı + simge (yalnız renge güvenilmez).
   * @param {Row} row
   * @returns {{level:string, label:string, icon:string}}
   */
  function statusOf(row) {
    const level = row.isStale ? 'stale' : row.hospital.crowdingLevel;
    return { level: level, label: text('crowding.' + level), icon: STATUS_ICONS[level] };
  }

  /* ---- Küçük parçalar ---------------------------------------------------- */

  function buildBadge(status) {
    return el('span', { className: 'badge badge--' + status.level }, [dom.icon(status.icon), el('span', { text: status.label })]);
  }

  /** Doluluk halkası (conic-gradient). Yüzde yazıyla da verilir; yalnız renge güvenilmez. */
  function buildRing(row) {
    const percent = row.hospital.occupancyPercent;
    const label = text('card.occupancy') + ' ' + format.percent(percent);
    return el('div', {
      className: 'ring ring--' + row.hospital.crowdingLevel,
      attrs: { role: 'img', 'aria-label': label },
      style: { '--p': percent }
    }, [el('span', { className: 'ring__value', attrs: { 'aria-hidden': 'true' }, text: format.percent(percent) })]);
  }

  function buildTags(row) {
    const h = row.hospital;
    const tags = el('ul', { className: 'tags' });
    if (h.childER) tags.appendChild(el('li', { className: 'tag tag--child' }, [dom.icon('child'), el('span', { text: text('card.childER') })]));
    if (h.isForecast) tags.appendChild(el('li', { className: 'tag tag--forecast' }, [dom.icon('clock'), el('span', { text: text('card.forecast') })]));
    if (h.dataSource === 'simulated') tags.appendChild(el('li', { className: 'tag tag--sim', text: text('card.simulation') }));
    return tags.childNodes.length > 0 ? tags : null;
  }

  function buildMeta(row) {
    const sep = text('card.metaSeparator');
    return el('p', { className: 'card__meta' }, [
      dom.icon('pin'),
      el('span', { text: row.hospital.district + sep + format.km(row.distanceKm) + sep + text('card.travelMeta', { range: format.minutesRange(row.travelMinutes) }) })
    ]);
  }

  function buildFavoriteButton(row, ctx) {
    const isFavorite = ctx.favorites.has(row.id);
    return el('button', {
      className: 'icon-btn fav-btn',
      attrs: {
        type: 'button',
        'aria-pressed': String(isFavorite),
        'aria-label': text(isFavorite ? 'card.favoriteRemove' : 'card.favoriteAdd', { name: row.hospital.name })
      },
      data: { action: 'favorite', id: row.id, focusKey: 'favorite:' + row.id }
    }, [dom.icon('star')]);
  }

  function buildHead(row, rank, ctx, titleId) {
    const status = statusOf(row);
    return el('header', { className: 'card__head' }, [
      el('span', { className: 'rank rank--' + status.level, attrs: { 'aria-hidden': 'true' }, text: format.number(rank) }),
      el('div', { className: 'card__heading' }, [
        el('h3', { className: 'card__title', attrs: { id: titleId } }, [
          el('span', { className: 'visually-hidden', text: text('card.rankLabel', { rank: format.number(rank) }) + ': ' }),
          row.hospital.name
        ]),
        buildMeta(row),
        buildTags(row)
      ]),
      ctx.features.favorites ? buildFavoriteButton(row, ctx) : null
    ]);
  }

  /* ---- Süre ve yoğunluk -------------------------------------------------- */

  function buildTile(iconName, label, value) {
    return el('li', { className: 'tile' }, [
      dom.icon(iconName, 'tile__icon'),
      el('span', { className: 'tile__label', text: label }),
      el('span', { className: 'tile__value', text: value })
    ]);
  }

  function buildTiles(row) {
    const physicians = row.hospital.activePhysicians;
    return el('ul', { className: 'tiles' }, [
      buildTile('car', text('card.tileTravel'), format.minutesRange(row.travelMinutes)),
      buildTile('hourglass', text('card.tileWait'), format.minutesRange(row.waitMinutes)),
      buildTile('doctor', text('card.tilePhysicians'), physicians == null ? text('card.unknown') : format.number(physicians))
    ]);
  }

  function buildTotal(row) {
    return el('div', { className: 'total' }, [
      el('span', { className: 'total__label', text: text('card.totalLabel') }),
      el('span', { className: 'total__value', text: format.minutesRange(row.totalMinutes) }),
      el('span', { className: 'total__note', text: text('card.totalNote') })
    ]);
  }

  /** Veri eskiyse süre/yoğunluk yerine bu uyarı çizilir. */
  function buildStaleNotice(row, nowMs) {
    const body = row.updatedAtMs
      ? text('card.staleBody', { relative: format.relative(new Date(row.updatedAtMs), nowMs) })
      : text('card.staleUnknown');
    return el('div', { className: 'stale-notice', attrs: { role: 'note' } }, [
      dom.icon('clock'),
      el('div', {}, [el('strong', { text: text('card.staleTitle') }), el('p', { text: body })])
    ]);
  }

  function buildLiveInfo(row) {
    return el('div', { className: 'card__body' }, [
      el('div', { className: 'card__status' }, [buildRing(row), buildBadge(statusOf(row))]),
      buildTotal(row),
      buildTiles(row)
    ]);
  }

  /* ---- Ayrıntılar -------------------------------------------------------- */

  function detailRow(label, value) {
    return [el('dt', { text: label }), el('dd', { text: value })];
  }

  function patientsText(count) {
    return count == null ? text('card.unknown') : text('details.patients', { count: format.number(count) });
  }

  function buildDetailsList(row, ctx) {
    const h = row.hospital;
    const updated = row.updatedAtMs ? new Date(row.updatedAtMs) : null;
    const items = [
      detailRow(text('details.distance'), format.km(row.distanceKm)),
      detailRow(text('details.registration'), format.minutesRange(ctx.registrationMinutes))
    ];
    if (!row.isStale) {
      items.push(detailRow(text('details.greenWaiting'), patientsText(h.greenWaiting)));
      items.push(detailRow(text('details.greenWait'), format.minutesRange(h.estimatedGreenWaitMinutes)));
      items.push(detailRow(text('details.yellowWaiting'), patientsText(h.yellowWaiting)));
      items.push(detailRow(text('details.yellowWait'), format.minutesRange(h.estimatedYellowWaitMinutes)));
      items.push(detailRow(text('details.physicians'), h.activePhysicians == null ? text('card.unknown') : format.number(h.activePhysicians)));
    }
    items.push(detailRow(text('details.updated'), updated
      ? text('details.updatedValue', { time: format.clock(updated), relative: format.relative(updated, ctx.nowMs) })
      : text('card.unknown')));
    items.push(detailRow(text('details.source'), text('source.' + h.dataSource)));
    return el('dl', { className: 'details-list' }, [].concat.apply([], items));
  }

  function buildDetails(row, ctx) {
    const detailsId = dom.safeDomId('details-', row.id);
    const expanded = ctx.expandedIds.has(row.id);
    const toggle = el('button', {
      className: 'disclosure',
      attrs: { type: 'button', 'aria-expanded': String(expanded), 'aria-controls': detailsId },
      data: { action: 'toggle-details', id: row.id, focusKey: 'details:' + row.id }
    }, [el('span', { text: text('card.detailsToggle') }), dom.icon('chevron', 'disclosure__chevron')]);
    const panel = el('div', { className: 'card__details', attrs: { id: detailsId, hidden: !expanded } }, [buildDetailsList(row, ctx)]);
    return [toggle, panel];
  }

  /* ---- Eylemler ---------------------------------------------------------- */

  function buildActions(row, ctx) {
    const h = row.hospital;
    const directions = el('a', {
      className: 'btn btn--primary',
      attrs: {
        href: AR.calc.buildDirectionsUrl(ctx.directionsTemplate, h.lat, h.lng),
        target: '_blank',
        rel: 'noopener noreferrer',
        'aria-label': text('card.directionsLabel', { name: h.name })
      }
    }, [dom.icon('directions'), el('span', { text: text('card.directions') })]);
    const showOnMap = ctx.mapAvailable ? el('button', {
      className: 'btn btn--secondary',
      attrs: { type: 'button', 'aria-label': text('card.showOnMapLabel', { name: h.name }) },
      data: { action: 'show-on-map', id: row.id, focusKey: (ctx.focusPrefix || '') + 'map:' + row.id }
    }, [dom.icon('pin'), el('span', { text: text('card.showOnMap') })]) : null;
    const share = ctx.features.share ? el('button', {
      className: 'btn btn--secondary',
      attrs: { type: 'button', 'aria-label': text('card.shareLabel', { name: h.name }) },
      data: { action: 'share', id: row.id, focusKey: (ctx.focusPrefix || '') + 'share:' + row.id }
    }, [dom.icon('share'), el('span', { text: text('card.share') })]) : null;
    return el('div', { className: 'card__actions' }, [directions, showOnMap, share]);
  }

  /* ---- Kart ve liste ----------------------------------------------------- */

  /**
   * Tek kart.
   * @param {Row} row
   * @param {number} rank  Listedeki sıra (haritadaki numarayla aynı)
   * @param {Object} ctx   Çizim bağlamı (bkz. renderList)
   */
  function buildCard(row, rank, ctx) {
    const titleId = dom.safeDomId('card-title-', row.id);
    const article = el('article', {
      className: 'card' + (row.isStale ? ' card--stale' : '') + (ctx.highlightedId === row.id ? ' is-highlighted' : ''),
      attrs: { id: dom.safeDomId('hospital-', row.id), 'aria-labelledby': titleId, tabindex: '-1' },
      data: { hospitalId: row.id }
    }, [
      buildHead(row, rank, ctx, titleId),
      row.isStale ? buildStaleNotice(row, ctx.nowMs) : buildLiveInfo(row)
    ].concat(buildDetails(row, ctx), [buildActions(row, ctx)]));
    return el('li', { className: 'card-item', style: { '--i': Math.min(rank - 1, ctx.maxStagger) } }, [article]);
  }

  /**
   * Listeyi baştan çizer.
   * @param {HTMLElement} listEl  <ol>
   * @param {Row[]} rows          Sıralanmış ve süzülmüş satırlar
   * @param {{favorites:Set<string>, expandedIds:Set<string>, features:Object, nowMs:number,
   *          highlightedId:?string, directionsTemplate:string, registrationMinutes:number[],
   *          mapAvailable:boolean, animate:boolean, maxStagger:number}} ctx
   */
  function renderList(listEl, rows, ctx) {
    dom.clear(listEl);
    listEl.classList.toggle('is-animated', Boolean(ctx.animate) && !dom.prefersReducedMotion());
    const fragment = document.createDocumentFragment();
    rows.forEach(function (row, index) { fragment.appendChild(buildCard(row, index + 1, ctx)); });
    listEl.appendChild(fragment);
  }

  /**
   * Öneri kutusu: seçimlere göre tahmini toplam süresi en kısa hastane.
   * @param {HTMLElement} container
   * @param {?Row} row
   * @param {number} rank  Listedeki sırası
   * @param {Object} ctx
   */
  function renderRecommendation(container, row, rank, ctx) {
    dom.clear(container);
    if (!row) {
      container.appendChild(el('p', { className: 'recommend__none', text: text('recommend.none') }));
      return;
    }
    const h = row.hospital;
    container.appendChild(el('div', { className: 'recommend__body' }, [
      el('p', { className: 'recommend__eyebrow', text: text('recommend.title') }),
      el('p', { className: 'recommend__name' }, [
        el('span', { className: 'rank rank--' + statusOf(row).level, attrs: { 'aria-hidden': 'true' }, text: format.number(rank) }),
        el('span', { text: h.name })
      ]),
      el('p', { className: 'recommend__meta', text: h.district + text('card.metaSeparator') + format.km(row.distanceKm) }),
      el('div', { className: 'recommend__total' }, [
        el('span', { className: 'total__label', text: text('recommend.totalLabel') }),
        el('span', { className: 'total__value', text: format.minutesRange(row.totalMinutes) })
      ]),
      buildBadge(statusOf(row)),
      el('p', { className: 'recommend__basis', text: text('recommend.basis') })
    ]));
    // NOT: Öneri kutusundaki düğmeler karttakilerden ayrı odak anahtarı taşır.
    const actions = buildActions(row, Object.assign({}, ctx, { focusPrefix: 'recommend-' }));
    actions.classList.add('recommend__actions');
    container.appendChild(actions);
  }

  /** Kart ↔ işaretçi karşılıklı vurgulama: yalnızca ilgili kartı vurgular. */
  function setHighlight(listEl, id) {
    listEl.querySelectorAll('.card.is-highlighted').forEach(function (card) { card.classList.remove('is-highlighted'); });
    if (id == null) return null;
    const card = listEl.querySelector('.card[data-hospital-id="' + CSS.escape(id) + '"]');
    if (card) card.classList.add('is-highlighted');
    return card;
  }

  /**
   * Tıklama ve vurgulama olaylarını tek yerden dinler (kartlar her çizimde yenilense de çalışır).
   * @param {HTMLElement[]} containers  Liste ve öneri kutusu
   * @param {{onAction:function(string, string, HTMLElement), onHover:function(?string)}} handlers
   */
  function bind(containers, handlers) {
    containers.forEach(function (container) {
      container.addEventListener('click', function (event) {
        const button = event.target.closest('[data-action]');
        if (button && container.contains(button)) handlers.onAction(button.dataset.action, button.dataset.id, button);
      });
      ['mouseover', 'focusin'].forEach(function (type) {
        container.addEventListener(type, function (event) {
          const card = event.target.closest('.card[data-hospital-id]');
          handlers.onHover(card ? card.dataset.hospitalId : null);
        });
      });
      container.addEventListener('mouseleave', function () { handlers.onHover(null); });
    });
  }

  AR.ui = AR.ui || {};
  AR.ui.cards = Object.freeze({
    renderList: renderList,
    renderRecommendation: renderRecommendation,
    setHighlight: setHighlight,
    bind: bind,
    statusOf: statusOf
  });
})(window.AcilRadar = window.AcilRadar || {});
