/* =============================================================================
 * motor/core/queue.js
 * NE İŞE YARAR : Tek bir Monte Carlo koşusu: olay güdümlü kuyruk benzetimi.
 *   - 3 triyaj sınıfı (kırmızı > sarı > yeşil), MÜDAHALESİZ öncelik, sınıf içinde sıra.
 *   - Zamana bağlı hekim sayısı (vardiya), zamana bağlı başvuru hızı (inceltme yöntemi).
 *   - Vazgeçme (LWBS): sabır süresi dolan bekleyen ayrılır.
 *   - Yatış bekleyenler (boarding) yatak/gözlem alanını bloklar; yatak gerektiren sınıf
 *     yatak yoksa bekler (alt sınıf öne geçebilir — yeşil hızlı alan yatak istemez).
 *   - İstenen anlarda durum kesiti: bekleyen, muayenede, yatış bekleyen, hekim.
 *   - "Ölçüm hastası": her durum kesitinde her sınıf için SIFIR süreli sanal bir hasta
 *     sıraya girer; muayeneye alınma anı, o anda gelen yeni bir hastanın bekleyeceği
 *     süreyi verir. Süresi sıfır olduğu için kimseyi geciktirmez, sayımlara girmez.
 * NEYİ DEĞİŞTİRMEK İÇİN BURAYA BAK: davranış ayarları config'te; algoritma bu dosyada.
 * GÜVENLİK: olay sayısı config.SIMULATION.MAX_EVENTS_PER_RUN ile sınırlı.
 * ========================================================================== */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./config.js'), require('./service.js'));
  else { const ns = root.AcilRadarMotor = root.AcilRadarMotor || {}; ns.queue = factory(ns.config, ns.service); }
})(typeof self !== 'undefined' ? self : this, function (config, service) {
  'use strict';

  const CLASSES = config.CLASSES;
  const MIX = CLASSES.map(function (c) { return config.CLASS_MIX[c]; });
  // Aynı andaki olayların işlenme sırası
  const SNAPSHOT = 0;
  const PHYSICIANS = 1;
  const DEPART = 2;
  const BOARD_END = 3;
  const ARRIVAL = 4;
  const KICK = 5;

  /* ---- Küçük ikili yığın (en küçük zaman önce) ---------------------------------- */

  function Heap() {
    this.items = [];
    this.seq = 0;
  }

  function before(a, b) {
    if (a.t !== b.t) return a.t < b.t;
    if (a.type !== b.type) return a.type < b.type;
    return a.seq < b.seq;
  }

  Heap.prototype.push = function (t, type, data) {
    const node = { t: t, type: type, data: data, seq: this.seq++ };
    const items = this.items;
    items.push(node);
    let i = items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (!before(items[i], items[parent])) break;
      const tmp = items[i]; items[i] = items[parent]; items[parent] = tmp;
      i = parent;
    }
  };

  Heap.prototype.pop = function () {
    const items = this.items;
    const top = items[0];
    const last = items.pop();
    if (items.length) {
      items[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < items.length && before(items[l], items[m])) m = l;
        if (r < items.length && before(items[r], items[m])) m = r;
        if (m === i) break;
        const tmp = items[i]; items[i] = items[m]; items[m] = tmp;
        i = m;
      }
    }
    return top;
  };

  /* ---- Sıra (baş işaretçili dizi; shift() maliyetinden kaçınır) ------------------ */

  function Line() {
    this.items = [];
    this.head = 0;
  }

  Line.prototype.push = function (p) { this.items.push(p); };

  /** Başta sabrı dolmuşları atar; atılan sayısını döndürür. */
  Line.prototype.purgeHead = function (now) {
    let dropped = 0;
    while (this.head < this.items.length) {
      const p = this.items[this.head];
      if (p.tag || p.deadline > now) break;
      this.head += 1;
      dropped += 1;
    }
    return dropped;
  };

  Line.prototype.peek = function () { return this.head < this.items.length ? this.items[this.head] : null; };
  Line.prototype.shift = function () { return this.items[this.head++]; };

  /** Sabrı dolmamış gerçek bekleyen sayısı. */
  Line.prototype.countActive = function (now) {
    let n = 0;
    for (let i = this.head; i < this.items.length; i++) {
      const p = this.items[i];
      if (!p.tag && p.deadline > now) n += 1;
    }
    return n;
  };

  /* ---- Benzetim ----------------------------------------------------------------- */

  /**
   * @param {Object} o
   * @param {Object} o.initial       { waiting:{red,yellow,green}, inService, boarding }
   * @param {Rng}    o.rng
   * @param {{slotMinutes:number, rates:Float64Array}} o.rateTable  dakika başına hız
   * @param {number} o.scale         talep ölçeği örneği (hız tablosuyla çarpılır)
   * @param {Object} o.serviceParams service.sampleParams() çıktısı
   * @param {{at:number, count:number}[]} o.physicianChanges
   * @param {number[]} o.snapshots   artan sırada dakika
   * @param {?number}  o.bedCapacity null = yatak kısıtı yok
   * @param {string[]} [o.tagClasses] ölçüm hastası sınıfları
   * @param {boolean}  [o.noAdmissions] karşıolgusal: yeni yatış bekleyen oluşmaz
   */
  function simulate(o) {
    const rng = o.rng;
    const heap = new Heap();
    const lines = {};
    CLASSES.forEach(function (c) { lines[c] = new Line(); });
    const tagClasses = o.tagClasses || [];
    const maxEvents = config.SIMULATION.MAX_EVENTS_PER_RUN;
    const lastSnapshot = o.snapshots[o.snapshots.length - 1];
    const stopAt = lastSnapshot + config.SIMULATION.TAG_EXTENSION_MINUTES;
    const rates = o.rateTable.rates;
    const slot = o.rateTable.slotMinutes;
    let maxRate = 0;
    for (let i = 0; i < rates.length; i++) if (rates[i] > maxRate) maxRate = rates[i];
    maxRate *= o.scale;

    const state = { total: o.physicianChanges[0].count, busy: 0, inService: 0, boarding: 0, bedsUsed: 0, lwbs: 0 };
    const bedCap = o.bedCapacity;
    const snaps = [];
    const tagWaits = o.snapshots.map(function () { return {}; });
    let pendingTags = 0;
    let events = 0;

    function patienceDeadline(cls, now) {
      const mean = config.PATIENCE_MEAN_MINUTES[cls];
      return mean ? now + rng.exponential(1 / mean) : Infinity;
    }

    function enqueue(cls, now) {
      lines[cls].push({ tag: false, arrival: now, deadline: patienceDeadline(cls, now) });
    }

    function scheduleArrival(now) {
      if (!(maxRate > 0)) return;
      let t = now;
      for (let guard = 0; guard < maxEvents; guard++) {
        t += rng.exponential(maxRate);
        if (t > stopAt) return;
        const index = Math.min(rates.length - 1, Math.floor(t / slot));
        if (rng.uniform() * maxRate <= rates[index] * o.scale) {
          heap.push(t, ARRIVAL, null);
          return;
        }
      }
    }

    function bedFree() {
      return bedCap === null || state.bedsUsed < bedCap;
    }

    function startService(now) {
      for (let guard = 0; guard < maxEvents; guard++) {
        let pick = null;
        for (let i = 0; i < CLASSES.length; i++) {
          const cls = CLASSES[i];
          state.lwbs += lines[cls].purgeHead(now);
          const head = lines[cls].peek();
          if (!head) continue;
          if (state.total - state.busy <= 0) continue;   // boş hekim yok (ölçüm hastası da bekler)
          if (!head.tag && config.NEEDS_BED[cls] && !bedFree()) continue;
          pick = cls;
          break;
        }
        if (pick === null) return;
        const p = lines[pick].shift();
        if (p.tag) {
          tagWaits[p.snapshotIndex][pick] = { wait: now - p.arrival, censored: false };
          pendingTags -= 1;
          continue;
        }
        beginService(pick, now, null);
      }
    }

    function beginService(cls, now, residual) {
      const needsBed = config.NEEDS_BED[cls] && bedCap !== null;
      state.busy += 1;
      state.inService += 1;
      if (needsBed) state.bedsUsed += 1;
      const duration = residual !== null ? residual : service.sampleService(cls, o.serviceParams, rng);
      heap.push(now + duration, DEPART, { cls: cls, bed: needsBed });
    }

    function depart(now, d) {
      state.busy -= 1;
      state.inService -= 1;
      if (d.bed) state.bedsUsed -= 1;
      if (!o.noAdmissions && rng.bernoulli(config.ADMIT_PROBABILITY[d.cls])) {
        state.boarding += 1;
        state.bedsUsed += 1;
        heap.push(now + service.sampleBoarding(rng), BOARD_END, null);
      }
    }

    function snapshot(now, index) {
      const waiting = {};
      let totalWaiting = 0;
      CLASSES.forEach(function (c) {
        waiting[c] = lines[c].countActive(now);
        totalWaiting += waiting[c];
      });
      snaps.push({ at: now, waiting: waiting, inService: state.inService, boarding: state.boarding,
        occupants: totalWaiting + state.inService + state.boarding, physicians: state.total });
      tagClasses.forEach(function (cls) {
        lines[cls].push({ tag: true, arrival: now, deadline: Infinity, snapshotIndex: index });
        pendingTags += 1;
      });
    }

    // ---- Başlangıç durumu (gözlenen an) ----
    const init = o.initial;
    const inService = Math.min(init.inService, state.total);
    for (let i = 0; i < inService; i++) {
      const cls = rng.choice(CLASSES, MIX);
      // Kalan süre: tam süre × U(0,1) (geçen süre bilinmiyor)
      beginService(cls, 0, service.sampleService(cls, o.serviceParams, rng) * rng.uniform());
    }
    for (let i = 0; i < init.boarding; i++) {
      state.boarding += 1;
      state.bedsUsed += 1;
      heap.push(service.sampleBoarding(rng) * rng.uniform(), BOARD_END, null);
    }
    CLASSES.forEach(function (c) {
      for (let i = 0; i < (init.waiting[c] || 0); i++) enqueue(c, 0);
    });
    o.physicianChanges.forEach(function (ch, i) { if (i > 0) heap.push(ch.at, PHYSICIANS, ch.count); });
    o.snapshots.forEach(function (at, i) { heap.push(at, SNAPSHOT, i); });
    heap.push(0, KICK, null);
    scheduleArrival(0);

    // ---- Olay döngüsü ----
    let now = 0;
    let truncated = false;
    while (heap.items.length) {
      if (++events > maxEvents) { truncated = true; break; }
      const ev = heap.pop();
      now = ev.t;
      if (now > stopAt) break;
      if (now > lastSnapshot && pendingTags === 0) break;
      switch (ev.type) {
        case SNAPSHOT: snapshot(now, ev.data); break;
        case PHYSICIANS: state.total = ev.data; break;
        case DEPART: depart(now, ev.data); break;
        case BOARD_END: state.boarding -= 1; state.bedsUsed -= 1; break;
        case ARRIVAL: enqueue(rng.choice(CLASSES, MIX), now); scheduleArrival(now); break;
        default: break;
      }
      startService(now);
    }

    // Muayeneye alınamamış ölçüm hastaları: süre sansürlü (en az bu kadar).
    const end = Math.min(Math.max(now, lastSnapshot), stopAt);
    tagWaits.forEach(function (w, i) {
      tagClasses.forEach(function (cls) {
        if (!w[cls]) w[cls] = { wait: Math.max(0, end - o.snapshots[i]), censored: true };
      });
    });
    return { snapshots: snaps, tagWaits: tagWaits, lwbs: state.lwbs, events: events, truncated: truncated };
  }

  return { simulate: simulate };
});
