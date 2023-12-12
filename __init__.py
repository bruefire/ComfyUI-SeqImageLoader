import os, shutil
import folder_paths
from .SequentialImageLoader import LoadImagesFromDirInpaint
from .SequentialImageLoader import LoadImagesFromFileInpaint


NODE_CLASS_MAPPINGS = { 
    "VFrame Loader With Mask Editor" : LoadImagesFromDirInpaint,
    "Video Loader With Mask Editor" : LoadImagesFromFileInpaint 
}
NODE_DISPLAY_NAME_MAPPINGS = { 
    "VFrame Loader With Mask Editor" : "SequentialImageLoader",
    "Video Loader With Mask Editor" : "VideoFrameExtractor",
}
__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS']


module_js_directory = os.path.join(os.path.dirname(os.path.realpath(__file__)), "js")
application_root_directory = os.path.dirname(folder_paths.__file__)
application_web_extensions_directory = os.path.join(application_root_directory, "web", "extensions", "SequentialImageLoader")

if os.path.exists(application_web_extensions_directory):
    shutil.rmtree(application_web_extensions_directory)
shutil.copytree(module_js_directory, application_web_extensions_directory, dirs_exist_ok=True)
