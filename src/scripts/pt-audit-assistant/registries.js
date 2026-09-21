

function createRegistry(name) {
    const items = new Map();
    return {
      register(id, value) {
        if (!id || !value) throw new Error(`${name} register requires id and value`);
        items.set(id, value);
        return value;
      },
      get(id) { return items.get(id); },
      list() { return Array.from(items.keys()); },
      run(ids, ctx, site) {
        const results = [];
        (ids || this.list()).forEach(id => {
          const item = items.get(id);
          if (!item) return;
          const out = item.run(ctx, site);
          if (Array.isArray(out)) results.push(...out);
        });
        return results;
      }
    };
  }

const SiteRegistry = createRegistry('SiteRegistry');

const CollectorRegistry = createRegistry('CollectorRegistry');

const ParserRegistry = createRegistry('ParserRegistry');

const ApprovalRegistry = createRegistry('ApprovalRegistry');

const RuleRegistry = createRegistry('RuleRegistry');

function createContext() {
    return {
      title: { raw: '', clean: '', lower: '', hasChinese: false, hasComplete: false, isEpisode: false, isSeasonPack: false, positions: {}, audioToken: '', hasAudioChannel: false },
      desc: { text: '', lower: '', html: '', containsMediainfo: false, containsForbidReseed: false },
      mediainfo: { raw: '', compact: '', kind: 'empty', empty: true, containsBBCode: false, unparsed: false },
      screenshots: { urls: [], count: 0, images: [] },
      siteMeta: { subtitle: '', categoryId: '', categorySelected: '', typeId: '', encodeId: '', audioId: '', resolutionId: '', groupId: '', groupSelected: '' },
      tags: { raw: '', normalized: new Set(), flags: {} },
      size: { raw: '', bytes: null, isBiggerThan1T: false },
      parsed: { source: '', medium: '', codec: '', audio: '', resolution: '', resolutionHeight: null, hdr: '', isHdr: false, isHdr10: false, isHdr10Plus: false, isDolbyVision: false, fps: null, bitrateMbps: null, audioLanguages: [], textLanguages: [], hasMandarinAudio: false, hasCantoneseAudio: false, hasChineseSubtitle: false, hasEnglishSubtitle: false },
      dbLinks: { hasAny: false, hasImdb: false, hasDouban: false, hasTmdb: false, hasBangumi: false, urls: [] },
      doubanScore: null,
      derived: { officialSeed: false, officialMusicSeed: false, godDramaSeed: false, vcbStudioSeed: false, haresSeed: false, isDIY: false },
      approval: { actionContainer: null, nativeReviewLink: null },
      findings: [],
      debug: {}
    };
  }



export { ApprovalRegistry, CollectorRegistry, ParserRegistry, RuleRegistry, SiteRegistry, createContext };
