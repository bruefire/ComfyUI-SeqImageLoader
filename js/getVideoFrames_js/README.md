Simple JavaScript library to performantly and reliably break a video down into its individual frames using the new WebCodecs API.

 * Currently only supports mp4 files.
 * Check browser support: https://caniuse.com/webcodecs
 * All credit for this code goes to authors of [official WebCodecs demos](https://w3c.github.io/webcodecs/samples/video-decode-display/) and of [mp4box.js](https://github.com/gpac/mp4box.js/).

### Usage
```html
<canvas id="canvasEl"></canvas>
<br>
<input type="file" accept="video/mp4" onchange="start(this.files[0])">
<script type="module">
  import getVideoFrames from "https://deno.land/x/get_video_frames@v0.0.10/mod.js"
  
  let frameCount = 0;

  window.start = async function(file) {
    let ctx = canvasEl.getContext("2d"); 

    // `getVideoFrames` requires a video URL as input.
    // If you have a file/blob instead of a videoUrl, turn it into a URL like this:
    let videoUrl = URL.createObjectURL(file);

    await getVideoFrames({
      videoUrl,
      onFrame(frame) {  // `frame` is a VideoFrame object: https://developer.mozilla.org/en-US/docs/Web/API/VideoFrame
        ctx.drawImage(frame, 0, 0, canvasEl.width, canvasEl.height);
        frame.close();
        frameCount++;
      },
      onConfig(config) {
        canvasEl.width = config.codedWidth;
        canvasEl.height = config.codedHeight;
      },
      onFinish() {
        console.log("finished!");
        console.log("frameCount", frameCount);
      },
    });

    URL.revokeObjectURL(file); // revoke URL to prevent memory leak
  }
</script> 
```

 * Simple demo: https://jsbin.com/gehaqureca/edit?html,output
 * Decode mp4 and re-encode as webm: https://josephrocca.github.io/createWebMFromFrames.js/demo/
