/* =============================================================================
 * motor/core/explain.js
 * NE İŞE YARAR : Açıklanabilirlik. Her faktörün doluluğa katkısı KARŞIOLGUSAL
 *   benzetimle ölçülür: faktör nötrlenir, aynı tohumla (ortak rastgele sayılar)
 *   yeniden benzetilir, ortalama doluluk farkı = katkı (puan).
 *   En çok 3 faktör, sabit şablon cümlelerle verilir. Sayılar yuvarlanır;
 *   tıbbi ya da korkutucu dil kullanılmaz.
 * NEYİ DEĞİŞTİRMEK İÇİN BURAYA BAK: cümleler → TEMPLATES; ayarlar → config.EXPLAIN.
 * NOT: Katkılar toplamsal DEĞİLDİR (faktörler etkileşir); her biri "yalnız bu faktör
 *      olmasaydı" farkıdır. Bu, docs/MODEL_KARTI.md'de açıkça yazılıdır.
 * ========================================================================== */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./config.js'), require('./forecast.js'));
  else { const ns = root.AcilRadarMotor = root.AcilRadarMotor || {}; ns.explain = factory(ns.config, ns.forecast); }
})(typeof self !== 'undefined' ? self : this, function (config, forecast) {
  'use strict';

  // {n}: yuvarlanmış puan (işaretsiz). up: katkı artıysa, down: eksiyse.
  const TEMPLATES = {
    queue: { up: 'Şu an bekleyen hasta sayısı nedeniyle doluluk yaklaşık +{n} puan.', down: 'Bekleyen hasta az olduğu için doluluk yaklaşık −{n} puan.' },
    seasonal: { up: 'Günün bu saatlerindeki başvuru yoğunluğu nedeniyle doluluk yaklaşık +{n} puan.', down: 'Günün bu saatlerinde başvurular azaldığı için doluluk yaklaşık −{n} puan.' },
    holiday: { up: 'Tatil/bayram dönemi nedeniyle doluluk yaklaşık +{n} puan.', down: 'Tatil/bayram dönemi nedeniyle doluluk yaklaşık −{n} puan.' },
    surge: { up: 'Son saatlerde başvurular beklenenden fazla olduğu için doluluk yaklaşık +{n} puan.', down: 'Son saatlerdeki başvuru değişimi doluluğu yaklaşık −{n} puan etkiliyor.' },
    shift: { up: 'Hekim vardiyası değişimi nedeniyle doluluk yaklaşık +{n} puan.', down: 'Vardiyada hekim sayısı arttığı için doluluk yaklaşık −{n} puan.' },
    boarding: { up: 'Yatış bekleyen hastalar nedeniyle doluluk yaklaşık +{n} puan.', down: 'Yatış bekleyen hasta etkisi yaklaşık −{n} puan.' }
  };

  // Bekleme süresi için cümleler ({n}: dakika). Ürün çıktısında YALNIZ bunlar kullanılır
  // (hibrit yöntem: etkenler yalnız motorun kanıtlı olduğu "şimdi" yeşil bekleme içindir).
  const WAIT_TEMPLATES = {
    queue: { up: 'Şu an bekleyen hasta sayısı nedeniyle bekleme yaklaşık +{n} dk.', down: 'Bekleyen hasta az olduğu için bekleme yaklaşık −{n} dk.' },
    seasonal: { up: 'Günün bu saatlerindeki başvuru yoğunluğu nedeniyle bekleme yaklaşık +{n} dk.', down: 'Günün bu saatlerinde başvurular azaldığı için bekleme yaklaşık −{n} dk.' },
    holiday: { up: 'Tatil/bayram dönemi nedeniyle bekleme yaklaşık +{n} dk.', down: 'Tatil/bayram dönemi nedeniyle bekleme yaklaşık −{n} dk.' },
    surge: { up: 'Son saatlerde başvurular beklenenden fazla olduğu için bekleme yaklaşık +{n} dk.', down: 'Son saatlerdeki başvuru değişimi beklemeyi yaklaşık −{n} dk etkiliyor.' },
    shift: { up: 'Hekim vardiyası değişimi nedeniyle bekleme yaklaşık +{n} dk.', down: 'Vardiyada hekim sayısı arttığı için bekleme yaklaşık −{n} dk.' },
    boarding: { up: 'Yatış bekleyen hastalar nedeniyle bekleme yaklaşık +{n} dk.', down: 'Yatış bekleyen hasta etkisi bekleme için yaklaşık −{n} dk.' }
  };

  /** Hangi faktörler bu durumda anlamlı (yoksa benzetim boşa yapılmaz)? */
  function applicableFactors(record, model, targetMs, dayInfo, baseNeutral) {
    const list = ['queue', 'seasonal', 'boarding'];
    if (!baseNeutral.holiday && (dayInfo(targetMs).type || dayInfo(model.nowMs).type)) list.push('holiday');
    if (!baseNeutral.surge && model.surge.alarm) list.push('surge');
    if (record.physicianSchedule) list.push('shift');
    return list;
  }

  /**
   * @param {Object} record
   * @param {Object} model
   * @param {{startMs:number, offset:number, seed:string, dayInfo:function(number):Object,
   *          baseNeutral?:Object, fixedParams?:boolean, noBedBlocking?:boolean,
   *          target?:('occupancy'|'waitGreen')}} o  temel (kapalı bileşenler dahil); target varsayılan 'occupancy'
   * @returns {{key:string, text:string, points:number, target:string}[]}  points: puan (doluluk) ya da dakika (waitGreen)
   */
  function explain(record, model, o) {
    const runs = config.EXPLAIN.RUNS;
    const baseNeutral = o.baseNeutral || {};
    const target = o.target === 'waitGreen' ? 'waitGreen' : 'occupancy';
    const metric = function (h) { return target === 'waitGreen' ? h.waitGreen.mean : h.occupancy.mean; };
    const templates = target === 'waitGreen' ? WAIT_TEMPLATES : TEMPLATES;
    const minPoints = target === 'waitGreen' ? config.EXPLAIN.MIN_WAIT_POINTS : config.EXPLAIN.MIN_POINTS;
    const common = { startMs: o.startMs, offsets: [o.offset], seed: o.seed + '/explain', maxRuns: runs, minRuns: runs, adaptive: false, waits: target === 'waitGreen',
      fixedParams: o.fixedParams, noBedBlocking: o.noBedBlocking };
    const baseline = metric(forecast.run(record, model, Object.assign({ neutral: baseNeutral }, common)).horizons[0]);
    const factors = applicableFactors(record, model, o.startMs + o.offset * 60000, o.dayInfo, baseNeutral).map(function (key) {
      const neutral = Object.assign({}, baseNeutral);
      neutral[key] = true;
      const value = metric(forecast.run(record, model, Object.assign({ neutral: neutral }, common)).horizons[0]);
      return { key: key, points: baseline - value };
    });
    return factors
      .filter(function (f) { return isFinite(f.points) && Math.abs(f.points) >= minPoints; })
      .sort(function (a, b) { return Math.abs(b.points) - Math.abs(a.points) || (a.key < b.key ? -1 : 1); })
      .slice(0, config.EXPLAIN.MAX_FACTORS)
      .map(function (f) {
        const rounded = Math.round(f.points);
        const template = templates[f.key][rounded >= 0 ? 'up' : 'down'];
        return { key: f.key, points: rounded, target: target, text: template.replace('{n}', String(Math.abs(rounded))) };
      });
  }

  return { explain: explain, TEMPLATES: TEMPLATES, WAIT_TEMPLATES: WAIT_TEMPLATES };
});
