
import { app } from "../../../scripts/app.js";
import { ComfyApp } from "../../../scripts/app.js";
import { api } from "../../../scripts/api.js";
import MaskEditorForVframes from "./MaskEditorForVframes.js";
import getVideoFrames from "./getVideoFrames_js/mod.js" 

let sequentialimageloader_getExtraMenuOptionsOverrided = [];


    
function showImage(name, node) {
    const img = new Image();
    img.onload = () => {
        node.extVframes = [img];
        app.graph.setDirtyCanvas(true);
    };
    let folder_separator = name.lastIndexOf("/");
    let subfolder = "";
    if (folder_separator > -1) {
        subfolder = name.substring(0, folder_separator);
        name = name.substring(folder_separator + 1);
    }
    img.src = api.apiURL(`/view?filename=${encodeURIComponent(name)}&type=input&subfolder=${subfolder}${app.getPreviewFormatParam()}`);
    node.setSizeForImage?.();
}

async function uploadFile(file, updateNode, vframeId, node) {
    if (!file.type.startsWith("image/")) 
        return; 

    try {
        // Wrap file in formdata so it includes filename
        const body = new FormData();
        body.append("image", file, file.name);
        body.append("subfolder", "extVideoFrame" + String(vframeId));
        const resp = await api.fetchApi("/upload/image", {
            method: "POST",
            body,
        });

        if (resp.status === 200) {
            const data = await resp.json();
            // update the widget value
            let path = data.name;
            if (data.subfolder) path = data.subfolder + "/" + path;

            if (updateNode) {
                showImage(path, node);
            }
        } else {
            alert(resp.status + " - " + resp.statusText);
        }
    } catch (error) {
        alert(error);
    }
}

async function uplaodSequentialDataCore(node, inputName, inputData, app, fileInput) {
    const idWidget = node.widgets.find((w) => w.name === "sequence_id");

    // Add our own callback to the combo widget to render an image when it changes
    idWidget.callback = function () {
        // let imageData = idWidget.value.split(":");
        // let dirIds = imageData[imageData.length - 1].split("/");
        // showImage("extVideoFrame" + dirIds[0] + "/" + imageData[0]);
    };
    
    // On load if we have a value then render the image
    requestAnimationFrame(() => {
        if (idWidget.value) {
            let imageData = idWidget.value.split(":");
            let dirIds = imageData[imageData.length - 1].split("/");
            showImage("extVideoFrame" + dirIds[0] + "/" + imageData[0], node);
        }
    });
    
    document.body.append(fileInput);

    // Create the button widget for selecting the files
    let uploadWidget = node.addWidget("button", fileInput['data-disp-msg'], "image", () => {
        fileInput.click();
    });
    uploadWidget.serialize = false;

    // Add handler to check if an image is being dragged over our node
    node.onDragOver = function (e) {
        if (e.dataTransfer && e.dataTransfer.items) {
            const image = [...e.dataTransfer.items].find((f) => f.kind === "file");
            return !!image;
        }

        return false;
    };

    // On drop upload files
    node.onDragDrop = function (e) {
        // console.log("onDragDrop called");
        // let handled = false;
        // for (const file of e.dataTransfer.files) {
        //     if (file.type.startsWith("image/")) {
        //         uploadFile(file, !handled); // Dont await these, any order is fine, only update on first one
        //         handled = true;
        //     }
        // }

        return handled;
    };

    return { widget: uploadWidget };
}


