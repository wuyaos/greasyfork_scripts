import { replaceIcons } from './replace-icons.js';



const observer = new MutationObserver(replaceIcons);

function bootstrap() {
replaceIcons();

observer.observe(document.body, { childList: true, subtree: true });
}



export { bootstrap };
