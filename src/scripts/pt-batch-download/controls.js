import { SIZE_UNITS } from './config.js';

import { pageIsDark } from './formatting.js';

function modal(id, title) {
    document.getElementById(id)?.remove()
    const overlay = el('div', { id, class: `ptbd-modal ${pageIsDark() ? 'ptbd-theme-dark' : 'ptbd-theme-light'}` })
    const close = () => overlay.remove()
    const closeButton = button('×', close, 'ptbd-close')
    closeButton.setAttribute('aria-label', '关闭')
    const body = el('div', { class: 'ptbd-dl-modal-body' })
    overlay.append(el('section', { class: 'ptbd-modal-box', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
      el('div', { class: 'ptbd-modal-head' }, el('strong', {}, title), closeButton), body))
    overlay.addEventListener('click', event => { if (event.target === overlay) close() })
    document.body.append(overlay)
    return { overlay, body, close }
  }


function multiFilter(title, selected) {
    const root = el('details')
    const summary = el('summary')
    const box = el('div', { class: 'ptbd-menu' })
    root.append(summary, box)
    const control = { root, summary, box, title, selected: new Set(selected || []) }
    root.addEventListener('change', () => updateMultiSummary(control))
    updateMultiSummary(control)
    return control
  }

function fillMulti(control, values, selected) {
    if (!control) return
    const old = new Set(selected || selectedMulti(control))
    control.box.textContent = ''
    values.forEach(([value, text]) => {
      const cb = el('input', { type: 'checkbox', value })
      cb.checked = old.has(value)
      control.box.append(el('label', {}, cb, ` ${text}`))
    })
    updateMultiSummary(control)
  }

function selectedMulti(control) {
    if (!control) return []
    return [...control.box.querySelectorAll('input:checked')].map(input => input.value).filter(value => value !== 'all')
  }

function updateMultiSummary(control) {
    const selected = selectedMulti(control)
    const all = control.box.querySelector('input[value="all"]')
    if (all && all.checked) {
      control.box.querySelectorAll('input:not([value="all"])').forEach(input => { input.checked = false })
    }
    control.summary.textContent = selected.length ? `已选 ${selected.length}` : '全部'
  }

function input(type, placeholder, value = '') {
    return el('input', { type, placeholder, value })
  }

function unitSelect(value) {
    const sel = select(SIZE_UNITS.map(unit => [unit, unit]), value)
    sel.className = 'ptbd-unit'
    return sel
  }

function select(options, value) {
    const node = el('select')
    options.forEach(([val, text]) => {
      const opt = el('option', { value: val }, text)
      if (val === value) opt.selected = true
      node.append(opt)
    })
    return node
  }

function field(labelText, child, cls = '') {
    return el('div', { class: `ptbd-field ${cls}`.trim() }, el('label', {}, labelText), child)
  }

function sizeRangeField(labelText, min, minUnit, max, maxUnit) {
    return el('div', { class: 'ptbd-field ptbd-range-field ptbd-size-range-field' },
      el('label', {}, labelText),
      el('div', { class: 'ptbd-range' }, el('div', { class: 'ptbd-size-box' }, min, minUnit), el('span', {}, '~'), el('div', { class: 'ptbd-size-box' }, max, maxUnit))
    )
  }

function rangeField(labelText, min, max) {
    return el('div', { class: 'ptbd-field ptbd-range-field' },
      el('label', {}, labelText),
      el('div', { class: 'ptbd-range' }, min, el('span', {}, '~'), max)
    )
  }

function selectField(labelText, control) {
    return el('div', { class: 'ptbd-field ptbd-select-field' }, el('label', {}, labelText), control)
  }

function button(labelText, fn, cls = 'ptbd-btn') {
    const btn = el('button', { type: 'button', class: cls }, labelText)
    btn.addEventListener('click', fn)
    return btn
  }

function el(tag, attrs, ...kids) {
    const node = document.createElement(tag)
    Object.entries(attrs || {}).forEach(([key, value]) => {
      if (value == null) return
      if (key === 'class') node.className = value
      else if (key === 'style') node.style.cssText = value
      else if (key === 'text') node.textContent = value
      else node.setAttribute(key, value)
    })
    kids.flat().forEach(kid => {
      if (kid == null) return
      node.append(kid instanceof Node ? kid : document.createTextNode(String(kid)))
    })
    return node
  }

function append(parent, ...kids) {
    kids.forEach(kid => parent.append(kid))
    return parent
  }



export { append, button, el, field, fillMulti, input, modal, multiFilter, rangeField, select, selectField, selectedMulti, sizeRangeField, unitSelect };
