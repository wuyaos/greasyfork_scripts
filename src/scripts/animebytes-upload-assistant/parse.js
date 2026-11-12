// Pure parser: outputs site option candidates and short reasons, never raw input in diagnostics.
function sections(text) {
  const result = [];
  let current;
  for (const line of text.split(/\r?\n/)) {
    const header = /^(General|Video|Audio|Text|Menu)(?:\s*#\d+)?\s*$/i.exec(line.trim());
    if (header) {
      current = { type: header[1].toLowerCase(), data: {} };
      result.push(current);
    } else if (current) {
      const item = /^\s*([^:]+?)\s*:\s*(.*?)\s*$/.exec(line);
      if (item) current.data[item[1].trim().toLowerCase()] = item[2];
    }
  }
  return result;
}

function videoCodec(format, depth = '') {
  if (/HEVC|h[ .-]?265/i.test(format)) return /12/.test(depth) ? 'h265 12-bit' : /10/.test(depth) ? 'h265 10-bit' : 'h265';
  if (/AVC|h[ .-]?264/i.test(format)) return /10/.test(depth) ? 'h264 10-bit' : 'h264';
  for (const [pattern, value] of [[/AV1/i, 'AV1'], [/VP9/i, 'VP9'], [/VC-1/i, 'VC-1'], [/MPEG-?[12]/i, 'MPEG-1/2'], [/XviD/i, 'XviD'], [/DivX/i, 'DivX']]) {
    if (pattern.test(format)) return value;
  }
}

function audioCodec(format) {
  // E-AC-3 has no exact site option; do not silently downgrade to AC3.
  if (/E-?AC-?3|EAC3|Dolby Digital Plus/i.test(format)) return;
  for (const [pattern, value] of [
    [/DTS.*(?:Master|MA\b)|DTS.*XLL/i, 'DTS-HD MA'], [/DTS.*(?:HD|HRA)/i, 'DTS-HD'],
    [/DTS-ES/i, 'DTS-ES'], [/DTS/i, 'DTS'], [/TrueHD|MLP FBA/i, 'TrueHD'],
    [/L?PCM/i, 'PCM'], [/FLAC/i, 'FLAC'], [/AAC/i, 'AAC'], [/AC-?3|Dolby Digital/i, 'AC3'],
    [/Opus/i, 'Opus'], [/Vorbis/i, 'Vorbis'], [/MP3|MPEG Audio.*Layer 3/i, 'MP3'],
    [/MP2|MPEG Audio.*Layer 2/i, 'MP2'], [/WMA/i, 'WMA'],
  ]) if (pattern.test(format)) return value;
}

function language(value = '') {
  const v = value.trim().toLowerCase();
  if (/^(english|eng|en)$/.test(v)) return 'en';
  if (/^(japanese|jpn|ja)$/.test(v)) return 'ja';
  return v;
}

function channelLayout(data) {
  const layout = data['channel layout'] || data['channel positions'] || '';
  const count = Number.parseInt(data['channel(s)'] || data.channels, 10);
  if (count === 1) return '1.0';
  if (count === 2) return '2.0';
  if (!count) return;
  if (!layout) return; // Six channels alone do not distinguish 5.1 from 6.0.
  const hasLFE = /\bLFE\b/i.test(layout);
  return `${count - (hasLFE ? 1 : 0)}.${hasLFE ? 1 : 0}`;
}

export function parseMedia(text) {
  const fields = {};
  const reasons = {};
  const notes = [];
  const put = (key, value, reason) => {
    if (value !== undefined) { fields[key] = value; reasons[key] = reason; }
  };
  let audio = [];
  let subtitles = [];
  let videoCount = 0;
  let kind;
  if (/^\s*(?:Disc Label|Disc Title|Playlist)\s*:/mi.test(text) && /^\s*Video\s*:/mi.test(text)) {
    kind = 'BDInfo';
    put('media', /\b(?:Ultra HD|UHD)\s*(?:Blu-ray|BD)\b/i.test(text) ? 'UHD Blu-ray' : 'Blu-ray', '光盘/播放列表结构');
    const videos = [...text.matchAll(/^\s*Video\s*:\s*(.+)$/gmi)];
    videoCount = videos.length;
    const v = videos[0]?.[1] || '';
    put('codecs', videoCodec(v, /(?:10|12)[ -]?bit/i.exec(v)?.[0]), 'BDInfo 视频编码/Profile');
    const res = /\b(720p|1080p|1080i|2160p)\b/i.exec(v)?.[1].toLowerCase();
    put('resolution', res === '2160p' ? '4K' : res, 'BDInfo 视频行');
    put('aspectratio', /\b(4:3|16:9|1\.85:1|2\.39:1|2\.4:1)\b/.exec(v)?.[1], 'BDInfo 视频显示比例');
    audio = [...text.matchAll(/^\s*Audio\s*:\s*(.+)$/gmi)].map(m => {
      const parts = m[1].split('/').map(s => s.trim());
      return { language: language(parts[0]), codec: audioCodec(parts[1] || ''), channels: /^\d\.\d$/.test(parts[2]) ? parts[2] : undefined, commentary: /commentary/i.test(m[1]) };
    });
    subtitles = [...text.matchAll(/^\s*Subtitle\s*:\s*([^/\r\n]+)/gmi)].map(m => language(m[1]));
    notes.push('BDInfo 摘要无法确认上传容器为 ISO 或目录结构，请手动选择 Containers。');
  } else {
    const parsed = sections(text);
    const general = parsed.find(s => s.type === 'general')?.data;
    const videos = parsed.filter(s => s.type === 'video');
    const v = videos[0]?.data;
    if (!general || !v) throw new Error('未识别到 MediaInfo 的 General/Video 段，或支持的 BDInfo 摘要。');
    kind = 'MediaInfo';
    videoCount = videos.length;
    const containers = { matroska: 'MKV', 'mpeg-4': 'MP4', 'mpeg-ts': 'TS', 'bdav': 'M2TS', avi: 'AVI', 'windows media': 'WMV', 'mpeg-ps': 'MPG', 'flash video': 'FLV', ogg: 'OGM' };
    put('containers', containers[general.format?.toLowerCase()], 'General → Format');
    if (/\b(?:BD|Blu[ .-]?ray|WEB[ .-]?(?:DL|Rip))\b/i.test(general['complete name'] || '')) notes.push('文件名含 BD/Web 来源候选；仅作提示，Media 请核实。');
    put('codecs', videoCodec(`${v.format || ''} ${v['codec id'] || ''}`, v['bit depth'] || (/High 10|Main 10/i.test(v['format profile'] || '') ? '10' : '')), 'Video → Format / Bit depth / Profile');
    const width = Number.parseInt((v.width || '').replace(/[\s,]/g, ''), 10);
    const height = Number.parseInt((v.height || '').replace(/[\s,]/g, ''), 10);
    let resolution;
    if (width === 1280 && height === 720 && !/interlaced/i.test(v['scan type'] || '')) resolution = '720p';
    else if (width === 1920 && height === 1080 && /progressive|interlaced/i.test(v['scan type'] || '')) resolution = /interlaced/i.test(v['scan type']) ? '1080i' : '1080p';
    else if ([3840, 4096].includes(width) && height === 2160) resolution = '4K';
    else if (['640x480', '720x480', '720x486', '720x576', '704x396', '848x480', '1024x576', '960x540'].includes(`${width}x${height}`)) resolution = `${width}x${height}`;
    put('resolution', resolution, 'Video → Width / Height / Scan type');
    put('aspectratio', v['display aspect ratio'], 'Video → Display aspect ratio');
    audio = parsed.filter(s => s.type === 'audio').map(s => ({
      language: language(s.data.language), codec: audioCodec(`${s.data.format || ''} ${s.data['format profile'] || ''} ${s.data['format commercial name'] || ''} ${s.data['commercial name'] || ''}`),
      channels: channelLayout(s.data), commentary: /commentary|commentaire|コメント/i.test(s.data.title || ''),
    }));
    subtitles = parsed.filter(s => s.type === 'text').map(s => language(s.data.language));
  }
  const main = audio.filter(a => !a.commentary);
  const japanese = main.filter(a => a.language === 'ja');
  const candidates = japanese.length ? japanese : main;
  // The English label on a Video stream never participates in audio-language detection.
  for (const [key, prop] of [['audio', 'codec'], ['audiochannels', 'channels']]) {
    const values = candidates.map(a => a[prop]);
    if (values.length && values.every(v => v !== undefined && v === values[0])) put(key, values[0], japanese.length ? '日语非评论音轨' : '非评论音轨结果一致');
  }
  if (main.some(a => a.language === 'ja') && main.some(a => a.language === 'en')) put('dual_audio', true, '日语与英语非评论音轨');
  else if (main.length && main.every(a => a.language) && !main.some(a => a.language === 'en')) put('dual_audio', false, '已列出的非评论音轨没有英语音轨');
  else notes.push('Dual Audio 缺少足够的原语言/英语音轨证据，请确认。');
  if (subtitles.length) {
    put('subbing', 'Softsubs', '存在独立字幕轨');
    if (!subtitles.includes('en')) notes.push('未发现英语字幕，请核对发布要求；不能把其他语言字幕视为英语字幕。');
  }
  if (videoCount > 1) {
    for (const field of ['codecs', 'resolution', 'aspectratio']) delete fields[field];
    notes.push('存在多条视频信息，视频字段请手动确认。');
  }
  return { kind, fields, reasons, notes, tracks: { video: videoCount, audio: audio.length, subtitles: subtitles.length } };
}
