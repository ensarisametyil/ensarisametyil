#!/usr/bin/env node
/* Altın dosyayı yeniden üretir. YALNIZ kasıtlı model değişikliğinden sonra çalıştırın. */
'use strict';
const fs = require('fs');
const path = require('path');
const engine = require('../../core/index.js');
const { CASES, OPTIONS } = require('./cases.js');

function snapshot() {
  const out = { modelVersion: engine.MODEL_VERSION, cases: {} };
  CASES.forEach(function (c) {
    const r = engine.computeHospital(c.input, Object.assign({ nowMs: c.nowMs, seed: 'golden-' + c.name }, OPTIONS));
    out.cases[c.name] = { tier: r.tier, confidence: r.confidence, now: engine.toContract(r, 'now'), '2h': engine.toContract(r, '2h'), evening: engine.toContract(r, 'evening') };
  });
  return out;
}

if (require.main === module) {
  fs.writeFileSync(path.join(__dirname, 'golden.json'), JSON.stringify(snapshot(), null, 2) + '\n');
  console.log('golden.json yazıldı (model ' + engine.MODEL_VERSION + ').');
}
module.exports = { snapshot: snapshot };
