import { $, isTagSet, lower } from './page.js';

import { RuleRegistry } from './registries.js';

import { escapeRegExp } from './media-parsing.js';



function finding(severity, code, message, meta) { return [{ severity, code, message, meta }]; }

function defaultTagTextMap() {
    return {
      'HDR10+': 'hdr10Plus', 'HDR10 Plus': 'hdr10Plus', 'HDR 10+': 'hdr10Plus', 'HDR10Plus': 'hdr10Plus', 'HDR10': 'hdr10', 'Dolby Vision': 'dolbyVision', '杜比视界': 'dolbyVision', '杜比視界': 'dolbyVision', 'HDR Vivid': 'hdrVivid', '菁彩HDR': 'hdrVivid', 'HDR': 'hdr',
      '官方': 'official', '官种': 'official', '官種': 'official', '禁转': 'reseedProhibited', '禁傳': 'reseedProhibited', '驻站': 'resident', '駐站': 'resident', '完结': 'complete', '完結': 'complete', '分集': 'incomplete', '合集': 'collection',
      '国语': 'mandarin', '國語': 'mandarin', '粤语': 'cantonese', '粵語': 'cantonese', '中字': 'chineseSubtitle', '英字': 'englishSubtitle', 'VCB-Studio': 'vcbStudio', 'DIY': 'diy', '原盘': 'untouched', '原盤': 'untouched', '原生': 'untouched', 'Untouched': 'untouched', 'Remux': 'remux', 'REMUX': 'remux',
      '大包': 'bigTorrent', '麒麟火': 'iceSeed', '方舟': 'arcProject', '高码': 'highBitrate', '高碼': 'highBitrate', '高帧': 'highFps', '高幀': 'highFps', '高分': 'highScore', '儿童': 'children', '兒童': 'children', '喜剧': 'comedy', '喜劇': 'comedy', 'Hares': 'hares'
    };
  }

