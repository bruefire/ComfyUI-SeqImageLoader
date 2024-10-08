# ComfyUI Sequential Image Loader

## Overview
This is an extension node for ComfyUI that allows you to load frames from a video in bulk and perform masking and sketching on each frame through a GUI.

## Install
Add this repository to the custom_nodes/ directory.

## Usage

### About "SequentialImageLoader" Node
This is in the Image category.

#### input
* sequence_id: Please ignore (used for internal processing only).
* upload button: Specify the directory containing frames from the video using the dialog.
(Use ffmpeg or similar to extract frames from the video.)
* start_index: Specify the start frame number. 0 to disable.
* end_index: Specify the end frame number. 0 to disable.
#### output
* images: Loaded frame data. If sketching is applied, it will be reflected in this output.
* mask_images: Masks for each frame are output as images. You may need to convert them to mask data using a Mask To Image node, for example.
* image_count: Number of processed frames.

### About "VideoFrameExtractor" Node
Instead of specifying a directory containing frames, you specify a video file. Currently, only mp4 format is supported. 
Otherwise, it is the same as the SequentialImageLoader Node.  
(I used [getVideoFrames.js](https://github.com/josephrocca/getVideoFrames.js) for extracting frames from MP4)

### About the Mask Editor
1. After loading the frames, right-click the node and select "Open In MaskEditor".
2. In the editor that appears, perform masking and sketching as needed. It is based on the standard Mask Editor.
	
### Editor Features
![image](docs/editor_features.png)
1. Switch between automatic masking (magic wand) and manual masking.
2. Switch between masking and sketching.
3. Canvas. Right-click to mask, left-click to unmask.
4. Change edit frame.
5. Clear mask on the current frame.
6. Paste the mask from the previous frame to the current frame.
7. Change the thickness of the masking.
8. Undo/Redo operations. Shortcut keys are alt+Z/shift+alt+Z. ( **not Ctrl+Z!** That's the standard shortcuts for ComfyUI. It might cause unexpected behavior.)
9. Save or cancel the results.
	
## Example With AnimateDiff
![iamge](docs/dogcat.gif)

[Workflow](sample_workflows/cat2dog_with_animatediff.json) (It's depend on [ComfyUI-AnimateDiff-Evolved](https://github.com/Kosinkadink/ComfyUI-AnimateDiff-Evolved))  
[Video source](https://www.pexels.com/video/a-pet-cat-standing-on-the-brick-floor-of-a-garden-3009091/)  

## Other
Temporary frame data accumulates in the input/ directory, so please delete data that is no longer needed at an appropriate time.
