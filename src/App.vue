<template>
  <div id="app">
    <!-- <e-reader></e-reader> -->
    <ReaderEpub />
  </div>
</template>

<script>
import eReader from "./components/eReader.vue";
import ReaderEpub from "./components/ReaderEpub.vue";

export default {
  name: "App",
  components: {
    // eReader,
    ReaderEpub,
  },
};
</script>

<style>
/* #app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
} */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
</style>
