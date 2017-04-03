<template>
  <div>
    <toolbar></toolbar>
    <image-canvas></image-canvas>
  </div>
</template>

<script>
    import Toolbar from './Toolbar.vue';
    import ImageCanvas from './ImageCanvas.vue';

    export default {
        components: {
            Toolbar,
            ImageCanvas
        }
    }
</script>