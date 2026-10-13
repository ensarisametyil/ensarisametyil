'use strict';
/* Görev kuralı: kanıtsız ifadeler hiçbir motor dosyasında, çıktısında ve yorumunda
 * geçmez. Sözcükler bu dosyada da geçmesin diye parçalardan kurulur. */
const fs = require('fs');
const path = require('path');
const { test, assert } = require('../lib/harness.js');

const ROOT = path.join(__dirname, '..', '..');
const TERMS = ['yapay ' + 'zek', 'can' + 'lı', 'an' + 'lık', 'gerçek ' + 'zaman', 'real' + '-time', 'real' + 'time', 'ki' + 'şiye özel'];
const PERCENT_CLAIM = new RegExp('%\\s?\\d+\\s+' + 'doğ' + 'ru');

function files(dir) {
  return fs.readdirSync(dir).reduce(function (list, name) {
    const full = path.join(dir, name);
    if (name === 'out' || name === 'node_modules') return list;
    if (fs.statSync(full).isDirectory()) return list.concat(files(full));
    return /\.(js|md|json)$/.test(name) ? list.concat(full) : list;
  }, []);
}

test('ifade: motor dosyalarında kanıtsız ifade yok', function () {
  const found = [];
  files(ROOT).forEach(function (file) {
    const text = fs.readFileSync(file, 'utf8').toLocaleLowerCase('tr');
    TERMS.forEach(function (term) {
      const re = new RegExp('(^|[^a-zçğıöşü])' + term.replace(/[-]/g, '\\-') + '(?![a-zçğıöşü])', 'i');
      if (re.test(text)) found.push(path.relative(ROOT, file) + ': ' + term);
    });
    if (PERCENT_CLAIM.test(text)) found.push(path.relative(ROOT, file) + ': yüzde iddiası');
  });
  assert.equal(found.length, 0, found.join(' | '));
});
