// 监听选中文本
document.addEventListener('mouseup', function (e) {
  var sel = window.getSelection();
  // console.log("sel", sel);
  // 有選取內容時 isCollapsed 為 false，反之為 true
  // 點選已經標示筆記位置，anchorNode.parentElement 會有「hl-*」的 class
  if (!sel.isCollapsed || sel.anchorNode.parentElement.className.split(' ').some((className) => className.match(/hl-.*/gi))) {
    selected(e);
  } else window.parent.document.getElementById('select-menu').style.display = 'none';
});

// 选中文本后的事件处理程序
function selected(e) {
  var x = e.clientX,
    y = e.clientY,
    menu = window.parent.document.getElementById('select-menu'),
    menuHeight = window.parent.document.defaultView.getComputedStyle(menu, null).height,
    menuWidth = window.parent.document.defaultView.getComputedStyle(menu, null).width,
    screenHeight = window.parent.screen.availHeight,
    screenWidth = window.parent.screen.availWidth;

  menuHeight = parseInt(menuHeight);
  menuWidth = parseInt(menuWidth);

  if (screenWidth - x < menuWidth) {
    menu.style.left = x - menuWidth + 'px';
  } else {
    menu.style.left = x + 'px';
  }
  if (screenHeight - y < menuHeight) {
    menu.style.top = y - menuHeight + 'px';
  } else {
    menu.style.top = y + 'px';
  }

  menu.style.display = 'block';
}

// 解决复制粘贴问题的 hack
document.addEventListener('keydown', function (e) {
  // console.log("e", e);
  var key = e.keyCode || e.which;
  if (key === 67 && e.ctrlKey) {
    document.execCommand('copy', false, null);
  }
});
