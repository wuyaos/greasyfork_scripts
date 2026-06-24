# greasyfork_scripts

职责：托管自用 Greasy Fork / Tampermonkey 脚本及其 README 安装入口；根目录 `.user.js` 为可直接安装的发布文件，IYUU/MP 的公共页面适配代码由轻量同步脚本合并。
Input: 浏览器用户脚本运行环境、目标站点页面、用户本地 GM 配置；Output: 网页增强/自动化行为；Pos: 仓库根目录作为脚本分发与索引层。

## Files

- `README.md`: 脚本列表与安装入口说明。
- `IYUU_Reseed_Checker.user.js`: 独立 IYUU 辅种检测脚本，支持手动/自动查询、站点选择、详情页跳转、多选打开、选中站点种子下载和多类 PT/BT 详情页适配。
- `PT_OneClickClaim.user.js`: PT 一键认领增强脚本，支持按标题表达式、体积、多选 IP、多选客户端筛选当前做种并预览后批量认领。
- `Moviepilot_AutoLogin.user.js`: MoviePilot 自动登录脚本。
- `Moviepilot_NameTest.user.js`: PT/BT 种子名称识别与 MoviePilot 推送脚本，支持默认关闭的自动查询、识别缓存和多类 PT/BT 详情页适配。
- `Bangumi_Enhanced.user.js`: Bangumi 中文标题与放送日历增强脚本。
- `AI_WebSummary.user.js`: AI 网页内容总结脚本。
- `NicePT_ReplaceIcon.user.js`: NicePT 分类图标替换脚本。
- `.omc/skills/tampermonkey-dev/SKILL.md`: 项目本地 Tampermonkey 5.4.1 userscript 开发 skill。
- `Local_Debug_Loader.user.js`: 本地 Tampermonkey 调试入口，通过运行时 no-cache 拉取并执行 `http://127.0.0.1:8787/...` 脚本，避免 `@require` 缓存。
- `serve-debug.sh`: 启动本地无缓存 HTTP 文件服务器，供 `Local_Debug_Loader.user.js` 调试加载。
- `serve_debug.py`: 本地调试 HTTP server 实现，设置 no-cache 与 CORS 响应头。
- `src/common/pt-common.js`: IYUU 与 MoviePilot 共用的页面插入、锚点查找、DOM 安全 wrapper 和 Mount 工具源码。
- `build/build-userscripts.mjs`: 将 `src/common/pt-common.js` 同步进 `IYUU_Reseed_Checker.user.js` 与 `Moviepilot_NameTest.user.js` 的 marker 区块。
- `icon/`: 脚本图标资源。
- `class_icon/`: NicePT 分类图标资源。

## Local Rules

- 使用 `agent-browser` 分析需要登录态的真实站点页面时，不要启动 WSL/agent-browser 自带的新浏览器代替用户浏览器；优先连接用户手动启动的 Windows Catsxp CDP（例如 `--remote-debugging-port=9222`）。如果 CDP 端口不可达，先报告监听/连接问题并继续用代码和用户提供的 DOM 证据分析，不要用未登录的新浏览器页面下结论。
- 运行 Python 时使用当前 micromamba 环境里的 Python；避免调用系统 Python 导致依赖或版本不一致。
- 修改 IYUU/MP 公共插入、锚点或 Mount 逻辑时，先改 `src/common/pt-common.js`，再运行 `node build/build-userscripts.mjs` 同步根目录发布脚本。
