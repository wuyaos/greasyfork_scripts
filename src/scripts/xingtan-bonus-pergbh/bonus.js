// 杏坛每GB·h体积收益计算。
// 站点的 data-size-bonus 用于计算每日体积收益；每GB·h 的分母读取种子行实际显示的体积。
//   体积收益/天 = K * atan((s / L) / (1 + (s + A) * A / L^2))
//   K = 763.94372688，s = data-size-bonus 中的公式参数，L = 当前人均做种体积，A = 用户 A 值
// 每GB·h = 体积收益/天 ÷ 24 ÷ 种子列表显示体积(GB)

const K = 763.94372688;

/**
 * 解析 bonus-data 元素上的 data-size-bonus JSON。
 * @param {Element} bonusData
 * @returns {{size_bonus: number, l_bonus: number, A: number} | null}
 */
export function parseSizeBonus(bonusData) {
  const raw = bonusData.getAttribute('data-size-bonus');
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    const size = Number(data.size_bonus);
    const L = Number(data.l_bonus);
    const A = Number(data.A);
    if (!Number.isFinite(size) || !Number.isFinite(L) || !Number.isFinite(A) || L <= 0) return null;
    return { size_bonus: size, l_bonus: L, A };
  } catch {
    return null;
  }
}

/** 计算单个种子每日体积收益（与站点脚本一致）。 */
export function volumePerDay(params) {
  const { size_bonus: s, l_bonus: L, A } = params;
  return K * Math.atan((s / L) / (1 + ((s + A) * A) / (L * L)));
}

/**
 * 将种子列表体积列换算成 GB。杏坛的 TB/GB 显示按 1024 进制换算。
 * @param {Element} torrentRow 外层种子行（直接包含标题、体积、做种数等 td）
 */
export function readDisplayedSizeGB(torrentRow) {
  const cells = [...torrentRow.children].filter(cell => cell.tagName === 'TD');
  for (const cell of cells) {
    const text = cell.textContent.replace(/\s+/g, ' ').trim();
    const match = text.match(/^([\d,]+(?:\.\d+)?)\s*(PB|TB|GB|MB|KB|B)$/i);
    if (!match) continue;
    const amount = Number(match[1].replaceAll(',', ''));
    const units = { PB: 1024 * 1024, TB: 1024, GB: 1, MB: 1 / 1024, KB: 1 / (1024 * 1024), B: 1 / (1024 * 1024 * 1024) };
    const sizeGB = amount * units[match[2].toUpperCase()];
    if (Number.isFinite(sizeGB) && sizeGB > 0) return sizeGB;
  }
  return null;
}

/** 读取 bonus-data 所在的外层种子行。 */
export function findTorrentRow(bonusData) {
  const innerTable = bonusData.closest('table');
  return innerTable?.parentElement?.closest('tr') || null;
}

/**
 * 在 bonus-result 容器内追加“每GB·h”行。
 * @param {Element} bonusData .bonus-data 元素
 * @param {Element} bonusResult .bonus-result 元素（站点脚本已渲染“数量/体积: X /天”）
 * @returns {boolean} 是否成功追加
 */
export function appendPerGBhRow(bonusData, bonusResult) {
  if (bonusResult.querySelector('.per-gbh-row')) return true;
  const params = parseSizeBonus(bonusData);
  const torrentRow = findTorrentRow(bonusData);
  const sizeGB = torrentRow && readDisplayedSizeGB(torrentRow);
  if (!params || !sizeGB) return false;
  const value = volumePerDay(params) / 24 / sizeGB;
  if (!Number.isFinite(value) || value <= 0) return false;

  const row = document.createElement('div');
  row.className = 'per-gbh-row';
  row.style.display = 'flex';
  row.textContent = `每GB·h: ${value.toFixed(5)}`;
  bonusResult.appendChild(row);
  return true;
}
