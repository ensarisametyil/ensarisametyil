/* =============================================================================
 * motor/tools/worker.js
 * NE İŞE YARAR : İSTEĞE BAĞLI arka plan iş parçacığı sarmalayıcısı. Ağır bölge
 *   hesabını ana iş parçacığını bloklamadan yapar. ÇEKİRDEK AYNIDIR (core/).
 *   - Tarayıcı (Web Worker):  new Worker('motor/tools/worker.js')
 *       postMessage({ id, kind: 'region'|'hospital', input(s), options }) → { id, result }
 *   - Node (worker_threads):  const { runInWorker } = require('motor/tools/worker.js');
 *       runInWorker({ kind, inputs, options }).then(result => …)
 * NOT: Motor saati okumaz; options.nowMs her zaman gönderilmelidir.
 * ========================================================================== */
/* global importScripts */
'use strict';

const CORE_FILES = ['config', 'holidays', 'rng', 'time', 'quality', 'demand', 'service', 'queue', 'occupancy', 'forecast', 'calibrate', 'explain', 'fallback', 'index'];

function handle(engine, message) {
  const o = message.options || {};
  if (message.kind === 'region') return engine.computeRegion(message.inputs, o);
  return engine.computeHospital(message.input, o);
}

if (typeof module === 'object' && module.exports) {
  // ---- Node ----
  const threads = require('worker_threads');
  if (!threads.isMainThread && threads.parentPort) {
    const engine = require('../core/index.js');
    threads.parentPort.on('message', function (message) {
      try {
        threads.parentPort.postMessage({ id: message.id, result: handle(engine, message) });
      } catch (error) {
        threads.parentPort.postMessage({ id: message.id, error: String(error && error.message || error) });
      }
    });
  }
  module.exports = {
    runInWorker: function (message) {
      return new Promise(function (resolve, reject) {
        const worker = new threads.Worker(__filename);
        worker.once('message', function (reply) {
          worker.terminate();
          if (reply.error) reject(new Error(reply.error)); else resolve(reply.result);
        });
        worker.once('error', reject);
        worker.postMessage(Object.assign({ id: 1 }, message));
      });
    }
  };
} else if (typeof importScripts === 'function') {
  // ---- Tarayıcı (Web Worker) ----
  importScripts.apply(null, CORE_FILES.map(function (f) { return '../core/' + f + '.js'; }));
  self.onmessage = function (event) {
    const message = event.data || {};
    try {
      self.postMessage({ id: message.id, result: handle(self.AcilRadarMotor.engine, message) });
    } catch (error) {
      self.postMessage({ id: message.id, error: String(error && error.message || error) });
    }
  };
}
