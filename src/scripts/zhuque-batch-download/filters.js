import { UNIT_BYTES, state } from './config.js';

import { clean, num, parseMult, sizeValue, toInt } from './elements.js';



function parseSize(text) {
    if (!text) return null;
    const m = String(text).trim().match(/([\d.]+)\s*([KMGTP]iB)/i);
    if (!m) return null;
    const val = parseFloat(m[1]);
    const factor = UNIT_BYTES[m[2].toLowerCase()];
    return isFinite(val) && factor ? val * factor : null;
  }


function readRow(row) {
    const cells = row.cells ? [...row.cells] : [];
    const titleCell = cells[2];
    const dl = titleCell?.querySelector('a[href*="/api/torrent/download/"]') || row.querySelector('a[href*="/api/torrent/download/"]');
    const href = dl?.getAttribute('href') || '';
    const id = href.match(/\/api\/torrent\/download\/(\d+)/)?.[1] || '';
    if (!href || !id) return null;
    const titleLink = titleCell?.querySelector('.link-deco') || [...(titleCell?.querySelectorAll('a') || [])].find(a => !/\/api\/torrent\/download\//.test(a.getAttribute('href') || ''));
    const uploadCell = cells[7];
    const uploadRaw = uploadCell?.querySelector('.text-upload')?.textContent || uploadCell?.textContent || '';
    const downloadRaw = uploadCell?.querySelector('.text-download')?.textContent || uploadCell?.textContent || '';
    const uploadMult = parseMult(uploadRaw, uploadCell?.textContent, '↑');
    const downloadMult = parseMult(downloadRaw, uploadCell?.textContent, '↓');
    const title = clean(titleLink?.textContent || titleCell?.textContent || id).replace(/\s*\[下载\]\s*$/, '').trim() || id;
    const uploadText = `${uploadMult}x`, downloadText = `${downloadMult}x`;
    return { row, cells, id, href, title, sizeText: clean(cells[3]?.textContent), size: parseSize(cells[3]?.textContent), seeders: toInt(cells[4]?.textContent), leechers: toInt(cells[5]?.textContent), completed: toInt(cells[6]?.textContent), uploadMult, downloadMult, uploadText, downloadText, ratioText: `↑${uploadText} / ↓${downloadText}` };
  }

function applyFilter(cfg) {
    const keyword = clean(cfg.keyword).toLowerCase();
    const minBytes = sizeValue(cfg.sizeMin, cfg.sizeMinUnit), maxBytes = sizeValue(cfg.sizeMax, cfg.sizeMaxUnit);
    const seedMin = num(cfg.seedMin), seedMax = num(cfg.seedMax), leechMin = num(cfg.leechMin), leechMax = num(cfg.leechMax);
    const ratioSet = new Set(cfg.ratioMult || []);
    return state.rows.filter(r => {
      if (keyword && !r.title.toLowerCase().includes(keyword)) return false;
      if (minBytes != null && (r.size == null || r.size < minBytes)) return false;
      if (maxBytes != null && (r.size == null || r.size > maxBytes)) return false;
      if (seedMin != null && r.seeders < seedMin) return false;
      if (seedMax != null && r.seeders > seedMax) return false;
      if (leechMin != null && r.leechers < leechMin) return false;
      if (leechMax != null && r.leechers > leechMax) return false;
      if (ratioSet.size && !ratioSet.has(r.ratioText)) return false;
      return true;
    });
  }



export { applyFilter, parseSize, readRow };
