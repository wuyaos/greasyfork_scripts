// ==UserScript==
// @name         AnimeBytes Upload Assistant（自用）
// @namespace    http://tampermonkey.net/
// @version      0.4.0
// @description  系列页分组上传入口与 Anime 上传 MediaInfo/BDInfo 解析、撤销及调试日志
// @match        https://animebytes.tv/series.php*
// @match        https://animebytes.tv/upload.php*
// @run-at       document-end
// @grant        none
// @icon         https://animebytes.tv/favicon.ico
// @license      MIT
// @downloadURL  https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/dist/AnimeBytes_UploadAssistant.user.js
// @updateURL    https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/dist/AnimeBytes_UploadAssistant.user.js
// ==/UserScript==

// Input: series groups or the Anime upload form; Output: local-only upload assistance.

// Generated from src/scripts/animebytes-upload-assistant/index.js; do not edit dist files.
(() => {
  var __defProp = Object.defineProperty;
  var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

  // src/scripts/animebytes-upload-assistant/series.js
  if (location.hostname === "animebytes.tv" && location.pathname === "/series.php") {
    for (const row of document.querySelectorAll('tr.group[id^="group_"]')) {
      const groupId = /^group_([1-9]\d*)$/.exec(row.id)?.[1];
      const heading = row.querySelector("h3");
      if (!groupId || !heading || heading.querySelector(".ab-add-format")) continue;
      let type;
      for (const link of heading.querySelectorAll("a[href]")) {
        const url2 = new URL(link.getAttribute("href"), location.href);
        if (url2.origin !== location.origin || url2.searchParams.get("id") !== groupId) continue;
        if (url2.pathname === "/torrents.php") type = "anime";
        if (url2.pathname === "/torrents2.php") type = "music";
        if (type) break;
      }
      if (!type) continue;
      const url = new URL("/upload.php", location.origin);
      url.searchParams.set("type", type);
      url.searchParams.set("groupid", groupId);
      const button = document.createElement("a");
      button.className = "ab-add-format";
      button.href = url.href;
      button.textContent = "[添加格式]";
      button.title = `为分组 ${groupId} 添加格式（${type}）`;
      button.style.marginInlineStart = "12px";
      button.style.fontSize = "0.85em";
      button.style.fontWeight = "normal";
      button.style.whiteSpace = "nowrap";
      heading.append(button);
    }
  }

  // src/scripts/animebytes-upload-assistant/source.js
  function sourceCandidates(path = "") {
    const filename = path.split(/[\\/]/).pop();
    const candidates = /* @__PURE__ */ new Map();
    const add = /* @__PURE__ */ __name((value, evidence) => candidates.set(value, { value, evidence }), "add");
    const tags = /(?:^|[\s.\[\]()_\-])((?:UHD|Ultra[ ._-]?HD)[ ._-]*(?:Blu[ ._-]?ray|BD)|Blu[ ._-]?ray|BDRip|DVD(?:Rip)?|WEB[ ._-]?(?:DL|Rip)|HDTV|TVRip)(?=$|[\s.\[\]()_\-])/gi;
    for (const match of filename.matchAll(tags)) {
      const tag = match[1].replace(/[ ._-]/g, "").toUpperCase();
      if (/^(UHD|ULTRAHD)/.test(tag)) add("UHD Blu-ray", "UHD Blu-ray 标签");
      else if (/^(BLURAY|BDRIP)$/.test(tag)) add("Blu-ray", "BluRay / BDRip 标签");
      else if (/^DVD/.test(tag)) add("DVD", "DVD / DVDRip 标签");
      else if (/^WEB/.test(tag)) add("Web", "WEB-DL / WEBRip 标签");
      else add("TV", "HDTV / TVRip 标签");
    }
    if (/[\[(]\s*BD(?:\s*[\])]|[ ._-]+(?:\d{3,4}[pi]|4K)\b)/i.test(filename)) add("Blu-ray", "括号内 BD 标签");
    if (candidates.has("UHD Blu-ray")) candidates.delete("Blu-ray");
    return [...candidates.values()];
  }
  __name(sourceCandidates, "sourceCandidates");

  // src/scripts/animebytes-upload-assistant/parse.js
  function sections(text) {
    const result = [];
    let current;
    for (const line of text.split(/\r?\n/)) {
      const header = /^(General|Video|Audio|Text|Menu)(?:\s*#\d+)?\s*$/i.exec(line.trim());
      if (header) {
        current = { type: header[1].toLowerCase(), data: {} };
        result.push(current);
      } else if (current) {
        const item = /^\s*([^:]+?)\s*:\s*(.*?)\s*$/.exec(line);
        if (item) current.data[item[1].trim().toLowerCase()] = item[2];
      }
    }
    return result;
  }
  __name(sections, "sections");
  function videoCodec(format, depth = "") {
    if (/HEVC|h[ .-]?265/i.test(format)) return /12/.test(depth) ? "h265 12-bit" : /10/.test(depth) ? "h265 10-bit" : "h265";
    if (/AVC|h[ .-]?264/i.test(format)) return /10/.test(depth) ? "h264 10-bit" : "h264";
    for (const [pattern, value] of [[/AV1/i, "AV1"], [/VP9/i, "VP9"], [/VC-1/i, "VC-1"], [/MPEG-?[12]/i, "MPEG-1/2"], [/XviD/i, "XviD"], [/DivX/i, "DivX"]]) {
      if (pattern.test(format)) return value;
    }
  }
  __name(videoCodec, "videoCodec");
  function audioCodec(format) {
    if (/E-?AC-?3|EAC3|Dolby Digital Plus/i.test(format)) return;
    for (const [pattern, value] of [
      [/DTS.*(?:Master|MA\b)|DTS.*XLL/i, "DTS-HD MA"],
      [/DTS.*(?:HD|HRA)/i, "DTS-HD"],
      [/DTS-ES/i, "DTS-ES"],
      [/DTS/i, "DTS"],
      [/TrueHD|MLP FBA/i, "TrueHD"],
      [/L?PCM/i, "PCM"],
      [/FLAC/i, "FLAC"],
      [/AAC/i, "AAC"],
      [/AC-?3|Dolby Digital/i, "AC3"],
      [/Opus/i, "Opus"],
      [/Vorbis/i, "Vorbis"],
      [/MP3|MPEG Audio.*Layer 3/i, "MP3"],
      [/MP2|MPEG Audio.*Layer 2/i, "MP2"],
      [/WMA/i, "WMA"]
    ]) if (pattern.test(format)) return value;
  }
  __name(audioCodec, "audioCodec");
  function language(value = "") {
    const v = value.trim().toLowerCase();
    if (/^(english|eng|en)$/.test(v)) return "en";
    if (/^(japanese|jpn|ja)$/.test(v)) return "ja";
    return v;
  }
  __name(language, "language");
  function channelLayout(data) {
    const layout = data["channel layout"] || data["channel positions"] || "";
    const count = Number.parseInt(data["channel(s)"] || data.channels, 10);
    if (count === 1) return "1.0";
    if (count === 2) return "2.0";
    if (!count) return;
    if (!layout) return;
    const hasLFE = /\bLFE\b/i.test(layout);
    return `${count - (hasLFE ? 1 : 0)}.${hasLFE ? 1 : 0}`;
  }
  __name(channelLayout, "channelLayout");
  function parseMedia(text) {
    const fields = {};
    const reasons = {};
    const notes = [];
    const put = /* @__PURE__ */ __name((key, value, reason) => {
      if (value !== void 0) {
        fields[key] = value;
        reasons[key] = reason;
      }
    }, "put");
    let audio = [];
    let subtitles = [];
    let videoCount = 0;
    let kind;
    let sources = [];
    if (/^\s*(?:Disc Label|Disc Title|Playlist)\s*:/mi.test(text) && /^\s*Video\s*:/mi.test(text)) {
      kind = "BDInfo";
      put("media", /\b(?:Ultra HD|UHD)\s*(?:Blu-ray|BD)\b/i.test(text) ? "UHD Blu-ray" : "Blu-ray", "光盘/播放列表结构");
      const videos = [...text.matchAll(/^\s*Video\s*:\s*(.+)$/gmi)];
      videoCount = videos.length;
      const v = videos[0]?.[1] || "";
      put("codecs", videoCodec(v, /(?:10|12)[ -]?bit/i.exec(v)?.[0]), "BDInfo 视频编码/Profile");
      const res = /\b(720p|1080p|1080i|2160p)\b/i.exec(v)?.[1].toLowerCase();
      put("resolution", res === "2160p" ? "4K" : res, "BDInfo 视频行");
      put("aspectratio", /\b(4:3|16:9|1\.85:1|2\.39:1|2\.4:1)\b/.exec(v)?.[1], "BDInfo 视频显示比例");
      audio = [...text.matchAll(/^\s*Audio\s*:\s*(.+)$/gmi)].map((m) => {
        const parts = m[1].split("/").map((s) => s.trim());
        return { language: language(parts[0]), codec: audioCodec(parts[1] || ""), channels: /^\d\.\d$/.test(parts[2]) ? parts[2] : void 0, commentary: /commentary/i.test(m[1]) };
      });
      subtitles = [...text.matchAll(/^\s*Subtitle\s*:\s*([^/\r\n]+)/gmi)].map((m) => language(m[1]));
      notes.push("BDInfo 摘要无法确认上传容器为 ISO 或目录结构，请手动选择 Containers。");
    } else {
      const parsed = sections(text);
      const general = parsed.find((s) => s.type === "general")?.data;
      const videos = parsed.filter((s) => s.type === "video");
      const v = videos[0]?.data;
      if (!general || !v) throw new Error("未识别到 MediaInfo 的 General/Video 段，或支持的 BDInfo 摘要。");
      kind = "MediaInfo";
      videoCount = videos.length;
      const containers = { matroska: "MKV", "mpeg-4": "MP4", "mpeg-ts": "TS", "bdav": "M2TS", avi: "AVI", "windows media": "WMV", "mpeg-ps": "MPG", "flash video": "FLV", ogg: "OGM" };
      put("containers", containers[general.format?.toLowerCase()], "General → Format");
      sources = sourceCandidates(general["complete name"]);
      put("codecs", videoCodec(`${v.format || ""} ${v["codec id"] || ""}`, v["bit depth"] || (/High 10|Main 10/i.test(v["format profile"] || "") ? "10" : "")), "Video → Format / Bit depth / Profile");
      const width = Number.parseInt((v.width || "").replace(/[\s,]/g, ""), 10);
      const height = Number.parseInt((v.height || "").replace(/[\s,]/g, ""), 10);
      let resolution;
      if (width === 1280 && height === 720 && !/interlaced/i.test(v["scan type"] || "")) resolution = "720p";
      else if (width === 1920 && height === 1080 && /progressive|interlaced/i.test(v["scan type"] || "")) resolution = /interlaced/i.test(v["scan type"]) ? "1080i" : "1080p";
      else if ([3840, 4096].includes(width) && height === 2160) resolution = "4K";
      else if (["640x480", "720x480", "720x486", "720x576", "704x396", "848x480", "1024x576", "960x540"].includes(`${width}x${height}`)) resolution = `${width}x${height}`;
      put("resolution", resolution, "Video → Width / Height / Scan type");
      put("aspectratio", v["display aspect ratio"], "Video → Display aspect ratio");
      audio = parsed.filter((s) => s.type === "audio").map((s) => ({
        language: language(s.data.language),
        codec: audioCodec(`${s.data.format || ""} ${s.data["format profile"] || ""} ${s.data["format commercial name"] || ""} ${s.data["commercial name"] || ""}`),
        channels: channelLayout(s.data),
        commentary: /commentary|commentaire|コメント/i.test(s.data.title || "")
      }));
      subtitles = parsed.filter((s) => s.type === "text").map((s) => language(s.data.language));
    }
    const main = audio.filter((a) => !a.commentary);
    const japanese = main.filter((a) => a.language === "ja");
    const candidates = japanese.length ? japanese : main;
    for (const [key, prop] of [["audio", "codec"], ["audiochannels", "channels"]]) {
      const values = candidates.map((a) => a[prop]);
      if (values.length && values.every((v) => v !== void 0 && v === values[0])) put(key, values[0], japanese.length ? "日语非评论音轨" : "非评论音轨结果一致");
    }
    if (main.some((a) => a.language === "ja") && main.some((a) => a.language === "en")) put("dual_audio", true, "日语与英语非评论音轨");
    else if (main.length && main.every((a) => a.language) && !main.some((a) => a.language === "en")) put("dual_audio", false, "已列出的非评论音轨没有英语音轨");
    else notes.push("Dual Audio 缺少足够的原语言/英语音轨证据，请确认。");
    if (subtitles.length) {
      put("subbing", "Softsubs", "存在独立字幕轨");
      if (!subtitles.includes("en")) notes.push("未发现英语字幕，请核对发布要求；不能把其他语言字幕视为英语字幕。");
    }
    if (videoCount > 1) {
      for (const field of ["codecs", "resolution", "aspectratio"]) delete fields[field];
      notes.push("存在多条视频信息，视频字段请手动确认。");
    }
    return { kind, fields, reasons, notes, sources, tracks: { video: videoCount, audio: audio.length, subtitles: subtitles.length } };
  }
  __name(parseMedia, "parseMedia");

  // src/scripts/animebytes-upload-assistant/region.js
  var normalize = /* @__PURE__ */ __name((value) => value.trim().toLowerCase().replace(/[.\s_-]+/g, ""), "normalize");
  var territories = [
    ["德国", "R2 Europe", "B", ["GER", "DEU", "DE", "Germany", "德国", "德國"]],
    ["日本", "R2 Japan", "A", ["JPN", "JP", "Japan", "日本"]],
    ["美国", "R1", "A", ["USA", "US", "United States", "United States of America", "美国", "美國"]],
    ["加拿大", "R1", "A", ["CAN", "CA", "Canada", "加拿大"]],
    ["中国大陆", "R6", "C", ["CHN", "CN", "China", "Mainland China", "中国", "中國", "中国大陆", "中國大陸"]],
    ["香港", "R3", "A", ["HKG", "HK", "Hong Kong", "香港"]],
    ["台湾", "R3", "A", ["TWN", "TW", "Taiwan", "台湾", "台灣"]],
    ["韩国", "R3", "A", ["KOR", "KR", "South Korea", "韩国", "韓國"]],
    ["澳大利亚", "R4", "B", ["AUS", "AU", "Australia", "澳大利亚", "澳大利亞", "澳洲"]],
    ["新西兰", "R4", "B", ["NZL", "NZ", "New Zealand", "新西兰", "紐西蘭"]],
    ["英国", "R2 Europe", "B", ["GBR", "GB", "UK", "United Kingdom", "英国", "英國"]],
    ["法国", "R2 Europe", "B", ["FRA", "FR", "France", "法国", "法國"]],
    ["意大利", "R2 Europe", "B", ["ITA", "IT", "Italy", "意大利"]],
    ["西班牙", "R2 Europe", "B", ["ESP", "ES", "Spain", "西班牙"]],
    ["欧洲", "R2 Europe", "B", ["Europe", "欧洲", "歐洲"]],
    ["俄罗斯", "R5", "C", ["RUS", "RU", "Russia", "俄罗斯", "俄羅斯"]],
    ["印度", "R5", "C", ["IND", "IN", "India", "印度"]],
    ["蒙古", "R5", "C", ["MNG", "MN", "Mongolia", "蒙古"]],
    ["南非", "R2 Europe", "B", ["ZAF", "ZA", "South Africa", "南非"]],
    ["埃及", "R2 Europe", "B", ["EGY", "EG", "Egypt", "埃及"]],
    ["巴西", "R4", "A", ["BRA", "BR", "Brazil", "巴西"]],
    ["墨西哥", "R4", "A", ["MEX", "MX", "Mexico", "墨西哥"]],
    ["新加坡", "R3", "A", ["SGP", "SG", "Singapore", "新加坡"]],
    ["马来西亚", "R3", "A", ["MYS", "MY", "Malaysia", "马来西亚", "馬來西亞"]],
    ["泰国", "R3", "A", ["THA", "TH", "Thailand", "泰国", "泰國"]]
  ];
  function matchRegion(input, media) {
    if (!["DVD", "Blu-ray"].includes(media)) return { reason: "请先选择 Media 为 DVD 或 Blu-ray；其他介质不套用本地区码表。" };
    const token = normalize(input);
    if (!token) return { reason: "请输入发行地区或明确的区码。" };
    const codes = media === "DVD" ? ["R1", "R2 Japan", "R2 Europe", "R3", "R4", "R5", "R6"] : ["A", "B", "C"];
    const code = codes.find((v) => normalize(v) === token);
    if (code) return { value: code, label: code };
    const found = territories.find((row) => row[3].some((alias) => normalize(alias) === token));
    if (found) {
      if (media === "DVD" && ["南非", "埃及"].includes(found[0])) return { reason: "该地区属于 DVD R2，但本站只有 R2 Japan / R2 Europe；请按本站规则手动核实。" };
      return { value: found[media === "DVD" ? 1 : 2], label: found[0] };
    }
    return { reason: "未匹配到唯一的站点区码，请检查拼写、Media 或手动选择；R2、ALL、ABC、多地区输入不会自动填写。" };
  }
  __name(matchRegion, "matchRegion");

  // src/scripts/animebytes-upload-assistant/upload.js
  var VERSION = "0.4.0";
  var LABELS = { media: "Media", containers: "Containers", codecs: "Codecs", resolution: "Resolution", audio: "Audio", audiochannels: "Audio Channels", dual_audio: "Dual Audio", subbing: "Subbing", aspectratio: "Aspect Ratio" };
  var DISC_CONTAINERS = ["ISO", "VOB IFO", "M2TS"];
  function mountUpload() {
    const form = document.getElementById("upload_form_anime");
    const input = form?.querySelector('textarea[name="mediainfo_desc"]');
    if (!input || form.querySelector(".abua-tools")) return;
    const fields = Object.fromEntries(Object.keys(LABELS).map((name) => [name, form.querySelector(`[name="${name}"]`)]));
    let snapshot = null;
    let logs = [];
    const style = document.createElement("style");
    style.textContent = `
    #upload_form_anime .abua-tools { margin-block: .6em; }
    #upload_form_anime .abua-actions { display:flex; flex-wrap:wrap; align-items:center; gap:.5em 1em; }
    #upload_form_anime .abua-result { margin-block:.6em; }
    #upload_form_anime .abua-details pre { white-space:pre-wrap; overflow-wrap:anywhere; font:inherit; }
    #upload_form_anime .abua-export { box-sizing:border-box; width:100%; max-width:100%; }
    #upload_form_anime .abua-region-note { margin-block:.4em; }
  `;
    document.head.append(style);
    const tools = document.createElement("div");
    tools.className = "abua-tools";
    tools.innerHTML = `<div class="abua-actions"></div><p class="abua-result min_padding" role="status" aria-live="polite">粘贴 MediaInfo / BDInfo 后点击解析；不会自动提交。</p><details class="abua-details"><summary>查看详情</summary><pre></pre></details>`;
    input.insertAdjacentElement("afterend", tools);
    const actions = tools.querySelector(".abua-actions");
    const result = tools.querySelector(".abua-result");
    const details = tools.querySelector("pre");
    const reference = form.querySelector('input[type="button"]');
    const button = /* @__PURE__ */ __name((label, cls) => {
      const el = document.createElement("input");
      el.type = "button";
      el.value = label;
      el.className = `${reference?.className || ""} ${cls}`.trim();
      actions.append(el);
      return el;
    }, "button");
    const parseButton = button("解析并填充", "abua-parse");
    const undoButton = button("撤销本次填充", "abua-undo");
    undoButton.disabled = true;
    const debugLabel = document.createElement("label");
    const debug = document.createElement("input");
    debug.type = "checkbox";
    debug.className = "abua-debug";
    debugLabel.append(debug, " Debug");
    actions.append(debugLabel);
    const copyButton = button("复制调试日志", "abua-copy");
    copyButton.hidden = true;
    const exportBox = document.createElement("textarea");
    exportBox.className = "abua-export";
    exportBox.readOnly = true;
    exportBox.rows = 8;
    exportBox.hidden = true;
    exportBox.setAttribute("aria-label", "调试日志 JSON，可手动复制");
    tools.append(exportBox);
    const region = form.querySelector('[name="region"]');
    if (region) {
      const note = document.createElement("p");
      note.className = "min_padding abua-region-note";
      note.style.whiteSpace = "pre-line";
      note.textContent = [
        "区码请按实际发行版本手动选择，不能根据音轨或字幕语言判断。媒体信息解析不修改 Region；仅单独点击「匹配区码」时填写。",
        "DVD 区码（主要对应地区）：",
        "R1：美国、加拿大及美国属地。",
        "R2：日本、欧洲、中东（含埃及）、南非、格陵兰；本站细分为 R2 Japan / R2 Europe。",
        "R3：东南亚、韩国、台湾、香港等地区。",
        "R4：澳大利亚、新西兰、太平洋岛屿、墨西哥、中美洲、南美洲及加勒比地区。",
        "R5：俄罗斯及部分东欧地区、印度次大陆、非洲大部（不含 R2 的埃及和南非）、朝鲜、蒙古。",
        "R6：中国大陆。",
        "Blu-ray 区码（主要对应地区）：",
        "A：北美洲、南美洲、美国属地、日本、韩国、台湾、香港及东南亚等地区。",
        "B：欧洲、非洲、中东、澳大利亚、新西兰。",
        "C：中国大陆、俄罗斯、中亚、南亚等其他亚洲地区（不含 A 区所列地区）。",
        "DVD 的 0 / ALL、Blu-ray 的 ABC 表示全区；Ultra HD Blu-ray 通常不设地区锁。遇到全区或多区版本，按本站规则核实，不要强行选择单一区码。",
        "以上是地区速查，不代表某张光盘的实际锁区；以光盘、包装或可靠发行资料标注为准。"
      ].join("\n");
      region.parentElement.append(note);
    }
    const log = /* @__PURE__ */ __name((event, data) => {
      if (!debug.checked) return;
      const entry = { time: (/* @__PURE__ */ new Date()).toISOString(), event, ...data };
      logs.push(entry);
      if (logs.length > 200) logs.shift();
      console.debug("[AB Upload Assistant]", JSON.stringify(entry));
    }, "log");
    debug.addEventListener("change", () => {
      copyButton.hidden = !debug.checked;
      logs = [];
      exportBox.hidden = true;
      exportBox.value = "";
      if (debug.checked) log("page", {
        version: VERSION,
        mode: form.querySelector('[name="add_format"]')?.value === "1" ? "add-format" : "upload",
        fields: Object.fromEntries(Object.entries(fields).map(([key, el]) => [key, !!el])),
        region: "explicit-match-only"
      });
    });
    copyButton.addEventListener("click", async () => {
      exportBox.value = JSON.stringify({ version: VERSION, logs }, null, 2);
      exportBox.hidden = false;
      try {
        await navigator.clipboard.writeText(exportBox.value);
        result.textContent = "调试日志已复制；仅含字段映射与操作，不含原始媒体信息。";
      } catch {
        exportBox.focus();
        exportBox.select();
        result.textContent = "浏览器未允许剪贴板访问，请复制下方已选中的日志。";
      }
    });
    const valueOf = /* @__PURE__ */ __name((el) => el.type === "checkbox" ? el.checked : el.value, "valueOf");
    const setValue = /* @__PURE__ */ __name((el, value) => {
      if (el.type === "checkbox") el.checked = value;
      else el.value = value;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }, "setValue");
    const sourceRow = document.createElement("div");
    sourceRow.className = "abua-source min_padding";
    sourceRow.hidden = true;
    const sourceText = document.createElement("span");
    const adoptSource = button("采用来源", "abua-source-adopt");
    sourceRow.append(sourceText, " ", adoptSource);
    tools.insertBefore(sourceRow, result);
    let sourceHint = null;
    let sourceInput = "";
    const clearSource = /* @__PURE__ */ __name(() => {
      sourceHint = null;
      sourceInput = "";
      sourceRow.hidden = true;
      adoptSource.disabled = true;
    }, "clearSource");
    input.addEventListener("input", clearSource);
    const showSource = /* @__PURE__ */ __name((parsed) => {
      if (!parsed.sources.length) return;
      const hints = parsed.sources;
      sourceRow.hidden = false;
      sourceText.textContent = "来源候选：" + hints.map((h) => h.value + "（依据：" + h.evidence + "）").join(" / ");
      if (hints.length > 1) {
        sourceText.textContent += "。检测到多种来源标签，请核实后手动选择。";
        log("source-conflict", { candidates: hints.map((h) => h.value) });
        return;
      }
      sourceHint = hints[0];
      sourceInput = input.value;
      const media = fields.media;
      adoptSource.disabled = !media || ![...media.options].some((o) => o.value === sourceHint.value && !o.disabled);
      if (media?.value && media.value !== sourceHint.value) sourceText.textContent += "；与当前 Media（" + media.value + "）冲突，未覆盖。";
      if (adoptSource.disabled) sourceText.textContent += "；页面没有匹配的 Media 选项。";
      sourceText.textContent += " 仅为文件名候选，不能证明原盘、Remux 或重编码方式。";
      log("source-candidate", { value: sourceHint.value, evidence: sourceHint.evidence, conflict: !!media?.value && media.value !== sourceHint.value });
    }, "showSource");
    adoptSource.addEventListener("click", () => {
      if (!sourceHint || input.value !== sourceInput) {
        clearSource();
        result.textContent = "媒体信息已变化，请重新解析后再采用来源。";
        return;
      }
      const media = fields.media;
      const before = media.value;
      const after = sourceHint.value;
      if (before !== after) {
        snapshot = [{ key: "media", before, after }];
        setValue(media, after);
        undoButton.disabled = false;
      }
      log("source-adopt", { before, after, evidence: sourceHint.evidence });
      result.textContent = "已采用来源：" + after + "。若修改了原值，可用「撤销本次填充」撤回；请核实实际来源。";
      clearSource();
    });
    if (region) {
      let regionSnapshot = null;
      const controls = document.createElement("div");
      controls.className = "abua-actions abua-region-controls";
      const label = document.createElement("label");
      label.textContent = "发行地区：";
      const territory = document.createElement("input");
      territory.type = "text";
      territory.className = "abua-territory";
      territory.placeholder = "GER / Germany / 德国 / B";
      territory.style.width = "18em";
      territory.style.maxWidth = "100%";
      label.append(territory);
      const match = button("匹配区码", "abua-region-match");
      const undoRegion = button("撤销区码", "abua-region-undo");
      undoRegion.disabled = true;
      controls.append(label, match, undoRegion);
      const status = document.createElement("p");
      status.className = "min_padding abua-region-status";
      status.setAttribute("aria-live", "polite");
      status.textContent = "填写发行地区，不是音轨语言；仅按地区匹配，实际锁区以光盘标注为准。";
      region.insertAdjacentElement("afterend", controls);
      controls.insertAdjacentElement("afterend", status);
      match.addEventListener("click", () => {
        const media = fields.media?.value;
        const matched = matchRegion(territory.value, media);
        if (!matched.value || ![...region.options].some((o) => o.value === matched.value && !o.disabled)) {
          status.textContent = matched.reason || "页面没有对应区码选项，保留原值。";
          log("region-skip", { media, reason: status.textContent });
          return;
        }
        const before = region.value;
        if (before !== matched.value) {
          regionSnapshot = { before, after: matched.value };
          setValue(region, matched.value);
          undoRegion.disabled = false;
        }
        status.textContent = matched.label + " + " + media + " → " + matched.value + "。请核对实际发行标注。";
        log("region-match", { media, territory: matched.label, before, after: matched.value });
      });
      territory.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          match.click();
        }
      });
      undoRegion.addEventListener("click", () => {
        if (regionSnapshot && region.value === regionSnapshot.after) {
          setValue(region, regionSnapshot.before);
          status.textContent = "已撤销上次区码匹配。";
          log("region-undo", { restored: regionSnapshot.before });
        } else {
          status.textContent = "区码已被手动修改，保留当前选择。";
          log("region-undo-skip", { reason: "user-edited" });
        }
        regionSnapshot = null;
        undoRegion.disabled = true;
      });
    }
    const aspectVisible = /* @__PURE__ */ __name(() => {
      if (!DISC_CONTAINERS.includes(fields.containers?.value)) return false;
      for (let el = fields.aspectratio; el && el !== form; el = el.parentElement) {
        if (el.hidden || getComputedStyle(el).display === "none") return false;
      }
      return true;
    }, "aspectVisible");
    parseButton.addEventListener("click", () => {
      clearSource();
      if (!input.value.trim()) {
        result.textContent = "请先粘贴 MediaInfo / BDInfo。";
        log("parse-error", { reason: "empty-input" });
        return;
      }
      const changed = [];
      try {
        const parsed = parseMedia(input.value);
        log("parsed", { kind: parsed.kind, tracks: parsed.tracks });
        showSource(parsed);
        const report = [];
        let filled = 0;
        let skipped = 0;
        for (const [key, label] of Object.entries(LABELS)) {
          const el = fields[key];
          const value = parsed.fields[key];
          let reason;
          if (!el) reason = "页面未找到该字段";
          else if (value === void 0) reason = "未识别或无法确定，保留原值";
          else if (key === "aspectratio" && !aspectVisible()) reason = "当前容器未显示 Aspect Ratio，保留原值";
          else if (el.type !== "checkbox" && ![...el.options].some((o) => o.value === value && !o.disabled)) reason = "没有匹配的站点选项，保留原值";
          if (reason) {
            skipped++;
            report.push(`${label}：${reason}`);
            log("skip", { field: key, reason });
            continue;
          }
          const before = valueOf(el);
          if (before !== value) {
            changed.push({ key, before, after: value });
            setValue(el, value);
          }
          filled++;
          report.push(`${label}：${typeof value === "boolean" ? value ? "勾选" : "不勾选" : value}（${parsed.reasons[key]}）`);
          log("fill", { field: key, before, after: value, changed: before !== value, reason: parsed.reasons[key] });
        }
        log("region", { action: "never-modify" });
        details.textContent = [...report, "", ...parsed.notes, "Region：媒体信息解析不修改；如需辅助填写，请使用独立的「匹配区码」。"].join("\n");
        result.textContent = `${parsed.kind}：已匹配 ${filled} 项，未填 ${skipped} 项；实际修改 ${changed.length} 项。${parsed.notes.length ? " 有提示，请查看详情。" : ""}`;
      } catch (error) {
        result.textContent = `解析/填充失败：${error.message}`;
        log("error", { stage: "parse-fill", name: error.name });
      }
      if (changed.length) {
        snapshot = changed;
        undoButton.disabled = false;
      }
    });
    undoButton.addEventListener("click", () => {
      let restored = 0;
      for (const item of snapshot || []) {
        const el = fields[item.key];
        if (valueOf(el) !== item.after) {
          log("undo-skip", { field: item.key, reason: "user-edited" });
          continue;
        }
        setValue(el, item.before);
        restored++;
        log("undo", { field: item.key, restored: item.before });
      }
      snapshot = null;
      undoButton.disabled = true;
      result.textContent = `已撤销 ${restored} 项；解析后手动改过的字段保持不动。`;
    });
  }
  __name(mountUpload, "mountUpload");

  // src/scripts/animebytes-upload-assistant/index.js
  if (location.hostname === "animebytes.tv" && location.pathname === "/upload.php") {
    mountUpload();
  }
})();
