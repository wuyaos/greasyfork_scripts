# greasyfork_scripts

职责：托管自用 Greasy Fork / Tampermonkey 脚本的模块化源码、构建工具、可安装产物和 README 安装入口。
Input: 浏览器用户脚本运行环境、目标站点页面、用户本地 GM 配置；Output: 网页增强/自动化行为；Pos: `src/` 是开发源代码，`script/` 是构建与校验工具，`dist/` 是可安装发布层。

## Files

- `src/scripts/<script-id>/`: 各 userscript 的模块化源码和 `meta.js`，按脚本独立维护。
- `src/common/`: 多个脚本共享的源码；公共逻辑只保留一个源文件。
- `script/build-userscripts.mjs`: 将 `src/` 模块打包到 `dist/`。
- `script/scripts-registry.mjs`: 脚本 ID、入口和发布文件名注册表。
- `dist/*.user.js`: 可安装的单文件发布产物，禁止手工编辑。
- `tests/`: 离线 fixture、契约和回归验证。
- `README.md`: 脚本列表、`dist/` 安装入口和开发说明。
- `icon/`: 脚本图标资源。
- `class_icon/`: NicePT 分类图标资源。
- `src/scripts/local-debug-loader/`: 本地调试入口，通过 `/dist/` 加载构建产物。
- `script/serve-debug.sh`、`script/serve_debug.py`: 本地无缓存 HTTP 调试服务。

## Commands

```bash
npm install
npm run build
npm run build:check
npm run validate
```

`npm run build` 生成全部 `dist/*.user.js`；`npm run build:script -- <script-id>` 生成单个脚本；`npm run build:check` 检查产物是否和源码一致。发布前对 `dist/` 运行 userscript validator 和离线 fixture。

## Local Rules

- 不访问真实目标站点做未授权验证；优先使用用户提供的 HTML、只读参考脚本和本地 fixture。实站行为无法证明时在报告中标记 `NOT_VERIFIED`。
- 根目录不再放可安装 `.user.js`；安装链接必须指向 `dist/<name>.user.js`。
- 修改 IYUU/MP 公共插入、锚点或 Mount 逻辑时，先改 `src/common/pt-common.js`，再运行 `npm run build` 生成两个 `dist/` 产物。
- 保留 userscript metadata、`@match`、`@grant`、`@require`、`@connect`、GM storage key、URL、选择器、文本、颜色、padding 和原有提交/确认边界。
- 不把 `@require` 外部依赖改成动态 import；保留运行时降级和可见错误反馈。
- 不自动提交表单、自动发帖或绕过用户确认。GM API 必须与 metadata 中的 `@grant` 对应。
- Python 使用当前 micromamba 环境；不要启动新的未登录浏览器代替用户浏览器。
