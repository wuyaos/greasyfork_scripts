'use strict';

// input: PT/BT 种子页面、IYUU Token、站点索引、可选 M-Team API Key
// output: 手动查询 IYUU 辅种结果，展示站点详情链接、多选跳转、下载入口，并从 MoviePilot 辅助选择拥有站点
// pos: 独立 IYUU 辅种检测脚本，可复用 MoviePilot 配置选择站点，首次使用自动引导配置
// changelog:
// - 1.1.17: 修复 Haidan 单种子详情页(group_id 空)辅种跳转链裸域重定向 &→&amp; 致空白，规范域名到 www.haidan.cc，按 torrent_id 归一化缓存并从 torrent_id 补全 group_id。
// - 1.1.8: 调整 GPW/Haidan 插入 UI 为左对齐 label｜按钮，并为 IYUU 索引本地视图补充站点改址复写。
// - 1.1.6: 复用公共 Gazelle 适配器，新增 Orpheus/Haidan/GPW group 页选择查询。
// - 1.1.5: 补齐 IYUU 私有站特殊详情页匹配，避免在公共 BT 站点注入，并收紧 IPT 匹配到详情页。
// - 1.1.4: 使用 IYUU 文档站图标作为脚本图标。
// - 1.1.3: 增强 lazy 详情页注入，恢复缓存/自动查询并限制 Monika 只匹配数字种子详情页。
// - 1.1.1: 修复 HHClub grid 布局下 UI 插入到底部的问题，并加强查询结果同站去重。
// - 1.0.9: 补充 HHClub、GPW、HDCity、IPT、BHD、FileList 详情页适配，并修正 M-Team 体积提取。
// - 1.0.8: 为每个辅种站点详情页写入跨站页面缓存别名；馒头下载改为带 API Key 换取真实下载链接。
// - 1.0.7: 保留配置保存后的查询结果缓存，新增当前页面快速缓存。
// - 1.0.6: 增加默认关闭的自动查询开关，缓存命中时不重复请求。
import { bootstrap } from './startup.js';

bootstrap();
