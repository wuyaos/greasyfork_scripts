

const DELAY_MS = 900;

const EMPTY_VALUE = '__PT_CLAIM_EMPTY__';

const EMPTY_LABEL = '未检测到';

const CLIENT_RE = /qBittorrent[^\s\n]*|Transmission[^\s\n]*|Deluge[^\s\n]*|uTorrent[^\s\n]*|µTorrent[^\s\n]*|BitComet[^\s\n]*|libtorrent[^\s\n]*|rTorrent[^\s\n]*|rtorrent[^\s\n]*|ruTorrent[^\s\n]*|BiglyBT[^\s\n]*|Azureus[^\s\n]*|Aria2[^\s\n]*|SeedBox/i;

const IPV4_RE = /(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}/g;

const IPV6_CANDIDATE_SEP = /[\s,，、;；()<>[\]{}"'|]+/;

const state = { adapter: null, block: null, items: [], ui: {} };



export { CLIENT_RE, DELAY_MS, EMPTY_LABEL, EMPTY_VALUE, IPV4_RE, IPV6_CANDIDATE_SEP, state };
