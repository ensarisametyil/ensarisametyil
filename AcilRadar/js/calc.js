/* =============================================================================
 * js/calc.js
 * NE İŞE YARAR : Mesafe, süre aralığı, veri yaşı, filtre, sıralama, en kısa süre
 *                seçimi, özet ve zaman seçeneği hesapları. Hepsi SAF fonksiyondur:
 *                DOM'a dokunmaz, ağa çıkmaz, saati kendisi okumaz (parametre alır).
 * VERDİĞİ      : AcilRadar.Calc
 * NEYİ DEĞİŞTİRMEK İÇİN BURAYA BAK:
 *   - Katsayılar: js/config.js › TRAVEL, REGISTRATION_MINUTES (burası değil).
 *   - Formülün kendisi: buildRow(). Değiştirirseniz strings.js › info.formula*
 *     metinlerini de güncelleyin.
 * NOT: Sıralama yalnız nesnel ölçütlerle yapılır; eşitlikte ada göre alfabetik.
 *      Hiçbir hastaneye öncelik verilmez.
 * ========================================================================== */
(function (AR) {
  'use strict';

  const EARTH_RADIUS_KM = 6371;
  const MINUTES_PER_HOUR = 60;
  const MS_PER_MINUTE = 60000;
  const CROWDING_RANK = { low: 0, medium: 1, high: 2 };

  /**
   * Bir hastanenin hesaplanmış görünümü.
   * @typedef {Object} Row
   * @property {string}   id
   * @property {Hospital} hospital
   * @property {number}   distanceKm     Tahmini yol mesafesi
   * @property {number[]} travelMinutes  [en az, en çok]
   * @property {?number[]} waitMinutes   Bilgi eskiyse null
   * @property {?number[]} totalMinutes  Bilgi eskiyse null
   * @property {boolean}  isStale
   * @property {?('age'|'future')} staleReason
   * @property {number}   ageMinutes     Sunucu saatine göre bilginin yaşı
   */

  /* ---- Mesafe ve süre ---------------------------------------------------- */

  function toRadians(degrees) {
    return (degrees * Math.PI) / 180;
  }

  /** Kuş uçuşu mesafe (km). a, b: { lat, lng } */
  function haversineKm(a, b) {
    const dLat = toRadians(b.lat - a.lat);
    const dLng = toRadians(b.lng - a.lng);
    const h = Math.pow(Math.sin(dLat / 2), 2) +
      Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.pow(Math.sin(dLng / 2), 2);
    return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  function roadDistanceKm(straightKm, travel) {
    return straightKm * travel.ROAD_FACTOR;
  }

  /** Yol süresi aralığı (dk.): [en az, en çok] */
  function estimateTravelMinutes(roadKm, travel) {
    const base = Math.max(travel.MIN_TRAVEL_MINUTES, (roadKm / travel.AVERAGE_SPEED_KMH) * MINUTES_PER_HOUR);
    return [Math.round(base), Math.round(base * travel.TRAFFIC_FACTOR_MAX)];
  }

  /** addRanges([1,2],[3,4]) → [4,6] */
  function addRanges() {
    return Array.prototype.reduce.call(arguments, function (sum, range) {
      return [sum[0] + range[0], sum[1] + range[1]];
    }, [0, 0]);
  }

  /* ---- Veri yaşı (sunucu saatiyle) ---------------------------------------- */

  /**
   * Tarayıcı saati yanlış olsa bile doğru sonuç için yaş, sunucunun generatedAt
   * değerine göre hesaplanır; yanıttan bu yana geçen süre tarayıcının kendi
   * saat FARKIYLA eklenir (mutlak saat kullanılmaz).
   * @param {{generatedAtMs:number, receivedAtMs:number}} timing
   */
  function serverNowMs(timing, nowMs) {
    return timing.generatedAtMs + Math.max(0, nowMs - timing.receivedAtMs);
  }

  /** @returns {{isStale:boolean, reason:?string, ageMinutes:number}} */
  function freshness(updatedAtMs, timing, nowMs, cfg) {
    const ageMinutes = (serverNowMs(timing, nowMs) - updatedAtMs) / MS_PER_MINUTE;
    const futureMinutes = (updatedAtMs - timing.generatedAtMs) / MS_PER_MINUTE;
    if (futureMinutes > cfg.FUTURE_TOLERANCE_MINUTES) return { isStale: true, reason: 'future', ageMinutes: 0 };
    if (ageMinutes > cfg.STALE_AFTER_MINUTES) return { isStale: true, reason: 'age', ageMinutes: ageMinutes };
    return { isStale: false, reason: null, ageMinutes: Math.max(0, ageMinutes) };
  }

  /** @returns {Row} */
  function buildRow(hospital, origin, timing, nowMs, cfg) {
    const distanceKm = roadDistanceKm(haversineKm(origin, hospital), cfg.TRAVEL);
    const travelMinutes = estimateTravelMinutes(distanceKm, cfg.TRAVEL);
    const fresh = freshness(hospital.updatedAtMs, timing, nowMs, cfg);
    const waitMinutes = fresh.isStale ? null : hospital.nonUrgentWaitMinutes.slice();
    return {
      id: hospital.id,
      hospital: hospital,
      distanceKm: distanceKm,
      travelMinutes: travelMinutes,
      waitMinutes: waitMinutes,
      totalMinutes: fresh.isStale ? null : addRanges(travelMinutes, cfg.REGISTRATION_MINUTES, waitMinutes),
      isStale: fresh.isStale,
      staleReason: fresh.reason,
      ageMinutes: fresh.ageMinutes
    };
  }

  /** @returns {Row[]} */
  function buildRows(hospitals, origin, timing, nowMs, cfg) {
    return hospitals.map(function (h) { return buildRow(h, origin, timing, nowMs, cfg); });
  }

  /* ---- Filtre ------------------------------------------------------------ */

  const TURKISH_FOLD = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' };

  /** "ÇAYIROVA" ile "cayirova" eşleşsin diye sadeleştirir. */
  function normalizeForSearch(value) {
    return String(value || '')
      .toLocaleLowerCase('tr-TR')
      .replace(/[çğıöşüâîû]/g, function (ch) { return TURKISH_FOLD[ch]; })
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * @param {Row[]} rows
   * @param {{query:string, childOnly:boolean, levels:Set<string>}} filters
   */
  function filterRows(rows, filters) {
    const query = normalizeForSearch(filters.query);
    return rows.filter(function (row) {
      const h = row.hospital;
      if (query && normalizeForSearch(h.name + ' ' + h.district).indexOf(query) === -1) return false;
      if (filters.childOnly && !h.childER) return false;
      // Güncel bilgisi olmayanın yoğunluğu bilinmez; yoğunluk filtresinde gösterilmez.
      if (filters.levels.size > 0 && (row.isStale || !filters.levels.has(h.crowdingLevel))) return false;
      return true;
    });
  }

  function hasActiveFilters(filters) {
    return Boolean(normalizeForSearch(filters.query)) || filters.childOnly || filters.levels.size > 0;
  }

  /* ---- Sıralama ---------------------------------------------------------- */

  function compareNames(a, b) {
    return a.hospital.name.localeCompare(b.hospital.name, 'tr-TR') || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  }

  function staleLast(a, b) {
    return Number(a.isStale) - Number(b.isStale);
  }

  function compareTotal(a, b) {
    if (a.isStale || b.isStale) return staleLast(a, b);
    return a.totalMinutes[0] - b.totalMinutes[0] || a.totalMinutes[1] - b.totalMinutes[1];
  }

  function compareCrowding(a, b) {
    if (a.isStale || b.isStale) return staleLast(a, b);
    return CROWDING_RANK[a.hospital.crowdingLevel] - CROWDING_RANK[b.hospital.crowdingLevel] ||
      a.hospital.occupancyPercent - b.hospital.occupancyPercent;
  }

  const COMPARATORS = {
    total: function (a, b) { return compareTotal(a, b) || a.distanceKm - b.distanceKm || compareNames(a, b); },
    distance: function (a, b) { return a.distanceKm - b.distanceKm || compareNames(a, b); },
    crowding: function (a, b) { return compareCrowding(a, b) || compareTotal(a, b) || compareNames(a, b); }
  };

  /** Yeni dizi döndürür; girdi değişmez. Bilinmeyen anahtarda 'total'. */
  function sortRows(rows, sortKey) {
    return rows.slice().sort(COMPARATORS[sortKey] || COMPARATORS.total);
  }

  /* ---- Seçim ve özet ----------------------------------------------------- */

  /** Güncel bilgisi olanlar içinde tahmini toplam süresi en kısa (yoksa null). */
  function pickShortest(rows) {
    const fresh = rows.filter(function (row) { return !row.isStale; });
    return fresh.length > 0 ? sortRows(fresh, 'total')[0] : null;
  }

  /** @returns {{count:number, leastCrowded:?Row, nearest:?Row}} */
  function summarize(rows) {
    const fresh = rows.filter(function (row) { return !row.isStale; });
    return {
      count: rows.length,
      leastCrowded: fresh.length > 0 ? sortRows(fresh, 'crowding')[0] : null,
      nearest: rows.length > 0 ? sortRows(rows, 'distance')[0] : null
    };
  }

  /** Harici harita bağlantısı: yalnız hedef koordinat. */
  function buildDirectionsUrl(template, lat, lng) {
    return template
      .replace('{lat}', encodeURIComponent(String(lat)))
      .replace('{lng}', encodeURIComponent(String(lng)));
  }

  /* ---- Zaman seçenekleri ------------------------------------------------- */

  /** Verilen saat diliminde günün kaçıncı dakikası (0–1439). */
  function minutesOfDay(ms, timeZone) {
    const parts = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: timeZone })
      .formatToParts(new Date(ms));
    const read = function (type) {
      const part = parts.find(function (p) { return p.type === type; });
      return part ? Number(part.value) : 0;
    };
    return read('hour') * MINUTES_PER_HOUR + read('minute');
  }

  /**
   * Belirli saatli seçenek (ör. Akşam 20:00) bugün için geçti mi?
   * NOT: Geçtiyse yarına kaydırılmaz; arayüz "bugün için geçti" yazar.
   */
  function isSlotPassed(slot, currentMinuteOfDay) {
    if (slot.atHour == null) return false;
    return currentMinuteOfDay >= slot.atHour * MINUTES_PER_HOUR + (slot.atMinute || 0);
  }

  AR.Calc = Object.freeze({
    haversineKm: haversineKm,
    roadDistanceKm: roadDistanceKm,
    estimateTravelMinutes: estimateTravelMinutes,
    addRanges: addRanges,
    serverNowMs: serverNowMs,
    freshness: freshness,
    buildRow: buildRow,
    buildRows: buildRows,
    normalizeForSearch: normalizeForSearch,
    filterRows: filterRows,
    hasActiveFilters: hasActiveFilters,
    sortRows: sortRows,
    pickShortest: pickShortest,
    summarize: summarize,
    buildDirectionsUrl: buildDirectionsUrl,
    minutesOfDay: minutesOfDay,
    isSlotPassed: isSlotPassed
  });
})(window.AcilRadar = window.AcilRadar || {});
