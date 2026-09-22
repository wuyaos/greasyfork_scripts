import { GithubReleaseEnhancer } from './enhancer.js';



const releaseUtils = {
            keywordRegexCache: new Map(),
            maxCacheSize: 100,

            collectAvailableArchs(parsedAssets, selectedPlatforms) {
                const availableArchs = new Set();
                const assetsToConsider = selectedPlatforms.size > 0
                    ? parsedAssets.filter(asset => asset.info.platform && selectedPlatforms.has(asset.info.platform))
                    : parsedAssets;
                assetsToConsider.forEach(asset => { if (asset.info.architecture) availableArchs.add(asset.info.architecture); });
                return availableArchs;
            },

            snapshotFilters(state) {
                return {
                    selectedPlatforms: state.selectedPlatforms, selectedArchs: state.selectedArchs,
                    filterMatchLanguage: state.filterMatchLanguage, filterMatchResolution: state.filterMatchResolution,
                    hideByKeyword: state.hideByKeyword, hideSourceCode: state.hideSourceCode,
                };
            },

            createElement(tag, options = {}) {
                try {
                    const el = document.createElement(tag);
                    for (const key in options) {
                        if (key === 'className') { el.className = options[key]; }
                        else if (key === 'textContent') { el.textContent = options[key]; }
                        else if (key === 'innerHTML') { el.innerHTML = options[key]; }
                        else if (key === 'style') { Object.assign(el.style, options[key]); }
                        else if (key === 'dataset') { for (const dataKey in options.dataset) { el.dataset[dataKey] = options.dataset[dataKey]; } }
                        else { el.setAttribute(key, options[key]); }
                    }
                    return el;
                } catch (error) {
                    console.error(`[GitHub Filter] Failed to create element <${tag}>:`, error);
                    return null;
                }
            },
            getText(key) {
                const GRE = GithubReleaseEnhancer;
                const textObject = GRE.config.texts[key];
                if (!textObject) return key;
                return textObject[GRE.store.state.isChinese ? 'zh' : 'en'] || textObject.en || key;
            },
            escapeRegExp(string) {
                return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            },
            getKeywordRegex(kw) {
                if (this.keywordRegexCache.has(kw)) {
                    const cachedRegex = this.keywordRegexCache.get(kw);
                    this.keywordRegexCache.delete(kw);
                    this.keywordRegexCache.set(kw, cachedRegex);
                    return cachedRegex;
                }
                const regex = new RegExp(`(^|[^a-z0-9])${this.escapeRegExp(kw)}([^a-z0-9]|$)`, 'i');
                if (this.keywordRegexCache.size >= this.maxCacheSize) {
                    const oldestKey = this.keywordRegexCache.keys().next().value;
                    this.keywordRegexCache.delete(oldestKey);
                }
                this.keywordRegexCache.set(kw, regex);
                return regex;
            },
            checkPageType() {
                GithubReleaseEnhancer.store.setState({
                    isMainReleasesPage: /^\/[^/]+\/[^/]+\/releases\/?(?:[?#]|$)/.test(window.location.pathname)
                });
            },
            getCurrentPlatform() {
                try { if (navigator.userAgentData && navigator.userAgentData.platform) { const d = navigator.userAgentData.platform.toLowerCase(); if (d.includes('win')) return 'windows'; if (d.includes('mac')) return 'macos'; if (d.includes('linux')) return 'linux'; if (d.includes('android')) return 'android'; if (d.includes('iphone') || d.includes('ipad') || d.includes('ipod') || d.includes('ios')) return 'ios'; } } catch (e) { /* ignore */ }
                const p = (navigator.platform || '').toLowerCase(); const u = (navigator.userAgent || '').toLowerCase();
                if (p.startsWith('win')) return 'windows'; if (p.startsWith('mac') || p.includes('darwin')) return 'macos'; if (p.startsWith('linux') || p.includes('freebsd')) return 'linux'; if (u.includes('android')) return 'android'; if (u.includes('iphone') || u.includes('ipad') || u.includes('ipod') || p.includes('iphone') || p.includes('ipad') || p.includes('ipod')) return 'ios'; return 'unknown';
            },
            async getCurrentArchitecture() {
                try { if (navigator.userAgentData?.getHighEntropyValues) { const d = await navigator.userAgentData.getHighEntropyValues(['architecture', 'bitness']); const a = d.architecture; const b = d.bitness; if (a === 'arm') return b === '64' ? 'arm64' : 'arm'; if (a === 'x86') return b === '64' ? 'x64' : 'x86'; if (a) return a; } } catch (e) { /* ignore */ }
                const p = (navigator.platform || '').toLowerCase(); const u = (navigator.userAgent || '').toLowerCase();
                if (u.includes('arm64') || u.includes('aarch64') || p.includes('arm64') || p.includes('aarch64') || u.includes('armv8')) return 'arm64'; if (u.includes('win64') || u.includes('x64') || u.includes('amd64') || p.includes('64')) return 'x64'; if (u.includes('x86') || p.includes('win32') || p.includes('i386') || p.includes('i686')) { if (!u.includes('x64') && !p.includes('64')) return 'x86'; } if (u.includes('arm') || p.includes('armv7') || p.includes('armhf')) { if (!u.includes('arm64') && !p.includes('arm64')) return 'arm'; } return 'unknown';
            },
            getCurrentLanguage() {
                const lang = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
                for (const langCode in GithubReleaseEnhancer.config.LANGUAGES) {
                    if (GithubReleaseEnhancer.config.LANGUAGES[langCode].keywords.some(kw => lang.startsWith(kw) || lang === kw)) {
                        return langCode;
                    }
                }
                if (lang.startsWith('zh-cn') || lang === 'zh-hans') return 'zh-hans';
                if (lang.startsWith('zh-tw') || lang.startsWith('zh-hk') || lang === 'zh-hant') return 'zh-hant';
                return lang.split('-')[0];
            },
            getCurrentResolutionCategory() {
                const height = window.screen.height;
                if (height >= 720) return 'hd';
                return 'sd';
            },
            parseAssetInfo(text) {
                const GRE = GithubReleaseEnhancer;
                const lowerText = text.replace(/\s+/g, ' ').trim().toLowerCase();
                const isSourceCode = GRE.config.SOURCE_CODE_KEYWORDS.includes(lowerText);
                if (isSourceCode) {
                    return { platform: null, architecture: null, language: null, resolution: null, isSourceCode: true, isByKeyword: false };
                }
                if (GRE.core.assetFilter.isHiddenAsset(text, GRE.store.state.hiddenKeywords)) {
                     return { platform: null, architecture: null, language: null, resolution: null, isSourceCode: false, isByKeyword: true };
                }

                let detectedPlatform = null, detectedArch = null,
                    detectedLang = null, detectedRes = null;

                for (const platform of GRE.config.PLATFORMS) {
                    if (platform.exclusiveFormats.some(ext => lowerText.endsWith(ext))) {
                        detectedPlatform = platform.id;
                        break;
                    }
                }
                if (!detectedPlatform) {
                    for (const platformId in GRE.platformArchRules) {
                        const platformRule = GRE.platformArchRules[platformId];
                        if (platformRule.keywords.some(kw => this.getKeywordRegex(kw).test(lowerText))) {
                            detectedPlatform = platformId;
                            break;
                        }
                    }
                }
                const archRules = detectedPlatform ? GRE.platformArchRules[detectedPlatform]?.arch : null;
                if (archRules) {
                    for (const archKey in archRules) {
                        if (archRules[archKey].some(kw => this.getKeywordRegex(kw).test(lowerText))) {
                            detectedArch = archKey;
                            break;
                        }
                    }
                }
                if (!detectedArch) {
                    const generalArchMap = {
                        'arm64': ['arm64', 'aarch64'], 'x64': ['x64', 'amd64', 'x86_64'],
                        'x86': ['x86', 'i386', 'i686', '386', 'win32'], 'arm': ['armv7', 'armhf', 'arm']
                    };
                    const archDetectionOrder = ['arm64', 'x64', 'x86', 'arm'];
                    for (const arch of archDetectionOrder) {
                        if (generalArchMap[arch].some(kw => {
                            const regex = this.getKeywordRegex(kw);
                            if (kw === 'win32' && (this.getKeywordRegex('x64').test(lowerText) || this.getKeywordRegex('amd64').test(lowerText))) return false;
                            if (arch === 'x86' && kw !== 'win32' && (this.getKeywordRegex('x64').test(lowerText) || this.getKeywordRegex('amd64').test(lowerText))) return false;
                            if (arch === 'arm' && (this.getKeywordRegex('arm64').test(lowerText) || this.getKeywordRegex('aarch64').test(lowerText))) return false;
                            return regex.test(lowerText);
                        })) {
                            detectedArch = arch;
                            break;
                        }
                    }
                }
                if (detectedPlatform === 'macos' && (this.getKeywordRegex('apple').test(lowerText) || this.getKeywordRegex('universal').test(lowerText))) detectedArch = 'arm64';
                for (const langCode in GRE.config.LANGUAGES) {
                    if (GRE.config.LANGUAGES[langCode].keywords.some(kw => this.getKeywordRegex(kw).test(lowerText))) {
                        detectedLang = langCode;
                        break;
                    }
                }
                for (const resCode in GRE.config.RESOLUTIONS) {
                    if (GRE.config.RESOLUTIONS[resCode].keywords.some(kw => this.getKeywordRegex(kw).test(lowerText))) {
                        detectedRes = resCode;
                        break;
                    }
                }
                return { platform: detectedPlatform, architecture: detectedArch, language: detectedLang, resolution: detectedRes, isSourceCode: false, isByKeyword: false };
            },
        };



export { releaseUtils };
