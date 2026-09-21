import { GithubReleaseEnhancer } from './enhancer.js';



const releaseActions = {
            togglePlatform(platformId) {
                const { state, setState } = GithubReleaseEnhancer.store;
                const newSelectedPlatforms = new Set(state.selectedPlatforms);
                newSelectedPlatforms.has(platformId) ? newSelectedPlatforms.delete(platformId) : newSelectedPlatforms.add(platformId);

                const parsedAssets = GithubReleaseEnhancer.core.assetFilter.getParsedAssets();
                const availableArchsNow = new Set();
                const assetsToConsider = newSelectedPlatforms.size > 0
                    ? parsedAssets.filter(asset => asset.info.platform && newSelectedPlatforms.has(asset.info.platform))
                    : parsedAssets;
                assetsToConsider.forEach(asset => {
                    if (asset.info.architecture) availableArchsNow.add(asset.info.architecture);
                });

                const newSelectedArchs = new Set(state.selectedArchs);
                for (const selected of newSelectedArchs) {
                    if (!availableArchsNow.has(selected)) {
                        newSelectedArchs.delete(selected);
                    }
                }

                setState({ selectedPlatforms: newSelectedPlatforms, selectedArchs: newSelectedArchs });
            },
            toggleArch(archId) {
                const { state, setState } = GithubReleaseEnhancer.store;
                const newSelectedArchs = new Set(state.selectedArchs);
                if (newSelectedArchs.has(archId)) {
                    newSelectedArchs.delete(archId);
                } else {
                    newSelectedArchs.add(archId);
                }
                setState({ selectedArchs: newSelectedArchs });
            },
            toggleSupplementaryFilter(filterType) {
                const { setState, state } = GithubReleaseEnhancer.store;
                const stateKeyMap = {
                    language: 'filterMatchLanguage',
                    resolution: 'filterMatchResolution',
                    keyword: 'hideByKeyword',
                    source: 'hideSourceCode'
                };
                const stateKey = stateKeyMap[filterType];
                if (stateKey) {
                    setState({ [stateKey]: !state[stateKey] });
                }
            },
            updateAndSaveAllFilters(select) {
                const { state, setState } = GithubReleaseEnhancer.store;
                if (select) {
                    const newSelectedPlatforms = new Set();
                    GithubReleaseEnhancer.config.PLATFORMS.forEach(platform => {
                        if (state.availableFilters.has(platform.id)) {
                            newSelectedPlatforms.add(platform.id);
                        }
                    });

                    const newSelectedArchs = new Set();
                    state.masterAvailableArchs.forEach(arch => newSelectedArchs.add(arch));

                    const newState = { selectedPlatforms: newSelectedPlatforms, selectedArchs: newSelectedArchs };
                    const supplementaryFilters = ['language', 'resolution', 'keyword', 'source'];
                    supplementaryFilters.forEach(type => {
                        if (state.availableFilters.has(type)) {
                            const stateKey = { language: 'filterMatchLanguage', resolution: 'filterMatchResolution', keyword: 'hideByKeyword', source: 'hideSourceCode' }[type];
                            if(stateKey) newState[stateKey] = true;
                        }
                    });
                    setState(newState);
                } else {
                    setState({
                        selectedPlatforms: new Set(),
                        selectedArchs: new Set(),
                        filterMatchLanguage: false,
                        filterMatchResolution: false,
                        hideByKeyword: false,
                        hideSourceCode: false,
                    });
                }
            },
            toggleDropdown() {
                const GRE = GithubReleaseEnhancer;
                const state = GRE.store.state;
                if (state.isDropdownOpen) {
                    GRE.core.assetFilter.closePopup();
                } else {
                    const wrapper = state.filterUIInstance;
                    if (wrapper) {
                        wrapper.classList.add(GRE.config.CLASS_NAMES.PLATFORM_OPTIONS_OPEN);
                        const filterButton = wrapper.querySelector(`.${GRE.config.CLASS_NAMES.FILTER_BUTTON}`);
                        if (filterButton) filterButton.setAttribute('aria-expanded', 'true');
                        GRE.store.setState({ isDropdownOpen: true });
                        requestAnimationFrame(() => {
                            const firstOption = wrapper.querySelector(GRE.config.SELECTORS.FIRST_FOCUSABLE_OPTION);
                            if (firstOption) firstOption.focus();
                        });
                    }
                }
            },
            restoreInitialFilters() {
                const { state, setState } = GithubReleaseEnhancer.store;
                if (state.initialFilterState) {
                    const clonedInitialState = {
                        ...state.initialFilterState,
                        selectedPlatforms: new Set(state.initialFilterState.selectedPlatforms),
                        selectedArchs: new Set(state.initialFilterState.selectedArchs),
                    };
                    setState(clonedInitialState);
                }
            },
            initializeFilterStates() {
                const { state, setState } = GithubReleaseEnhancer.store;
                let newFilterState = {};

                if (state.isMainReleasesPage) {
                     newFilterState = {
                        selectedPlatforms: new Set(),
                        selectedArchs: new Set(),
                        filterMatchLanguage: false,
                        filterMatchResolution: false,
                        hideByKeyword: true,
                        hideSourceCode: false,
                     };
                // [FIXED v2.0.0] 修复偏好筛选模式下的逻辑
                } else if (state.filterMode === 'preferred' && Object.keys(state.preferredFilters).length > 0) {
                    const { preferredFilters } = state;
                    const validatedSelectedPlatforms = new Set();
                    const validatedSelectedArchs = new Set();

                    // 1. 验证用户偏好的平台在当前 Release 中是否可用
                    if (preferredFilters.selectedPlatforms) {
                        for (const platform of preferredFilters.selectedPlatforms) {
                            if (state.availableFilters.has(platform)) {
                                validatedSelectedPlatforms.add(platform);
                            }
                        }
                    }

                    // 2. 只有在至少一个偏好平台可用的情况下，才验证并选择偏好的架构
                    if (validatedSelectedPlatforms.size > 0 && preferredFilters.selectedArchs) {
                        for (const arch of preferredFilters.selectedArchs) {
                            if (state.masterAvailableArchs.has(arch)) {
                                validatedSelectedArchs.add(arch);
                            }
                        }
                    }
                    newFilterState = {
                        ...preferredFilters,
                        selectedPlatforms: validatedSelectedPlatforms,
                        selectedArchs: validatedSelectedArchs,
                    };
                } else { // 智能筛选模式
                    // [FIXED v2.0.1] 修复智能筛选模式下的逻辑
                    const selectedPlatforms = new Set();
                    const selectedArchs = new Set();

                    // 1. 检查用户的当前平台在 Release 中是否可用
                    if (state.availableFilters.has(state.currentUserPlatform)) {
                        selectedPlatforms.add(state.currentUserPlatform);

                        // 2. 只有在平台匹配后，才检查并选择架构
                        if (state.availableArchs.has(state.currentUserArchitecture)) {
                            selectedArchs.add(state.currentUserArchitecture);
                        }
                    }
                    newFilterState = {
                        selectedPlatforms,
                        selectedArchs,
                        filterMatchLanguage: state.availableFilters.has('language'),
                        filterMatchResolution: state.availableFilters.has('resolution'),
                        hideByKeyword: state.availableFilters.has('keyword'),
                        hideSourceCode: state.availableFilters.has('source'),
                    };
                }

                const initialSnapshot = {
                    ...newFilterState,
                    selectedPlatforms: new Set(newFilterState.selectedPlatforms),
                    selectedArchs: new Set(newFilterState.selectedArchs)
                };

                setState({
                    ...newFilterState,
                    initialFilterState: initialSnapshot,
                });
            }
        };



export { releaseActions };
