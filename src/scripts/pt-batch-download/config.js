

const ID = 'ptbd-panel'

const TOGGLE_ID = 'ptbd-toggle'

const CUSTOM_SITES_KEY = 'ptbd_custom_sites'

const DOWNLOADERS_KEY = 'ptbd_downloaders'

const DEFAULT_PATHS = ['/userdetails.php', '/torrents.php', '/special.php', '/browse.php']

const UNIT3D_LIST_PATH = '/torrents'

const UNIT3D_DL_SELECTOR = 'a[href*="/torrents/download/"]'

const DEFAULT_DL = { id: '', name: '', type: 'qb', host: '', username: '', password: '', qbCategory: '', qbTags: '', qbSavePath: '', trDownloadDir: '', trLabels: '' }

const UNIT_BYTES = { kib: 1024, mib: 1024 ** 2, gib: 1024 ** 3, tib: 1024 ** 4, kb: 1024, mb: 1024 ** 2, gb: 1024 ** 3, tb: 1024 ** 4, b: 1 }

const SIZE_UNITS = ['GiB', 'MiB', 'KiB', 'TiB']

const state = { torrents: [], filtered: [], selected: new Set(), selectedDownloaderId: '', isDownloading: false, ui: {}, filter: { delay: 1200 } }



export { CUSTOM_SITES_KEY, DEFAULT_DL, DEFAULT_PATHS, DOWNLOADERS_KEY, ID, SIZE_UNITS, TOGGLE_ID, UNIT3D_DL_SELECTOR, UNIT3D_LIST_PATH, UNIT_BYTES, state };
