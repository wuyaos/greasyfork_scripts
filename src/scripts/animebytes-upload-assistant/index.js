// Input: series groups or the Anime upload form; Output: local-only upload assistance.
import './series.js';
import { mountUpload } from './upload.js';

if (location.hostname === 'animebytes.tv' && location.pathname === '/upload.php') {
  mountUpload();
}
