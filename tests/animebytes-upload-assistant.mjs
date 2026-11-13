import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const source = readFileSync(new URL('../dist/AnimeBytes_UploadAssistant.user.js', import.meta.url), 'utf8');
// Minimal public structure observed on series.php?id=2121; no account data or download links.
const fixture = `<table><tbody>
<tr class="group discog" id="group_873"><td><h3>2008 - <a href="torrents.php?id=873" title="View Torrent">TV Series</a></h3></td></tr>
<tr class="group discog" id="group_5078"><td><h3>2008 - Various Artists - <a href="torrents2.php?id=5078" title="View Torrent">OST</a></h3></td></tr>
<tr class="group discog" id="group_8561"><td><h3><a href="/artist.php?id=6">Lia</a> - <a href="/torrents2.php?id=8561">doll / human</a></h3></td></tr>
<tr class="group" id="group_42"><td><h3><a href="https://animebytes.tv/torrents.php?x=1&amp;id=42">Other anime</a></h3></td></tr>
<tr class="group" id="group_99"><td><h3><a href="torrents.php?id=100">Mismatched ID</a></h3></td></tr>
<tr class="group" id="group_100"><td><h3><a href="https://example.org/torrents.php?id=100">External</a></h3></td></tr>
<tr class="group" id="group_101"><td><h3><a href="artist.php?id=101">Not a group</a></h3></td></tr>
<tr class="group" id="group_bad"><td><h3><a href="torrents.php?id=bad">Invalid ID</a></h3></td></tr>
<tr class="group" id="group_102"><td>No heading</td></tr>
</tbody></table>`;

function run(url, html = fixture) {
  const dom = new JSDOM(html, { url, runScripts: 'outside-only' });
  dom.window.eval(source);
  return dom;
}

const dom = run('https://animebytes.tv/series.php?id=2121');
try {
  const { document } = dom.window;
  assert.equal(document.querySelectorAll('.ab-add-format').length, 4);
  for (const [id, type] of [['873', 'anime'], ['5078', 'music'], ['8561', 'music'], ['42', 'anime']]) {
    const button = document.querySelector(`#group_${id} h3 > .ab-add-format`);
    assert.equal(button.href, `https://animebytes.tv/upload.php?type=${type}&groupid=${id}`);
    assert.equal(button.textContent, '[添加格式]');
    assert.equal(button.tagName, 'A');
  }
  dom.window.eval(source);
  assert.equal(document.querySelectorAll('.ab-add-format').length, 4, 'rerunning must not duplicate buttons');
} finally {
  dom.window.close();
}
for (const url of ['https://animebytes.tv/torrents.php?id=873', 'https://example.org/series.php?id=2121']) {
  const other = run(url);
  assert.equal(other.window.document.querySelectorAll('.ab-add-format').length, 0);
  other.window.close();
}
const empty = run('https://animebytes.tv/series.php?id=999', '<p>No groups</p>');
assert.equal(empty.window.document.querySelectorAll('.ab-add-format').length, 0);
empty.window.close();
// Category labels do not determine type: the detail endpoint does.
// Manga/Game rows match series 185; remaining labels are synthetic regression fixtures.
const categories = [
  ['Anime', 'anime'], ['Manga', 'anime'], ['Artbooks', 'anime'],
  ['Light Novels', 'anime'], ['Music', 'music'], ['PVs & Lives', 'music'],
  ['Games', 'anime'], ['Visual Novels', 'anime'], ['Live Action', 'anime'], ['Packs', 'anime'],
];
for (const [category, type] of categories) {
  const endpoint = type === 'music' ? 'torrents2.php' : 'torrents.php';
  const page = run('https://animebytes.tv/series.php?id=185',
    `<table><tr class="group" id="group_11498"><td><h3><a href="${endpoint}?id=11498">${category}</a></h3></td></tr></table>`);
  assert.equal(page.window.document.querySelector('.ab-add-format')?.href,
    `https://animebytes.tv/upload.php?type=${type}&groupid=11498`, category);
  page.window.close();
}
console.log('PASS AnimeBytes: anime/music mapping, relative/absolute URLs, ID/origin checks, missing/unknown groups, idempotency and route scope');

