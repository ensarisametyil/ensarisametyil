/* =============================================================================
 * panel/js/ui/form.js
 * NE İŞE YARAR : Form parçaları: etiketli alan (ipucu + alan hatası), seçim kutusu,
 *                hata özeti (alanlara bağlantılı), bildirim kutusu, meşgul düğme.
 * VERDİĞİ      : AcilRadar.Panel.UI.form
 * NEYİ DEĞİŞTİRMEK İÇİN BURAYA BAK:
 *   - Görünüm: panel/css/panel.css › .pfield, .error-summary
 * NOT (ERİŞİLEBİLİRLİK): Hatalı alan aria-invalid="true" alır; hata metni
 *      aria-describedby ile alana bağlanır. Gönderimde hata özeti odaklanır ve her
 *      madde ilgili alana götüren bir bağlantıdır.
 * ========================================================================== */
(function (AR) {
  'use strict';

  const dom = AR.UI.dom;
  const el = dom.el;
  const t = AR.Strings.text;

  function errorText(error) {
    return t('panel.validation.' + error.key, error.params || {});
  }

  /**
   * Etiketli alan.
   * @param {{id:string, name:string, label:string, hint?:string, type?:string, inputmode?:string,
   *          autocomplete?:string, value?:string, required?:boolean, maxlength?:number}} o
   * @returns {{root:HTMLElement, input:HTMLInputElement, setError:function(?Object)}}
   */
  function field(o) {
    const hintId = o.id + '-hint';
    const errorId = o.id + '-error';
    const input = el('input', {
      className: 'input',
      attrs: {
        id: o.id, name: o.name, type: o.type || 'text', inputmode: o.inputmode || false,
        autocomplete: o.autocomplete || 'off', required: Boolean(o.required), maxlength: o.maxlength || false,
        'aria-describedby': o.hint ? hintId : false, spellcheck: 'false'
      }
    });
    if (o.value != null) input.value = String(o.value);
    const error = el('p', { className: 'pfield__error', attrs: { id: errorId, hidden: true } });
    const root = el('div', { className: 'pfield field' }, [
      el('label', { className: 'field__label', attrs: { for: o.id }, text: o.label }),
      o.hint ? el('p', { className: 'field-hint', attrs: { id: hintId }, text: o.hint }) : null,
      error,
      input
    ]);
    return { root: root, input: input, setError: function (value) { setFieldError(input, error, hintId, Boolean(o.hint), value); } };
  }

  function setFieldError(input, errorNode, hintId, hasHint, value) {
    const described = [];
    if (hasHint) described.push(hintId);
    if (value) {
      errorNode.textContent = errorText(value);
      errorNode.hidden = false;
      input.setAttribute('aria-invalid', 'true');
      described.push(errorNode.id);
    } else {
      errorNode.textContent = '';
      errorNode.hidden = true;
      input.removeAttribute('aria-invalid');
    }
    if (described.length > 0) input.setAttribute('aria-describedby', described.join(' '));
    else input.removeAttribute('aria-describedby');
  }

  /**
   * Seçim kutusu.
   * @param {{id:string, name:string, label:string, options:{value:string, label:string}[], value?:string}} o
   */
  function select(o) {
    const errorId = o.id + '-error';
    const input = el('select', { className: 'input', attrs: { id: o.id, name: o.name } },
      o.options.map(function (opt) { return el('option', { attrs: { value: opt.value }, text: opt.label }); }));
    if (o.value != null) input.value = o.value;
    const error = el('p', { className: 'pfield__error', attrs: { id: errorId, hidden: true } });
    const root = el('div', { className: 'pfield field' }, [
      el('label', { className: 'field__label', attrs: { for: o.id }, text: o.label }),
      error,
      input
    ]);
    return { root: root, input: input, setError: function (value) { setFieldError(input, error, '', false, value); } };
  }

  /**
   * Hata özeti: başlık + alanlara götüren bağlantılar. Odaklanır.
   * @param {HTMLElement} container
   * @param {{fieldId:string, label:string, error:Object}[]} items  boşsa özet gizlenir
   */
  function errorSummary(container, items) {
    dom.clear(container);
    container.hidden = items.length === 0;
    if (items.length === 0) return;
    const list = el('ul', { className: 'error-summary__list' });
    items.forEach(function (item) {
      const link = el('a', { attrs: { href: '#' + item.fieldId }, text: item.label + ': ' + errorText(item.error) });
      link.addEventListener('click', function (event) {
        event.preventDefault();
        const target = document.getElementById(item.fieldId);
        if (target) target.focus();
      });
      list.appendChild(el('li', {}, [link]));
    });
    container.appendChild(el('h2', { className: 'error-summary__title', attrs: { id: container.id + '-title' }, text: t('panel.errors.summaryTitle') }));
    container.appendChild(list);
    container.setAttribute('aria-labelledby', container.id + '-title');
    container.focus();
  }

  /**
   * Bildirim kutusu (başarı / hata / bilgi). Hata ve uyarı "alert" ile hemen duyurulur.
   * @param {'success'|'error'|'info'|'warning'} tone
   */
  function notice(container, tone, message) {
    dom.clear(container);
    container.hidden = !message;
    if (!message) return;
    const icons = { success: 'check', error: 'alert', warning: 'alert', info: 'info' };
    container.className = 'pnotice pnotice--' + tone;
    container.setAttribute('role', tone === 'error' || tone === 'warning' ? 'alert' : 'status');
    container.appendChild(dom.icon(icons[tone]));
    container.appendChild(el('p', { text: message }));
  }

  /** Gönderim sırasında düğmeyi kilitler (çift gönderime karşı). */
  function setBusy(button, busy) {
    button.disabled = busy;
    button.setAttribute('aria-busy', String(busy));
  }

  /** Formdaki alanların ham metin değerleri: { ad: değer } */
  function values(form) {
    const result = {};
    Array.prototype.forEach.call(form.elements, function (input) {
      if (input.name) result[input.name] = input.value;
    });
    return result;
  }

  AR.Panel.UI = AR.Panel.UI || {};
  AR.Panel.UI.form = Object.freeze({
    field: field,
    select: select,
    errorSummary: errorSummary,
    notice: notice,
    setBusy: setBusy,
    values: values,
    errorText: errorText
  });
})(window.AcilRadar = window.AcilRadar || {});
