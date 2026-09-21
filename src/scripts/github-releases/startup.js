import { GithubReleaseEnhancer } from './enhancer.js';



function waitForElement(selector, callback) {
        const element = document.querySelector(selector);
        if (element) {
            callback();
            return;
        }
        const observer = new MutationObserver(() => {
            if (document.querySelector(selector)) {
                observer.disconnect();
                callback();
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

function main() {
        waitForElement(GithubReleaseEnhancer.config.SELECTORS.MAIN_REPO_CONTENT, () => {
            GithubReleaseEnhancer.init();
        });
    }

function bootstrap() {
if (document.readyState === 'interactive' || document.readyState === 'complete') {
        main();
    } else {
        document.addEventListener('DOMContentLoaded', main, { once: true });
    }
}



export { bootstrap };