// Upload fixture mirrors live field names/options and the container-dependent rows.
const { bdinfo, mediainfo } = await import('./fixtures/animebytes-media.mjs');
const { parseMedia } = await import('../src/scripts/animebytes-upload-assistant/parse.js');
assert.deepEqual(parseMedia(bdinfo).fields, { media: 'Blu-ray', codecs: 'h264', resolution: '1080p', aspectratio: '16:9', audio: 'PCM', audiochannels: '2.0', dual_audio: false, subbing: 'Softsubs' });
assert.deepEqual(parseMedia(mediainfo).fields, { containers: 'MKV', codecs: 'h264 10-bit', resolution: '720p', aspectratio: '16:9', audio: 'AAC', audiochannels: '2.0', dual_audio: false, subbing: 'Softsubs' });
assert.equal(parseMedia(bdinfo.replace('Audio: German', 'Audio: English')).fields.dual_audio, true);
assert.equal(parseMedia(mediainfo.replace('Format : AAC', 'Format : E-AC-3')).fields.audio, undefined);
assert.equal(parseMedia(mediainfo.replace('1 280 pixels', '1 276 pixels')).fields.resolution, undefined);
assert.equal(parseMedia(mediainfo.replace(/Text\n[\s\S]*$/, '')).fields.subbing, undefined);
assert.equal(parseMedia(mediainfo.replace('Language : Japanese', '')).fields.dual_audio, undefined);
assert.equal(parseMedia(mediainfo + '\nVideo #2\nFormat : AVC').fields.codecs, undefined);
assert.throws(() => parseMedia('arbitrary input'), /未识别/);
const { sourceCandidates } = await import('../src/scripts/animebytes-upload-assistant/source.js');
for (const [name, expected] of [
  ['[Commie] Aiura - 01 [BD 720p AAC].mkv', ['Blu-ray']],
  ['Title.[BD].mkv', ['Blu-ray']], ['Title.1080p.BluRay.mkv', ['Blu-ray']],
  ['Title.BDRip.mkv', ['Blu-ray']], ['Title.UHD.BluRay.2160p.mkv', ['UHD Blu-ray']],
  ['Title.Ultra-HD.Blu-ray.mkv', ['UHD Blu-ray']], ['Title.DVDRip.mkv', ['DVD']],
  ['Title.[DVD].mkv', ['DVD']], ['Title.2160p.HEVC.WEB-DL.mkv', ['Web']],
  ['Title.WEBRip.mkv', ['Web']], ['Title.HDTV.mkv', ['TV']], ['Title.TVRip.mkv', ['TV']],
  ['Title.BDRip.WEB-DL.mkv', ['Blu-ray', 'Web']],
  ['Title.2160p.HEVC.mkv', []], ['BD Adventure.mkv', []],
  ['Title.NotBluRay.mkv', []], ['C:/BluRay/Title.mkv', []],
]) assert.deepEqual(sourceCandidates(name).map(h => h.value), expected, name);
assert.equal(parseMedia(mediainfo).sources[0].value, 'Blu-ray');
assert.deepEqual(parseMedia(bdinfo).sources, []);
const options = {
  media: ['', 'TV', 'DVD', 'Blu-ray', 'UHD Blu-ray', 'Web'],
  containers: ['', 'MKV', 'MP4', 'ISO', 'VOB', 'VOB IFO', 'M2TS'],
  codecs: ['', 'h264', 'h264 10-bit', 'h265', 'h265 10-bit', 'AV1'],
  resolution: ['', '720p', '1080p', '1080i', '4K'],
  audio: ['', 'AAC', 'PCM', 'FLAC', 'TrueHD', 'DTS-HD MA'],
  audiochannels: ['', '1.0', '2.0', '5.1', '7.1'],
  subbing: ['', 'Softsubs', 'Hardsubs', 'RAW'],
  aspectratio: ['', '4:3', '16:9'],
  region: ['', 'A', 'B', 'C', 'R1', 'R2 Japan', 'R2 Europe', 'R3', 'R4', 'R5', 'R6'],
};
const selectHTML = name => `<select name="${name}">${options[name].map(v => `<option value="${v}">${v}</option>`).join('')}</select>`;
const formHTML = `<form id="upload_form_anime"><input name="add_format" value="1" type="hidden"><input type="button" value="Autofill!"><textarea name="mediainfo_desc"></textarea>${Object.keys(options).filter(k => !['region', 'aspectratio'].includes(k)).map(selectHTML).join('')}<div class="disc" style="display:none">${selectHTML('region')}</div><div class="disc" style="display:none">${selectHTML('aspectratio')}</div><input type="checkbox" name="dual_audio"></form><form id="upload_form_music"><textarea name="mediainfo_desc">untouched</textarea></form>`;
const upload = run('https://animebytes.tv/upload.php?type=anime&groupid=873', formHTML);
try {
  const { document, Event } = upload.window;
  const f = document.querySelector('#upload_form_anime');
  const field = name => f.querySelector(`[name="${name}"]`);
  let network = 0;
  upload.window.fetch = () => { network++; throw new Error('unexpected request'); };
  const submitted = [];
  f.addEventListener('submit', e => { e.preventDefault(); submitted.push(true); });
  field('containers').addEventListener('change', () => {
    for (const el of f.querySelectorAll('.disc')) el.style.display = ['ISO', 'VOB IFO', 'M2TS'].includes(field('containers').value) ? '' : 'none';
  });
  const parse = () => f.querySelector('.abua-parse').click();
  const undo = () => f.querySelector('.abua-undo').click();
  const debugMessages = [];
  upload.window.console.debug = (...args) => debugMessages.push(args.join(' '));
  field('region').value = 'B';
  field('dual_audio').checked = true;
  field('mediainfo_desc').value = mediainfo;
  parse();
  assert.equal(field('containers').value, 'MKV');
  assert.equal(field('codecs').value, 'h264 10-bit');
  assert.equal(field('audio').value, 'AAC');
  assert.equal(field('audiochannels').value, '2.0');
  assert.equal(field('dual_audio').checked, false, 'Video English is not an English audio track');
  assert.equal(field('aspectratio').value, '', 'hidden aspect must not be filled');
  assert.equal(field('region').value, 'B');
  const regionHelp = f.querySelector('.abua-region-note');
  for (const code of ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'A', 'B', 'C']) {
    assert.ok(regionHelp.textContent.includes(`${code}：`), `missing region ${code}`);
  }
  assert.match(regionHelp.textContent, /不能根据音轨或字幕语言判断/);
  assert.equal(regionHelp.parentElement, field('region').parentElement, 'help follows native Region visibility');
  assert.equal(debugMessages.length, 0, 'debug is opt-in');
  field('audio').value = 'FLAC';
  undo();
  assert.equal(field('audio').value, 'FLAC', 'undo preserves subsequent manual edits');
  assert.equal(field('containers').value, '');
  assert.equal(field('dual_audio').checked, true);
  const debug = f.querySelector('.abua-debug');
  debug.checked = true;
  debug.dispatchEvent(new Event('change'));
  field('containers').value = 'ISO';
  field('containers').dispatchEvent(new Event('change'));
  field('mediainfo_desc').value = bdinfo;
  parse();
  assert.equal(field('media').value, 'Blu-ray');
  assert.equal(field('containers').value, 'ISO', 'BDInfo never guesses container');
  assert.equal(field('aspectratio').value, '16:9');
  assert.equal(field('audio').value, 'PCM');
  assert.equal(field('region').value, 'B');
  assert.match(f.querySelector('.abua-details pre').textContent, /未发现英语字幕/);
  let copied;
  Object.defineProperty(upload.window.navigator, 'clipboard', { value: { writeText: async text => { copied = text; } }, configurable: true });
  f.querySelector('.abua-copy').click();
  await Promise.resolve();
  assert.equal(JSON.parse(copied).version, '0.4.0');
  assert.ok(JSON.parse(copied).logs.some(l => l.event === 'fill'));
  for (const privateText of ['GUNSLINGER', 'Commie', 'mediainfo_desc', 'Disc Size', 'Complete name']) assert.ok(!copied.includes(privateText), privateText);
  undo();
  assert.equal(field('aspectratio').value, '');
  assert.equal(field('region').value, 'B');
  field('mediainfo_desc').value = 'not media information';
  parse();
  assert.match(f.querySelector('.abua-result').textContent, /未识别/);
  assert.equal(field('region').value, 'B');
  const territory = f.querySelector('.abua-territory');
  const matchRegionButton = f.querySelector('.abua-region-match');
  const regionUndo = f.querySelector('.abua-region-undo');
  const match = (text, media) => {
    field('media').value = media;
    territory.value = text;
    matchRegionButton.click();
  };
  for (const [text, media, expected] of [
    ['GER', 'Blu-ray', 'B'], [' germany ', 'DVD', 'R2 Europe'], ['德国', 'DVD', 'R2 Europe'],
    ['JP', 'DVD', 'R2 Japan'], ['JPN', 'Blu-ray', 'A'], ['美国', 'DVD', 'R1'],
    ['CHN', 'DVD', 'R6'], ['中国大陆', 'Blu-ray', 'C'], ['AUS', 'DVD', 'R4'],
    ['AU', 'Blu-ray', 'B'], ['Europe', 'DVD', 'R2 Europe'], ['b', 'Blu-ray', 'B'], ['R2 Japan', 'DVD', 'R2 Japan'],
  ]) {
    match(text, media);
    assert.equal(field('region').value, expected, text + '/' + media);
  }
  regionUndo.click();
  assert.equal(field('region').value, 'B', 'independent region undo');
  match('Japan', 'Blu-ray');
  field('region').value = 'C';
  regionUndo.click();
  assert.equal(field('region').value, 'C', 'region undo preserves manual edit');
  for (const [text, media] of [['private-secret-input', 'DVD'], ['R2', 'DVD'], ['ALL', 'DVD'], ['ABC', 'Blu-ray'], ['Asia', 'Blu-ray'], ['GER/USA', 'DVD'], ['B', 'DVD'], ['R1', 'Blu-ray'], ['GER', 'Web'], ['GER', 'UHD Blu-ray'], ['GER', ''], ['', 'DVD'], ['Egypt', 'DVD']]) {
    match(text, media);
    assert.equal(field('region').value, 'C', text + ' must not overwrite');
  }
  field('media').value = 'Blu-ray';
  territory.value = 'GER';
  assert.equal(field('region').value, 'C', 'typing alone does not change Region');
  const enter = new upload.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
  territory.dispatchEvent(enter);
  assert.equal(enter.defaultPrevented, true, 'Enter must not submit upload form');
  assert.equal(field('region').value, 'B');
  f.querySelector('.abua-copy').click();
  await Promise.resolve();
  assert.ok(JSON.parse(copied).logs.some(l => l.event === 'region-match'));
  assert.ok(!copied.includes('private-secret-input'), 'unknown territory is never logged verbatim');
  field('media').value = 'DVD';
  field('mediainfo_desc').value = mediainfo;
  parse();
  const sourceRow = f.querySelector('.abua-source');
  const adopt = f.querySelector('.abua-source-adopt');
  assert.equal(sourceRow.hidden, false);
  assert.match(sourceRow.textContent, /Blu-ray/);
  assert.match(sourceRow.textContent, /冲突/);
  assert.equal(field('media').value, 'DVD', 'candidate never auto-overwrites Media');
  adopt.click();
  assert.equal(field('media').value, 'Blu-ray');
  assert.equal(field('region').value, 'B', 'adopting source never matches Region');
  undo();
  assert.equal(field('media').value, 'DVD', 'source adoption is undoable');
  field('mediainfo_desc').value = mediainfo;
  parse();
  field('mediainfo_desc').value += '\n';
  adopt.click();
  assert.equal(field('media').value, 'DVD', 'stale candidate cannot be adopted');
  field('mediainfo_desc').value = mediainfo;
  parse();
  field('mediainfo_desc').dispatchEvent(new Event('input'));
  assert.equal(sourceRow.hidden, true, 'editing invalidates source candidate');
  assert.equal(adopt.disabled, true);
  field('mediainfo_desc').value = mediainfo.replace(/Complete name[^\n]*/, 'Complete name : Title.BDRip.WEB-DL.mkv');
  parse();
  assert.match(sourceRow.textContent, /多种来源标签/);
  assert.equal(adopt.disabled, true);
  assert.equal(field('media').value, 'DVD');
  field('mediainfo_desc').value = bdinfo.replace('1080p', '1080i');
  parse();
  assert.equal(field('media').value, 'Blu-ray', '1080i BDInfo remains Blu-ray');
  assert.equal(field('resolution').value, '1080i');
  assert.equal(sourceRow.hidden, true);
  f.querySelector('.abua-copy').click();
  await Promise.resolve();
  assert.ok(JSON.parse(copied).logs.some(l => l.event === 'source-adopt'));
  for (const word of ['Commie', 'Aiura', 'Title.BDRip', 'Complete name']) assert.ok(!copied.includes(word), word);
  upload.window.eval(source);
  assert.equal(f.querySelectorAll('.abua-tools').length, 1);
  assert.equal(document.querySelector('#upload_form_music textarea').value, 'untouched');
  assert.equal(document.querySelector('#upload_form_music .abua-tools'), null);
  assert.equal(submitted.length, 0);
  assert.equal(network, 0);
} finally { upload.window.close(); }
const musicOnly = run('https://animebytes.tv/upload.php?type=music&groupid=5078', '<form id="upload_form_music"><textarea name="mediainfo_desc"></textarea></form>');
assert.equal(musicOnly.window.document.querySelector('.abua-tools'), null);
musicOnly.window.close();
console.log('PASS AnimeBytes Upload Assistant: user samples, field mapping, dependency order, Region parsing boundary, territory mapping/undo/ambiguity/Enter, undo/manual edits, opt-in private logs, no submit/network');
