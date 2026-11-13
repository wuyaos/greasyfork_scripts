import { parseMedia } from './parse.js';
import { matchRegion } from './region.js';

const VERSION = '0.3.0';
const LABELS = { media: 'Media', containers: 'Containers', codecs: 'Codecs', resolution: 'Resolution', audio: 'Audio', audiochannels: 'Audio Channels', dual_audio: 'Dual Audio', subbing: 'Subbing', aspectratio: 'Aspect Ratio' };
const DISC_CONTAINERS = ['ISO', 'VOB IFO', 'M2TS'];

export function mountUpload() {
  const form = document.getElementById('upload_form_anime');
  const input = form?.querySelector('textarea[name="mediainfo_desc"]');
  if (!input || form.querySelector('.abua-tools')) return;
  const fields = Object.fromEntries(Object.keys(LABELS).map(name => [name, form.querySelector(`[name="${name}"]`)]));
  let snapshot = null;
  let logs = [];
  const style = document.createElement('style');
  style.textContent = `
    #upload_form_anime .abua-tools { margin-block: .6em; }
    #upload_form_anime .abua-actions { display:flex; flex-wrap:wrap; align-items:center; gap:.5em 1em; }
    #upload_form_anime .abua-result { margin-block:.6em; }
    #upload_form_anime .abua-details pre { white-space:pre-wrap; overflow-wrap:anywhere; font:inherit; }
    #upload_form_anime .abua-export { box-sizing:border-box; width:100%; max-width:100%; }
    #upload_form_anime .abua-region-note { margin-block:.4em; }
  `;
  document.head.append(style);
  const tools = document.createElement('div');
  tools.className = 'abua-tools';
  // Static markup only. Parsed input is rendered through textContent, never HTML.
  tools.innerHTML = `<div class="abua-actions"></div><p class="abua-result min_padding" role="status" aria-live="polite">粘贴 MediaInfo / BDInfo 后点击解析；不会自动提交。</p><details class="abua-details"><summary>查看详情</summary><pre></pre></details>`;
  input.insertAdjacentElement('afterend', tools);
  const actions = tools.querySelector('.abua-actions');
  const result = tools.querySelector('.abua-result');
  const details = tools.querySelector('pre');
  const reference = form.querySelector('input[type="button"]');
  const button = (label, cls) => {
    // Same element and class as the site's Autofill button; no palette overrides.
    const el = document.createElement('input');
    el.type = 'button';
    el.value = label;
    el.className = `${reference?.className || ''} ${cls}`.trim();
    actions.append(el);
    return el;
  };
  const parseButton = button('解析并填充', 'abua-parse');
  const undoButton = button('撤销本次填充', 'abua-undo');
  undoButton.disabled = true;
  const debugLabel = document.createElement('label');
  const debug = document.createElement('input');
  debug.type = 'checkbox';
  debug.className = 'abua-debug';
  debugLabel.append(debug, ' Debug');
  actions.append(debugLabel);
  const copyButton = button('复制调试日志', 'abua-copy');
  copyButton.hidden = true;
  const exportBox = document.createElement('textarea');
  exportBox.className = 'abua-export';
  exportBox.readOnly = true;
  exportBox.rows = 8;
  exportBox.hidden = true;
  exportBox.setAttribute('aria-label', '调试日志 JSON，可手动复制');
  tools.append(exportBox);

  const region = form.querySelector('[name="region"]');
  if (region) {
    const note = document.createElement('p');
    note.className = 'min_padding abua-region-note';
    note.style.whiteSpace = 'pre-line';
    note.textContent = [
      '区码请按实际发行版本手动选择，不能根据音轨或字幕语言判断。媒体信息解析不修改 Region；仅单独点击「匹配区码」时填写。',
      'DVD 区码（主要对应地区）：',
      'R1：美国、加拿大及美国属地。',
      'R2：日本、欧洲、中东（含埃及）、南非、格陵兰；本站细分为 R2 Japan / R2 Europe。',
      'R3：东南亚、韩国、台湾、香港等地区。',
      'R4：澳大利亚、新西兰、太平洋岛屿、墨西哥、中美洲、南美洲及加勒比地区。',
      'R5：俄罗斯及部分东欧地区、印度次大陆、非洲大部（不含 R2 的埃及和南非）、朝鲜、蒙古。',
      'R6：中国大陆。',
      'Blu-ray 区码（主要对应地区）：',
      'A：北美洲、南美洲、美国属地、日本、韩国、台湾、香港及东南亚等地区。',
      'B：欧洲、非洲、中东、澳大利亚、新西兰。',
      'C：中国大陆、俄罗斯、中亚、南亚等其他亚洲地区（不含 A 区所列地区）。',
      'DVD 的 0 / ALL、Blu-ray 的 ABC 表示全区；Ultra HD Blu-ray 通常不设地区锁。遇到全区或多区版本，按本站规则核实，不要强行选择单一区码。',
      '以上是地区速查，不代表某张光盘的实际锁区；以光盘、包装或可靠发行资料标注为准。',
    ].join('\n');
    region.parentElement.append(note);
  }
  const log = (event, data) => {
    if (!debug.checked) return;
    const entry = { time: new Date().toISOString(), event, ...data };
    logs.push(entry);
    if (logs.length > 200) logs.shift();
    console.debug('[AB Upload Assistant]', JSON.stringify(entry));
  };
  debug.addEventListener('change', () => {
    copyButton.hidden = !debug.checked;
    logs = [];
    exportBox.hidden = true;
    exportBox.value = '';
    if (debug.checked) log('page', {
      version: VERSION,
      mode: form.querySelector('[name="add_format"]')?.value === '1' ? 'add-format' : 'upload',
      fields: Object.fromEntries(Object.entries(fields).map(([key, el]) => [key, !!el])),
      region: 'explicit-match-only',
    });
  });
  copyButton.addEventListener('click', async () => {
    exportBox.value = JSON.stringify({ version: VERSION, logs }, null, 2);
    exportBox.hidden = false;
    try {
      await navigator.clipboard.writeText(exportBox.value);
      result.textContent = '调试日志已复制；仅含字段映射与操作，不含原始媒体信息。';
    } catch {
      exportBox.focus();
      exportBox.select();
      result.textContent = '浏览器未允许剪贴板访问，请复制下方已选中的日志。';
    }
  });
  const valueOf = el => el.type === 'checkbox' ? el.checked : el.value;
  const setValue = (el, value) => {
    if (el.type === 'checkbox') el.checked = value;
    else el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };
  if (region) {
    let regionSnapshot = null;
    const controls = document.createElement('div');
    controls.className = 'abua-actions abua-region-controls';
    const label = document.createElement('label');
    label.textContent = '发行地区：';
    const territory = document.createElement('input');
    territory.type = 'text';
    territory.className = 'abua-territory';
    territory.placeholder = 'GER / Germany / 德国 / B';
    territory.style.width = '18em';
    territory.style.maxWidth = '100%';
    label.append(territory);
    const match = button('匹配区码', 'abua-region-match');
    const undoRegion = button('撤销区码', 'abua-region-undo');
    undoRegion.disabled = true;
    controls.append(label, match, undoRegion);
    const status = document.createElement('p');
    status.className = 'min_padding abua-region-status';
    status.setAttribute('aria-live', 'polite');
    status.textContent = '填写发行地区，不是音轨语言；仅按地区匹配，实际锁区以光盘标注为准。';
    region.insertAdjacentElement('afterend', controls);
    controls.insertAdjacentElement('afterend', status);
    match.addEventListener('click', () => {
      const media = fields.media?.value;
      const matched = matchRegion(territory.value, media);
      if (!matched.value || ![...region.options].some(o => o.value === matched.value && !o.disabled)) {
        status.textContent = matched.reason || '页面没有对应区码选项，保留原值。';
        log('region-skip', { media, reason: status.textContent });
        return;
      }
      const before = region.value;
      if (before !== matched.value) {
        regionSnapshot = { before, after: matched.value };
        setValue(region, matched.value);
        undoRegion.disabled = false;
      }
      status.textContent = matched.label + ' + ' + media + ' → ' + matched.value + '。请核对实际发行标注。';
      log('region-match', { media, territory: matched.label, before, after: matched.value });
    });
    territory.addEventListener('keydown', event => {
      if (event.key === 'Enter') { event.preventDefault(); match.click(); }
    });
    undoRegion.addEventListener('click', () => {
      if (regionSnapshot && region.value === regionSnapshot.after) {
        setValue(region, regionSnapshot.before);
        status.textContent = '已撤销上次区码匹配。';
        log('region-undo', { restored: regionSnapshot.before });
      } else {
        status.textContent = '区码已被手动修改，保留当前选择。';
        log('region-undo-skip', { reason: 'user-edited' });
      }
      regionSnapshot = null;
      undoRegion.disabled = true;
    });
  }
  const aspectVisible = () => {
    if (!DISC_CONTAINERS.includes(fields.containers?.value)) return false;
    for (let el = fields.aspectratio; el && el !== form; el = el.parentElement) {
      if (el.hidden || getComputedStyle(el).display === 'none') return false;
    }
    return true;
  };
  parseButton.addEventListener('click', () => {
    if (!input.value.trim()) {
      result.textContent = '请先粘贴 MediaInfo / BDInfo。';
      log('parse-error', { reason: 'empty-input' });
      return;
    }
    const changed = [];
    try {
      const parsed = parseMedia(input.value);
      log('parsed', { kind: parsed.kind, tracks: parsed.tracks });
      const report = [];
      let filled = 0;
      let skipped = 0;
      // Insertion order matters: Media/Containers trigger the site's own dependent controls.
      for (const [key, label] of Object.entries(LABELS)) {
        const el = fields[key];
        const value = parsed.fields[key];
        let reason;
        if (!el) reason = '页面未找到该字段';
        else if (value === undefined) reason = '未识别或无法确定，保留原值';
        else if (key === 'aspectratio' && !aspectVisible()) reason = '当前容器未显示 Aspect Ratio，保留原值';
        else if (el.type !== 'checkbox' && ![...el.options].some(o => o.value === value && !o.disabled)) reason = '没有匹配的站点选项，保留原值';
        if (reason) {
          skipped++;
          report.push(`${label}：${reason}`);
          log('skip', { field: key, reason });
          continue;
        }
        const before = valueOf(el);
        if (before !== value) {
          changed.push({ key, before, after: value });
          setValue(el, value);
        }
        filled++;
        report.push(`${label}：${typeof value === 'boolean' ? (value ? '勾选' : '不勾选') : value}（${parsed.reasons[key]}）`);
        log('fill', { field: key, before, after: value, changed: before !== value, reason: parsed.reasons[key] });
      }
      log('region', { action: 'never-modify' });
      details.textContent = [...report, '', ...parsed.notes, 'Region：媒体信息解析不修改；如需辅助填写，请使用独立的「匹配区码」。'].join('\n');
      result.textContent = `${parsed.kind}：已匹配 ${filled} 项，未填 ${skipped} 项；实际修改 ${changed.length} 项。${parsed.notes.length ? ' 有提示，请查看详情。' : ''}`;
    } catch (error) {
      result.textContent = `解析/填充失败：${error.message}`;
      log('error', { stage: 'parse-fill', name: error.name });
    }
    if (changed.length) { snapshot = changed; undoButton.disabled = false; }
  });
  undoButton.addEventListener('click', () => {
    // Do not undo edits the user made after parsing.
    let restored = 0;
    for (const item of snapshot || []) {
      const el = fields[item.key];
      if (valueOf(el) !== item.after) {
        log('undo-skip', { field: item.key, reason: 'user-edited' });
        continue;
      }
      setValue(el, item.before);
      restored++;
      log('undo', { field: item.key, restored: item.before });
    }
    snapshot = null;
    undoButton.disabled = true;
    result.textContent = `已撤销 ${restored} 项；解析后手动改过的字段保持不动。`;
  });
}
