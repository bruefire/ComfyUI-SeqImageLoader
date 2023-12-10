import os
import sys
import torch
import numpy as np
from PIL import Image, ImageOps


class LoadImagesFromDirInpaint:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "sequence_id": ("STRING", {"frames_upload": True}),
            },
            "optional": {
                "start_index": ("INT", {"default": 0, "min": 0, "step": 1}),
                "end_index": ("INT", {"default": 0, "min": 0, "step": 1}),
            }
        }
    
    RETURN_TYPES = ("IMAGE", "IMAGE", "INT")
    RETURN_NAMES  = ("images", "mask_images", "image_count",)
    FUNCTION = "load_images"

    CATEGORY = "image"


    def load_images(self, sequence_id: str, start_index: int = 0, end_index: int = 0):
        if start_index != 0:
            start_index -= 1
        if end_index == 0:
            end_index = sys.maxsize

        comfy_custom_dir = os.path.dirname(os.path.abspath(__file__))
        comfy_root_dir = os.path.join(comfy_custom_dir, "..", "..")

        pathParts = sequence_id.split(":")
        vframeIds = pathParts[len(pathParts) - 1].split("/")
        filenames = pathParts[:-1]

        images = []
        masks = []
        if len(vframeIds) == 1:
            imageDir = os.path.join(comfy_root_dir, "input", "extVideoFrame" + vframeIds[0])

            images = self.load_from_dir(imageDir, end_index, start_index)
            masks = [image.clone() for image in images]
            for mask in masks:
                mask.fill_(0)
        else:
            imageDir = os.path.join(comfy_root_dir, "input", "extVideoFrame" + vframeIds[0])
            maskDir = os.path.join(comfy_root_dir, "input", "extVideoFrame" + vframeIds[1])
            sketchDir = os.path.join(comfy_root_dir, "input", "extVideoFrame" + vframeIds[2])

            images = self.load_from_dir_sketch(imageDir, sketchDir, end_index, start_index)
            masks = self.load_from_dir(maskDir, end_index, start_index)
        

        return (torch.cat(images, dim=0), torch.cat(masks, dim=0), len(images))


    def load_from_dir(self, imageDir, end_index, start_index):

        img_files = self.getImagePaths(imageDir)
        img_files = img_files[start_index:end_index]

        images = []
        image_count = 0

        for image_path in img_files:
            if os.path.isdir(image_path):
                continue
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
    

    def load_from_dir_sketch(self, imageDir, sketchDir, end_index, start_index):

        img_files = self.getImagePaths(imageDir)
        img_files = img_files[start_index:end_index]
        skt_files = self.getImagePaths(sketchDir)
        skt_files = skt_files[start_index:end_index]

        images = []
        image_count = 0

        for idx, image_path in enumerate(img_files):
            if os.path.isdir(image_path):
                continue
            i = Image.open(image_path)
            i = ImageOps.exif_transpose(i).convert("RGBA")
            s = Image.open(skt_files[idx])
            s = ImageOps.exif_transpose(s).convert("RGBA")
            s = s.resize(i.size)
            image = Image.alpha_composite(i, s)
            image.convert("RGB")
            image = np.array(image).astype(np.float32) / 255.0
            image = torch.from_numpy(image)[None,]

            images.append(image)
            image_count += 1
        
        if len(images) == 0:
            raise FileNotFoundError(f"No images could be loaded from directory '{imageDir}'.")
        
        return images
    

    def getImagePaths(self, imageDir):
        # confirm paths
        if not os.path.isdir(imageDir):
            raise FileNotFoundError(f"Directory '{imageDir} cannot be found.'")
        img_files = os.listdir(imageDir)
        if len(img_files) == 0:
            raise FileNotFoundError(f"No files in directory '{imageDir}'.")

        # start at start_index
        img_files = sorted(img_files)
        img_files = [os.path.join(imageDir, x) for x in img_files]

        return img_files

