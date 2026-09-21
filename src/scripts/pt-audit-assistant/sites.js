import { AUTO_APPROVAL_KEY, DEFAULT_COLLECTORS, DEFAULT_PARSERS } from './config.js';

import { SiteRegistry } from './registries.js';



function override(rules, id, patch) { return rules.map(r => r.id === id ? Object.assign({}, r, patch) : r); }

function baseRules() {
    return [
      { id: 'mediainfoRequired' }, { id: 'screenshotMinCount', params: { min: 1 } }, { id: 'screenshotValid', params: { severity: 'warning', minHeight: 24, timeout: 30000 } }, { id: 'dbLinkRequired', severity: 'warning', params: { severity: 'warning' } }, { id: 'officialLabelConsistency' }, { id: 'hdrTagsMatchMediainfo' }, { id: 'titleMediaMatches' }, { id: 'completeTagRequired' }, { id: 'incompleteTagRequired' }, { id: 'collectionTagForbidden' }, { id: 'audioLanguageTagConsistency' }, { id: 'vcbStudioTagRequired' }, { id: 'remuxTagRequired' }, { id: 'mediainfoBbcodeError' }, { id: 'mediainfoTypeConsistency' }, { id: 'musicTitleFields' }
    ];
  }

function registerAllSites() {
    const common = { paths: [/^\/details\.php/i], collectors: DEFAULT_COLLECTORS, parsers: DEFAULT_PARSERS, approval: { enabled: false, adapter: 'nexusPhpTokenPost', modeStorageKey: AUTO_APPROVAL_KEY }, fieldLabels: { subtitle: ['副标题', '副標題'], tags: ['标签', '標籤'], basic: ['基本信息', '基本資料'], mediainfo: ['MediaInfo', 'Mediainfo', '媒体信息', '媒體信息', 'BDInfo'], action: ['行为', '行為'] } };
    SiteRegistry.register('pandapt', Object.assign({}, common, { id: 'pandapt', name: 'PandaPT', hosts: ['pandapt.net'], reviewInfoPosition: 3, officialGroups: ['Panda', 'AilMWeb', 'AilMTV', 'AilMUpscale'], suppressions: [{ when: { categoryIds: ['408'], categoryTexts: ['音频', '音頻'] }, exceptRules: ['musicTitleFields'] }, { when: { categoryIds: ['409'], categoryTexts: ['其他'] }, exceptRules: [] }], rules: baseRules().concat([{ id: 'titleNamingSpec' }, { id: 'titleTokenOrder' }, { id: 'titleCompleteness' }, { id: 'diyUntouchedTagConsistency' }, { id: 'hlgNeedsHdrTag' }, { id: 'titleAudioChannelRequired' }, { id: 'dvdResolutionCheck' }]) }));
    SiteRegistry.register('qingwa', Object.assign({}, common, { id: 'qingwa', name: 'QingWaPT', hosts: ['qingwapt.com', 'new.qingwa.pro', 'qingwapt.org'], reviewInfoPosition: 3, officialGroups: ['frog', 'froge', 'frogweb', 'Loong@QingWa'], rules: baseRules().concat([{ id: 'titleChineseWarning' }, { id: 'titleCompleteRequiredForSeason' }, { id: 'titleHdr10PlusSpelling' }, { id: 'requiredMedium' }, { id: 'requiredVideoCodec' }, { id: 'requiredResolution' }, { id: 'requiredAudioCodec' }, { id: 'forbidGroups', params: { groups: ['CMCT', 'WiKi', 'beAst'] } }, { id: 'titleNamingSpec' }, { id: 'titleTokenOrder' }, { id: 'diyUntouchedTagConsistency' }, { id: 'hlgNeedsHdrTag' }, { id: 'titleAudioChannelRequired' }, { id: 'dvdResolutionCheck' }]) }));
    SiteRegistry.register('hdkylin', Object.assign({}, common, { id: 'hdkylin', name: 'HDKylin', hosts: ['hdkyl.in'], paths: [/^\/details\.php/i, /^\/web\/torrent-approval-page/i], reviewInfoPosition: 2, officialGroups: ['HDK', 'HDKMV', 'GodDramas'], tagTextMap: { '麒麟火': 'iceSeed' }, rules: override(baseRules().filter(r => r.id !== 'dbLinkRequired'), 'screenshotMinCount', { params: { min: 2 } }).concat([{ id: 'requiredSubtitle' }, { id: 'bigTorrentWarning' }]) }));
    SiteRegistry.register('cspt', Object.assign({}, common, { id: 'cspt', name: 'CSPT', hosts: ['cspt.top', 'cspt.cc', 'cspt.date'], reviewInfoPosition: 2, officialGroups: ['csweb', 'cspt', 'Hares', 'GodDramas'], tagTextMap: { '方舟': 'arcProject', 'Hares': 'hares', '儿童': 'children', '喜剧': 'comedy' }, suppressions: [{ when: { categoryIds: ['410', '419'], categoryTexts: ['短剧', 'Playlet', 'short', 'shortdrama'] }, exceptRules: ['requiredSubtitle', 'screenshotMinCount', 'screenshotValid', 'mediainfoRequired'] }], rules: override(baseRules().map(r => r.id === 'dbLinkRequired' ? Object.assign({}, r, { severity: 'error', params: { severity: 'error' } }) : r), 'screenshotMinCount', { params: { min: 2 } }).concat([{ id: 'titleChineseForbidden' }, { id: 'requiredSubtitle' }, { id: 'childrenComedyConsistency' }, { id: 'arcHaresConsistency' }, { id: 'bigTorrentWarning' }]) }));
    SiteRegistry.register('longpt', Object.assign({}, common, { id: 'longpt', name: 'LongPT', hosts: ['longpt.org'], reviewInfoPosition: 2, tagTextMap: { '高码': 'highBitrate', '高碼': 'highBitrate', '高帧': 'highFps', '高幀': 'highFps', '高分': 'highScore' }, rules: [{ id: 'longptDomDegraded' }, { id: 'screenshotValid', params: { severity: 'warning', minHeight: 24, timeout: 30000 } }, { id: 'highBitrate', params: { tag: 'highBitrate', thresholdsMbps: { 2160: 15, 1080: 9, 1440: 9 }, inclusive: false } }, { id: 'highFps', params: { thresholdFps: 60, tag: 'highFps' } }, { id: 'highScore', params: { threshold: 8, inclusive: false, tag: 'highScore' } }] }));
  }



export { registerAllSites };
