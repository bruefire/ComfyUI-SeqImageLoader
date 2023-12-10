# ComfyUI Sequential Image Loader

## Overview
This is an extension node for ComfyUI that allows you to load frames from a video in bulk and perform masking and sketching on each frame through a GUI.

## Install
Add this repository to the custom_nodes/ directory.

## Usage

### About "SequentialImageLoader" Node

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

### About the Mask Editor
1. After loading the frames, right-click the node and select "Open In MaskEditor".
2. In the editor that appears, perform masking and sketching as needed. It is based on the standard Mask Editor.
	
## Example With AnimateDiff
![iamge](docs/dogcat.gif)

## Other
Temporary frame data accumulates in the input/ directory, so please delete data that is no longer needed at an appropriate time.