<template>
  <div>
    <div id="viewer" class="scrolled" style="height: 100vh" />
    <button id="prev" class="arrow prev" @click="clickPreviousPageHandler">
      ‹
    </button>
    <button id="next" class="arrow next" @click="clickNextPageHandler">
      ›
    </button>
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
      <div class="divider" />
      <button id="remove-heightlight" class="menu-item">删除标记</button>
    </div>
  </div>
</template>

<script>
// import "../../static/epub.min.js";
import ePub from "epubjs";
import generateEpub from "epub-gen-memory";
import QiuPen from "../../util/highlight";
import storage from "../../util/storage";

const readLocalFile = (file) => {
  return new Promise((resolve) => {
    const rawFile = new XMLHttpRequest();
    rawFile.open("GET", file, false);
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

export default {
  data() {
    return {
      selected: false,
      bookId: 1,
      selectedText: "",
      locationCfi: "",
      notes: [],
      book: null,
      rendition: null,
      // bookTitle: null,
      // bookMeta: null,
      // bookToc: null,
      options: {
        bgColor: "#fff",
        fontSize: 16,
        fontFamily: "Microsoft Yahei, Heiti SC, Heiti TC",
        lineHeight: 2,
        theme: 0,
      },
      themes: [
        {
          id: "1",
          name: "白色",
          color: "#000",
          bgColor: "#fff",
        },
        {
          id: "2",
          name: "浅棕色",
          color: "#000",
          bgColor: "#f9f4e9",
        },
        {
          id: "3",
          name: "护眼",
          color: "#000",
          bgColor: "#ceeaba",
        },
        {
          id: "4",
          name: "夜间",
          color: "#fff",
          bgColor: "#000",
        },
      ],
      highlights: [
        {
          name: "red",
          color: "#FFBA84",
        },
        {
          name: "orange",
          color: "#E2943B",
        },
        {
          name: "yellow",
          color: "#F7C242",
        },
        {
          name: "green",
          color: "#86C166",
        },
        {
          name: "blue",
          color: "#33A6B8",
        },
        {
          name: "purple",
          color: "#8A6BBE",
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
        author: "Lewis Carroll", // *Required, name of the author.
        publisher: "Macmillan & Co.", // optional
        cover: "logo.png", // Url or File path, both ok.
      };

      const content = [
        {
          title: "Acknowledgment.xhtml",
          content: await readLocalFile(
            "/scrum/OEBPS/Text/Acknowledgment.xhtml"
          ),
        },
        {
          title: "Appendix.xhtml",
          content: await readLocalFile("/scrum/OEBPS/Text/Appendix.xhtml"),
        },
        {
          title: "Ch1.xhtml",
          content: await readLocalFile("/scrum/OEBPS/Text/Ch1.xhtml"),
        },
        {
          title: "Ch2.xhtml",
          content: await readLocalFile("/scrum/OEBPS/Text/Ch2.xhtml"),
        },
        {
          title: "Ch3.xhtml",
          content: await readLocalFile("/scrum/OEBPS/Text/Ch3.xhtml"),
        },
      ];
      console.log(content);
      const epubContent = await generateEpub(options, content);

      this.book = ePub(epubContent);
      // this.book = ePub(
      //   "https://s3.amazonaws.com/epubjs/books/moby-dick/OPS/package.opf"
      // );

      this.rendition = this.book.renderTo("viewer", { height: "100%" });
      // this.rendition.display();

      // 前往某一個章節
      // this.rendition.display("epubcfi(/6/8[Ch2.xhtml]!/4/2/2/1:0)");
      this.rendition.display("epubcfi(/6/8!/4/110/1:193)");

      this.book.ready.then(() => {
        console.log("book.ready");
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
      this.book.on("renderer:chapterDisplayed", () => {
        // 创建动态脚本
        const createScript = (url) => {
          var script = document.createElement("script");
          script.type = "text/javascript";
          script.src = url;
          return script;
        };

        // 创建动态样式表
        const createLink = (url) => {
          var link = document.createElement("link");
          link.rel = "stylesheet";
          link.type = "text/css";
          link.href = url;
          return link;
        };
        const link = createLink("/static/common.css");
        const script = createScript("/static/selection.js");
        const iframe = document.getElementsByTagName("iframe")[0];
        iframe.contentDocument.head.appendChild(link);
        iframe.contentDocument.body.appendChild(script);

        const isFloat = (n) => {
          return Number(n) === n && n % 1 !== 0;
        };

        // 鍵盤控制上、下頁事件
        iframe.contentDocument.addEventListener("keydown", (e) => {
          switch (e.keyCode) {
            case 37: // left
            case 38: // up
              this.rendition.prev();
              break;
            case 39: // right
            case 40: // down
              this.rendition.next();
              break;
          }
        });

        // 滑鼠滾輪控制上、下頁事件
        // 還有些問題，需再查看
        iframe.contentDocument.addEventListener("wheel", (e) => {
          // console.log(e);
          if (wheelTimer) clearTimeout(wheelTimer);
          wheelTimer = setTimeout(() => {
            e.preventDefault();
            if (isFloat(e.deltaY)) return;
            if (e.deltaY < 0) {
              this.rendition.prev();
            } else {
              this.rendition.next();
            }
          }, 300);
        });

        QiuPen.create(iframe.contentWindow.document);
        QiuPen.load(this.book, this.bookId);
      });

      this.book.on("book:pageChanged", function (location) {
        console.log(
          "book:pageChanged",
          location.anchorPage,
          location.pageRange
        );
      });

      // 切換章節事件
      this.rendition.on("rendered", (section) => {
        console.log("section:", section);
      });

      // 切換頁事件
      this.rendition.on("relocated", (location) => {
        console.log("location:", location);
      });

      this.book.on("renderer:locationChanged", (location) => {
        this.locationCfi = location;
      });

      // 選取文字事件
      this.book.on("renderer:mouseup", (event) => {
        // 释放后检测用户选中的文字
        var render = this.book.renderer.render;
        var selectedContent = render.window.getSelection();
        const selection = selectedContent;
        console.log("selection", selection);
        console.log(
          "selection.anchorNode.data.substring：",
          selection.anchorNode.data.substring(
            selection.baseOffset,
            selection.extentOffset
          )
        );
        this.selectedText = selection.anchorNode.data.substring(
          selection.baseOffset,
          selection.extentOffset
        );
        console.log("selectedText", selectedText);
        // 若当前用户不在选中状态，并且选中文字不为空
        if (this.selected === false) {
          console.log("啦啦1");
          if (selectedContent.toString() && selectedContent.toString() !== "") {
            console.log("啦啦2");
            this.selected = true;
          }
        }
      });
    },
    /**
     * 設置電子書樣式
     */
    setBookStyle() {
      if (!this.book) {
        return;
      }
      this.book.setStyle("font-size", options.fontSize + "px");
      this.book.setStyle("background-color", options.bgColor);
      this.book.setStyle("font-family", options.fontFamily);
      this.book.setStyle("line-height", 3);
      this.book.renderer.forceSingle(false);
      this.book.setStyle("color", themes[options.theme].color);
      this.book.setStyle("background-color", themes[options.theme].bgColor);
    },
    /**
     * 載入筆記
     */
    loadNote() {
      const store = storage.get("highlight", {});
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
      const { id: noteId } =
        QiuPen.highlighter.highlightSelection(highlightName)[0];
      QiuPen.save(
        this.book,
        this.bookId,
        this.selectedText,
        this.locationCfi,
        highlight.color,
        noteId
      );
      this.loadNote();
      this.$refs.notePoptip.style.display = "none";
    },
    /**
     * 刪除筆記標記事件
     */
    deleteMarkHandler() {
      const unhighlightSelection = QiuPen.highlighter.unhighlightSelection()[0];
      const { id: noteId } = unhighlightSelection;
      QiuPen.deleteNote({ bookKey: bookId, noteId, book: this.book });
      this.loadNote();
      this.$refs.notePoptip.style.display = "none";
    },
  },
};
</script>

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