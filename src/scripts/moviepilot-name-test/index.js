'use strict';

// changelog:
// - 3.5.17: 兼容 MoviePilot V2 裸响应与 V3 业务 envelope；检查业务失败、空元信息及测试连接响应。
// - 3.5.15: Haidan 单种子详情页(group_id 空)从 DOM 提取真实 group_id 存入种子定位，与 IYUU 同步。
// - 3.5.6: Gazelle DOM 解析改为复用 pt-common 公共实现，并保持 Orpheus/Haidan/GPW group 页选择识别。
// - 3.5.5: 新增 Orpheus/Haidan Gazelle 适配器，支持 Gazelle group 页多种子选择识别。
// - 3.5.4: 收紧公共 BT 与 GPW 匹配到详情页，避免首页/列表页误注入，IPT 匹配收紧到详情页。
// - 3.5.3: 增强 lazy 详情页识别缓存/自动识别恢复，优化配置密钥显示切换，并限制 Monika 只匹配数字种子详情页。
import { bootstrap } from './startup.js';

bootstrap();
