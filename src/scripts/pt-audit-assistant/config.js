

const ID = 'pt-audit-assistant';

const AUTO_APPROVAL_KEY = 'pt_audit_assistant_auto_approval';

const AUTO_CLOSE_KEY = 'pt_audit_assistant_auto_close';

const DEBUG_KEY = 'pt_audit_assistant_debug';

const ONE_TIB = 1024 ** 4;

const DEFAULT_COLLECTORS = ['title', 'desc', 'siteMeta', 'tags', 'mediainfo', 'screenshots', 'size', 'approvalLink'];

const DEFAULT_PARSERS = ['title', 'mediainfo', 'dbLinks', 'doubanScore', 'derived'];



export { AUTO_APPROVAL_KEY, AUTO_CLOSE_KEY, DEBUG_KEY, DEFAULT_COLLECTORS, DEFAULT_PARSERS, ID, ONE_TIB };