function registerRules() {
RuleRegistry.register('requiredSubtitle', { run: ctx => ctx.siteMeta.subtitle ? [] : finding('error', 'SUBTITLE_REQUIRED', '副标题必填') });

RuleRegistry.register('requiredMedium', { run: ctx => ctx.parsed.medium || ctx.debug.metaSelections?.medium ? [] : finding('error', 'MEDIUM_REQUIRED', '媒介信息缺失或无法解析') });

RuleRegistry.register('requiredVideoCodec', { run: ctx => ctx.parsed.codec || ctx.debug.metaSelections?.codec ? [] : finding('error', 'VIDEO_CODEC_REQUIRED', '视频编码缺失或无法解析') });

RuleRegistry.register('requiredResolution', { run: ctx => ctx.parsed.resolution || ctx.debug.metaSelections?.resolution ? [] : finding('error', 'RESOLUTION_REQUIRED', '分辨率缺失或无法解析') });

RuleRegistry.register('titleMediaMatches', {
    run(ctx) {
      const errors = [];
      const selected = ctx.debug.metaSelections || {};
      if (selected.resolution && ctx.parsed.resolution && !lower(selected.resolution).includes(lower(ctx.parsed.resolution).replace('p', ''))) errors.push({ severity: 'error', code: 'TITLE_RESOLUTION_MISMATCH', message: `标题分辨率 ${ctx.parsed.resolution} 与站点选择 ${selected.resolution} 不一致` });
      if (selected.codec && ctx.parsed.codec && !lower(selected.codec).replace(/[^a-z0-9]/g, '').includes(lower(ctx.parsed.codec).replace(/[^a-z0-9]/g, ''))) errors.push({ severity: 'error', code: 'TITLE_CODEC_MISMATCH', message: `标题编码 ${ctx.parsed.codec} 与站点选择 ${selected.codec} 不一致` });
      if (selected.medium && ctx.parsed.medium && !lower(selected.medium).includes(lower(ctx.parsed.medium).replace('-', ''))) errors.push({ severity: 'warning', code: 'TITLE_MEDIUM_MISMATCH', message: `标题媒介 ${ctx.parsed.medium} 与站点选择 ${selected.medium} 可能不一致` });
      return errors;
    }
  });

RuleRegistry.register('screenshotMinCount', { run: (ctx, site, params) => ctx.screenshots.count >= (params.min || 1) ? [] : finding(params.severity || 'error', 'SCREENSHOT_MIN_COUNT', `截图数量不足，要求至少 ${params.min || 1} 张，当前 ${ctx.screenshots.count} 张`) });

RuleRegistry.register('screenshotValid', {
    run(ctx, site, params) {
      if (ctx.screenshots.scopeFound === false) return [];
      const minHeight = params.minHeight || 24;
      const severity = params.severity || 'warning';
      const out = [];
      (ctx.screenshots.images || []).forEach((img, idx) => {
        const url = img.url || img.src || img.currentSrc || `#${idx + 1}`;
        const height = img.naturalHeight || 0;
        const width = img.naturalWidth || 0;
        const broken = img.broken || (img.complete && (!width || !height));
        if (broken) out.push({ severity, code: 'SCREENSHOT_BROKEN', message: `截图链接加载失败：${url}`, meta: { url, index: idx, naturalWidth: width, naturalHeight: height, complete: Boolean(img.complete) } });
        else if (height && height <= minHeight) out.push({ severity, code: 'SCREENSHOT_INVALID_SIZE', message: `截图高度异常（${height}px），疑似无效占位图：${url}`, meta: { url, index: idx, naturalWidth: width, naturalHeight: height, complete: Boolean(img.complete) } });
      });
      return out;
    }
  });

RuleRegistry.register('mediainfoRequired', { run: ctx => !ctx.mediainfo.empty ? [] : finding('error', 'MEDIAINFO_REQUIRED', 'MediaInfo 必填或采集失败') });

RuleRegistry.register('dbLinkRequired', { run: (ctx, site, params) => ctx.dbLinks.hasAny ? [] : finding(params.severity || 'error', 'DB_LINK_REQUIRED', '简介中未检测到 IMDb / 豆瓣 / TMDB / Bangumi 链接或信息') });

RuleRegistry.register('officialLabelConsistency', {
    run(ctx) {
      const out = [];
      if (ctx.derived.officialSeed && !isTagSet(ctx, 'official')) out.push({ severity: 'warning', code: 'OFFICIAL_LABEL_MISSING', message: '疑似官组资源但未选择官方标签' });
      if (!ctx.derived.officialSeed && isTagSet(ctx, 'official')) out.push({ severity: 'warning', code: 'OFFICIAL_LABEL_EXTRA', message: '选择了官方标签，但标题/制作组未识别为本站官组' });
      if (ctx.derived.officialSeed && !ctx.siteMeta.groupSelected) out.push({ severity: 'error', code: 'OFFICIAL_GROUP_MISSING', message: '官组资源未选择制作组' });
      return out;
    }
  });

RuleRegistry.register('hdrTagsMatchMediainfo', {
    run(ctx) {
      const out = [];
      const isHdr10Plus = ctx.parsed.isHdr10Plus, isHdr10 = ctx.parsed.isHdr10, isDV = ctx.parsed.isDolbyVision, isHdrAny = ctx.parsed.isHdr;
      const hasHdrTag = isTagSet(ctx, 'hdr') || isTagSet(ctx, 'hdr10') || isTagSet(ctx, 'hdr10Plus') || isTagSet(ctx, 'dolbyVision') || isTagSet(ctx, 'hdrVivid');
      // HDR 整体双向：检测到 HDR 但无任何 HDR 系列标签 / 有 HDR 标签但未检测到
      if (isHdrAny && !hasHdrTag) out.push({ severity: 'error', code: 'HDR_TAG_MISSING', message: 'MediaInfo/标题检测到 HDR，但未选择任何 HDR 系列标签' });
      if (!isHdrAny && hasHdrTag) out.push({ severity: 'warning', code: 'HDR_TAG_EXTRA', message: '选择了 HDR 系列标签，但未识别到 HDR 信息' });
      // HDR10+ 双向
      if (isHdr10Plus && !isTagSet(ctx, 'hdr10Plus')) out.push({ severity: 'error', code: 'HDR10PLUS_TAG_MISSING', message: '检测到 HDR10+，但未选择 HDR10+ 标签' });
      if (!isHdr10Plus && isTagSet(ctx, 'hdr10Plus')) out.push({ severity: 'error', code: 'HDR10PLUS_TAG_EXTRA', message: '选择了 HDR10+ 标签，但未识别到 HDR10+' });
      // 杜比视界双向
      if (isDV && !isTagSet(ctx, 'dolbyVision')) out.push({ severity: 'error', code: 'DV_TAG_MISSING', message: '检测到 Dolby Vision/DV，但未选择杜比视界标签' });
      if (!isDV && isTagSet(ctx, 'dolbyVision')) out.push({ severity: 'error', code: 'DV_TAG_EXTRA', message: '选择了杜比视界标签，但未识别到 Dolby Vision' });
      return out;
    }
  });

RuleRegistry.register('highBitrate', {
    run(ctx, site, params) {
      const height = ctx.parsed.resolutionHeight;
      const bitrate = ctx.parsed.bitrateMbps;
      const thresholds = params.thresholdsMbps || {};
      const threshold = thresholds[height];
      if (!threshold || bitrate == null) return [];
      const hit = params.inclusive ? bitrate >= threshold : bitrate > threshold;
      return hit && !isTagSet(ctx, params.tag || 'highBitrate') ? finding('error', 'HIGH_BITRATE_TAG_MISSING', `视频码率 ${bitrate.toFixed(2)} Mbps 超过 ${height}p 高码阈值 ${threshold} Mbps，未选择高码标签`) : [];
    }
  });

RuleRegistry.register('highFps', { run: (ctx, site, params) => ctx.parsed.fps != null && ctx.parsed.fps >= (params.thresholdFps || 60) && !isTagSet(ctx, params.tag || 'highFps') ? finding('error', 'HIGH_FPS_TAG_MISSING', `帧率 ${ctx.parsed.fps} fps 达到高帧阈值，未选择高帧标签`) : [] });

RuleRegistry.register('highScore', { run: (ctx, site, params) => ctx.doubanScore != null && (params.inclusive ? ctx.doubanScore >= (params.threshold || 8) : ctx.doubanScore > (params.threshold || 8)) && !isTagSet(ctx, params.tag || 'highScore') ? finding('error', 'HIGH_SCORE_TAG_MISSING', `豆瓣评分 ${ctx.doubanScore} 超过高分阈值，未选择高分标签`) : [] });

RuleRegistry.register('titleChineseForbidden', { run: ctx => ctx.title.hasChinese ? finding('error', 'TITLE_CHINESE_FORBIDDEN', '标题含中文字符') : [] });

RuleRegistry.register('titleChineseWarning', { run: ctx => ctx.title.hasChinese ? finding('warning', 'TITLE_CHINESE_WARNING', '标题含中文字符，请确认是否符合站点规范') : [] });

RuleRegistry.register('titleCompleteRequiredForSeason', { run: ctx => ctx.title.isSeasonPack && !ctx.title.hasComplete ? finding('error', 'TITLE_COMPLETE_REQUIRED', '季包标题应包含 Complete') : [] });

RuleRegistry.register('titleHdr10PlusSpelling', { run: ctx => /HDR10Plus/i.test(ctx.title.clean) ? finding('error', 'HDR10PLUS_SPELLING', 'HDR10+ 建议使用 HDR10+ 写法，不使用 HDR10Plus') : [] });

RuleRegistry.register('forbidGroups', { run: (ctx, site, params) => (params.groups || []).some(g => new RegExp(`[-@]${escapeRegExp(g)}$`, 'i').test(ctx.title.clean)) ? finding('error', 'FORBID_GROUP', '标题命中禁发组，请人工核对') : [] });

RuleRegistry.register('bigTorrentWarning', { run: ctx => ctx.size.isBiggerThan1T && !isTagSet(ctx, 'bigTorrent') ? finding('warning', 'BIG_TORRENT_TAG_MISSING', '种子大于等于 1 TiB，建议确认大包标签') : [] });

RuleRegistry.register('childrenComedyConsistency', {
    run(ctx) {
      const out = [];
      if (/儿童|Children/i.test(ctx.desc.text + ctx.title.clean) && !isTagSet(ctx, 'children')) out.push({ severity: 'warning', code: 'CHILDREN_TAG_MISSING', message: '疑似儿童内容，未选择儿童标签' });
      if (/喜剧|Comedy/i.test(ctx.desc.text + ctx.title.clean) && !isTagSet(ctx, 'comedy')) out.push({ severity: 'warning', code: 'COMEDY_TAG_MISSING', message: '疑似喜剧内容，未选择喜剧标签' });
      return out;
    }
  });

RuleRegistry.register('arcHaresConsistency', {
    run(ctx) {
      const out = [];
      if (/\bArc\b|方舟/i.test(ctx.title.clean + ctx.siteMeta.groupSelected) && !isTagSet(ctx, 'arcProject')) out.push({ severity: 'warning', code: 'ARC_TAG_MISSING', message: '疑似方舟资源，未选择方舟标签' });
      if (ctx.derived.haresSeed && !isTagSet(ctx, 'hares')) out.push({ severity: 'warning', code: 'HARES_TAG_MISSING', message: '疑似 Hares 资源，未选择 Hares 标签' });
      return out;
    }
  });

RuleRegistry.register('completeTagRequired', { run: ctx => ctx.title.isSeasonPack && ctx.title.hasComplete && !isTagSet(ctx, 'complete') ? finding('warning', 'COMPLETE_TAG_MISSING', '季包已标注 Complete，建议选择完结标签') : [] });

RuleRegistry.register('incompleteTagRequired', { run: ctx => ctx.title.isEpisode && !isTagSet(ctx, 'incomplete') && !isTagSet(ctx, 'complete') ? finding('warning', 'INCOMPLETE_TAG_MISSING', '分集剧集未选择分集标签') : [] });

RuleRegistry.register('collectionTagForbidden', { run: ctx => !ctx.title.isSeasonPack && isTagSet(ctx, 'collection') ? finding('warning', 'COLLECTION_TAG_EXTRA', '非季包资源选择了合集标签，请确认') : [] });

RuleRegistry.register('audioLanguageTagConsistency', {
    run(ctx) {
      const out = [];
      if (ctx.parsed.hasMandarinAudio && !isTagSet(ctx, 'mandarin')) out.push({ severity: 'warning', code: 'MANDARIN_TAG_MISSING', message: '检测到国语音轨，未选择国语标签' });
      if (ctx.parsed.hasCantoneseAudio && !isTagSet(ctx, 'cantonese')) out.push({ severity: 'warning', code: 'CANTONESE_TAG_MISSING', message: '检测到粤语音轨，未选择粤语标签' });
      if (ctx.parsed.hasChineseSubtitle && !isTagSet(ctx, 'chineseSubtitle')) out.push({ severity: 'warning', code: 'CHINESE_SUBTITLE_TAG_MISSING', message: '检测到中文字幕，未选择中字标签' });
      return out;
    }
  });

RuleRegistry.register('vcbStudioTagRequired', { run: ctx => ctx.derived.vcbStudioSeed && !isTagSet(ctx, 'vcbStudio') ? finding('warning', 'VCB_STUDIO_TAG_MISSING', 'VCB-Studio 资源未选择 VCB-Studio 标签') : [] });

RuleRegistry.register('remuxTagRequired', { run: ctx => /remux/i.test(ctx.parsed.medium) && !isTagSet(ctx, 'remux') ? finding('warning', 'REMUX_TAG_MISSING', 'Remux 媒介未选择 Remux 标签') : [] });

RuleRegistry.register('titleNamingSpec', {
    run(ctx) {
      const t = ctx.title.clean, tl = ctx.title.lower;
      const out = [];
      if (/(480|720|1080|2160|4320)P\b/.test(t)) out.push({ severity: 'warning', code: 'TITLE_RES_P_CASE', message: '标题分辨率后缀 P 应改为小写 p' });
      if (/\b4K\b/i.test(t) && !/2160p/i.test(t)) out.push({ severity: 'warning', code: 'TITLE_4K_SPELLING', message: '标题 4K 建议改为 2160p' });
      if (/\bAC3\b/.test(t) && !/\bDD[P+]?\b/.test(t)) out.push({ severity: 'warning', code: 'TITLE_AC3_SPELLING', message: '标题 AC3 建议改为 DD' });
      const noise = [];
      if (/\bHQ\b/.test(t)) noise.push('HQ');
      if (/\bFPS\b/i.test(t)) noise.push('FPS');
      if (/\bEDR\b/.test(t)) noise.push('EDR');
      if (/\bSDR\b/.test(t)) noise.push('SDR');
      if (noise.length) out.push({ severity: 'warning', code: 'TITLE_NOISE_WORDS', message: `标题含多余规格词：${noise.join('、')}，建议删除` });
      if (/WEB/i.test(t)) {
        if (/\bHEVC\b|\bH265\b/.test(t) && !/H\.265/i.test(t)) out.push({ severity: 'warning', code: 'TITLE_WEB_CODEC_CASE', message: 'WEB 资源编码 HEVC/H265 应写为 H.265' });
        if (/\bAVC\b|\bH264\b/.test(t) && !/H\.264/i.test(t)) out.push({ severity: 'warning', code: 'TITLE_WEB_CODEC_CASE', message: 'WEB 资源编码 AVC/H264 应写为 H.264' });
      }
      if (/HDTV/i.test(t)) {
        if (/\bHEVC\b|H\.265/i.test(t) && !/\bH265\b/.test(t)) out.push({ severity: 'warning', code: 'TITLE_HDTV_CODEC_CASE', message: 'HDTV 资源编码 HEVC/H.265 应写为 H265' });
        if (/\bAVC\b|H\.264/i.test(t) && !/\bH264\b/.test(t)) out.push({ severity: 'warning', code: 'TITLE_HDTV_CODEC_CASE', message: 'HDTV 资源编码 AVC/H.264 应写为 H264' });
      }
      if (/atmos.*truehd/.test(tl)) out.push({ severity: 'warning', code: 'TITLE_ATMOS_ORDER', message: '标题 Atmos 应置于 TrueHD/声道之后' });
      return out;
    }
  });

RuleRegistry.register('titleTokenOrder', {
    run(ctx) {
      const p = ctx.title.positions;
      const out = [];
      if (p.video >= 0 && p.source >= 0 && p.video < p.source) out.push({ severity: 'warning', code: 'TITLE_SOURCE_ORDER', message: '标题片源类型应置于视频编码之前' });
      if (p.resolution >= 0 && p.source >= 0 && p.resolution > p.source) out.push({ severity: 'warning', code: 'TITLE_RESOLUTION_BEFORE_SOURCE', message: '标题分辨率应置于来源/媒介之前' });
      if (p.video >= 0 && p.audio >= 0 && p.video > p.audio) out.push({ severity: 'warning', code: 'TITLE_VIDEO_BEFORE_AUDIO', message: '标题视频编码应置于音频编码之前' });
      if (p.hdr >= 0 && p.video >= 0 && p.hdr > p.video) out.push({ severity: 'warning', code: 'TITLE_HDR_BEFORE_VIDEO', message: '标题 HDR 类型应置于视频编码之前' });
      return out;
    }
  });

RuleRegistry.register('titleCompleteness', {
    run(ctx) {
      const p = ctx.title.positions;
      const out = [];
      if (p.resolution < 0) out.push({ severity: 'warning', code: 'TITLE_MISSING_RESOLUTION', message: '标题缺少分辨率' });
      if (p.source < 0) out.push({ severity: 'warning', code: 'TITLE_MISSING_SOURCE', message: '标题缺少来源/媒介' });
      if (p.video < 0) out.push({ severity: 'warning', code: 'TITLE_MISSING_VIDEO_CODEC', message: '标题缺少视频编码' });
      if (p.audio < 0) out.push({ severity: 'warning', code: 'TITLE_MISSING_AUDIO_CODEC', message: '标题缺少音频编码' });
      return out;
    }
  });

RuleRegistry.register('requiredAudioCodec', { run: ctx => ctx.parsed.audio || ctx.debug.metaSelections?.audio ? [] : finding('error', 'AUDIO_CODEC_REQUIRED', '音频编码缺失或无法解析') });

RuleRegistry.register('mediainfoBbcodeError', { run: ctx => ctx.mediainfo.containsBBCode ? finding('error', 'MEDIAINFO_BBCODE', 'MediaInfo 含 BBCode 标签，应为纯文本') : [] });

RuleRegistry.register('mediainfoTypeConsistency', {
    run(ctx) {
      if (ctx.mediainfo.empty) return [];
      const isBD = /bluray|原盘|untouched/i.test(ctx.parsed.medium);
      if (isBD && ctx.mediainfo.kind !== 'bdinfo') return finding('warning', 'MEDIAINFO_SHOULD_BE_BDINFO', '蓝光原盘类资源 MediaInfo 栏建议填写 BDinfo');
      if (!isBD && ctx.mediainfo.kind === 'bdinfo') return finding('warning', 'MEDIAINFO_SHOULD_BE_MEDIAINFO', '非蓝光原盘资源 MediaInfo 栏建议填写 mediainfo');
      return [];
    }
  });

RuleRegistry.register('diyUntouchedTagConsistency', {
    run(ctx) {
      if (ctx.mediainfo.kind !== 'bdinfo') return []; // 仅 BDinfo（蓝光原盘）适用
      const isDIY = ctx.derived.isDIY, hasDIY = isTagSet(ctx, 'diy'), hasUntouched = isTagSet(ctx, 'untouched');
      const out = [];
      if (isDIY && !hasDIY) out.push({ severity: 'error', code: 'DIY_TAG_MISSING', message: 'DIY 资源未选择 DIY 标签' });
      if (isDIY && hasUntouched) out.push({ severity: 'error', code: 'UNTOUCHED_TAG_EXTRA', message: 'DIY 资源不应选择原生原盘标签' });
      if (!isDIY && !hasDIY && !hasUntouched) out.push({ severity: 'warning', code: 'BLURAY_TAG_MISSING', message: '蓝光原盘未选择原生或 DIY 标签' });
      if (hasDIY && hasUntouched) out.push({ severity: 'error', code: 'DIY_UNTOUCHED_CONFLICT', message: '原生原盘与 DIY 标签只能选一个' });
      return out;
    }
  });

RuleRegistry.register('hlgNeedsHdrTag', { run: ctx => /^(?!Encoding).*HLG/im.test(ctx.mediainfo.raw) && !isTagSet(ctx, 'hdr') && !isTagSet(ctx, 'hdrVivid') ? finding('warning', 'HLG_HDR_TAG_MISSING', 'MediaInfo 检测到 HLG，未选择 HDR 标签') : [] });

RuleRegistry.register('titleAudioChannelRequired', { run: ctx => ctx.title.audioToken && !ctx.title.hasAudioChannel ? finding('warning', 'TITLE_AUDIO_CHANNEL_MISSING', '标题音频编码后未标示声道数（如 5.1）') : [] });

RuleRegistry.register('musicTitleFields', {
    run(ctx) {
      const isMusic = ctx.siteMeta.categoryId === '408' || /音频|音頻/.test(ctx.siteMeta.categorySelected || '');
      if (!isMusic) return [];
      const out = [], tl = ctx.title.lower;
      if (!/khz/.test(tl)) out.push({ severity: 'warning', code: 'MUSIC_SAMPLE_RATE_MISSING', message: '音频类资源主标题缺少采样频率（如 44.1kHz）' });
      if (!/bit/.test(tl)) out.push({ severity: 'warning', code: 'MUSIC_BITRATE_MISSING', message: '音频类资源主标题缺少比特率（如 320kbps）' });
      return out;
    }
  });

RuleRegistry.register('dvdResolutionCheck', { run: ctx => /\bDVD\b/i.test(ctx.title.clean) && ctx.parsed.resolutionHeight === 720 ? finding('warning', 'DVD_RESOLUTION_CHECK', 'DVD 来源资源标为 720p，请检查分辨率是否错标') : [] });

RuleRegistry.register('longptDomDegraded', { run: ctx => (!ctx.title.clean || (!$('#outer') && !$('#kdescr'))) ? finding('info', 'DOM_DEGRADED', '页面 DOM 与默认 NexusPHP 选择器不完全匹配，部分检查已降级') : [] });
}



export { defaultTagTextMap, registerRules };
