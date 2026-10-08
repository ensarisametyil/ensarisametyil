/* =============================================================================
 * DOSYA ADI    : js/calc.js
 * NE İŞE YARAR : Mesafe, süre, filtre, sıralama, öneri ve özet hesapları.
 *                Hepsi SAF fonksiyondur: DOM'a dokunmaz, ağa çıkmaz, saat okumaz
 *                (şimdiki zaman parametre olarak gelir). Bu yüzden
 *                tests/smoke-test.html ile kolayca sınanır.
 * NEYİ ALIR    : Hospital[] (js/api.js), başlangıç noktası, ayarlar (config).
 * NEYİ VERİR   : AcilRadar.calc → buildRows, filterRows, sortRows,
 *                pickRecommendation, summarize, haversineKm, … (aşağıda listesi var)
 * NEYİ DEĞİŞTİRMEK İÇİN BURAYA BAK:
 *   - Formülün KATSAYILARI: js/config.js › TRAVEL, REGISTRATION_MINUTES (burayı değil!)
 *   - Formülün KENDİSİ: buildRow(). Değiştirirseniz strings.js › formula metnini de
 *     güncelleyin; sayfadaki "Süre nasıl hesaplanıyor?" bölümü oradan gelir.
 *   - Yeni sıralama ölçütü: COMPARATORS'a ekleyin + config.SORT_KEYS + strings.js › sort.
 * NOT: Sıralama yalnızca nesnel ölçütlerle yapılır. Eşitlikte hastane adına göre
 *      alfabetik sıralanır; hiçbir hastaneye öncelik/sponsorluk verilmez.
 * ========================================================================== */
