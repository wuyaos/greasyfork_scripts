// ==UserScript==
// @name         杏坛种子每GB·h体积收益（自用）
// @namespace    http://tampermonkey.net/
// @version      0.1.0
// @description  在杏坛种子列表自动计算每个种子的每GB·h体积收益（体积收益/天 ÷ 24 ÷ 种子体积GB），追加到现有显示之后
// @match        https://xingtan.one/torrents.php*
// @grant        none
// @icon         https://xingtan.one/favicon.ico
// @license      MIT
// @downloadURL  https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/dist/Xingtan_BonusPerGBh.user.js
// @updateURL    https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/dist/Xingtan_BonusPerGBh.user.js
// ==/UserScript==

/* 杏坛（xingtan.one）种子列表：自动计算每个种子的每GB·h体积收益
 * Input: torrents.php 页面中站点渲染的 .bonus-data（data-size-bonus JSON）与 .bonus-result
 * Output: 在每个种子的 bonus-result 容器内追加"每GB·h: X.XXXXX"行
 * Pos: 不修改站点公式与现有显示；仅在站点已渲染的体积收益行之后追加一行
 */

// Generated from src/scripts/xingtan-bonus-pergbh/index.js; do not edit dist files.
"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

  // src/scripts/xingtan-bonus-pergbh/bonus.js
  var K = 763.94372688;
  function parseSizeBonus(bonusData) {
    const raw = bonusData.getAttribute("data-size-bonus");
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
  __name(parseSizeBonus, "parseSizeBonus");
  function volumePerDay(params) {
    const { size_bonus: s, l_bonus: L, A } = params;
    return K * Math.atan(s / L / (1 + (s + A) * A / (L * L)));
  }
  __name(volumePerDay, "volumePerDay");
  function readDisplayedSizeGB(torrentRow) {
    const cells = [...torrentRow.children].filter((cell) => cell.tagName === "TD");
    for (const cell of cells) {
      const text = cell.textContent.replace(/\s+/g, " ").trim();
      const match = text.match(/^([\d,]+(?:\.\d+)?)\s*(PB|TB|GB|MB|KB|B)$/i);
      if (!match) continue;
      const amount = Number(match[1].replaceAll(",", ""));
      const units = { PB: 1024 * 1024, TB: 1024, GB: 1, MB: 1 / 1024, KB: 1 / (1024 * 1024), B: 1 / (1024 * 1024 * 1024) };
      const sizeGB = amount * units[match[2].toUpperCase()];
      if (Number.isFinite(sizeGB) && sizeGB > 0) return sizeGB;
    }
    return null;
  }
  __name(readDisplayedSizeGB, "readDisplayedSizeGB");
  function findTorrentRow(bonusData) {
    const innerTable = bonusData.closest("table");
    return innerTable?.parentElement?.closest("tr") || null;
  }
  __name(findTorrentRow, "findTorrentRow");
  function appendPerGBhRow(bonusData, bonusResult) {
    if (bonusResult.querySelector(".per-gbh-row")) return true;
    const params = parseSizeBonus(bonusData);
    const torrentRow = findTorrentRow(bonusData);
    const sizeGB = torrentRow && readDisplayedSizeGB(torrentRow);
    if (!params || !sizeGB) return false;
    const value = volumePerDay(params) / 24 / sizeGB;
    if (!Number.isFinite(value) || value <= 0) return false;
    const row = document.createElement("div");
    row.className = "per-gbh-row";
    row.style.display = "flex";
    row.textContent = `每GB·h: ${value.toFixed(5)}`;
    bonusResult.appendChild(row);
    return true;
  }
  __name(appendPerGBhRow, "appendPerGBhRow");

  // src/scripts/xingtan-bonus-pergbh/startup.js
  var PROCESSED = "data-gbh-processed";
  function processRows() {
    document.querySelectorAll(".bonus-data").forEach((bonusData) => {
      if (bonusData.hasAttribute(PROCESSED)) return;
      const bonusResult = bonusData.nextElementSibling;
      if (!bonusResult || !bonusResult.classList.contains("bonus-result")) return;
      if (appendPerGBhRow(bonusData, bonusResult)) bonusData.setAttribute(PROCESSED, "1");
    });
  }
  __name(processRows, "processRows");
  function bootstrap() {
    processRows();
    const observer = new MutationObserver(() => processRows());
    observer.observe(document.body, { childList: true, subtree: true });
  }
  __name(bootstrap, "bootstrap");

  // src/scripts/xingtan-bonus-pergbh/index.js
  bootstrap();
})();
