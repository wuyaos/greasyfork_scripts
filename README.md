# Greasy Fork Scripts

本仓库收录自用 Greasy Fork / Tampermonkey 脚本，共 12 个，涵盖 MoviePilot、PT 站点、Bangumi、GitHub Releases 与本地调试等场景。

> 说明：本仓库脚本均为自用，部分代码由 AI 辅助生成，可能存在未覆盖的边界情况；安装和使用前请自行评估风险，并优先在熟悉的站点与环境中验证。

## 目录

| 脚本 | 版本 | 简述 | 图标 |
|---|---|---|---|
| [Moviepilot_AutoLogin](#moviepilot_autologin) | 1.3.1 | MoviePilot 自动登录 | ![icon](icon/moviepilot-autologin.png) |
| [Moviepilot_NameTest](#moviepilot_nametest) | 3.5.14 | PT 站种子名称识别，推送 MoviePilot | ![icon](icon/moviepilot.png) |
| [IYUU_Reseed_Checker](#iyuu_reseed_checker) | 1.1.16 | IYUU 辅种检测助手 | ![icon](icon/iyuu-reseed.png) |
| [PT_OneClickClaim](#pt_oneclickclaim) | 0.2.2 | PT 一键认领增强脚本 | ![icon](icon/pt-oneclickclaim.svg) |
| [PT_AuditAssistant](#pt_auditassistant) | 0.1.0 | 聚合 PT 审种助手 | ![icon](icon/pt-audit.png) |
| [Zhuque_BatchDownload](#zhuque_batchdownload) | 0.2.1 | 朱雀搜索页批量下载 | ![icon](icon/zhuque-batch.png) |
| [PT_BatchDownload](#pt_batchdownload) | 0.2.0 | 通用 PT 当前页批量下载 | ![icon](icon/pt-batch.png) |
| [Bangumi_Enhanced](#bangumi_enhanced) | 1.0.0 | Bangumi 中文标题与放送日历增强 | ![icon](icon/bangumi.png) |
| [AI_WebSummary](#ai_websummary) | 2.0.5 | 使用 AI 总结网页内容 | ![icon](icon/ai.png) |
| [NicePT_ReplaceIcon](#nicept_replaceicon) | 1.0 | 替换 NicePT 分类图标 | ![icon](icon/nicept.png) |
| [Local_Debug_Loader](#local_debug_loader) | 0.2.3 | 本地调试入口 | ![icon](icon/debug-loader.png) |
| [GitHubReleases_NavigationEnhancer](#githubreleases_navigationenhancer) | 2.0.2 | GitHub Releases 页面导航增强 | ![icon](icon/github-releases.png) |

---

<a id="moviepilot_autologin"></a>
### [Moviepilot_AutoLogin](https://github.com/wuyaos/greasyfork_scripts/raw/refs/heads/main/Moviepilot_AutoLogin.user.js)
> 版本 1.3.1 · 作者 wuyaos & AI  
> @match 站点范围：全站匹配，仅在页面标题为 MoviePilot 的登录页执行  
> 图标 ![icon](icon/moviepilot-autologin.png)

MoviePilot 自动登录脚本，用于在 MoviePilot 登录页自动填充已配置的账号密码。

主要特性：
- 提供 MoviePilot URL、用户名、密码等登录配置入口
- 根据页面标题判断 MoviePilot 页面，避免在无关页面执行登录逻辑
- 适合自用环境下减少重复输入账号密码

<a id="moviepilot_nametest"></a>
### [Moviepilot_NameTest](https://github.com/wuyaos/greasyfork_scripts/raw/refs/heads/main/Moviepilot_NameTest.user.js)
> 版本 3.5.14 · 作者 wuyaos & AI  
> @match 站点范围：PT/BT 种子详情页，含 NexusPHP、TTG、Bangumi/Mikan、M-Team、GPW、IPT、BHD、Nyaa 等  
> 图标 ![icon](icon/moviepilot.png)

PT 站种子名称识别脚本，可将种子标题推送到 MoviePilot 进行识别，并支持默认关闭的自动查询和识别缓存。

主要特性：
- 在多类 PT/BT 详情页注入 MoviePilot 识别入口
- 支持手动查询、可选自动查询与本地识别缓存
- 复用公共 PT 页面适配逻辑，兼容多站点标题和元数据提取

<a id="iyuu_reseed_checker"></a>
### [IYUU_Reseed_Checker](https://github.com/wuyaos/greasyfork_scripts/raw/refs/heads/main/IYUU_Reseed_Checker.user.js)
> 版本 1.1.16 · 作者 wuyaos & AI  
> @match 站点范围：PT/BT 种子详情页，含 NexusPHP、TTG、M-Team、HDCity、GPW、Haidan、IPT、BHD 等  
> 图标 ![icon](icon/iyuu-reseed.png)

IYUU 辅种检测助手，用于在 PT/BT 种子详情页查询 IYUU 辅种信息并展示可辅种站点。

主要特性：
- 支持手动/自动查询、站点选择与详情页跳转
- 支持多选打开辅种站点，并可下载选中站点种子
- 支持 M-Team API Key 配置，用于馒头种子下载场景

<a id="pt_oneclickclaim"></a>
### [PT_OneClickClaim](https://github.com/wuyaos/greasyfork_scripts/raw/refs/heads/main/PT_OneClickClaim.user.js)
> 版本 0.2.2 · 作者 wuyaos & AI  
> @match 站点范围：PT 站用户详情页、当前做种列表页和 Audiences 做种列表页  
> 图标 ![icon](icon/pt-oneclickclaim.svg)

PT 一键认领增强脚本，用于筛选当前做种并在预览确认后批量认领。

主要特性：
- 支持按标题表达式、体积、多选 IP、多选客户端筛选当前做种
- 提供筛选结果预览，避免直接误认领
- 只处理显式确认后的批量认领流程

<a id="pt_auditassistant"></a>
### [PT_AuditAssistant](https://github.com/wuyaos/greasyfork_scripts/raw/refs/heads/main/PT_AuditAssistant.user.js)
> 版本 0.1.0 · 作者 wuyaos & AI  
> @match 站点范围：PandaPT、QingWaPT、HDKylin、CS 财神、LongPT 详情页/审种页  
> 图标 ![icon](icon/pt-audit.png)

聚合 PT 审种助手，基于注册表驱动的模块化审种规则引擎，在详情页注入检测面板，仅作辅助参考。

主要特性：
- 支持标题、元数据、MediaInfo、截图有效性与标签一致性校验
- 覆盖 PandaPT、QingWaPT、HDKylin、CS 财神、LongPT 等站点规则
- 支持 LongPT 高码、高帧、高分等特定规则提示

<a id="zhuque_batchdownload"></a>
### [Zhuque_BatchDownload](https://github.com/wuyaos/greasyfork_scripts/raw/refs/heads/main/Zhuque_BatchDownload.user.js)
> 版本 0.2.1 · 作者 wuyaos & AI  
> @match 站点范围：朱雀种子搜索页  
> 图标 ![icon](icon/zhuque-batch.png)

朱雀种子搜索页批量下载脚本，用于按条件勾选搜索结果并下载当前勾选种子。

主要特性：
- 支持关键字、体积、做种、下载和优惠筛选
- 支持按筛选条件批量勾选当前页种子
- 适配朱雀搜索页的批量下载操作

<a id="pt_batchdownload"></a>
### [PT_BatchDownload](https://github.com/wuyaos/greasyfork_scripts/raw/refs/heads/main/PT_BatchDownload.user.js)
> 版本 0.2.0 · 作者 wuyaos & AI  
> @match 站点范围：通用 PT 站 PHP 页面，默认面向用户详情、种子列表和特价页等列表场景  
> 图标 ![icon](icon/pt-batch.png)

通用 PT 当前页批量下载脚本，用于从当前页面筛选种子并批量下载或推送到下载器。

主要特性：
- 支持关键字、体积、做种数、优惠、做种状态筛选
- 支持浏览器直下 ZIP 打包
- 支持 qBittorrent / Transmission 推送配置

<a id="bangumi_enhanced"></a>
### [Bangumi_Enhanced](https://github.com/wuyaos/greasyfork_scripts/raw/refs/heads/main/Bangumi_Enhanced.user.js)
> 版本 1.0.0 · 作者 wuyaos & AI  
> @match 站点范围：bgm.tv、bangumi.tv、chii.in  
> 图标 ![icon](icon/bangumi.png)

Bangumi 增强脚本，用于显示中文标题并优化放送日历，提供接近 B 站番剧时间表的浏览体验。

主要特性：
- 在 Bangumi 相关页面显示中文标题信息
- 优化放送日历布局与可读性
- 适配 bgm.tv、bangumi.tv、chii.in 三个域名

<a id="ai_websummary"></a>
### [AI_WebSummary](https://github.com/wuyaos/greasyfork_scripts/raw/refs/heads/main/AI_WebSummary.user.js)
> 版本 2.0.5 · 作者 wuyaos & AI  
> @match 站点范围：全站网页  
> 图标 ![icon](icon/ai.png)

AI 网页内容总结脚本，用于在当前网页中提取内容并调用 AI 生成摘要。

主要特性：
- 支持在任意网页触发内容总结
- 使用 Markdown 渲染与 DOMPurify 清理输出内容
- 提供自用 AI 总结入口，适合快速阅读长页面

<a id="nicept_replaceicon"></a>
### [NicePT_ReplaceIcon](https://github.com/wuyaos/greasyfork_scripts/raw/refs/heads/main/NicePT_ReplaceIcon.user.js)
> 版本 1.0 · 作者 wuyaos & AI  
> @match 站点范围：NicePT 全站  
> 图标 ![icon](icon/nicept.png)

NicePT 分类图标替换脚本，用于替换 NicePT 分类中的图标资源。

主要特性：
- 针对 NicePT 页面分类图标做本地替换
- 使用仓库内 `class_icon/` 图标资源
- 适合按个人偏好统一分类视觉样式

<a id="local_debug_loader"></a>
### [Local_Debug_Loader](https://github.com/wuyaos/greasyfork_scripts/raw/refs/heads/main/Local_Debug_Loader.user.js)
> 版本 0.2.3 · 作者 wuyaos & AI  
> @match 站点范围：本仓库 PT/BT 详情页调试目标，含 NexusPHP、TTG、Bangumi/Mikan、M-Team、GPW、IPT、BHD、Nyaa 等  
> 图标 ![icon](icon/debug-loader.png)

本地调试入口，通过本地 HTTP 文件服务器加载当前仓库脚本，便于使用外部编辑器实时修改和刷新验证。

主要特性：
- 从 `http://127.0.0.1:8787/` 加载本地脚本
- 配合 `serve-debug.sh` 使用，减少 Tampermonkey 缓存干扰
- 适合调试 IYUU 与 MoviePilot 名称识别等详情页脚本

<a id="githubreleases_navigationenhancer"></a>
### [GitHubReleases_NavigationEnhancer](https://github.com/wuyaos/greasyfork_scripts/raw/refs/heads/main/GitHubReleases_NavigationEnhancer.user.js)
> 版本 2.0.2 · 作者 wuyaos & AI  
> @match 站点范围：GitHub 全站，主要增强 Releases 页面  
> 图标 ![icon](icon/github-releases.png)

GitHub Releases 页面导航增强脚本，用于解决发布说明过长挤占发布列表空间、发布文件过多难定位目标文件的问题。

主要特性：
- 支持折叠/展开过长发布说明，减少页面占用
- 增加 Release 资产筛选能力，快速定位目标文件
- 提供平台、架构、语言、分辨率等筛选偏好与设置入口

## 本地调试

1. 运行 `./serve-debug.sh` 启动 `http://127.0.0.1:8787/` 文件服务器。
2. 在 Tampermonkey 安装或更新 `Local_Debug_Loader.user.js`。
3. 保持文件服务器运行，直接用外部编辑器修改 `IYUU_Reseed_Checker.user.js` / `Moviepilot_NameTest.user.js`，刷新目标站页面即可加载最新脚本。

## 开发说明

`IYUU_Reseed_Checker.user.js` 和 `Moviepilot_NameTest.user.js` 是最终可安装脚本。两者共用的页面插入、锚点查找、DOM 安全 wrapper 和 Mount 工具维护在 `src/common/pt-common.js`。

修改公共逻辑后运行：

```bash
node build/build-userscripts.mjs
node build/build-userscripts.mjs --check
node --check IYUU_Reseed_Checker.user.js
node --check Moviepilot_NameTest.user.js
```

`build/build-userscripts.mjs` 会将公共源码同步到两个脚本的 `// <pt-common:start>` / `// <pt-common:end>` 区块。

## 问题

*   IYUU_Reseed_Checker 下载馒头（M-Team）种子需要在配置页填写 M-Team API Key；未配置时会提示并阻止下载。
*   AI_WebSummary出现“错误： Failed to fetch”，需要在油猴插件-设置-修改内容安全策略（CSP）头信息 改为“全部移除（可能不安全）”
