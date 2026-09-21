import { GithubReleaseEnhancer } from './enhancer.js';



let navigationReInit;

const releasePage = {
            observer: {
                start() {
                    try {
                        const GRE = GithubReleaseEnhancer;
                        const mainContent = document.querySelector(GRE.config.SELECTORS.MAIN_CONTENT) || document.body;
                        let domChangeDebounceTimer;
                        const callback = (mutationsList) => {
                            clearTimeout(domChangeDebounceTimer);
                            domChangeDebounceTimer = setTimeout(() => this.handleChanges(mutationsList), GRE.config.DEBOUNCE_DELAY);
                        };
                        const observer = new MutationObserver(callback);
                        observer.observe(mainContent, { childList: true, subtree: true });
                        GRE._observer = observer;

                    } catch (e) { console.error(`[GitHub Filter@${location.pathname}] Error starting DOM observer:`, e); }
                },
                handleChanges(mutations) {
                    const GRE = GithubReleaseEnhancer;
                    const S = GRE.config.SELECTORS;
                    let needsReleaseNotesUpdate = false;
                    let needsAssetFilterUpdate = false;

                    const hasElementNodes = mutations.some(m => m.addedNodes.length > 0 && Array.from(m.addedNodes).some(n => n.nodeType === Node.ELEMENT_NODE));
                    if (!hasElementNodes) return;

                    for (const mutation of mutations) {
                        for (const node of mutation.addedNodes) {
                            if (node.nodeType === Node.ELEMENT_NODE) {
                                if (node.matches(`.${GRE.config.CLASS_NAMES.MARKDOWN_BODY}.${GRE.config.CLASS_NAMES.RELEASE_NOTES_PANEL}`) || node.querySelector(`.${GRE.config.CLASS_NAMES.MARKDOWN_BODY}.${GRE.config.CLASS_NAMES.RELEASE_NOTES_PANEL}`)) {
                                    needsReleaseNotesUpdate = true;
                                }
                                const assetSummarySelector = `${S.ASSET_LIST_CONTAINER}, ${S.ASSETS_SUMMARY}`;
                                if (!GRE.store.state.isMainReleasesPage && (node.matches(assetSummarySelector) || node.querySelector(assetSummarySelector))) {
                                    needsAssetFilterUpdate = true;
                                }
                            }
                        }
                    }

                    if (needsReleaseNotesUpdate) {
                        requestAnimationFrame(() => GRE.core.releaseNotes.initializeExpansion());
                    }
                    if (needsAssetFilterUpdate) {
                        requestAnimationFrame(() => GRE.core.assetFilter.handleAssetLoad());
                    }
                }
            },
            navigation: {
                setupListeners() {
                    try {
                        if (navigationReInit) {
                            document.removeEventListener('turbo:load', navigationReInit);
                            window.removeEventListener('popstate', navigationReInit);
                        }
                        navigationReInit = () => setTimeout(() => GithubReleaseEnhancer.init(), 100);
                        document.addEventListener('turbo:load', navigationReInit);
                        window.addEventListener('popstate', navigationReInit);
                    } catch (e) { console.error(`[GitHub Filter@${location.pathname}] Error setting up navigation listeners:`, e); }
                }
            }
        };



export { releasePage };
