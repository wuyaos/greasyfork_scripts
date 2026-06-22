# greasyfork_scripts

职责：托管自用 Greasy Fork / Tampermonkey 脚本及其 README 安装入口；不包含构建系统，脚本均为可直接安装的 `.user.js`。
Input: 浏览器用户脚本运行环境、目标站点页面、用户本地 GM 配置；Output: 网页增强/自动化行为；Pos: 仓库根目录作为脚本分发与索引层。

## Files

- `README.md`: 脚本列表与安装入口说明。
- `IYUU_Reseed_Checker.user.js`: 独立 IYUU 辅种检测脚本，手动查询并用小图标展示可辅种站点。
- `Moviepilot_AutoLogin.user.js`: MoviePilot 自动登录脚本。
- `Moviepilot_NameTest.user.js`: PT/BT 种子名称识别与 MoviePilot 推送脚本。
- `Bangumi_Enhanced.user.js`: Bangumi 中文标题与放送日历增强脚本。
- `AI_WebSummary.user.js`: AI 网页内容总结脚本。
- `NicePT_ReplaceIcon.user.js`: NicePT 分类图标替换脚本。
- `.omc/skills/tampermonkey-dev/SKILL.md`: 项目本地 Tampermonkey 5.4.1 userscript 开发 skill。
- `icon/`: 脚本图标资源。
- `class_icon/`: NicePT 分类图标资源。
