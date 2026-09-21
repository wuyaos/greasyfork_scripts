'use strict';

// input: PT 站用户详情页或当前做种列表页，页面内当前做种表格、认领按钮、IP 与客户端文本
// output: 页面内增强筛选栏，按标题表达式/体积/IP/客户端预览并批量认领当前做种种子
// pos: 独立 PT 一键认领增强脚本，只做认领筛选与显式确认执行，不处理账号领种移除
import { bootstrap } from './startup.js';

bootstrap();
