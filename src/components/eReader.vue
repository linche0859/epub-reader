<template>
  <div>
    <div id="viewer" class="scrolled" style="height: 100vh" />
    <button id="prev" class="arrow prev" @click="clickPreviousPageHandler">
      ‹
    </button>
    <button id="next" class="arrow next" @click="clickNextPageHandler">
      ›
    </button>

    <div id="area"></div>

    <!-- <div id="select-menu" ref="notePoptip" class="select-menu">
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
    </div> -->
  </div>
</template>
<script>
import generateEpub from "epub-gen-memory";
import QiuPen from "../../util/highlight";
import storage from "../../util/storage";
import ePub from "epubjs";

export default {
  data() {
    return {
      book: null,
      rendition: null,
    };
  },
  async mounted() {
    const options = {
      title: "Alice's Adventures in Wonderland", // *Required, title of the book.
      author: "Lewis Carroll", // *Required, name of the author.
      publisher: "Macmillan & Co.", // optional
      cover: "logo.png", // Url or File path, both ok.
    };

    let content = [];

    for (let i = 1; i < 100; i++) {
      content.push({ title: `第 ${i} 章`, content: "AWEFAWEFAwefawefawef" });
    }

    let epubContent = await generateEpub(options, content);

    this.book = new ePub(epubContent);
    this.rendition = this.book.renderTo("area", {
      width: "100%",
      height: "100%",
      spreads: "always",
    });
    this.rendition.display();

    this.book.ready.then(() => {
      console.log("book.ready");
      QiuPen.init();
    });

    this.initBookEvent();
  },
  methods: {
    /**
     * 初始化電子書的事件
     */
    initBookEvent() {
      // 監聽章節的渲染
      // 切換章節後也會觸發
      this.book.on("renderer:chapterDisplayed", () => {
        // 创建动态脚本
        const createScript = url => {
          var script = document.createElement("script");
          script.type = "text/javascript";
          script.src = url;
          return script;
        };

        // 创建动态样式表
        const createLink = url => {
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

        const isFloat = n => {
          return Number(n) === n && n % 1 !== 0;
        };

        // 鍵盤控制上、下頁事件
        iframe.contentDocument.addEventListener("keydown", e => {
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
        iframe.contentDocument.addEventListener("wheel", e => {
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
      this.rendition.on("rendered", section => {
        console.log("section:", section);
      });

      // 切換頁事件
      this.rendition.on("relocated", location => {
        console.log("location:", location);
      });

      this.book.on("renderer:locationChanged", location => {
        this.locationCfi = location;
      });

      // 選取文字事件
      this.book.on("renderer:mouseup", event => {
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
    clickPreviousPageHandler() {
      this.rendition.prev();
    },
    clickNextPageHandler() {
      this.rendition.next();
    },
  },
};
</script>
<style scoped>
#area {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.arrow {
  position: fixed;
  top: 50%;
  width: 50px;
  height: 50px;
  font-size: 1.5rem;
  transform: translateY(-50%);
  cursor: pointer;
  z-index: 100;
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
