# Greasy Fork Scripts

这个仓库包含一些我编写的油猴脚本，并可一键跳转到对应的脚本文件。

## 脚本列表

*   **[Moviepilot_AutoLogin](https://github.com/wuyaos/greasyfork_scripts/raw/refs/heads/main/Moviepilot_AutoLogin.user.js)**: MoviePilot自动登录
*   **[Moviepilot_NameTest](https://github.com/wuyaos/greasyfork_scripts/raw/refs/heads/main/Moviepilot_NameTest.user.js)**: PT站种子名称识别，推送moviepilots，支持默认关闭的自动查询和识别缓存
*   **[IYUU_Reseed_Checker](https://github.com/wuyaos/greasyfork_scripts/raw/refs/heads/main/IYUU_Reseed_Checker.user.js)**: IYUU辅种检测助手，支持手动/自动查询、站点选择、详情页跳转、多选打开和选中站点种子下载
*   **[PT_OneClickClaim](https://github.com/wuyaos/greasyfork_scripts/raw/refs/heads/main/PT_OneClickClaim.user.js)**: PT一键认领增强脚本，支持按标题表达式、体积、多选 IP、多选客户端筛选当前做种并预览后批量认领
*   **[Zhuque_BatchDownload](https://github.com/wuyaos/greasyfork_scripts/raw/refs/heads/main/Zhuque_BatchDownload.user.js)**: 朱雀种子搜索页批量下载脚本，支持关键字、体积、做种、下载和优惠筛选，按条件勾选后下载当前勾选种子
*   **[Bangumi_Enhanced](https://github.com/wuyaos/greasyfork_scripts/raw/refs/heads/main/Bangumi_Enhanced.user.js)**: Bangumi增强脚本：显示中文标题，优化放送日历(仿B站番剧时间表)
*   **[AI_WebSummary](https://github.com/wuyaos/greasyfork_scripts/raw/refs/heads/main/AI_WebSummary.user.js)**: 使用AI总结网页内容
*   **[NicePT_ReplaceIcon](https://github.com/wuyaos/greasyfork_scripts/raw/refs/heads/main/NicePT_ReplaceIcon.user.js)**: 替换NicePT分类中的图标
*   **[Local_Debug_Loader](https://github.com/wuyaos/greasyfork_scripts/raw/refs/heads/main/Local_Debug_Loader.user.js)**: 本地调试入口，通过本地 HTTP 文件服务器 `@require` 当前仓库脚本，便于外部编辑器实时修改

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
