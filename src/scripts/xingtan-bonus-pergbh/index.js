'use strict';

/* 杏坛（xingtan.one）种子列表：自动计算每个种子的每GB·h体积收益
 * Input: torrents.php 页面中站点渲染的 .bonus-data（data-size-bonus JSON）与 .bonus-result
 * Output: 在每个种子的 bonus-result 容器内追加"每GB·h: X.XXXXX"行
 * Pos: 不修改站点公式与现有显示；仅在站点已渲染的体积收益行之后追加一行
 */

import { bootstrap } from './startup.js';

bootstrap();
