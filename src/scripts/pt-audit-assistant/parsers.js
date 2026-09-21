import { $, $$, firstMatch, isTagSet, normalizeResolution } from './page.js';

import { ParserRegistry } from './registries.js';

import { escapeRegExp, languageMatches, parseBitrate, parseFps, videoSection } from './media-parsing.js';



function registerParsers() {
ParserRegistry.register('title', {
    run(ctx) {
      const t = ctx.title.clean;
      const tl = ctx.title.lower;
      ctx.parsed.source = firstMatch(t, [{ re: /\b(BluRay|UHD\s*BluRay|WEB[- ]?DL|WEBRip|HDTV|DVDRip|CD|DVD)\b/i }]);
      ctx.parsed.medium = firstMatch(t, [{ re: /\b(REMUX|BDRip|BluRay|WEB[- ]?DL|WEBRip|HDTV|Encode|DVD|CD)\b/i }]);
      ctx.parsed.codec = firstMatch(t, [{ re: /\b(x264|x265|H\.264|H\.265|HEVC|AVC|AV1|VC-1|MPEG-2)\b/i }]);
      ctx.parsed.audio = firstMatch(t, [{ re: /\b(Atmos|TrueHD|DTS[- ]?HD(?: MA)?|DTS:X|DTS|DDP?\+?|AAC|FLAC|LPCM|AC3|EAC3)\b/i }]);
      const res = normalizeResolution(t);
      ctx.parsed.resolution = res.resolution;
      ctx.parsed.resolutionHeight = res.height;
      ctx.parsed.isHdr10Plus = /HDR10\+|HDR10Plus/i.test(t);
      ctx.parsed.isHdr10 = !ctx.parsed.isHdr10Plus && /\bHDR10\b/i.test(t);
      ctx.parsed.isDolbyVision = /\bDV\b|Dolby\s*Vision/i.test(t);
      ctx.parsed.isHdr = ctx.parsed.isHdr10 || ctx.parsed.isHdr10Plus || ctx.parsed.isDolbyVision || /\bHDR\b/i.test(tl);
      ctx.title.positions = {
        resolution: t.search(/\b(?:2160|1440|1080|720|576|480)[pi]\b|\b(?:4K|UHD)\b/i),
        source: t.search(/\b(?:BluRay|WEB[- ]?DL|WEBRip|HDTV|DVDRip|DVD)\b/i),
        video: t.search(/\b(?:x264|x265|H\.264|H\.265|HEVC|AVC|AV1)\b/i),
        audio: t.search(/\b(?:Atmos|TrueHD|DTS|DDP?\+?|AAC|FLAC|LPCM|AC3|EAC3)\b/i),
        hdr: t.search(/HDR10\+|HDR10|Dolby\s*Vision|\bDV\b|\bHDR\b/i)
      };
      // 标题音频 token 与声道数（X.Y），用于声道数标示检查
      const audioMatch = t.match(/\b(DD[P\+]?|FLAC|LPCM|AC3|AV3A|OPUS|TrueHD|DTS([: -]?X|-?HD ?(M|HR)A)?) ?(\d[ \.]?\d)?/);
      if (audioMatch) {
        ctx.title.audioToken = audioMatch[0];
        ctx.title.hasAudioChannel = /\d[ \.]\d/.test(audioMatch[0]);
      }
    }
  });

ParserRegistry.register('mediainfo', {
    run(ctx) {
      const raw = ctx.mediainfo.raw || '';
      const video = videoSection(raw);
      const br = parseBitrate(video);
      const fps = parseFps(video || raw);
      if (br != null) ctx.parsed.bitrateMbps = br;
      if (fps != null) ctx.parsed.fps = fps;
      const videoClean = video.replace(/^Encoding settings\s*:.*$/gmi, '');
      const hasHdr10Plus = /SMPTE\s*ST\s*2094|HDR10\+/i.test(videoClean);
      const hasDolbyVision = /Dolby\s*Vision|dvhe\.|dvh1\./i.test(videoClean);
      if (hasHdr10Plus) ctx.parsed.isHdr10Plus = true;
      if (hasDolbyVision) ctx.parsed.isDolbyVision = true;
      if (/\bHDR10\b|HDR\s*10|ST\s*2086|\bHLG\b|Transfer characteristics\s*[:：]\s*PQ/i.test(videoClean) || hasHdr10Plus || hasDolbyVision) ctx.parsed.isHdr = true;
      const all = `${raw}\n${ctx.desc.text}`;
      ctx.parsed.hasMandarinAudio = /Audio[\s\S]{0,500}(?:Language\s*[:：]\s*(?:Chinese|Mandarin|国语|普通话|中文)|Title\s*[:：].*(?:Mandarin|国语|普通话))/i.test(all);
      ctx.parsed.hasCantoneseAudio = /Audio[\s\S]{0,500}(?:Language\s*[:：]\s*(?:Cantonese|粤语|粵語)|Title\s*[:：].*(?:Cantonese|粤语|粵語))/i.test(all);
      ctx.parsed.hasChineseSubtitle = /Text[\s\S]{0,400}(?:Language\s*[:：]\s*(?:Chinese|中文|简体|繁體|繁体)|Title\s*[:：].*(?:Chinese|中文|简体|繁體|繁体|中字))/i.test(all);
      ctx.parsed.hasEnglishSubtitle = /Text[\s\S]{0,400}(?:Language\s*[:：]\s*English|Title\s*[:：].*(?:English|英字))/i.test(all);
      ctx.parsed.audioLanguages = languageMatches(all, 'Audio');
      ctx.parsed.textLanguages = languageMatches(all, 'Text');
    }
  });

ParserRegistry.register('dbLinks', {
    run(ctx) {
      const urls = $$('a', $('#kdescr') || document).map(a => a.href || '').filter(Boolean);
      const text = `${ctx.desc.text}\n${urls.join('\n')}`;
      ctx.dbLinks.urls = urls.filter(u => /imdb|douban|themoviedb|tmdb|bangumi/i.test(u));
      ctx.dbLinks.hasImdb = /imdb\.com\/title\/tt\d+/i.test(text);
      ctx.dbLinks.hasDouban = /douban\.com\/subject\/\d+/i.test(text);
      ctx.dbLinks.hasTmdb = /themoviedb\.org|tmdb/i.test(text);
      ctx.dbLinks.hasBangumi = /bangumi\.tv|bgm\.tv/i.test(text);
      ctx.dbLinks.hasAny = ctx.dbLinks.hasImdb || ctx.dbLinks.hasDouban || ctx.dbLinks.hasTmdb || ctx.dbLinks.hasBangumi;
    }
  });

ParserRegistry.register('doubanScore', {
    run(ctx) {
      if (!/豆瓣/.test(ctx.desc.text)) return;
      const m = ctx.desc.text.match(/豆瓣(?:评分|分|評分)\s*[:：]?\s*(10(?:\.0)?|[0-9](?:\.[0-9])?)/);
      if (!m) return;
      const score = parseFloat(m[1]);
      if (isFinite(score) && score >= 0 && score <= 10) ctx.doubanScore = score;
    }
  });

ParserRegistry.register('derived', {
    run(ctx, site) {
      const group = `${ctx.siteMeta.groupSelected} ${ctx.title.clean}`;
      ctx.derived.officialSeed = (site.officialGroups || []).some(g => new RegExp(`(^|[-@\\s])${escapeRegExp(g)}($|[-@\\s])`, 'i').test(group)) || isTagSet(ctx, 'official');
      ctx.derived.officialMusicSeed = ctx.derived.officialSeed && /music|mv|flac|album|音乐|音樂/i.test(group);
      ctx.derived.godDramaSeed = /GodDramas/i.test(group);
      ctx.derived.vcbStudioSeed = /VCB[- ]?Studio/i.test(group) || isTagSet(ctx, 'vcbStudio');
      ctx.derived.haresSeed = /Hares/i.test(group) || isTagSet(ctx, 'hares');
      // DIY 资源：标题命中 DIY 制作组或副标题含 DIY
      ctx.derived.isDIY = /[-@](BHYS|sGnb|SPM|HDSky|HDHome|D[Ii]Y|UBits)\b/i.test(ctx.title.clean) || /DIY/.test(ctx.siteMeta.subtitle);
    }
  });
}



export { registerParsers };
