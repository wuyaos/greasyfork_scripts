import { clean } from './page.js';



function videoSection(raw) {
    const lines = String(raw || '').split(/\r?\n/);
    let start = -1;
    for (let i = 0; i < lines.length; i++) {
      if (/^\s*(Video|视频|視訊)\s*(?:#\d+)?\s*$/i.test(lines[i]) || /^\s*(Video|视频|視訊)\s*[:：]/i.test(lines[i])) { start = i; break; }
    }
    if (start < 0) return '';
    const out = [];
    for (let i = start; i < lines.length; i++) {
      if (i > start && /^\s*(Audio|Text|Menu|General|音频|音頻|文本|菜单|菜單|概要)\s*(?:#\d+)?\s*(?:[:：].*)?$/i.test(lines[i])) break;
      out.push(lines[i]);
    }
    return out.join('\n');
  }

function parseBitrate(text) {
    const normalized = String(text || '').replace(/(?<=\d)[,\s](?=\d{3}\b)/g, '');
    const re = /(?:^|\n)\s*(?:Bit rate|Nominal bit rate|Video bitrate|视频码率|視頻碼率|码率|碼率|比特率)\s*[:：]\s*([0-9]+(?:[.,]\d+)?)\s*(kb\/s|kbit\/s|mb\/s|mbit\/s|gb\/s|bps|Kbps|Mbps|Gbps)/i;
    const m = normalized.match(re);
    if (!m) return null;
    const n = parseFloat(m[1].replace(',', '.'));
    const u = m[2].toLowerCase();
    if (!isFinite(n)) return null;
    if (u === 'kb/s' || u === 'kbit/s' || u === 'kbps') return n / 1000;
    if (u === 'mb/s' || u === 'mbit/s' || u === 'mbps') return n;
    if (u === 'gb/s' || u === 'gbps') return n * 1000;
    if (u === 'bps') return n / 1e6;
    return null;
  }

function parseFps(text) {
    const m = String(text || '').match(/(?:Frame rate|帧率|幀率)\s*[:：]\s*([0-9]+(?:[.,]\d+)?)\s*(FPS|fps)?/i);
    return m ? parseFloat(m[1].replace(',', '.')) : null;
  }

function languageMatches(text, section) {
    const re = new RegExp(`${section}[\\s\\S]{0,600}?Language\\s*[:：]\\s*([^\\n\\r]+)`, 'ig');
    const out = [];
    let m;
    while ((m = re.exec(text))) out.push(clean(m[1]));
    return out;
  }

function escapeRegExp(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }



export { escapeRegExp, languageMatches, parseBitrate, parseFps, videoSection };