app.registerExtension({  

    name: "ComfyUI.sequentialimageloader.inpaint",
    
    async init(app)
    {   
		ComfyApp.ext_open_maskeditor_for_vframes =
        function (idWidget) {
            
            const dlg = MaskEditorForVframes.getInstance();
            dlg.path_data = idWidget.value;
            dlg.updatePathDataHnadler = (maskDirId, sketchDirId) => {
                let imageData = idWidget.value.split(":");
                let dirIdStr = imageData.pop();
                let dirIds = dirIdStr.split("/");

                dirIds = [dirIds[0], maskDirId, sketchDirId];
                dirIdStr = dirIds.join("/");
                imageData.push(dirIdStr);

                idWidget.value = imageData.join(":");
            };
            if(!dlg.isOpened()) {
                dlg.show();
            }
        };
    },
    async setup() 
    {   
    },
    async beforeRegisterNodeDef(nodeType, nodeData, app)
    {
        if (nodeData.name !== "VFrame Loader With Mask Editor" 
        && nodeData.name !== "Video Loader With Mask Editor") 
            return;

        if (!sequentialimageloader_getExtraMenuOptionsOverrided.includes(nodeData.name)) {
            // menu initializing
            const originalProto = nodeType.prototype.getExtraMenuOptions;
            nodeType.prototype.getExtraMenuOptions = function (_, options){
                // do original processing
                originalProto.bind(this)(_, options); 
    
                // add mask menu
                if (this.extVframes) {
                    options.push({
                            content: "Open in MaskEditor",
                            callback: (obj) => {
                                // ComfyApp.copyToClipspace(this);
                                // ComfyApp.clipspace_return_node = this;
                                
                                ComfyApp.ext_open_maskeditor_for_vframes(this.widgets[0]);
                            }
                        });
                }
            }
            sequentialimageloader_getExtraMenuOptionsOverrided.push(nodeData.name);
        }

        // head image drawing
		nodeType.prototype.onDrawBackground = function (ctx) {
            
            // Draw individual
            if (this.extVframes) {

                function getImageTop(node) {
                    let shiftY;
                    if (node.imageOffset != null) {
                        shiftY = node.imageOffset;
                    } else {
                        if (node.widgets?.length) {
                            const w = node.widgets[node.widgets.length - 1];
                            shiftY = w.last_y;
                            if (w.computeSize) {
                                shiftY += w.computeSize()[1] + 4;
                            }
                            else if(w.computedHeight) {
                                shiftY += w.computedHeight;
                            }
                            else {
                                shiftY += LiteGraph.NODE_WIDGET_HEIGHT + 4;
                            }
                        } else {
                            shiftY = node.computeSize()[1];
                        }
                    }
                    return shiftY;
                }
    
                const shiftY = getImageTop(this);
                let dw = this.size[0];
                let dh = this.size[1] - shiftY;
                let w = this.extVframes[0].naturalWidth;
                let h = this.extVframes[0].naturalHeight;
    
                const scaleX = dw / w;
                const scaleY = dh / h;
                const scale = Math.min(scaleX, scaleY, 1);
    
                w *= scale;
                h *= scale;
    
                let x = (dw - w) / 2;
                let y = (dh - h) / 2 + shiftY;
                ctx.drawImage(this.extVframes[0], x, y, w, h);
            }
        }
        
        // widget setting
        // Adds an upload button to the nodes
		if (nodeData?.input?.required?.sequence_id?.[1]?.frames_upload === true) {
			nodeData.input.required.upload = ["VFRAMESUPLOAD"];
		}
        else if (nodeData?.input?.required?.sequence_id?.[1]?.video_upload === true) {
			nodeData.input.required.upload = ["VIDEOUPLOAD"];
        }
    },
    async getCustomWidgets()
    {
        return {
            VFRAMESUPLOAD(node, inputName, inputData, app) {
                const idWidget = node.widgets.find((w) => w.name === "sequence_id");

                const fileInput = document.createElement("input");
                Object.assign(fileInput, {
                    type: "file",
                    style: "display: none",
                    webkitdirectory: true,
                    'data-disp-msg': "choose image directory to upload",
                    onchange: async () => {
                        if (fileInput.files.length) {
                            const vframeId = Date.now();
                            let vframeData = "";
            
                            for (let i = 0; i < fileInput.files.length; i++) {
                                vframeData += fileInput.files[i].name + ":";
                                await uploadFile(
                                    fileInput.files[i], i === 0, vframeId, node);
                            }
                            vframeData += String(vframeId);
                            idWidget.value = vframeData;
                        }
                    },
                });

                return uplaodSequentialDataCore(node, inputName, inputData, app, fileInput);
            },
            VIDEOUPLOAD(node, inputName, inputData, app) {
                const idWidget = node.widgets.find((w) => w.name === "sequence_id");

                async function getFramesFromVideo(file) {
                    const imageType = 'image/png';
                    let frameCount = 0;
                    let tWidth, tHeight;
                    let videoUrl = URL.createObjectURL(file);
                    let fCanvases = [];
                
                    await getVideoFrames({
                      videoUrl,
                      async onFrame(vframe) {  // `frame` is a VideoFrame object
                        let fCanvas = document.createElement('canvas');
                        fCanvas.width = tWidth;
                        fCanvas.height = tHeight;
                        
                        fCanvas.getContext('2d').drawImage(vframe, 0, 0, fCanvas.width, fCanvas.height);
                        vframe.close();
                        fCanvases.push(fCanvas);
                      },
                      onConfig(config) {
                        tWidth = config.codedWidth;
                        tHeight = config.codedHeight;
                      },
                      onFinish() {
                      },
                    });

                    let frames = await Promise.all(
                        fCanvases.map(fCanvas => 
                            new Promise((resolve, reject) => {
                                const fid = frameCount++;
                                fCanvas.toBlob(blob => {
                                    if (blob) {
                                        blob.name = ("00000000" + fid).slice(-8) + ".png";
                                        resolve(blob);
                                    } else {
                                        reject(new Error('blob creating failed'));
                                    }
                                }, imageType);
                            })));
                
                    URL.revokeObjectURL(videoUrl); // revoke URL to prevent memory leak
                    console.log("Frame extraction completed with " + frameCount + " frames");

                    return frames;
                }
                
                const fileInput = document.createElement("input");
                Object.assign(fileInput, {
                    type: "file",
                    style: "display: none",
                    accept: "video/*",
                    'data-disp-msg': "choose mp4 to upload",
                    onchange: async () => {
                        if (fileInput.files.length) {
                            const file = fileInput.files[0];
                            const frames = await getFramesFromVideo(file);

                            const vframeId = Date.now();
                            let vframeData = "";
            
                            for (let i = 0; i < frames.length; i++) {
                                vframeData += frames[i].name + ":";
                                await uploadFile(frames[i], i === 0, vframeId, node);
                            }
                            vframeData += String(vframeId);
                            idWidget.value = vframeData;
                        }
                    },
                });

                return uplaodSequentialDataCore(node, inputName, inputData, app, fileInput);
            }
        }
    }
})