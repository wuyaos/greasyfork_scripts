import { GithubReleaseEnhancer } from './enhancer.js';



const ReleaseNotesCollapser = class {
        constructor() {
            this.EXCLUDE_SELECTORS = [
                '.AppHeader',
                '.mb-5',
                '.Box',
                `.${GithubReleaseEnhancer.config.CLASS_NAMES.SETTINGS_OVERLAY}`,
            ].join(',');

            this.activePanel = null;
            this.boundClickHandler = null;
            this.lastTapTime = 0;
        }

        initForPanel(panel) {
            if (!GithubReleaseEnhancer.store.state.clickOutsideToCollapse || this.activePanel) {
                return;
            }
            this.activePanel = panel;

            if (!this.boundClickHandler) {
                this.boundClickHandler = this.handleDocumentClick.bind(this);
                setTimeout(() => {
                    document.addEventListener('click', this.boundClickHandler, { capture: true });
                    document.addEventListener('touchend', this.boundClickHandler, { capture: true });
                }, 50);
            }
        }

        handleDocumentClick(event) {
            if (!this.activePanel) return;

            if (event.type === 'touchend') {
                const now = Date.now();
                if (now - this.lastTapTime < 300) {
                    event.preventDefault();
                    return;
                }
                this.lastTapTime = now;
            }

            const target = event.target;

            if (this.activePanel.contains(target) || target.closest(this.EXCLUDE_SELECTORS)) {
                return;
            }

            this.collapsePanel();
        }

        collapsePanel() {
            if (!this.activePanel) return;
            const toggleBtn = this.activePanel.querySelector(`.${GithubReleaseEnhancer.config.CLASS_NAMES.TOGGLE_BUTTON}`);
            if (toggleBtn) {
                toggleBtn.click();
            } else {
                this.activePanel.classList.remove(GithubReleaseEnhancer.config.CLASS_NAMES.EXPANDED);
                this.cleanup();
            }
        }

        cleanup() {
            if (this.boundClickHandler) {
                document.removeEventListener('click', this.boundClickHandler, { capture: true });
                document.removeEventListener('touchend', this.boundClickHandler, { capture: true });
                this.boundClickHandler = null;
            }
            this.activePanel = null;
        }
    };



export { ReleaseNotesCollapser };
