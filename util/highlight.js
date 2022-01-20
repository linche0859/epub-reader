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
  rangy.init(); // 初始化rangy模块
  console.log('QiuPen.init ');
  classes.forEach(function (item) {
    var classApplier = rangy.createClassApplier(item, {
      ignoreWhiteSpace: true,
      elementTagName: 'span',
    });
    classAppliers.push(classApplier);
  });
};

QiuPen.create = function (document) {
  console.log('QiuPen.create ');
  QiuPen.highlighter = rangy.createHighlighter(document); // 创建一个highlighter
  classAppliers.forEach(function (item) {
    QiuPen.highlighter.addClassApplier(item);
  });
};

QiuPen.save = function (book, bookKey, selectedText, cfi, color, noteId) {
  console.log('selectedText', selectedText);
  var store = storage.get('highlight', {});

  store[bookKey] = store[bookKey] || [];
  // 目前的章節
  var chapterPos = book.renderer.currentChapter.spinePos;
  // console.log("保存");
  console.log(chapterPos);
  var serStr = QiuPen.highlighter.serialize();
  console.log(serStr);

  var hlObj = new Highlight(chapterPos, serStr, selectedText);

  // 同步同一章節的全部 highlight
  store[bookKey]
    .filter((item) => item.chapterPos === chapterPos)
    .forEach((item) => {
      item.highlight = serStr;
    });

  console.log('hlObj', hlObj);
  hlObj.id = noteId;
  hlObj.createTime = new Date().getTime();
  hlObj.cfi = cfi;
  hlObj.color = color;
  hlObj.note = '';
  hlObj.selectedText = selectedText;

  console.log(hlObj);
  store[bookKey].unshift(hlObj);

  storage.set('highlight', store);
};

// 載入筆記事件
QiuPen.load = function (book, bookKey) {
  console.log('bookKey', bookKey);
  var store = storage.get('highlight', {});
  var hlObjs = store[bookKey];
  if (!hlObjs) return;
  var chapterPos = book.renderer.currentChapter.spinePos;
  console.log('hlObjs', hlObjs);
  var result = hlObjs.find((item) => item.chapterPos === chapterPos);
  // hlObjs.forEach(function (item) {
  // 	if (item.chapterPos === chapterPos) {
  // 		result = item;
  // 	}
  // });
  if (!result) return;
  console.log('result.highlight', result.highlight);
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
  var chapterPos = book.renderer.currentChapter.spinePos;
  var serStr = QiuPen.highlighter.serialize();

  // console.log("hlObjs", hlObjs);
  // console.log("QiuPen.highlighter.serialize()", );
  if (!hlObjs) return;
  store[bookKey] = hlObjs.filter((item) => item.id !== noteId);
  // 同步同一章節的全部 highlight
  store[bookKey]
    .filter((item) => item.chapterPos === chapterPos)
    .forEach((item) => {
      item.highlight = serStr;
    });
  // console.log("store[bookKey]", store[bookKey]);
  storage.set('highlight', store);
};

export default QiuPen;
