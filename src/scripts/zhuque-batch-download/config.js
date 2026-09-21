

const ID = 'zhuque-batch-dl';

const STORAGE_KEY = 'zhuque_batch_dl_cfg';

const DELAY_KEY = 'zhuque_batch_dl_delay';

const UNIT_BYTES = { kib: 1024, mib: 1024 ** 2, gib: 1024 ** 3, tib: 1024 ** 4, pib: 1024 ** 5 };

const state = { rows: [], filtered: [], panel: null, ui: {}, mountTimer: null, lastSig: '' };



export { DELAY_KEY, ID, STORAGE_KEY, UNIT_BYTES, state };
