<template>
  <div class="reader-epub">
    <div class="container">
      <div id="viewer" ref="viewer" class="scrolled" />
      <div class="arrow prev">
        <button id="prev" @click="clickPreviousPageHandler">
          <span>‹</span>
        </button>
      </div>
      <div class="arrow next">
        <button id="next" @click="clickNextPageHandler">
          <span>›</span>
        </button>
      </div>
      <div v-show="selected" id="select-menu" ref="notePoptip" class="select-menu">
        <ul class="highlight-list">
          <li
            v-for="item in highlights"
            :key="item.name"
            class="item ann-color"
            :style="{ backgroundColor: item.color }"
            @click="clickMarkHandler(item.name)"
          />
        </ul>
        <hr />
        <button id="remove-heightlight" class="menu-item" @click="deleteMarkHandler">删除标记</button>
      </div>
    </div>
  </div>
</template>

<script>
import ePub from 'epubjs';
import generateEpub from 'epub-gen-memory';
import QiuPen, { highlightElementClass } from '../../util/highlight';
import storage from '../../util/storage';

const readLocalFile = (file) => {
  return new Promise((resolve) => {
    const rawFile = new XMLHttpRequest();
    rawFile.open('GET', file, false);
    rawFile.onreadystatechange = function () {
      if (rawFile.readyState === 4) {
        if (rawFile.status === 200 || rawFile.status == 0) {
          resolve(rawFile.responseText);
        }
      }
    };
    rawFile.send(null);
  });
};

import { bookContent } from '../../book';

