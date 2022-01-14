<template>
  <div id="area"></div>
</template>
<script>
import generateEpub from "epub-gen-memory";
import ePub from "epubjs";

export default {
  async mounted() {
    const options = {
      title: "Alice's Adventures in Wonderland", // *Required, title of the book.
      author: "Lewis Carroll", // *Required, name of the author.
      publisher: "Macmillan & Co.", // optional
      cover: "logo.png", // Url or File path, both ok.
    };

    let content = [];

    content.push({ title: "new chapter", content: "new content" });
    content.push({ title: "new chapter", content: "new content" });

    let epubContent = await generateEpub(options, content);

    let book = new ePub(epubContent);
    let rendition = book.renderTo("area", {
      width: 800,
      height: 600,
      spreads: "always",
    });
    await rendition.display();

    // 重新抓資料後更新電子書
    rendition.destroy();
    content.push({ title: "new chapter", content: "new content" });
    epubContent = await generateEpub(options, content);
    book = new ePub(epubContent);
    rendition = book.renderTo("area", {
      width: 800,
      height: 600,
      spreads: "always",
    });
    rendition.display();
  },
};
</script>
