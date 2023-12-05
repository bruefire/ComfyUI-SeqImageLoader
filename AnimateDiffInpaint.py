import os
import torch
import numpy as np
from PIL import Image, ImageOps


class LoadImagesFromDirInpaint:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "images_id": ("STRING", {"frames_upload": True}),
            },
            "optional": {
                "image_load_cap": ("INT", {"default": 0, "min": 0, "step": 1}),
                "start_index": ("INT", {"default": 0, "min": 0, "step": 1}),
            }
        }
    
    RETURN_TYPES = ("IMAGE", "IMAGE", "INT")
    RETURN_NAMES  = ("images", "mask_images", "image_count",)
    FUNCTION = "load_images"

    CATEGORY = "image"


    def load_images(self, images_id: str, image_load_cap: int = 0, start_index: int = 0):
        comfy_custom_dir = os.path.dirname(os.path.abspath(__file__))
        comfy_root_dir = os.path.join(comfy_custom_dir, "..", "..")

        pathParts = images_id.split(":")
        vframeId = pathParts[0]
        filenames = pathParts[1:]
        imageDir = os.path.join(comfy_root_dir, "input", "extVideoFrame" + vframeId)
        maskDir = os.path.join(comfy_root_dir, "input", "extVideoFrame-mask" + vframeId)
        
        images = self.load_from_dir(imageDir, image_load_cap, start_index)
        masks = self.load_from_dir(maskDir, image_load_cap, start_index)

        print(len(masks))
        return (torch.cat(images, dim=0), torch.cat(masks, dim=0), len(images))


    def load_from_dir(self, imageDir, image_load_cap, start_index):
        # confirm paths
        if not os.path.isdir(imageDir):
            raise FileNotFoundError(f"Directory '{imageDir} cannot be found.'")
        img_files = os.listdir(imageDir)
        if len(img_files) == 0:
            raise FileNotFoundError(f"No files in directory '{imageDir}'.")

        # start at start_index
        img_files = sorted(img_files)
        img_files = [os.path.join(imageDir, x) for x in img_files]
        img_files = img_files[start_index:]

        images = []

        limit_images = False
        if image_load_cap > 0:
            limit_images = True
        image_count = 0

        for image_path in img_files:
            if os.path.isdir(image_path):
                continue
            if limit_images and image_count >= image_load_cap:
                break
            i = Image.open(image_path)
            i = ImageOps.exif_transpose(i)
            image = i.convert("RGB")
            image = np.array(image).astype(np.float32) / 255.0
            image = torch.from_numpy(image)[None,]

            images.append(image)
            image_count += 1
        
        if len(images) == 0:
            raise FileNotFoundError(f"No images could be loaded from directory '{imageDir}'.")
        
        return images
