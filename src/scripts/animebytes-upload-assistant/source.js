// Filename hints are candidates, not disc/container or release-method evidence.
export function sourceCandidates(path = '') {
  const filename = path.split(/[\\/]/).pop();
  const candidates = new Map();
  const add = (value, evidence) => candidates.set(value, { value, evidence });
  const tags = /(?:^|[\s.\[\]()_\-])((?:UHD|Ultra[ ._-]?HD)[ ._-]*(?:Blu[ ._-]?ray|BD)|Blu[ ._-]?ray|BDRip|DVD(?:Rip)?|WEB[ ._-]?(?:DL|Rip)|HDTV|TVRip)(?=$|[\s.\[\]()_\-])/gi;
  for (const match of filename.matchAll(tags)) {
    const tag = match[1].replace(/[ ._-]/g, '').toUpperCase();
    if (/^(UHD|ULTRAHD)/.test(tag)) add('UHD Blu-ray', 'UHD Blu-ray 标签');
    else if (/^(BLURAY|BDRIP)$/.test(tag)) add('Blu-ray', 'BluRay / BDRip 标签');
    else if (/^DVD/.test(tag)) add('DVD', 'DVD / DVDRip 标签');
    else if (/^WEB/.test(tag)) add('Web', 'WEB-DL / WEBRip 标签');
    else add('TV', 'HDTV / TVRip 标签');
  }
  // Short "BD" is too ambiguous in a title; accept only a bracketed tag group
  // beginning with BD followed by a resolution, or the isolated [BD] tag.
  if (/[\[(]\s*BD(?:\s*[\])]|[ ._-]+(?:\d{3,4}[pi]|4K)\b)/i.test(filename)) add('Blu-ray', '括号内 BD 标签');
  // One filename may redundantly say UHD BluRay and BluRay; keep the specific hint.
  if (candidates.has('UHD Blu-ray')) candidates.delete('Blu-ray');
  return [...candidates.values()];
}