export default {
  data() {
    return {
      addedContentEventListener: false,
      isMobile: false,
      isMouseDown: false,
      selected: false,
      changedPage: false,
      bookId: 1,
      mouseDownX: 0,
      mouseDownY: 0,
      selectedText: '',
      locationCfi: '',
      notes: [],
      book: null,
      rendition: null,
      // bookTitle: null,
      // bookMeta: null,
      // bookToc: null,
      options: {
        bgColor: '#fff',
        fontSize: 16,
        fontFamily: 'Microsoft Yahei, Heiti SC, Heiti TC',
        lineHeight: 2,
        theme: 0,
      },
      themes: [
        {
          id: '1',
          name: '白色',
          color: '#000',
          bgColor: '#fff',
        },
        {
          id: '2',
          name: '浅棕色',
          color: '#000',
          bgColor: '#f9f4e9',
        },
        {
          id: '3',
          name: '护眼',
          color: '#000',
          bgColor: '#ceeaba',
        },
        {
          id: '4',
          name: '夜间',
          color: '#fff',
          bgColor: '#000',
        },
      ],
      highlights: [
        {
          name: 'red',
          color: '#FFBA84',
        },
        {
          name: 'orange',
          color: '#E2943B',
        },
        {
          name: 'yellow',
          color: '#F7C242',
        },
        {
          name: 'green',
          color: '#86C166',
        },
        {
          name: 'blue',
          color: '#33A6B8',
        },
        {
          name: 'purple',
          color: '#8A6BBE',
        },
      ],
      wheelTimer: null,
    };
  },
  mounted() {
    this.initBook();
    window.addEventListener('resize', this.resizeWindowHandler);
    this.resizeWindowHandler();
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.resizeWindowHandler);
  },
  methods: {
    /**
     * 初始化設定
     */
    async initBook() {
      const options = {
        title: "Alice's Adventures in Wonderland", // *Required, title of the book.
        author: 'Lewis Carroll', // *Required, name of the author.
        publisher: 'Macmillan & Co.', // optional
        cover: 'logo.png', // Url or File path, both ok.
      };

      const content = [
        {
          title: 'Acknowledgment.xhtml',
          content: bookContent,
        },
        {
          title: 'Appendix.xhtml',
          content: bookContent,
        },
        {
          title: 'Ch1.xhtml',
          content: bookContent,
        },
        {
          title: 'Ch2.xhtml',
          content: bookContent,
        },
        {
          title: 'Ch3.xhtml',
          content: bookContent,
        },
      ];

      const epubContent = await generateEpub(options, content);

      this.book = ePub(epubContent);
      // this.book = ePub(
      //   "https://s3.amazonaws.com/epubjs/books/moby-dick/OPS/package.opf"
      // );

      this.rendition = this.book.renderTo('viewer', { width: '100%', height: window.innerHeight - 80 });
      // this.rendition.display();

      // 前往某一個章節
      // this.rendition.display("epubcfi(/6/8[Ch2.xhtml]!/4/2/2/1:0)");
      this.rendition.display('epubcfi(/6/4!/4/6,/1:80,/2/1:2)');

      this.book.ready.then(() => {
        // console.log('book.ready');
        QiuPen.init();
      });

      // 載入儲存在 localStorage 的筆記
      this.loadNote();

      this.initBookEvent();

      this.initBookStyle();
    },
    /**
     * 初始化電子書的事件
     */
    initBookEvent() {
      // 監聽章節的渲染
      // 切換章節後也會觸發
      // Navigation loaded
      this.book.loaded.navigation.then(function (toc) {
        // console.log(toc);
      });

      const next = document.getElementById('next');
      next.addEventListener(
        'click',
        () => {
          this.rendition.next();
        },
        false,
      );

      const prev = document.getElementById('prev');
      prev.addEventListener(
        'click',
        () => {
          this.rendition.prev();
        },
        false,
      );

      const keyListener = (e) => {
        // Left Key
        if ((e.keyCode || e.which) == 37) {
          this.rendition.prev();
        }

        // Right Key
        if ((e.keyCode || e.which) == 39) {
          this.rendition.next();
        }
      };

      this.rendition.on('keyup', keyListener);
      document.addEventListener('keyup', keyListener, false);

      // 切換頁時，當到達第一頁時，隱藏上一頁按鈕，到達最後一頁時，隱藏下一頁按鈕
      this.rendition.on('relocated', (location, e) => {
        const iframe = document.getElementsByTagName('iframe')[0];
        const iframeDocument = iframe.contentWindow.document;
        QiuPen.create(iframeDocument);
        QiuPen.load(this.book, this.bookId);
        // 桌機版以下才有滑動內容且換頁功能

        if (this.isMobile && !this.addedContentEventListener) {
          this.addedContentEventListener = true;
          this.registerSlidingContent(iframeDocument);
        }
        // 取消監聽手機版的滑動事件
        if (!this.isMobile && this.addedContentEventListener) {
          this.addedContentEventListener = false;
          this.unregisterSlidingContent(iframeDocument);
        }
        // 目前只能透過 location.displayed 抓取當前章節的頁碼和總頁數
        // 無法取得整本書的總頁數
        // var currentLocation = this.rendition.currentLocation();
        // var currentPage = this.book.locations.percentageFromCfi(location.start.cfi);

        var next = this.book.package.metadata.direction === 'rtl' ? document.getElementById('prev') : document.getElementById('next');
        var prev = this.book.package.metadata.direction === 'rtl' ? document.getElementById('next') : document.getElementById('prev');

        if (location.atEnd) {
          next.style.visibility = 'hidden';
        } else {
          next.style.visibility = 'visible';
        }

        if (location.atStart) {
          prev.style.visibility = 'hidden';
        } else {
          prev.style.visibility = 'visible';
        }
      });
      // # highlight 筆記區塊
      // ["epubcfi(/6/8!/4/110,/1:166,/1:286)"].forEach(cfi => {
      //   this.rendition.annotations.highlight(cfi, {
      //     type: "highlight",
      //     color: "#FFBA84",
      //   });
      // });

      this.rendition.on('click', (e) => {
        // 先讓畫面更新再做判斷
        setTimeout(() => {
          // 有包含 highlight 的元素，則顯示筆記彈窗
          if ([...e.target.classList].some((item) => highlightElementClass.includes(item))) {
            this.selected = true;
            return;
          }
          // iframe 中是否有已被選取得文字，有則顯示筆記彈窗
          const selectedContent = QiuPen.highlighter.doc.getSelection() || {};
          if (selectedContent.anchorNode && selectedContent.anchorNode.data.substring(selectedContent.baseOffset, selectedContent.extentOffset)) {
            this.selected = true;
            return;
          }
          this.selected = false;
        });
      });

      // Apply a class to selected text
      this.rendition.on('selected', (cfiRange, contents) => {
        const selectedContent = contents.window.getSelection();
        this.locationCfi = cfiRange;
        this.selectedText = selectedContent.anchorNode.data.substring(selectedContent.baseOffset, selectedContent.extentOffset);
        if (!this.selected && selectedContent.toString() && selectedContent.toString().length) {
          this.selected = true;
        }
      });
    },
    /**
     * 設置電子書樣式
     */
    initBookStyle() {
      this.rendition.themes.register('tan', process.env.NODE_ENV === 'production' ? '/epub-reader/common.css' : '/common.css');
      this.rendition.themes.select('tan');
    },
    /**
     * 載入筆記
     */
    loadNote() {
      const store = storage.get('highlight', {});
      this.notes = store[this.bookId] || [];
    },
    /**
     * 點擊上一頁按鈕事件
     */
    clickPreviousPageHandler() {
      this.rendition.prev();
    },
    /**
     * 點擊下一頁按鈕事件
     */
    clickNextPageHandler() {
      this.rendition.next();
    },
    /**
     * 點擊筆記標記事件
     * @param {string} name 標記的顏色名稱
     */
    clickMarkHandler(name) {
      // 必需和 highlight.js 中的 classes 相同
      const highlight = this.highlights.find((item) => item.name === name);
      const highlightName = `hl-${name}`;
      const highlightSelections = QiuPen.highlighter.highlightSelection(highlightName);
      if (!highlightSelections.length) {
        alert('未選取文字範圍');
        return;
      }
      const { id: noteId } = highlightSelections[0];
      QiuPen.save(this.book, this.bookId, this.selectedText, this.locationCfi, highlight.color, noteId);
      this.loadNote();
      // this.selected = false;
    },
    /**
     * 刪除筆記標記事件
     */
    deleteMarkHandler() {
      const unHighlightSelections = QiuPen.highlighter.unhighlightSelection();
      if (!unHighlightSelections.length) {
        alert('未為合法的刪除範圍');
        return;
      }
      const { id: noteId } = unHighlightSelections[0];
      QiuPen.deleteNote({ bookKey: this.bookId, noteId, book: this.book });
      this.loadNote();
      this.selected = false;
    },
    /**
     * 變更視窗大小事件
     */
    resizeWindowHandler() {
      this.isMobile = window.innerWidth < 1024;
    },
    /**
     * 註冊滑動內容事件
     * @param {object} element 被註冊的元素
     */
    registerSlidingContent(element) {
      element.addEventListener('mousedown', this.mousedownContentHandler);
      element.addEventListener('mousemove', this.mousemoveContentHandler);
      element.addEventListener('mouseup', this.mouseupContentHandler);
      element.addEventListener('touchstart', this.mousedownContentHandler);
      element.addEventListener('touchmove', this.mousemoveContentHandler);
      element.addEventListener('touchend', this.mouseupContentHandler);
    },
    /**
     * 取消註冊滑動內容事件
     * @param {object} element 被取消註冊的元素
     */
    unregisterSlidingContent(element) {
      element.removeEventListener('mousedown', this.mousedownContentHandler);
      element.removeEventListener('mousemove', this.mousemoveContentHandler);
      element.removeEventListener('mouseup', this.mouseupContentHandler);
      element.removeEventListener('touchstart', this.mousedownContentHandler);
      element.removeEventListener('touchmove', this.mousemoveContentHandler);
      element.removeEventListener('touchend', this.mouseupContentHandler);
    },
    /**
     * 滑鼠按下內容時的事件
     * @param {object} e MouseEvent Attribute
     */
    mousedownContentHandler(e) {
      this.isMouseDown = true;
      this.mouseDownX = e.pageX || e.changedTouches[0].pageX || 0;
      this.mouseDownY = e.pageY || e.changedTouches[0].pageY || 0;
    },
    /**
     * 滑鼠移動內容時的事件
     * @param {object} e MouseEvent Attribute
     */
    mousemoveContentHandler(e) {
      if (!(this.selected || this.changedPage) && this.isMouseDown) {
        // 滑動的距離達到畫面的三分之一時，觸發換頁
        // const reachDistance = Math.abs(e.pageX - this.mouseDownX) /3 >= (this.$refs.viewer.clientWidth / 3)
        // if (reachDistance) {
        const pageX = e.pageX || e.changedTouches[0].pageX || 0;
        const pageY = e.pageY || e.changedTouches[0].pageY || 0;
        if (pageX > this.mouseDownX || pageY > this.mouseDownY) {
          this.clickPreviousPageHandler();
        } else if (pageX < this.mouseDownX || pageY < this.mouseDownY) {
          this.clickNextPageHandler();
        }
        // }
        this.changedPage = true;
      }
      // console.log('this.mouseDownX', this.mouseDownX);
      // console.log('this.mouseDownY', this.mouseDownY);
    },
    /**
     * 滑鼠離開內容時的事件
     */
    mouseupContentHandler() {
      this.isMouseDown = false;
      this.changedPage = false;
    },
  },
};
</script>

