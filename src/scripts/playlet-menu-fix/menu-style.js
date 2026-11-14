const STYLE_ID = 'playlet-menu-fix-style';
const OPEN_CLS = 'pmenu-open';

const CSS = `
/* 点击父项后固定展开子菜单（不依赖 hover），hover 仍可用 */
#ddtopmenubar li.has-children.${OPEN_CLS} > ul.sub-menu {
  display: block !important;
  visibility: visible !important;
  opacity: 1 !important;
}
/* 兜底：hover 展开（站点已有，重复声明防站点改版回退） */
#ddtopmenubar li.has-children:hover > ul.sub-menu {
  display: block !important;
}
`;

function isOpen(li) {
  return li.classList.contains(OPEN_CLS);
}

function closeAll(bar) {
  bar.querySelectorAll('li.has-children.' + OPEN_CLS).forEach((li) => {
    li.classList.remove(OPEN_CLS);
  });
}

export function bindClickToggle() {
  const bar = document.getElementById('ddtopmenubar');
  if (!bar || bar.dataset.pmenuFix) return;
  bar.dataset.pmenuFix = '1';

  bar.addEventListener('click', (e) => {
    const a = e.target.closest('#ddtopmenubar > li.has-children > a');
    if (!a) return;
    const li = a.parentElement;
    const href = a.getAttribute('href') || '';
    const isVoid = href === 'javascript:void(0);' || href === 'javascript:;' || href === '#';

    // 点子菜单项时收起所有展开的父项
    if (e.target.closest('#ddtopmenubar .sub-menu')) {
      closeAll(bar);
      return;
    }

    if (isOpen(li)) {
      li.classList.remove(OPEN_CLS);
      if (isVoid) e.preventDefault();
      return;
    }
    closeAll(bar);
    li.classList.add(OPEN_CLS);
    // void(0) 父项无跳转目标，阻止默认；真实链接父项（如"种子"）保留跳转，
    // 跳转后由 CSS :hover + URL 无状态，不阻塞导航
    if (isVoid) e.preventDefault();
  }, false);

  // 点击菜单外区域时收起
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#ddtopmenubar')) closeAll(bar);
  }, true);
}

export function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  (document.head || document.documentElement).appendChild(style);
}
