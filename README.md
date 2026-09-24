# Greasy Fork Scripts

本仓库收录自用 Greasy Fork / Tampermonkey 脚本，共 15 个，涵盖 MoviePilot、PT 站点、Bangumi、GitHub Releases 与本地调试等场景。可安装产物统一位于 `dist/`，模块化源码位于 `src/`，构建工具位于 `script/`。

> 说明：本仓库脚本均为自用，部分代码由 AI 辅助生成，可能存在未覆盖的边界情况；安装和使用前请自行评估风险，并优先在熟悉的站点与环境中验证。

## 目录

安装路径已迁移到 `dist/`。已安装的旧版脚本若仍从根目录检查更新，需要从下列新链接重新安装一次；脚本名称、namespace 和 GM 存储键保持不变。

| 脚本 | 版本 | 简述 | 安装 |
|---|---|---|---|
| <img src="icon/moviepilot-autologin.png" width="24" alt=""> [Moviepilot_AutoLogin](#moviepilot_autologin) | 1.3.2 | MoviePilot 自动登录 | [安装](https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/dist/Moviepilot_AutoLogin.user.js) |
| <img src="icon/moviepilot.png" width="24" alt=""> [Moviepilot_NameTest](#moviepilot_nametest) | 3.5.17 | PT 站种子名称识别，推送 MoviePilot V2/V3 | [安装](https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/dist/Moviepilot_NameTest.user.js) |
| <img src="icon/iyuu-reseed.png" width="24" alt=""> [IYUU_Reseed_Checker](#iyuu_reseed_checker) | 1.1.18 | IYUU 辅种检测助手 | [安装](https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/dist/IYUU_Reseed_Checker.user.js) |
| <img src="icon/pt-oneclickclaim.png" width="24" alt=""> [PT_OneClickClaim](#pt_oneclickclaim) | 0.2.3 | PT 一键认领增强脚本 | [安装](https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/dist/PT_OneClickClaim.user.js) |
| <img src="icon/pt-audit.png" width="24" alt=""> [PT_AuditAssistant](#pt_auditassistant) | 0.1.1 | 聚合 PT 审种助手 | [安装](https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/dist/PT_AuditAssistant.user.js) |
| <img src="icon/zhuque-batch.png" width="24" alt=""> [Zhuque_BatchDownload](#zhuque_batchdownload) | 0.2.2 | 朱雀搜索页批量下载 | [安装](https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/dist/Zhuque_BatchDownload.user.js) |
| <img src="icon/pt-batch.png" width="24" alt=""> [PT_BatchDownload](#pt_batchdownload) | 0.6.11 | 通用 PT 当前页批量下载 | [安装](https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/dist/PT_BatchDownload.user.js) |
| <img src="icon/bangumi.png" width="24" alt=""> [Bangumi_Enhanced](#bangumi_enhanced) | 1.0.1 | Bangumi 中文标题与放送日历增强 | [安装](https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/dist/Bangumi_Enhanced.user.js) |
| <img src="icon/ai.png" width="24" alt=""> [AI_WebSummary](#ai_websummary) | 2.0.6 | 使用 AI 总结网页内容 | [安装](https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/dist/AI_WebSummary.user.js) |
| <img src="icon/nicept.png" width="24" alt=""> [NicePT_ReplaceIcon](#nicept_replaceicon) | 1.0.1 | 替换 NicePT 分类图标 | [安装](https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/dist/NicePT_ReplaceIcon.user.js) |
| [Local_Debug_Loader](#local_debug_loader) | 0.2.4 | 本地调试入口 | [安装](https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/dist/Local_Debug_Loader.user.js) |
| <img src="icon/github-releases.png" width="24" alt=""> [GitHubReleases_NavigationEnhancer](#githubreleases_navigationenhancer) | 2.0.3 | GitHub Releases 页面导航增强 | [安装](https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/dist/GitHubReleases_NavigationEnhancer.user.js) |
| <img src="icon/lounge-irc-translator.png" width="24" alt=""> [Lounge_IRC_Translator](#lounge_irc_translator) | 0.8.6 | Lounge IRC 翻译助手 | [安装](https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/dist/Lounge_IRC_Translator.user.js) |
| [Picix_CardQuickActions](#picix_cardquickactions) | 0.4.7 | Picix 卡片快捷操作 | [安装](https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/dist/Picix_CardQuickActions.user.js) |
| [Xingtan_BonusPerGBh](#xingtan_bonuspergbh) | 0.1.0 | 杏坛种子每GB·h体积收益 | [安装](https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/dist/Xingtan_BonusPerGBh.user.js) |

---

<a id="moviepilot_autologin"></a>
### [Moviepilot_AutoLogin](https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/dist/Moviepilot_AutoLogin.user.js)
> 版本 1.3.2 · 作者 wuyaos & AI<br>
> @match 站点范围：全站匹配，仅在页面标题为 MoviePilot 的登录页执行  
> 图标 <img src="icon/moviepilot-autologin.png" width="24" alt="icon">

MoviePilot 自动登录脚本，用于在 MoviePilot 登录页自动填充已配置的账号密码。

主要特性：
- 提供 MoviePilot URL、用户名、密码等登录配置入口
- 根据页面标题判断 MoviePilot 页面，避免在无关页面执行登录逻辑
- 适合自用环境下减少重复输入账号密码

<a id="moviepilot_nametest"></a>
### [Moviepilot_NameTest](https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/dist/Moviepilot_NameTest.user.js)
> 版本 3.5.17 · 作者 wuyaos & AI<br>
> @match 站点范围：PT/BT 种子详情页，含 NexusPHP、TTG、Bangumi/Mikan、M-Team、GPW、IPT、BHD、Nyaa 等  
> 图标 <img src="icon/moviepilot.png" width="24" alt="icon">

PT 站种子名称识别脚本，可将种子标题推送到 MoviePilot 进行识别，并支持默认关闭的自动查询和识别缓存。

主要特性：
- 在多类 PT/BT 详情页注入 MoviePilot 识别入口
- 支持手动查询、可选自动查询与本地识别缓存
- 复用公共 PT 页面适配逻辑，兼容多站点标题和元数据提取
- 兼容 MoviePilot V2 裸响应与 V3 的 `{success, message, data}` 响应封装，登录和 API 地址保持不变
- 识别结果为空时继续候选词/TMDB 兜底；测试连接和推送均检查业务失败，避免 HTTP 200 被误报为成功

<a id="iyuu_reseed_checker"></a>
### [IYUU_Reseed_Checker](https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/dist/IYUU_Reseed_Checker.user.js)
> 版本 1.1.18 · 作者 wuyaos & AI<br>
> @match 站点范围：PT/BT 种子详情页，含 NexusPHP、TTG、M-Team、HDCity、GPW、Haidan、IPT、BHD 等  
> 图标 <img src="icon/iyuu-reseed.png" width="24" alt="icon">

IYUU 辅种检测助手，用于在 PT/BT 种子详情页查询 IYUU 辅种信息并展示可辅种站点。

主要特性：
- 支持手动/自动查询、站点选择与详情页跳转
- 支持多选打开辅种站点，并可下载选中站点种子
- 支持 M-Team API Key 配置，用于馒头种子下载场景

<a id="pt_oneclickclaim"></a>
### [PT_OneClickClaim](https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/dist/PT_OneClickClaim.user.js)
> 版本 0.2.3 · 作者 wuyaos & AI<br>
> @match 站点范围：PT 站用户详情页、当前做种列表页和 Audiences 做种列表页  
> 图标 <img src="icon/pt-oneclickclaim.png" width="24" alt="icon">

PT 一键认领增强脚本，用于筛选当前做种并在预览确认后批量认领。

主要特性：
- 支持按标题表达式、体积、多选 IP、多选客户端筛选当前做种
- 提供筛选结果预览，避免直接误认领
- 只处理显式确认后的批量认领流程

<a id="pt_auditassistant"></a>
### [PT_AuditAssistant](https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/dist/PT_AuditAssistant.user.js)
> 版本 0.1.1 · 作者 wuyaos & AI<br>
> @match 站点范围：PandaPT、QingWaPT、HDKylin、CS 财神、LongPT 详情页/审种页  
> 图标 <img src="icon/pt-audit.png" width="24" alt="icon">

聚合 PT 审种助手，基于注册表驱动的模块化审种规则引擎，在详情页注入检测面板，仅作辅助参考。

主要特性：
- 支持标题、元数据、MediaInfo、截图有效性与标签一致性校验
- 覆盖 PandaPT、QingWaPT、HDKylin、CS 财神、LongPT 等站点规则
- 支持 LongPT 高码、高帧、高分等特定规则提示

<a id="zhuque_batchdownload"></a>
### [Zhuque_BatchDownload](https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/dist/Zhuque_BatchDownload.user.js)
> 版本 0.2.2 · 作者 wuyaos & AI<br>
> @match 站点范围：朱雀种子搜索页  
> 图标 <img src="icon/zhuque-batch.png" width="24" alt="icon">

朱雀种子搜索页批量下载脚本，用于按条件勾选搜索结果并下载当前勾选种子。

主要特性：
- 支持关键字、体积、做种、下载和优惠筛选
- 支持按筛选条件批量勾选当前页种子
- 适配朱雀搜索页的批量下载操作

<a id="pt_batchdownload"></a>
### [PT_BatchDownload](https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/dist/PT_BatchDownload.user.js)
> 版本 0.6.11 · 作者 wuyaos & AI<br>
> @match 站点范围：通用 PT 站 PHP 页面、Unit3D 架构 `/torrents` 列表页（如 darkland.top）、Gazelle 架构（GGn/Anthelion 等）列表页  
> 图标 <img src="icon/pt-batch.png" width="24" alt="icon">

通用 PT 当前页批量下载脚本，用于从当前页面筛选种子并批量下载或推送到下载器。

主要特性：
- 支持关键字、体积、做种数、优惠、做种状态筛选
- 支持浏览器直下 ZIP 打包，使用有限并发、单项超时与失败计数
- ZIP 输入使用已读取的字节数组；打包连续 15 秒无数据输出或失败时，自动逐个下载已获取文件，不重复请求站点（浏览器可能需要允许多文件下载）
- 启动时提供基于 `setTimeout` 的 `setImmediate`，修复 JSZip 在部分油猴沙箱中调度垫片失效导致的打包卡死
- 支持 qBittorrent / Transmission 推送配置
- 站点适配器架构：基类 `SiteAdapter` + `NexusPHPAdapter` / `Unit3DAdapter` 子类
- 同时适配 NexusPHP（`download.php?id=`）与 Unit3D（`/torrents/download/{id}` RESTful 路由）两种架构
- 促销标记直接采用站点原文，多标记自动组合显示（如“100% 免费 + 100% 双倍上传收益”）
- 优惠筛选选项来自当前页动态扫描的唯一标记，多选 OR 语义命中

<a id="bangumi_enhanced"></a>
### [Bangumi_Enhanced](https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/dist/Bangumi_Enhanced.user.js)
> 版本 1.0.1 · 作者 wuyaos & AI<br>
> @match 站点范围：bgm.tv、bangumi.tv、chii.in  
> 图标 <img src="icon/bangumi.png" width="24" alt="icon">

Bangumi 增强脚本，用于显示中文标题并优化放送日历，提供接近 B 站番剧时间表的浏览体验。

主要特性：
- 在 Bangumi 相关页面显示中文标题信息
- 优化放送日历布局与可读性
- 适配 bgm.tv、bangumi.tv、chii.in 三个域名

<a id="ai_websummary"></a>
### [AI_WebSummary](https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/dist/AI_WebSummary.user.js)
> 版本 2.0.6 · 作者 wuyaos & AI<br>
> @match 站点范围：全站网页  
> 图标 <img src="icon/ai.png" width="24" alt="icon">

AI 网页内容总结脚本，用于在当前网页中提取内容并调用 AI 生成摘要。

主要特性：
- 支持在任意网页触发内容总结
- 使用 Markdown 渲染与 DOMPurify 清理输出内容
- 提供自用 AI 总结入口，适合快速阅读长页面

<a id="nicept_replaceicon"></a>
### [NicePT_ReplaceIcon](https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/dist/NicePT_ReplaceIcon.user.js)
> 版本 1.0.1 · 作者 wuyaos & AI<br>
> @match 站点范围：NicePT 全站  
> 图标 <img src="icon/nicept.png" width="24" alt="icon">

NicePT 分类图标替换脚本，用于替换 NicePT 分类中的图标资源。

主要特性：
- 针对 NicePT 页面分类图标做本地替换
- 使用仓库内 `class_icon/` 图标资源
- 适合按个人偏好统一分类视觉样式

<a id="local_debug_loader"></a>
### [Local_Debug_Loader](https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/dist/Local_Debug_Loader.user.js)
> 版本 0.2.4 · 作者 wuyaos & AI<br>
> @match 站点范围：本仓库 PT/BT 详情页调试目标，含 NexusPHP、TTG、Bangumi/Mikan、M-Team、GPW、IPT、BHD、Nyaa 等  

本地调试入口，通过本地 HTTP 文件服务器加载当前仓库脚本，便于使用外部编辑器实时修改和刷新验证。

主要特性：
- 从 `http://127.0.0.1:8787/` 加载本地脚本
- 配合 `serve-debug.sh` 使用，减少 Tampermonkey 缓存干扰
- 适合调试 IYUU 与 MoviePilot 名称识别等详情页脚本

<a id="githubreleases_navigationenhancer"></a>
### [GitHubReleases_NavigationEnhancer](https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/dist/GitHubReleases_NavigationEnhancer.user.js)
> 版本 2.0.3 · 作者 wuyaos & AI<br>
> @match 站点范围：GitHub 全站，主要增强 Releases 页面  
> 图标 <img src="icon/github-releases.png" width="24" alt="icon">

GitHub Releases 页面导航增强脚本，用于解决发布说明过长挤占发布列表空间、发布文件过多难定位目标文件的问题。

主要特性：
- 支持折叠/展开过长发布说明，减少页面占用
- 增加 Release 资产筛选能力，快速定位目标文件
- 提供平台、架构、语言、分辨率等筛选偏好与设置入口

<a id="lounge_irc_translator"></a>
### [Lounge_IRC_Translator](https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/dist/Lounge_IRC_Translator.user.js)
> 版本 0.8.6 · Lounge IRC 翻译助手

在 Lounge IRC 页面提供翻译、候选回复、短语管理和本地配置。

### [Picix_CardQuickActions](https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/dist/Picix_CardQuickActions.user.js)
> 版本 0.4.7 · Picix 卡片快捷操作

为 Picix 卡片提供翻译和快捷操作入口。

<a id="xingtan_bonuspergbh"></a>
### [Xingtan_BonusPerGBh](https://cdn.jsdelivr.net/gh/wuyaos/greasyfork_scripts@main/dist/Xingtan_BonusPerGBh.user.js)
> 版本 0.1.0 · 作者 wuyaos & AI<br>
> @match 站点范围：杏坛（xingtan.one）种子列表页 torrents.php

在杏坛种子列表自动计算每个种子的每GB·h体积收益（体积收益/天 ÷ 24 ÷ 种子体积GB），追加到站点已有的“数量/体积: X /天”显示之后，用于比较不同体积种子的做种收益效率。

主要特性：
- 复用站点已有的体积收益公式与显示（K·atan(s/L)，L 为当前人均做种体积），分母读取种子列表实际体积列并统一换算为 GB
- 每行追加“每GB·h: X.XXXXX”，小种子收益高、大种子因 atan 饱和递减
- 幂等追加，翻页/刷新后自动重算

## 本地调试

1. 修改 `src/scripts/` 或 `src/common/`，运行 `npm run build`。
2. 运行 `./script/serve-debug.sh` 启动 `http://127.0.0.1:8787/` 文件服务器，产物位于 `/dist/`。
3. 在 Tampermonkey 安装或更新 `dist/Local_Debug_Loader.user.js`，避免同时启用同一脚本的正式版和调试版。
4. 每次修改源码后重新构建，再由用户刷新目标站页面；Loader 保留原有 no-cache 行为。

## 开发说明

`dist/*.user.js` 是最终可安装脚本，不能手工编辑。脚本模块位于 `src/scripts/<script-id>/`，共享代码位于 `src/common/`，构建和校验工具位于 `script/`。

修改源码后运行:

```bash
npm ci
npm run build
npm run build:script -- iyuu-reseed-checker
npm run check
```

要求 Node.js 20.19+。`npm run check` 包括产物漂移检查、元数据/GM 权限校验、597 个原始语法块契约、14 个离线 DOM 初始化对照（新脚本无基线时仅验证网络边界）及构建失败保护测试。测试不会连接目标站点，也不执行真实认领、下载或审批。

`meta.js` 是元数据唯一来源；原有 `@require` 保留，不改为动态加载。可独立提取的静态 CSS 在各脚本的 `styles/` 中，含运行时插值的样式保留在对应功能模块中，不压缩、不改变 CSS 文本。

迁移只做结构搬运。唯一额外修复是补齐 GitHub Releases 原脚本已使用但漏声明的 `GM_deleteValue` grant。Windows 原生 Node、油猴真实运行环境及全部站点/主题尚未实测（`NOT_VERIFIED`）。

`script/build-userscripts.mjs` 会把模块打包到 `dist/`，构建器的 `--check` 会检查发布产物是否与当前源码一致。

## 问题

*   IYUU_Reseed_Checker 下载馒头（M-Team）种子需要在配置页填写 M-Team API Key；未配置时会提示并阻止下载。
*   AI_WebSummary出现“错误： Failed to fetch”，需要在油猴插件-设置-修改内容安全策略（CSP）头信息 改为“全部移除（可能不安全）”

## 文件组织

```text
greasyfork_scripts/
├── src/
│   ├── common/                     # IYUU/MP 公共代码
│   └── scripts/<script-id>/        # meta.js、index.js、功能模块、styles/
├── script/                        # 构建、注册表、校验、本地调试工具
├── dist/                          # 15 个可安装 .user.js，提交版本控制
├── tests/                         # 离线对照与迁移契约，不含真实凭据
├── icon/                          # 保持已有资源 URL
├── class_icon/
├── package.json
├── package-lock.json
└── README.md
```

模块按原有职责拆分，保留必要的实时绑定和惰性引用，不为消除循环引用而重写业务。迁移基线及验证覆盖说明见 [tests/README.md](tests/README.md)。

## Overview

TODO: Add project description.

## Project Structure

```
├── src/scripts/pt-batch-download/zip.js
├── tests/pt-batch-zip.mjs
├── .agents/notes/implemented/bug-fix/2026-09-24-pt-batch-zip-stall.md
├── src/scripts/moviepilot-name-test/response.js
├── tests/moviepilot-response.mjs
├── .agents/notes/implemented/bug-fix/2026-09-24-moviepilot-v3-response-envelope.md
├── .agents/notes/implemented/bug-fix/2026-09-23-pt-batch-download-timeout.md
├── src/scripts/xingtan-bonus-pergbh/meta.js
├── src/scripts/xingtan-bonus-pergbh/bonus.js
├── src/scripts/xingtan-bonus-pergbh/startup.js
├── src/scripts/xingtan-bonus-pergbh/index.js
├── cleanup-inventory.tmp.mjs
greasyfork_scripts/
```
