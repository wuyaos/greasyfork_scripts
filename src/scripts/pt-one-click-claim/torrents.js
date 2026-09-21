import { state } from './config.js';

import { extractNetworkInfo } from './parsing.js';

import { findSizeText, findTitleCell, parseSize } from './filters.js';

import { clean } from './elements.js';



function parseItems() { return candidateRows().map(parseRow).filter(Boolean); }

function candidateRows() {
    const ownRows = [...(state.block?.querySelectorAll('tr') || [])].filter(r => !r.querySelector('#pt-claim-plus'));
    if (ownRows.length > 1) return ownRows;
    return [...document.querySelectorAll('table')].filter(t => /标题/.test(t.innerText) && /客户端|IP|操作/.test(t.innerText)).flatMap(t => [...t.rows]);
  }

function parseRow(row) {
    if (!row.cells?.length) return null;
    const claim = state.adapter.claim(row);
    if (!claim) return null;
    const cells = [...row.cells];
    const titleCell = findTitleCell(cells);
    const title = clean(titleCell?.querySelector('a[title]')?.getAttribute('title') || titleCell?.querySelector('a')?.textContent || titleCell?.textContent);
    if (!title) return null;
    const network = extractNetworkInfo(row);
    const sizeText = findSizeText(cells);
    return { row, cell: claim.cell || row.lastElementChild, id: claim.id, title, sizeText, sizeBytes: parseSize(sizeText), ips: network.ips, clients: network.clients };
  }



export { parseItems };
