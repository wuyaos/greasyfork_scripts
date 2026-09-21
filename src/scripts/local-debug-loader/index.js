'use strict';

// input: 本地调试 HTTP 服务 http://127.0.0.1:8787 与当前 PT/BT 详情页。
// output: 动态拉取并执行仓库内 IYUU / MoviePilot 用户脚本，避免 Tampermonkey @require 缓存。
// pos: 本地调试入口，仅用于开发期加载最新脚本，不作为 Greasy Fork 发布脚本。
// changelog:
// - 0.2.3: 同步 IYUU/MP 详情页匹配收敛，减少公共 BT 首页/列表页误加载，IPT 匹配收紧到详情页。
// - 0.2.2: 同步 Monika 数字种子详情页匹配，避免本地调试加载到 grouped 列表页。
import { bootstrap } from './startup.js';

bootstrap();
