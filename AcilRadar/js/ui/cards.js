/* =============================================================================
 * js/ui/cards.js
 * NE İŞE YARAR : Acil servis kartlarını çizer; karttaki düğmelerin tıklamalarını
 *                tek dinleyiciyle app.js'e iletir; kart ↔ işaretçi vurgusunu uygular.
 * VERDİĞİ      : AcilRadar.UI.cards → renderList, setHighlight, bind,
 *                statusOf, buildBadge, buildDirections (pick.js ve map.js de kullanır)
 * NEYİ DEĞİŞTİRMEK İÇİN BURAYA BAK:
 *   - Karta yeni alan eklemek (2 yer): js/schema.js › FIELD_RULES'a kural,
 *     bu dosyada buildTags() ya da buildDetails() içine bir satır (+ metni strings.js).
 *   - Görünüm: css/components.css › .card
 * NOT (YASAL): Süre DAİMA aralık ve "tahmini" ile gösterilir. Bilgi eskiyse süre,
 *      yoğunluk ve halka HİÇ çizilmez.
 * ========================================================================== */
(function (AR) {
  'use strict';

  const dom = AR.UI.dom;
  const el = dom.el;
  const t = AR.Strings.text;
  const format = AR.Strings.format;

  const STATUS_ICONS = { low: 'check', medium: 'medium', high: 'alert', stale: 'clock' };

  /** Durum: renk sınıfı + yazı + simge (yalnız renge güvenilmez). */
  function statusOf(row) {
    const level = row.isStale ? 'stale' : row.hospital.crowdingLevel;
    return { level: level, label: t('crowding.' + level), icon: STATUS_ICONS[level] };
  }

  function buildBadge(status) {
    return el('span', { className: 'badge badge--' + status.level }, [dom.icon(status.icon), el('span', { text: status.label })]);
  }

  /** "Yol tarifi al": harici harita, yeni sekme, yalnız hedef koordinat. */
  function buildDirections(row, template) {
    const h = row.hospital;
    return el('a', {
      className: 'btn btn--primary',
      attrs: { href: AR.Calc.buildDirectionsUrl(template, h.lat, h.lng), target: '_blank', rel: 'noopener noreferrer', 'aria-label': t('card.directionsLabel', { name: h.name }) }
    }, [dom.icon('directions'), el('span', { text: t('card.directions') })]);
  }

  /* ---- Başlık bölümü ----------------------------------------------------- */

  function tag(className, iconName, label) {
    return el('li', { className: 'tag ' + className }, [iconName ? dom.icon(iconName) : null, el('span', { text: label })]);
  }

  function buildTags(row, isShortest) {
    const h = row.hospital;
    const items = [
      isShortest ? tag('tag--shortest', 'clock', t('card.shortest')) : null,
      h.childER ? tag('tag--child', 'child', t('card.childER')) : null,
      h.isForecast ? tag('tag--forecast', 'clock', t('card.forecast')) : null,
      h.dataSource === 'simulated' ? tag('tag--sample', null, t('card.sample')) : null,
      // Düşük güven arayüzde GÖSTERİLİR. Örnek veride zaten "Örnek veri" etiketi var.
      h.confidence === 'low' && h.dataSource !== 'simulated' ? tag('tag--lowconf', 'info', t('card.lowConfidence')) : null
    ].filter(Boolean);
    return items.length > 0 ? el('ul', { className: 'tags' }, items) : null;
  }

  /** İlçe · mesafe · yol süresi. Her parça kendi içinde bölünmez ("3–4 dk." alt satıra kırılmaz). */
  function buildMeta(row) {
    const parts = [row.hospital.district, format.km(row.distanceKm), t('card.travelMeta', { range: format.minutesRange(row.travelMinutes) })];
    const line = el('span');
    parts.forEach(function (part, index) {
      if (index > 0) line.appendChild(document.createTextNode(t('card.separator')));
      line.appendChild(el('span', { className: 'nowrap', text: part }));
    });
    return el('p', { className: 'card__meta' }, [dom.icon('pin'), line]);
  }

  /** Doluluk halkası. Yüzde yazıyla da verilir. */
  function buildRing(row) {
    const value = format.percent(row.hospital.occupancyPercent);
    return el('div', {
      className: 'ring ring--' + row.hospital.crowdingLevel,
      attrs: { role: 'img', 'aria-label': t('card.occupancy', { value: value }) },
      style: { '--p': row.hospital.occupancyPercent }
    }, [el('span', { className: 'ring__value', attrs: { 'aria-hidden': 'true' }, text: value })]);
  }

  function buildHead(row, rank, titleId, isShortest) {
    return el('header', { className: 'card__head' }, [
      el('span', { className: 'rank rank--' + statusOf(row).level, attrs: { 'aria-hidden': 'true' }, text: format.number(rank) }),
      el('div', { className: 'card__heading' }, [
        el('h3', { className: 'card__title', attrs: { id: titleId } }, [
          el('span', { className: 'visually-hidden', text: t('card.rank', { rank: format.number(rank) }) + ': ' }),
          row.hospital.name
        ]),
        buildMeta(row),
        buildTags(row, isShortest)
      ]),
      row.isStale ? null : buildRing(row)
    ]);
  }

  /* ---- Süre ve durum ------------------------------------------------------ */

  function tile(iconName, label, value) {
    return el('li', { className: 'tile' }, [
      dom.icon(iconName, 'tile__icon'),
      el('span', { className: 'tile__label', text: label }),
      el('span', { className: 'tile__value', text: value })
    ]);
  }

  function buildLiveBody(row) {
    const physicians = row.hospital.activePhysicians;
    return el('div', { className: 'card__body' }, [
      buildBadge(statusOf(row)),
      el('p', { className: 'total' }, [
        el('span', { className: 'total__label', text: t('card.totalLabel') }),
        el('span', { className: 'total__value', text: format.minutesRange(row.totalMinutes) }),
        el('span', { className: 'total__note', text: t('card.totalNote') })
      ]),
      el('ul', { className: 'tiles' }, [
        tile('car', t('card.tileTravel'), format.minutesRange(row.travelMinutes)),
        tile('hourglass', t('card.tileWait'), format.minutesRange(row.waitMinutes)),
        tile('doctor', t('card.tilePhysicians'), physicians == null ? t('card.unknown') : format.number(physicians))
      ])
    ]);
  }

  function buildStaleBody(row) {
    const body = row.staleReason === 'future' ? t('card.staleFuture') : t('card.staleAge', { relative: format.ago(row.ageMinutes) });
    return el('div', { className: 'state state--stale', attrs: { role: 'note' } }, [
      el('span', { className: 'state__icon' }, [dom.icon('clock')]),
      el('div', { className: 'state__content' }, [
        el('p', { className: 'state__title', text: t('card.staleTitle') }),
        el('p', { className: 'state__body', text: body })
      ])
    ]);
  }

  /* ---- Ayrıntılar -------------------------------------------------------- */

  function people(count) {
    return count == null ? t('card.unknown') : t('details.people', { count: format.number(count) });
  }

  function detailRows(row, ctx) {
    const h = row.hospital;
    const rows = [
      ['details.distance', format.km(row.distanceKm)],
      ['details.registration', format.minutesRange(ctx.registrationMinutes)]
    ];
    if (!row.isStale) {
      rows.push(['details.nonUrgentWaiting', people(h.nonUrgentWaiting)]);
      rows.push(['details.nonUrgentWait', format.minutesRange(h.nonUrgentWaitMinutes)]);
      rows.push(['details.urgentWaiting', people(h.urgentWaiting)]);
      rows.push(['details.urgentWait', format.minutesRange(h.urgentWaitMinutes)]);
      rows.push(['details.physicians', h.activePhysicians == null ? t('card.unknown') : format.number(h.activePhysicians)]);
    }
    rows.push(['details.updated', row.staleReason === 'future' ? t('card.unknown') : format.ago(row.ageMinutes)]);
    rows.push(['details.kind', t(h.isForecast ? 'details.kindForecast' : 'details.kindNow')]);
    rows.push(['details.source', t('source.' + h.dataSource)]);
    if (!row.isStale && h.confidence) rows.push(['details.confidence', t('confidence.' + h.confidence)]);
    if (!row.isStale && h.occupancyRange) {
      rows.push(['details.occupancyRange', h.occupancyRange[0] === h.occupancyRange[1] ? format.percent(h.occupancyRange[0])
        : t('details.occupancyRangeValue', { low: format.number(h.occupancyRange[0]), high: format.number(h.occupancyRange[1]) })]);
    }
    if (!row.isStale && h.factors && h.factors.length) {
      rows.push(['details.factors', h.factors.map(function (f) {
        return t('factors.' + f.key + '.' + (f.points >= 0 ? 'up' : 'down'), { n: format.number(Math.abs(f.points)) });
      }).join(' ')]);
    }
    return rows;
  }

  function buildDetails(row, ctx) {
    const panelId = dom.safeDomId('details-', row.id);
    const expanded = ctx.expandedIds.has(row.id);
    const toggle = el('button', {
      className: 'disclosure',
      attrs: { type: 'button', 'aria-expanded': String(expanded), 'aria-controls': panelId },
      data: { action: 'details', id: row.id, focusKey: 'details:' + row.id }
    }, [el('span', { text: t('card.details') }), dom.icon('chevron', 'disclosure__chevron')]);
    const list = el('dl', { className: 'details' });
    detailRows(row, ctx).forEach(function (pair) {
      list.appendChild(el('div', { className: 'details__row' }, [el('dt', { text: t(pair[0]) }), el('dd', { text: pair[1] })]));
    });
    return [toggle, el('div', { className: 'card__details', attrs: { id: panelId, hidden: !expanded } }, [list])];
  }

  function buildActions(row, ctx) {
    const showOnMap = ctx.mapAvailable ? el('button', {
      className: 'btn btn--secondary',
      attrs: { type: 'button', 'aria-label': t('card.showOnMapLabel', { name: row.hospital.name }) },
      data: { action: 'map', id: row.id, focusKey: 'map:' + row.id }
    }, [dom.icon('map'), el('span', { text: t('card.showOnMap') })]) : null;
    return el('div', { className: 'card__actions' }, [buildDirections(row, ctx.directionsTemplate), showOnMap]);
  }

  /* ---- Kart ve liste ------------------------------------------------------ */

  function buildCard(row, rank, ctx) {
    const level = statusOf(row).level;
    const isShortest = ctx.shortestId === row.id;
    const titleId = dom.safeDomId('card-title-', row.id);
    const article = el('article', {
      className: 'card card--' + level + (isShortest ? ' card--shortest' : '') + (ctx.highlightedId === row.id ? ' is-highlighted' : ''),
      attrs: { id: dom.safeDomId('hospital-', row.id), 'aria-labelledby': titleId, tabindex: '-1' },
      data: { hospitalId: row.id }
    }, [
      buildHead(row, rank, titleId, isShortest),
      row.isStale ? buildStaleBody(row) : buildLiveBody(row)
    ].concat(buildDetails(row, ctx), [buildActions(row, ctx)]));
    return el('li', { className: 'card-item', style: { '--i': Math.min(rank - 1, ctx.maxAnimated) } }, [article]);
  }

  /**
   * Listeyi baştan çizer.
   * @param {HTMLElement} listEl
   * @param {Row[]} rows  süzülmüş ve sıralanmış
   * @param {{expandedIds:Set<string>, highlightedId:?string, shortestId:?string, mapAvailable:boolean,
   *          directionsTemplate:string, registrationMinutes:number[], animate:boolean, maxAnimated:number}} ctx
   */
  function renderList(listEl, rows, ctx) {
    dom.clear(listEl);
    listEl.classList.toggle('is-animated', Boolean(ctx.animate) && !dom.prefersReducedMotion());
    const fragment = document.createDocumentFragment();
    rows.forEach(function (row, index) { fragment.appendChild(buildCard(row, index + 1, ctx)); });
    listEl.appendChild(fragment);
    listEl.setAttribute('aria-busy', 'false');
  }

  /** Yalnız ilgili kartı vurgular; kartı döndürür. */
  function setHighlight(listEl, id) {
    listEl.querySelectorAll('.card.is-highlighted').forEach(function (card) { card.classList.remove('is-highlighted'); });
    if (id == null) return null;
    const card = listEl.querySelector('.card[data-hospital-id="' + CSS.escape(id) + '"]');
    if (card) card.classList.add('is-highlighted');
    return card;
  }

  /**
   * Olayları kapsayıcıdan dinler (kartlar yeniden çizilse de çalışır).
   * @param {HTMLElement[]} containers
   * @param {{onAction:function(string,string,HTMLElement), onHover:function(?string)}} handlers
   */
  function bind(containers, handlers) {
    containers.forEach(function (container) {
      container.addEventListener('click', function (event) {
        const target = event.target.closest('[data-action]');
        if (target && container.contains(target)) handlers.onAction(target.dataset.action, target.dataset.id, target);
      });
      ['mouseover', 'focusin'].forEach(function (type) {
        container.addEventListener(type, function (event) {
          const card = event.target.closest('[data-hospital-id]');
          handlers.onHover(card ? card.dataset.hospitalId : null);
        });
      });
      container.addEventListener('mouseleave', function () { handlers.onHover(null); });
    });
  }

  AR.UI = AR.UI || {};
  AR.UI.cards = Object.freeze({
    renderList: renderList,
    setHighlight: setHighlight,
    bind: bind,
    statusOf: statusOf,
    buildBadge: buildBadge,
    buildDirections: buildDirections
  });
})(window.AcilRadar = window.AcilRadar || {});
