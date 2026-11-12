// Input: AnimeBytes series.php 分组标题行与详情链接。
// Output: 每组一个上传格式入口；不发起请求或提交表单。
// Pos: AnimeBytes 系列页增强入口。

'use strict';

if (location.hostname === 'animebytes.tv' && location.pathname === '/series.php') {
  for (const row of document.querySelectorAll('tr.group[id^="group_"]')) {
    const groupId = /^group_([1-9]\d*)$/.exec(row.id)?.[1];
    const heading = row.querySelector('h3');
    if (!groupId || !heading || heading.querySelector('.ab-add-format')) continue;

    // type 是分区而非上传页分类：torrents.php（含漫画、游戏等）用 anime；
    // torrents2.php（音乐及 PVs/Lives）用 music。具体表单由 groupid 决定。
    let type;
    for (const link of heading.querySelectorAll('a[href]')) {
      const url = new URL(link.getAttribute('href'), location.href);
      if (url.origin !== location.origin || url.searchParams.get('id') !== groupId) continue;
      if (url.pathname === '/torrents.php') type = 'anime';
      if (url.pathname === '/torrents2.php') type = 'music';
      if (type) break;
    }
    if (!type) continue;

    const url = new URL('/upload.php', location.origin);
    url.searchParams.set('type', type);
    url.searchParams.set('groupid', groupId);
    const button = document.createElement('a');
    button.className = 'ab-add-format';
    button.href = url.href;
    button.textContent = '[添加格式]';
    button.title = `为分组 ${groupId} 添加格式（${type}）`;
    button.style.marginInlineStart = '12px';
    button.style.fontSize = '0.85em';
    button.style.fontWeight = 'normal';
    button.style.whiteSpace = 'nowrap';
    heading.append(button);
  }
}
