'use strict';

// input: 朱雀种子搜索/列表页，Ant Design Table 行，每行含体积、做种数、下载数、完成数、上传/下载倍率、下载链接
// output: 页面顶部注入批量下载面板，按多选条件筛选当前页种子并批量下载，可预览、全选/反选
// pos: 独立朱雀批量下载脚本，只读取页面表格并触发显式用户下载，不改写站点逻辑
import { bootstrap } from './startup.js';

bootstrap();
