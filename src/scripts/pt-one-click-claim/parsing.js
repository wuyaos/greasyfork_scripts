import { CLIENT_RE, IPV4_RE, IPV6_CANDIDATE_SEP } from './config.js';

import { readableText } from './page.js';

import { clean, escapeRegExp } from './elements.js';



function extractNetworkInfo(row) {
    const ips = new Set(), clients = new Set();
    const cellTexts = [...row.cells].map(readableText);
    cellTexts.forEach(t => extractIps(t).forEach(ip => ips.add(ip)));
    row.querySelectorAll('img[title]').forEach(img => { if (CLIENT_RE.test(img.title)) clients.add(clean(img.title)); });
    cellTexts.forEach(t => t.split(/[\n\r]+/).map(clean).filter(Boolean).forEach(line => {
      const match = line.match(CLIENT_RE);
      if (match) clients.add(match[0]);
      const withoutIps = stripIps(line).replace(/\b\d{2,5}\b/g, ' ').trim();
      if (CLIENT_RE.test(withoutIps)) clients.add(withoutIps.match(CLIENT_RE)[0]);
    }));
    return { ips: [...ips], clients: [...clients] };
  }

function extractIps(textValue) { const text = String(textValue || ''); const ips = text.match(IPV4_RE) || []; text.split(IPV6_CANDIDATE_SEP).forEach(part => { const token = part.trim(); if (token.includes(':') && isIPv6(token)) ips.push(token); }); return [...new Set(ips)]; }

function isIPv6(value) { try { return new URL(`http://[${value}]/`).hostname.toLowerCase() === `[${value.toLowerCase()}]`; } catch (_) { return false; } }

function stripIps(textValue) { return String(textValue || '').replace(IPV4_RE, ' ').split(IPV6_CANDIDATE_SEP).map(part => isIPv6(part) ? ' ' : part).join(' '); }

function parseKeywordQuery(raw) {
    const query = String(raw || '').trim();
    const parsed = { all: [], any: [], not: [] };
    if (!query) return parsed;
    for (const token of tokens(query)) {
      const neg = token.startsWith('-');
      const body = (neg ? token.slice(1) : token).trim();
      if (!body) continue;
      const parts = body.split('|').map(x => x.trim()).filter(Boolean);
      if (neg) parsed.not.push(...parts); else if (parts.length > 1) parsed.any.push(...parts); else parsed.all.push(body);
    }
    return parsed;
  }

function matchKeyword(title, query) {
    const parsed = typeof query === 'string' ? parseKeywordQuery(query) : query;
    const textValue = String(title || '').toLowerCase();
    return parsed.all.every(t => termMatch(textValue, t)) && (!parsed.any.length || parsed.any.some(t => termMatch(textValue, t))) && !parsed.not.some(t => termMatch(textValue, t));
  }

function termMatch(textValue, term) { const raw = String(term || '').toLowerCase(); return raw.includes('*') ? wildcard(raw).test(textValue) : textValue.includes(raw); }

function wildcard(term) { return new RegExp(escapeRegExp(term).replace(/\\\*/g, '.*'), 'i'); }

function tokens(query) { const out = []; query.replace(/"([^"]+)"|'([^']+)'|(\S+)/g, (_, a, b, c) => out.push(a || b || c)); return out; }



export { extractNetworkInfo, matchKeyword, parseKeywordQuery };