<style scoped>
.reader-epub {
  background-color: #2d353a;
  min-height: 100vh;
}
.container {
  position: relative;
  margin-left: auto;
  margin-right: auto;
  padding: 40px 8px;
  max-width: 1180px;
}
#viewer {
  margin-left: auto;
  margin-right: auto;
  border-radius: 10px;
  overflow: hidden;
}
.arrow {
  position: fixed;
  top: 0;
  bottom: 0;
  width: 40px;
}
.arrow button {
  display: block;
  width: 100%;
  height: 100%;
  background-color: transparent;
  border-width: 0;
  cursor: pointer;
}
.arrow span {
  display: none;
}
.prev {
  left: 0;
}
.next {
  right: 0;
}
.select-menu {
  position: absolute;
  top: 0;
  left: 0;
  width: 240px;
  padding: 10px 0;
  background-color: #fff;
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.14);
  border: 1px solid rgba(27, 31, 35, 0.15);
  border-radius: 4px;
  z-index: 10;
}
.highlight-list {
  list-style: none;
  margin-left: 0;
  padding: 0;
}
.ann-color {
  display: inline-block;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.3s;
}
.ann-color:hover {
  transform: scale(1.2, 1.2);
}

@media (min-width: 1024px) {
  #viewer {
    max-width: 900px;
    width: 76.27%;
  }
  .arrow {
    position: absolute;
    top: 50%;
    bottom: auto;
    max-width: 100px;
    width: 8.47%;
    transform: translateY(-50%);
  }
  .arrow button {
    padding-top: 100%;
    height: auto;
    font-size: 37.49px;
    background-color: #424c54;
    color: #bccad4;
    border-radius: 50%;
  }
  .arrow span {
    position: absolute;
    display: block;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }
}

@media (min-width: 1680px) {
  .container {
    max-width: 1650px;
  }
  #viewer {
    max-width: 1370px;
    width: 83.03%;
  }
}
</style>
