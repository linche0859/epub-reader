import storage from './storage.js';
import rangy from 'rangy';
import 'rangy/lib/rangy-classapplier.js';
import 'rangy/lib/rangy-highlighter.js';

var QiuPen = {
  highlighter: null,
};

var classes = [
  'hl-red',
  'hl-orange',
  'hl-yellow',
  'hl-green',
  'hl-blue',
  'hl-purple',
  'line-red',
  'line-orange',
  'line-yellow',
  'line-green',
  'line-blue',
  'line-purple',
];
var classAppliers = [];

function Highlight(chapterPos, highlight) {
  this.chapterPos = chapterPos;
  this.highlight = highlight;
}

QiuPen.init = function () {
  rangy.init(); // 初始化 rangy 模块
  classes.forEach(function (item) {
    var classApplier = rangy.createClassApplier(item, {
      ignoreWhiteSpace: true,
      elementTagName: 'span',
    });
    classAppliers.push(classApplier);
  });
};

QiuPen.create = function (document) {
  QiuPen.highlighter = rangy.createHighlighter(document); // 创建一个 highlighter
  classAppliers.forEach(function (item) {
    QiuPen.highlighter.addClassApplier(item);
  });
};

QiuPen.save = function (book, bookKey, selectedText, cfi, color, noteId) {
  var store = storage.get('highlight', {});
  // 目前的章節
  var chapterPos = book.rendition.location.start.href;
  var serStr = QiuPen.highlighter.serialize();

  store[bookKey] = store[bookKey] || [];

  // 同步同一章節的全部 highlight
  store[bookKey]
    .filter((item) => item.chapterPos === chapterPos)
    .forEach((item) => {
      item.highlight = serStr;
    });

  // 已經存在的筆記則更新標記顏色
  const existNote = store[bookKey].find((item) => item.id === noteId);
  if (existNote) {
    existNote.cfi = cfi;
    existNote.color = color;
    existNote.selectedText = selectedText;
  }
  // 未存在則新增筆記
  else {
    const hlObj = new Highlight(chapterPos, serStr, selectedText);
    hlObj.id = noteId;
    hlObj.createTime = new Date().getTime();
    hlObj.cfi = cfi;
    hlObj.color = color;
    hlObj.note = '';
    hlObj.selectedText = selectedText;
    store[bookKey].unshift(hlObj);
  }

  storage.set('highlight', store);
  QiuPen.highlighter.deserialize(serStr);
};

// 載入筆記事件
QiuPen.load = function (book, bookKey) {
  var store = storage.get('highlight', {});
  var hlObjs = store[bookKey];
  if (!hlObjs) return;
  var chapterPos = book.rendition.location.start.href;
  var result = hlObjs.find((item) => item.chapterPos === chapterPos);
  hlObjs.forEach(function (item) {
    if (item.chapterPos === chapterPos) {
      result = item;
    }
  });
  if (!result) return;
  QiuPen.highlighter.deserialize(result.highlight);
};

QiuPen.clear = function (bookKey) {
  var store = storage.get('highlight', {});
  var hlObjs = store[bookKey];
  if (!hlObjs) return;
  delete store[bookKey];
  storage.set('highlight', store);
};

// 刪除指定筆記事件
QiuPen.deleteNote = function ({ bookKey, noteId, book }) {
  var store = storage.get('highlight', {});
  var hlObjs = store[bookKey];
  var chapterPos = book.rendition.location.start.href;
  var serStr = QiuPen.highlighter.serialize();

  if (!hlObjs) return;
  store[bookKey] = hlObjs.filter((item) => item.id !== noteId && item.highlight && item.highlight !== 'type:textContent');
  // 同步同一章節的全部 highlight
  store[bookKey]
    .filter((item) => item.chapterPos === chapterPos)
    .forEach((item) => {
      item.highlight = serStr;
    });
  storage.set('highlight', store);
};

export default QiuPen;
export const highlightElementClass = classes;
