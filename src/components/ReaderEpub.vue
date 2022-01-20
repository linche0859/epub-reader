<template>
  <div>
    <div id="viewer" class="scrolled" style="height: 100vh" />
    <button id="prev" class="arrow prev" @click="clickPreviousPageHandler">‹</button>
    <button id="next" class="arrow next" @click="clickNextPageHandler">›</button>
    <div id="select-menu" ref="notePoptip" class="select-menu">
      <ul class="highlight-list">
        <li
          v-for="item in highlights"
          :key="item.name"
          class="item ann-color"
          :style="{ backgroundColor: item.color }"
          @click="clickMarkHandler(item.name)"
        />
      </ul>

      <div id="extras">
        <ul id="highlights"></ul>
      </div>
      <!-- <div class="divider" />
      <button id="remove-heightlight" class="menu-item">删除标记</button> -->
    </div>
  </div>
</template>

<script>
// import "../../static/epub.min.js";
import ePub from 'epubjs';
import generateEpub from 'epub-gen-memory';
import QiuPen from '../../util/highlight';
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
      selected: false,
      bookId: 1,
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
    this.init();
  },
  methods: {
    /**
     * 初始化設定
     */
    async init() {
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

      this.rendition = this.book.renderTo('viewer', { height: '100%' });
      this.rendition.display();

      // 前往某一個章節
      // this.rendition.display("epubcfi(/6/8[Ch2.xhtml]!/4/2/2/1:0)");
      // this.rendition.display("epubcfi(/6/8!/4/110/1:193)");

      this.book.ready.then(() => {
        console.log('book.ready');
        QiuPen.init();
      });

      // 載入儲存在 localStorage 的筆記
      this.loadNote();

      this.initBookEvent();

      // this.setBookStyle();
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
      this.rendition.on('relocated', (location) => {
        console.log(location);

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
      const highlight = document.getElementById('highlights');

      // Apply a class to selected text
      this.rendition.on('selected', (cfiRange, contents) => {
        this.book.getRange(cfiRange).then((range) => {
          const a = document.createElement('a');
          const remove = document.createElement('a');
          if (range) {
            const text = range.toString();
            const textNode = document.createTextNode(text);
            a.textContent = cfiRange;
            a.href = '#' + cfiRange;
            a.onclick = () => {
              this.rendition.display(cfiRange);
            };
            remove.textContent = 'remove';
            remove.href = '#' + cfiRange;
            remove.onclick = () => {
              this.rendition.annotations.remove(cfiRange);
              return false;
            };
          }
        });

        // 選取範圍上色
        this.rendition.annotations.highlight(cfiRange, {}, (e) => {
          console.log('highlight clicked', e.target);
        });

        // 在最右側顯示筆記 icon
        // this.rendition.annotations.mark(cfiRange, { something: false }, e => {
        // const bounds = e.target.getBoundingClientRect();
        // const clientX = e.clientX;
        // if (clientX > bounds.right) {
        //   console.log("mark clicked", e.target);
        // }
        // });

        contents.window.getSelection().removeAllRanges();
      });

      this.rendition.themes.default({
        '::selection': {
          background: 'rgba(255,255,0, 0.3)',
        },
        '.epubjs-hl': {
          fill: 'yellow',
          'fill-opacity': '0.3',
          'mix-blend-mode': 'multiply',
          cursor: 'pointer',
          'pointer-events': 'auto',
        },
      });

      // Illustration of how to get text from a saved cfiRange
      const highlights = document.getElementById('highlights');

      // this.rendition.on("selected", function (cfiRange) {

      // });
    },
    /**
     * 設置電子書樣式
     */
    setBookStyle() {
      if (!this.book) {
        return;
      }
      this.book.setStyle('font-size', options.fontSize + 'px');
      this.book.setStyle('background-color', options.bgColor);
      this.book.setStyle('font-family', options.fontFamily);
      this.book.setStyle('line-height', 3);
      this.book.renderer.forceSingle(false);
      this.book.setStyle('color', themes[options.theme].color);
      this.book.setStyle('background-color', themes[options.theme].bgColor);
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
      const { id: noteId } = QiuPen.highlighter.highlightSelection(highlightName)[0];
      QiuPen.save(this.book, this.bookId, this.selectedText, this.locationCfi, highlight.color, noteId);
      this.loadNote();
      this.$refs.notePoptip.style.display = 'none';
    },
    /**
     * 刪除筆記標記事件
     */
    deleteMarkHandler() {
      const unhighlightSelection = QiuPen.highlighter.unhighlightSelection()[0];
      const { id: noteId } = unhighlightSelection;
      QiuPen.deleteNote({ bookKey: bookId, noteId, book: this.book });
      this.loadNote();
      this.$refs.notePoptip.style.display = 'none';
    },
  },
};
</script>

<style type="text/css">
::selection {
  background: yellow;
}

#extras {
  width: 600px;
  margin: 40px auto;
}

#highlights {
  list-style: none;
  margin-left: 0;
  padding: 0;
}

#highlights li {
  list-style: none;
  margin-bottom: 20px;
  border-top: 1px solid #e2e2e2;
  padding: 10px;
}

#highlights a {
  display: block;
}

#viewer.spreads {
  top: 0;
  margin-top: 50px;
}

[ref='epubjs-mk'] {
  background: url('data:image/svg+xml;base64,PHN2ZyB2ZXJzaW9uPScxLjEnIHhtbG5zPSdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZycgeG1sbnM6eGxpbms9J2h0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsnIHg9JzBweCcgeT0nMHB4JyB2aWV3Qm94PScwIDAgNzUgNzUnPjxnIGZpbGw9JyNCREJEQkQnIGlkPSdidWJibGUnPjxwYXRoIGNsYXNzPSdzdDAnIGQ9J00zNy41LDkuNEMxOS42LDkuNCw1LDIwLjUsNSwzNC4zYzAsNS45LDIuNywxMS4zLDcuMSwxNS42TDkuNiw2NS42bDE5LTcuM2MyLjgsMC42LDUuOCwwLjksOC45LDAuOSBDNTUuNSw1OS4yLDcwLDQ4LjEsNzAsMzQuM0M3MCwyMC41LDU1LjQsOS40LDM3LjUsOS40eicvPjwvZz48L3N2Zz4=')
    no-repeat;
  width: 20px;
  height: 20px;
  cursor: pointer;
  margin-left: 0;
}

[ref='epubjs-hl'] {
  cursor: pointer;
}
</style>

<style scoped>
.arrow {
  position: fixed;
  top: 50%;
  width: 50px;
  height: 50px;
  font-size: 1.5rem;
  transform: translateY(-50%);
  cursor: pointer;
}
.prev {
  left: 0;
}
.next {
  right: 0;
}
.select-menu {
  position: absolute;
  display: none;
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
</style>