(function (AR) {
  'use strict';

  const EARTH_RADIUS_KM = 6371;
  const MINUTES_PER_HOUR = 60;
  const MS_PER_MINUTE = 60000;
  const CROWDING_RANK = { low: 0, medium: 1, high: 2 };

  /**
   * Bir hastanenin hesaplanmış görünümü (liste, harita ve öneri bunu kullanır).
   * @typedef {Object} Row
   * @property {string}   id
   * @property {Hospital} hospital
   * @property {number}   distanceKm       Tahmini YOL mesafesi (kuş uçuşu × yol çarpanı)
   * @property {number[]} travelMinutes    [alt, üst]
   * @property {?number[]} waitMinutes     [alt, üst]; veri eskiyse null
   * @property {?number[]} totalMinutes    [alt, üst]; veri eskiyse null
   * @property {boolean}  isStale          Veri STALE_AFTER_MINUTES'tan eski mi
   * @property {?number}  updatedAtMs      Son güncelleme (ms) ya da null
   */

  /* ---- Mesafe ve süre ---------------------------------------------------- */

  function toRadians(degrees) {
    return (degrees * Math.PI) / 180;
  }

  /** İki nokta arası kuş uçuşu mesafe (km). a, b: { lat, lng } */
  function haversineKm(a, b) {
    const dLat = toRadians(b.lat - a.lat);
    const dLng = toRadians(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 +
      Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  /** Kuş uçuşu mesafeyi tahmini yol mesafesine çevirir. */
  function roadDistanceKm(straightKm, travelCfg) {
    return straightKm * travelCfg.ROAD_FACTOR;
  }

  /** Yol mesafesinden yol süresi aralığı (dk.): [alt, üst] */
  function estimateTravelMinutes(roadKm, travelCfg) {
    const base = Math.max(travelCfg.MIN_TRAVEL_MINUTES, (roadKm / travelCfg.AVERAGE_SPEED_KMH) * MINUTES_PER_HOUR);
    return [Math.round(base), Math.round(base * travelCfg.TRAFFIC_FACTOR_MAX)];
  }

  /** Aralıkları toplar: addRanges([1,2],[3,4]) → [4,6] */
  function addRanges() {
    return Array.prototype.reduce.call(arguments, function (sum, range) {
      return [sum[0] + range[0], sum[1] + range[1]];
    }, [0, 0]);
  }

  /** Veri eskimiş mi? Tarih okunamıyorsa da "eski" sayılır (güvenli taraf). */
  function isStale(updatedAtMs, nowMs, staleAfterMinutes) {
    if (updatedAtMs == null || Number.isNaN(updatedAtMs)) return true;
    return nowMs - updatedAtMs > staleAfterMinutes * MS_PER_MINUTE;
  }

  /**
   * Tek hastane için Row üretir.
   * @param {Hospital} hospital
   * @param {{lat:number, lng:number}} origin
   * @param {number} nowMs
   * @param {Object} cfg  AcilRadar.config
   * @returns {Row}
   */
  function buildRow(hospital, origin, nowMs, cfg) {
    const distanceKm = roadDistanceKm(haversineKm(origin, hospital), cfg.TRAVEL);
    const travelMinutes = estimateTravelMinutes(distanceKm, cfg.TRAVEL);
    const parsed = Date.parse(hospital.updatedAt);
    const updatedAtMs = Number.isNaN(parsed) ? null : parsed;
    const stale = isStale(updatedAtMs, nowMs, cfg.STALE_AFTER_MINUTES);
    const waitMinutes = stale ? null : hospital.estimatedGreenWaitMinutes.slice();
    return {
      id: hospital.hospitalId,
      hospital: hospital,
      distanceKm: distanceKm,
      travelMinutes: travelMinutes,
      waitMinutes: waitMinutes,
      totalMinutes: stale ? null : addRanges(travelMinutes, cfg.REGISTRATION_MINUTES, waitMinutes),
      isStale: stale,
      updatedAtMs: updatedAtMs
    };
  }

  /** @returns {Row[]} */
  function buildRows(hospitals, origin, nowMs, cfg) {
    return hospitals.map(function (hospital) { return buildRow(hospital, origin, nowMs, cfg); });
  }

  /* ---- Filtre ------------------------------------------------------------ */

  const TURKISH_FOLD = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' };

  /** Arama için sadeleştirir: "ÇAYIROVA" ve "cayirova" eşleşsin. */
  function normalizeForSearch(value) {
    return String(value || '')
      .toLocaleLowerCase('tr-TR')
      .replace(/[çğıöşüâîû]/g, function (ch) { return TURKISH_FOLD[ch]; })
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * @param {Row[]} rows
   * @param {{query:string, childOnly:boolean, levels:Set<string>, favoritesOnly:boolean}} filters
   * @param {Set<string>} favoriteIds
   * @returns {Row[]}
   */
  function filterRows(rows, filters, favoriteIds) {
    const query = normalizeForSearch(filters.query);
    return rows.filter(function (row) {
      const h = row.hospital;
      if (query && normalizeForSearch(h.name + ' ' + h.district).indexOf(query) === -1) return false;
      if (filters.childOnly && !h.childER) return false;
      // Eski veride yoğunluk bilinmez; yoğunluk filtresi açıksa bu satır gösterilmez.
      if (filters.levels.size > 0 && (row.isStale || !filters.levels.has(h.crowdingLevel))) return false;
      if (filters.favoritesOnly && !favoriteIds.has(row.id)) return false;
      return true;
    });
  }

  /** Hiç filtre açık mı? (Boş sonuç iletisini seçmek için.) */
  function hasActiveFilters(filters) {
    return Boolean(normalizeForSearch(filters.query)) || filters.childOnly ||
      filters.levels.size > 0 || filters.favoritesOnly;
  }

  /* ---- Sıralama ---------------------------------------------------------- */

  function compareNames(a, b) {
    return a.hospital.name.localeCompare(b.hospital.name, 'tr-TR');
  }

  // Eski veri her zaman en sona gider (süresi/yoğunluğu bilinmediği için).
  function compareStaleLast(a, b) {
    return Number(a.isStale) - Number(b.isStale);
  }

  function compareTotal(a, b) {
    if (a.isStale || b.isStale) return compareStaleLast(a, b) || a.distanceKm - b.distanceKm;
    return a.totalMinutes[0] - b.totalMinutes[0] || a.totalMinutes[1] - b.totalMinutes[1];
  }

  function compareCrowding(a, b) {
    if (a.isStale || b.isStale) return compareStaleLast(a, b);
    return CROWDING_RANK[a.hospital.crowdingLevel] - CROWDING_RANK[b.hospital.crowdingLevel] ||
      a.hospital.occupancyPercent - b.hospital.occupancyPercent;
  }

  const COMPARATORS = {
    total: function (a, b) { return compareTotal(a, b) || a.distanceKm - b.distanceKm || compareNames(a, b); },
    distance: function (a, b) { return a.distanceKm - b.distanceKm || compareNames(a, b); },
    crowding: function (a, b) { return compareCrowding(a, b) || compareTotal(a, b) || compareNames(a, b); }
  };

  /** Yeni dizi döndürür; girdiyi değiştirmez. Bilinmeyen anahtarda 'total' kullanılır. */
  function sortRows(rows, sortKey) {
    const comparator = COMPARATORS[sortKey] || COMPARATORS.total;
    return rows.slice().sort(comparator);
  }

  /* ---- Öneri ve özet ----------------------------------------------------- */

  /** Güncel veriler arasında tahmini toplam süresi en kısa olan satır (yoksa null). */
  function pickRecommendation(rows) {
    const fresh = rows.filter(function (row) { return !row.isStale; });
    return fresh.length > 0 ? sortRows(fresh, 'total')[0] : null;
  }

  /**
   * Tanıtım alanındaki üç özet kutusu için.
   * @returns {{count:number, leastCrowded:?Row, nearest:?Row}}
   */
  function summarize(rows) {
    const fresh = rows.filter(function (row) { return !row.isStale; });
    return {
      count: rows.length,
      leastCrowded: fresh.length > 0 ? sortRows(fresh, 'crowding')[0] : null,
      nearest: rows.length > 0 ? sortRows(rows, 'distance')[0] : null
    };
  }

  /** "Yol tarifi al" bağlantısı. Yalnızca hedef koordinat eklenir. */
  function buildDirectionsUrl(template, lat, lng) {
    return template
      .replace('{lat}', encodeURIComponent(String(lat)))
      .replace('{lng}', encodeURIComponent(String(lng)));
  }

  AR.calc = Object.freeze({
    haversineKm: haversineKm,
    roadDistanceKm: roadDistanceKm,
    estimateTravelMinutes: estimateTravelMinutes,
    addRanges: addRanges,
    isStale: isStale,
    buildRow: buildRow,
    buildRows: buildRows,
    normalizeForSearch: normalizeForSearch,
    filterRows: filterRows,
    hasActiveFilters: hasActiveFilters,
    sortRows: sortRows,
    pickRecommendation: pickRecommendation,
    summarize: summarize,
    buildDirectionsUrl: buildDirectionsUrl
  });
})(window.AcilRadar = window.AcilRadar || {});
