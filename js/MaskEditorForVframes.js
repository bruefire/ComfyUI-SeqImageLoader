import { app } from "../../scripts/app.js";
import { ComfyDialog, $el } from "../../scripts/ui.js";
import { ComfyApp } from "../../scripts/app.js";
import { api } from "../../scripts/api.js"
import MagicWand from "./MagicWand.js";
//import { ClipspaceDialog } from "./clipspace.js";

// Helper function to convert a data URL to a Blob object
function dataURLToBlob(dataURL) {
	const parts = dataURL.split(';base64,');
	const contentType = parts[0].split(':')[1];
	const byteString = atob(parts[1]);
	const arrayBuffer = new ArrayBuffer(byteString.length);
	const uint8Array = new Uint8Array(arrayBuffer);
	for (let i = 0; i < byteString.length; i++) {
		uint8Array[i] = byteString.charCodeAt(i);
	}
	return new Blob([arrayBuffer], { type: contentType });
}


class MaskEditorDialog extends ComfyDialog {
	static instance = null;

	static getInstance() {
		if(!MaskEditorDialog.instance) {
			MaskEditorDialog.instance = new MaskEditorDialog(app);
		}

		return MaskEditorDialog.instance;
	}

	is_layout_created = false;

	set path_data(value) {
		const parts = value?.split(":");
		if (parts) {
			const oldId = this.#seqImgId;

			const dirIds = parts.pop();
			const ids = dirIds.split("/");
			this.#seqImgId = ids[0];
			this.#seqMskId = ids[1];
			this.#seqSkhId = ids[2];
			this.#paths = parts.map(file_name => {
				return {
					filename: file_name,
					subfolder: "extVideoFrame" + this.#seqImgId,
					type: "input"
				}
			});
			
			this.#selectedIndex = 0;
			if (this.#seqImgId != oldId) {
				this.backupMaskCanvases = null;
				this.backupSketchCanvases = null;
			}
		}
	}
	#paths = null;
	#seqImgId = -1;
	#seqMskId = null;
	#seqSkhId = null;

	#selectedIndex = 0;

	constructor() {
		super();
		this.element = $el("div", { parent: document.body }, 
			[ $el("div.comfy-modal-content", 
				[...this.createButtons()]),
			]);

		this.element.style.position = "fixed";
		this.element.style.padding = "30px 30px 10px 30px";
		this.element.style.backgroundColor = "#353535";
		this.element.style.boxShadow = "0 0 20px #888888";
		this.element.style.borderRadius = "10px";
		this.element.style.fontFamily = "monospace";
		this.element.style.fontSize = "15px";
		this.element.style.top = "5%";
		this.element.style.left = "100px";
	}

	createButtons() {
		return [];
	}

	createButton(name, callback) {
		var button = document.createElement("button");
		button.innerText = name;
		button.addEventListener("click", callback);
		return button;
	}

	createLeftButton(name, callback) {
		var button = this.createButton(name, callback);
		button.style.cssFloat = "left";
		button.style.marginRight = "4px";
		return button;
	}

	createRightButton(name, callback) {
		var button = this.createButton(name, callback);
		button.style.cssFloat = "right";
		button.style.marginLeft = "4px";
		return button;
	}

	createLeftColorPicker(self, callback) {
		var input = document.createElement('input');
		input.setAttribute('type', 'color');
		input.setAttribute('value', '#000');
		input.addEventListener("change", callback);
		return input;
	}

	createRightText(content, callback) {
		var text = document.createElement('div');
		text.style.display = "inline-block";
		text.style.top = "0";
		text.style.right = "0";
		text.style.fontFamily = "sans-serif";
		text.style.fontSize = "20px";
		text.style.color = "#fff";
		text.innerText = content;
		return text;
	}

	createLeftSlider(self, name, callback) {
		const divElement = document.createElement('div');
		divElement.id = "maskeditor-slider";
		divElement.style.cssFloat = "left";
		divElement.style.fontFamily = "sans-serif";
		divElement.style.marginRight = "4px";
		divElement.style.color = "var(--input-text)";
		divElement.style.backgroundColor = "var(--comfy-input-bg)";
		divElement.style.borderRadius = "8px";
		divElement.style.borderColor = "var(--border-color)";
		divElement.style.borderStyle = "solid";
		divElement.style.fontSize = "15px";
		divElement.style.height = "21px";
		divElement.style.padding = "1px 6px";
		divElement.style.display = "flex";
		divElement.style.position = "relative";
		divElement.style.top = "2px";
		self.brush_slider_input = document.createElement('input');
		self.brush_slider_input.setAttribute('type', 'range');
		self.brush_slider_input.setAttribute('min', '1');
		self.brush_slider_input.setAttribute('max', '100');
		self.brush_slider_input.setAttribute('value', '10');
		const labelElement = document.createElement("label");
		labelElement.textContent = name;

		divElement.appendChild(labelElement);
		divElement.appendChild(self.brush_slider_input);

		self.brush_slider_input.addEventListener("change", callback);

		return divElement;
	}

	createRightSlider(self, callbackCg, callbacKd) {
		const divElement = document.createElement('div');
		divElement.id = "maskeditor-frame-slider";
		divElement.style.cssFloat = "left";
		divElement.style.fontFamily = "sans-serif";
		divElement.style.marginRight = "4px";
		divElement.style.color = "var(--input-text)";
		divElement.style.backgroundColor = "var(--comfy-input-bg)";
		divElement.style.borderRadius = "8px";
		divElement.style.borderColor = "var(--border-color)";
		divElement.style.borderStyle = "solid";
		divElement.style.fontSize = "15px";
		divElement.style.height = "21px";
		divElement.style.padding = "1px 6px";
		divElement.style.display = "flex";
		divElement.style.position = "relative";
		divElement.style.top = "2px";

		self.frame_slider_input = document.createElement('input');
		self.frame_slider_input.setAttribute('type', 'range');
		self.frame_slider_input.addEventListener("change", callbackCg);
		self.frame_slider_input.addEventListener('keydown', callbacKd);
		
		divElement.appendChild(self.frame_slider_input);

		return divElement;
	}

	setlayout(imgCanvas, maskCanvas, sketchCanvas) {
		const self = this;

		// If it is specified as relative, using it only as a hidden placeholder for padding is recommended
		// to prevent anomalies where it exceeds a certain size and goes outside of the window.
		var placeholder = document.createElement("div");
		placeholder.style.position = "relative";
		placeholder.style.height = "50px";

		var top_panel = document.createElement("div");
		top_panel.style.position = "absolute";
		top_panel.style.top = "4px";
		top_panel.style.left = "20px";
		top_panel.style.right = "20px";
		top_panel.style.height = "50px";

		var top_right_sub_panel = document.createElement("div");
		top_right_sub_panel.style.position = "absolute";
		top_right_sub_panel.style.top = "0";
		top_right_sub_panel.style.right = "0";

		var bottom_panel = document.createElement("div");
		bottom_panel.style.position = "absolute";
		bottom_panel.style.bottom = "0px";
		bottom_panel.style.left = "20px";
		bottom_panel.style.right = "20px";
		bottom_panel.style.height = "50px";

		var brush = document.createElement("div");
		brush.id = "brush";
		brush.style.backgroundColor = "transparent";
		brush.style.outline = "1px dashed black";
		brush.style.boxShadow = "0 0 0 1px white";
		brush.style.borderRadius = "50%";
		brush.style.MozBorderRadius = "50%";
		brush.style.WebkitBorderRadius = "50%";
		brush.style.position = "absolute";
		brush.style.zIndex = 8889;
		brush.style.pointerEvents = "none";
		this.brush = brush;
		this.element.appendChild(imgCanvas);
		this.element.appendChild(sketchCanvas);
		this.element.appendChild(maskCanvas);
		this.element.appendChild(placeholder); // must below z-index than bottom_panel to avoid covering button
		this.element.appendChild(top_panel);
		this.element.appendChild(bottom_panel);
		top_panel.appendChild(top_right_sub_panel)
		document.body.appendChild(brush);
		

		var colorPicker = this.colorPicker = this.createLeftColorPicker("sketch",
			() => {
			});
		var modeButton = this.createLeftButton("sketch",
			(ev) => {
				this.beforeCanvases = [];
				this.afterCanvases = [];

				this.maskCtx.globalCompositeOperation = "source-over";
				if (!this.is_sketch) {
					ev.target.innerText = "inpaint";
					colorPicker.style.display = "inline";
					maskCanvas.style.opacity = "1.0";
					sketchCanvas.style.display = "none";

					this.storeActiveToBack();
					const bSketchCanvas = this.backSketchCanvases[this.#selectedIndex];
					this.maskCtx.clearRect(0, 0, this.maskCanvas.width, this.maskCanvas.height);
					this.maskCanvas.getContext('2d').drawImage(bSketchCanvas, 0, 0, bSketchCanvas.width, bSketchCanvas.height);
				} else {
					ev.target.innerText = "sketch";
					colorPicker.style.display = "none";
					maskCanvas.style.opacity = "0.66";
					sketchCanvas.style.display = "inline";
					
					this.storeActiveToBack();
					this.prepareSketchLayer();
					const bMaskCanvas = this.backMaskCanvases[this.#selectedIndex];
					this.maskCtx.clearRect(0, 0, this.maskCanvas.width, this.maskCanvas.height);
					this.maskCanvas.getContext('2d').drawImage(bMaskCanvas, 0, 0, bMaskCanvas.width, bMaskCanvas.height);
				}
				this.is_sketch = !this.is_sketch;
			});
		this.frameNumberText = this.createRightText("", () => {});
		
		this.frameNumberSlider = this.createRightSlider(self, 
		(event) => {
			self.moveTo(event.target.value - 1);
			self.updateFrameNumberUi(false);
		},
		(event) => {
			if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
				event.preventDefault();
			}
		});

		var brush_size_slider = this.createLeftSlider(self, "Thickness", (event) => {
			self.brush_size = event.target.value;
			self.updateBrushPreview(self, null, null);
		});
		var clearButton = this.createLeftButton("Clear",
			() => {
				self.maskCtx.clearRect(0, 0, self.maskCanvas.width, self.maskCanvas.height);
			});
		var ReuseButton = this.createLeftButton("Reuse Prev",
			() => {
				if (this.#selectedIndex > 0) {
					const prevBack = this.getBackCanvasForCurrentMode(this.#selectedIndex - 1);
					this.maskCanvas.getContext('2d').drawImage(prevBack, 0, 0, prevBack.width, prevBack.height);
				}
			});
		var UndoButton = this.createLeftButton("Undo",
			() => this.unstackBeforeCanvas());
		var RedoButton = this.createLeftButton("Redo",
			() => this.unstackAfterCanvas());

		var fillModeButton = this.createLeftButton("✨",
			(ev) => {
				this.changeFillMode(ev.target);
			});
		var prevButton = this.createLeftButton("<", () => this.moveToPrev());
		var nextButton = this.createLeftButton(">", () => this.moveToNext());
		var cancelButton = this.createRightButton("Cancel", () => {
			document.removeEventListener("mouseup", MaskEditorDialog.handleMouseUp);
			document.removeEventListener("keydown", MaskEditorDialog.handleKeyDown);
			
			self.close();
		});

		this.saveButton = this.createRightButton("Save", () => {
			document.removeEventListener("mouseup", MaskEditorDialog.handleMouseUp);
			document.removeEventListener("keydown", MaskEditorDialog.handleKeyDown);
				self.save();
			});

		this.element.appendChild(imgCanvas);
		this.element.appendChild(maskCanvas);
		this.element.appendChild(placeholder); // must below z-index than bottom_panel to avoid covering button
		this.element.appendChild(bottom_panel);

		top_panel.appendChild(fillModeButton);
		top_panel.appendChild(modeButton);
		top_panel.appendChild(colorPicker);
		top_right_sub_panel.appendChild(this.frameNumberText);
		top_right_sub_panel.appendChild(this.frameNumberSlider);
		top_right_sub_panel.appendChild(prevButton);
		top_right_sub_panel.appendChild(nextButton);
		bottom_panel.appendChild(clearButton);
		bottom_panel.appendChild(ReuseButton);
		bottom_panel.appendChild(this.saveButton);
		bottom_panel.appendChild(cancelButton);
		bottom_panel.appendChild(brush_size_slider);
		bottom_panel.appendChild(UndoButton);
		bottom_panel.appendChild(RedoButton);

		colorPicker.style.display = "none";

		imgCanvas.style.position = "relative";
		imgCanvas.style.top = "200";
		imgCanvas.style.left = "0";
		imgCanvas.style.zIndex = "-2";

		sketchCanvas.style.position = "absolute";
		sketchCanvas.style.zIndex = "-1";

		maskCanvas.style.position = "absolute";
		maskCanvas.style.opacity = "0.66";
		maskCanvas.style.zIndex = "0";
	}

	show() {
		const hasBackup = this.backupMaskCanvases != null;

		if(!this.is_layout_created) {
			// layout
			const imgCanvas = document.createElement('canvas');
			const maskCanvas = document.createElement('canvas');
			const sketchCanvas = document.createElement('canvas');
			const backMaskCanvases = [...new Array(this.#paths.length)].map(_ => document.createElement("canvas"));
			const backSketchCanvases = [...new Array(this.#paths.length)].map(_ => document.createElement("canvas"));

			imgCanvas.id = "imageCanvas";
			maskCanvas.id = "vMaskCanvas";
			sketchCanvas.id = "vSketchCanvas";

			this.setlayout(imgCanvas, maskCanvas, sketchCanvas);

			// prepare content
			this.imgCanvas = imgCanvas;
			this.maskCanvas = maskCanvas;
			this.sketchCanvas = sketchCanvas;
			this.backMaskCanvases = backMaskCanvases;
			this.backSketchCanvases = backSketchCanvases;
			this.beforeCanvases = [];
			this.afterCanvases = [];
			this.maskCtx = maskCanvas.getContext('2d');

			this.setMaskEventHandler(maskCanvas);

			this.is_layout_created = true;
			this.is_sketch = false;
			this.is_magicWand = false;

			// replacement of onClose hook since close is not real close
			const self = this;
			const observer = new MutationObserver(function(mutations) {
			mutations.forEach(function(mutation) {
					if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
						if(self.last_display_style && self.last_display_style != 'none' && self.element.style.display == 'none') {
							ComfyApp.onClipspaceEditorClosed();
						}

						self.last_display_style = self.element.style.display;
					}
				});
			});

			const config = { attributes: true };
			observer.observe(this.element, config);

			if (this.#seqMskId) {
				const maskPaths = this.#paths.map(data => {
					let data0 = Object.assign({}, data);
					data0.subfolder = "extVideoFrame" + String(this.#seqMskId);
					return data0;
				});
				const sketchPaths = this.#paths.map(data => {
					let data0 = Object.assign({}, data);
					data0.subfolder = "extVideoFrame" + String(this.#seqSkhId);
					return data0;
				});
				const loadPrev = (path, backCanvas, backupCanvas) => {
					const params = new URLSearchParams(path);
					const url = new URL(api.apiURL("/view?" + params.toString()), window.location.href);
					let img = new Image();
					img.src = url;
					img.onload = () => {
						[backCanvas, backupCanvas].forEach(cvs => {
							cvs.width = img.width;
							cvs.height = img.height;
							cvs.getContext('2d').drawImage(img, 0, 0, cvs.width, cvs.height);
						});
					};
				};
				this.backupMaskCanvases = [...new Array(this.#paths.length)].map(_ => document.createElement("canvas"));
				this.backupSketchCanvases = [...new Array(this.#paths.length)].map(_ => document.createElement("canvas"));
				maskPaths.forEach((elem, i) => loadPrev(elem, this.backMaskCanvases[i], this.backupMaskCanvases[i]));
				sketchPaths.forEach((elem, i) => loadPrev(elem, this.backSketchCanvases[i], this.backupSketchCanvases[i]));
			}

		}
		else if(this.#paths.length != this.backMaskCanvases.length) {
			this.backMaskCanvases = [...new Array(this.#paths.length)].map(_ => document.createElement("canvas"));
			this.backSketchCanvases = [...new Array(this.#paths.length)].map(_ => document.createElement("canvas"));
		}

		if (hasBackup) {
			this.#restoreBackCanvases();
		}
		else {
			this.backMaskCanvases.forEach(
				canvas => canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height));
			this.backSketchCanvases.forEach(
				canvas => canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height));
		}

		this.setImages(this.imgCanvas);
		this.updateFrameNumberUi(true);

		if(ComfyApp.clipspace_return_node) {
			this.saveButton.innerText = "Save to node";
		}
		else {
			this.saveButton.innerText = "Save";
		}
		this.saveButton.disabled = false;

		this.element.style.display = "block";
		this.element.style.zIndex = 8888; // NOTE: alert dialog must be high priority.
		
		document.addEventListener('pointerup', MaskEditorDialog.handlePointerUp);
		document.addEventListener('keydown', MaskEditorDialog.handleKeyDown);
	}

	isOpened() {
		return this.element.style.display == "block";
	}

	setImages(imgCanvas) {
		const imgCtx = imgCanvas.getContext('2d');
		const maskCtx = this.maskCtx;
		const maskCanvas = this.maskCanvas;
		const sketchCanvas = this.sketchCanvas;
		const sketchCtx = sketchCanvas.getContext('2d');

		imgCtx.clearRect(0,0,this.imgCanvas.width,this.imgCanvas.height);
		maskCtx.clearRect(0,0,this.maskCanvas.width,this.maskCanvas.height);

		// image load
		const orig_image = new Image();
		this.resizingEventHandler = () => {
			// repositioning
			imgCanvas.width = window.innerWidth - 250;
			imgCanvas.height = window.innerHeight - 200;

			// redraw image
			let drawWidth = orig_image.width;
			let drawHeight = orig_image.height;
			if (orig_image.width > imgCanvas.width) {
				drawWidth = imgCanvas.width;
				drawHeight = (drawWidth / orig_image.width) * orig_image.height;
			}

			if (drawHeight > imgCanvas.height) {
				drawHeight = imgCanvas.height;
				drawWidth = (drawHeight / orig_image.height) * orig_image.width;
			}

			imgCtx.drawImage(orig_image, 0, 0, drawWidth, drawHeight);

			// update mask
			[maskCanvas, sketchCanvas].forEach(canvas => {
				canvas.width = drawWidth;
				canvas.height = drawHeight;
				canvas.style.top = imgCanvas.offsetTop + "px";
				canvas.style.left = imgCanvas.offsetLeft + "px";
			});

			const resizeBackCanvas = backCanvas => {
				if (backCanvas.width != maskCanvas.width || backCanvas.height != maskCanvas.height) {
					backCanvas.width = maskCanvas.width;
					backCanvas.height = maskCanvas.height;
				}
			};
			this.backMaskCanvases.forEach(resizeBackCanvas);
			this.backSketchCanvases.forEach(resizeBackCanvas);
			resizeBackCanvas(this.sketchCanvas);

			this.prepareSketchLayer();
			maskCtx.drawImage(this.getBackCanvasForCurrentMode(this.#selectedIndex), 0, 0, maskCanvas.width, maskCanvas.height);
		};

		window.addEventListener("resize", this.resizingEventHandler);

		const touched_image = new Image();

		const alpha_url = new URL(api.apiURL("/view?" + new URLSearchParams(this.#paths[this.#selectedIndex]).toString()), window.location.href);
		alpha_url.searchParams.delete('channel');
		alpha_url.searchParams.delete('preview');
		alpha_url.searchParams.set('channel', 'a');
		touched_image.src = alpha_url;

		// original image load
		orig_image.onload = function() {
			window.dispatchEvent(new Event('resize'));
		};

		const rgb_url = new URL(api.apiURL("/view?" + new URLSearchParams(this.#paths[this.#selectedIndex]).toString()), window.location.href);
		rgb_url.searchParams.delete('channel');
		rgb_url.searchParams.set('channel', 'rgb');
		orig_image.src = rgb_url;
		this.image = orig_image;
	}

	setMaskEventHandler(maskCanvas) {
		maskCanvas.addEventListener("contextmenu", (event) => {
			event.preventDefault();
		});

		const self = this;
		maskCanvas.addEventListener('wheel', (event) => this.handleWheelEvent(self,event));
		maskCanvas.addEventListener('pointerdown', (event) => this.handlePointerDown(self,event));
		maskCanvas.addEventListener('pointermove', (event) => this.draw_move(self,event));
		maskCanvas.addEventListener('touchmove', (event) => this.draw_move(self,event));
		maskCanvas.addEventListener('pointerover', (event) => { this.brush.style.display = "block"; });
		maskCanvas.addEventListener('pointerleave', (event) => { this.brush.style.display = "none"; });
	}

	brush_size = 10;
	drawing_mode = false;
	lastx = -1;
	lasty = -1;
	lasttime = 0;

	static handleKeyDown(event) {
		const self = MaskEditorDialog.instance;
		if (event.key === ']') {
			self.brush_size = Math.min(self.brush_size+2, 100);
		} else if (event.key === '[') {
			self.brush_size = Math.max(self.brush_size-2, 1);
		} else if(event.key === 'Enter') {
			self.save();
		} else if (event.key == 'ArrowLeft') {
			self.moveToPrev();
		} else if (event.key == 'ArrowRight') {
			self.moveToNext();
		} else if (event.altKey && event.shiftKey && (event.key == 'z' || event.key == 'Z')) {
			event.preventDefault();
			event.stopPropagation();
			self.unstackAfterCanvas();
			
		} else if (event.altKey && (event.key == 'z' || event.key == 'Z')) {
			event.preventDefault();
			event.stopPropagation();
			self.unstackBeforeCanvas();

		}

		self.updateBrushPreview(self);
	}

	static handlePointerUp(event) {
		event.preventDefault();
		MaskEditorDialog.instance.drawing_mode = false;
	}

	updateBrushPreview(self) {
		const brush = self.brush;

		var centerX = self.cursorX;
		var centerY = self.cursorY;

		brush.style.width = self.brush_size * 2 + "px";
		brush.style.height = self.brush_size * 2 + "px";
		brush.style.left = (centerX - self.brush_size) + "px";
		brush.style.top = (centerY - self.brush_size) + "px";
	}

	handleWheelEvent(self, event) {
		if(event.deltaY < 0)
			self.brush_size = Math.min(self.brush_size+2, 100);
		else
			self.brush_size = Math.max(self.brush_size-2, 1);

		self.brush_slider_input.value = self.brush_size;

		self.updateBrushPreview(self);
	}

	draw_move(self, event) {
		event.preventDefault();

		this.cursorX = event.pageX;
		this.cursorY = event.pageY;

		self.updateBrushPreview(self);

		const maskRect = self.maskCanvas.getBoundingClientRect();
		const x = event.offsetX || event.targetTouches[0].clientX - maskRect.left;
		const y = event.offsetY || event.targetTouches[0].clientY - maskRect.top;

		if (this.is_magicWand) {
			if ((window.TouchEvent && event instanceof TouchEvent || event.buttons == 1)
				|| (event.buttons == 2 || event.buttons == 5 || event.buttons == 32)) {
			
				var diff = performance.now() - self.lasttime;

				if(diff > 20 && !this.drawing_mode) {
					
				} else {
					var dx = x - self.lastx;
					var dy = y - self.lasty;
					var deviation = Math.sqrt(dx * dx + dy * dy) * Math.sign(dx * dy);

					this.magicWandInst?.execute(self.lastx, self.lasty, deviation, this.maskCanvas);
				}
			}

		} else {
			if (window.TouchEvent && event instanceof TouchEvent || event.buttons == 1) {
				var diff = performance.now() - self.lasttime;
	
				var brush_size = this.brush_size;
				if(event instanceof PointerEvent && event.pointerType == 'pen') {
					brush_size *= event.pressure;
					this.last_pressure = event.pressure;
				}
				else if(window.TouchEvent && event instanceof TouchEvent && diff < 20){
					// The firing interval of PointerEvents in Pen is unreliable, so it is supplemented by TouchEvents.
					brush_size *= this.last_pressure;
				}
				else {
					brush_size = this.brush_size;
				}
	
				if(diff > 20 && !this.drawing_mode)
					requestAnimationFrame(() => {
						self.maskCtx.beginPath();
						self.maskCtx.fillStyle = this.getActiveBrushColor();
						self.maskCtx.globalCompositeOperation = "source-over";
						self.maskCtx.arc(x, y, brush_size, 0, Math.PI * 2, false);
						self.maskCtx.fill();
						self.lastx = x;
						self.lasty = y;
					});
				else
					requestAnimationFrame(() => {
						self.maskCtx.beginPath();
						self.maskCtx.fillStyle = this.getActiveBrushColor();
						self.maskCtx.globalCompositeOperation = "source-over";
	
						var dx = x - self.lastx;
						var dy = y - self.lasty;
	
						var distance = Math.sqrt(dx * dx + dy * dy);
						var directionX = dx / distance;
						var directionY = dy / distance;
	
						for (var i = 0; i < distance; i+=5) {
							var px = self.lastx + (directionX * i);
							var py = self.lasty + (directionY * i);
							self.maskCtx.arc(px, py, brush_size, 0, Math.PI * 2, false);
							self.maskCtx.fill();
						}
						self.lastx = x;
						self.lasty = y;
					});
	
				self.lasttime = performance.now();
			}
			else if(event.buttons == 2 || event.buttons == 5 || event.buttons == 32) {
	
				var brush_size = this.brush_size;
				if(event instanceof PointerEvent && event.pointerType == 'pen') {
					brush_size *= event.pressure;
					this.last_pressure = event.pressure;
				}
				else if(window.TouchEvent && event instanceof TouchEvent && diff < 20){
					brush_size *= this.last_pressure;
				}
				else {
					brush_size = this.brush_size;
				}
	
				if(diff > 20 && !drawing_mode) // cannot tracking drawing_mode for touch event
					requestAnimationFrame(() => {
						self.maskCtx.beginPath();
						self.maskCtx.globalCompositeOperation = "destination-out";
						self.maskCtx.arc(x, y, brush_size, 0, Math.PI * 2, false);
						self.maskCtx.fill();
						self.lastx = x;
						self.lasty = y;
					});
				else
					requestAnimationFrame(() => {
						self.maskCtx.beginPath();
						self.maskCtx.globalCompositeOperation = "destination-out";
						
						var dx = x - self.lastx;
						var dy = y - self.lasty;
	
						var distance = Math.sqrt(dx * dx + dy * dy);
						var directionX = dx / distance;
						var directionY = dy / distance;
	
						for (var i = 0; i < distance; i+=5) {
							var px = self.lastx + (directionX * i);
							var py = self.lasty + (directionY * i);
							self.maskCtx.arc(px, py, brush_size, 0, Math.PI * 2, false);
							self.maskCtx.fill();
						}
						self.lastx = x;
						self.lasty = y;
					});
	
					self.lasttime = performance.now();
			}
		}
	}

	handlePointerDown(self, event) {
		this.stackBeforeCanvas();

		if (this.is_magicWand) {
			if ([0, 2, 5].includes(event.button)) {
				self.drawing_mode = true;
	
				event.preventDefault();
				const maskRect = self.maskCanvas.getBoundingClientRect();
				const x = event.offsetX || event.targetTouches[0].clientX - maskRect.left;
				const y = event.offsetY || event.targetTouches[0].clientY - maskRect.top;

				this.magicWandInst = new MagicWand(
					this.imgCanvas, 
					this.maskCanvas, 
					this.sketchCanvas, 
					this.getActiveBrushColor(),
					16,
					event.button == 0);
				this.magicWandInst.execute(x, y, 0, this.maskCanvas);
				
				self.lastx = x;
				self.lasty = y;
				self.lasttime = performance.now();
			}

		} else {
			var brush_size = this.brush_size;
			if(event instanceof PointerEvent && event.pointerType == 'pen') {
				brush_size *= event.pressure;
				this.last_pressure = event.pressure;
			}
	
			if ([0, 2, 5].includes(event.button)) {
				self.drawing_mode = true;
	
				event.preventDefault();
				const maskRect = self.maskCanvas.getBoundingClientRect();
				const x = event.offsetX || event.targetTouches[0].clientX - maskRect.left;
				const y = event.offsetY || event.targetTouches[0].clientY - maskRect.top;
	
				self.maskCtx.beginPath();
				if (event.button == 0) {
					self.maskCtx.fillStyle = this.getActiveBrushColor();
					self.maskCtx.globalCompositeOperation = "source-over";
				} else {
					self.maskCtx.globalCompositeOperation = "destination-out";
				}
				self.maskCtx.arc(x, y, brush_size, 0, Math.PI * 2, false);
				self.maskCtx.fill();
				self.lastx = x;
				self.lasty = y;
				self.lasttime = performance.now();
			}
		}
	}

	stackBeforeCanvas() {
		let newCanvas = document.createElement("canvas");
		newCanvas.width = this.maskCanvas.width;
		newCanvas.height = this.maskCanvas.height;
		newCanvas.getContext('2d').drawImage(this.maskCanvas, 0, 0);

		if (this.beforeCanvases.length == 32)
			this.beforeCanvases.shift();
		this.beforeCanvases.push(newCanvas);

		this.afterCanvases = [];
	}

	unstackBeforeCanvas() {
		if (this.beforeCanvases.length == 0)
			return;

		let deactivatedCvs = MaskEditorDialog.#cloneCanvas(this.maskCanvas);

		this.maskCtx.globalCompositeOperation = "source-over";
		let activatedCanvas = this.beforeCanvases.pop();
		this.maskCanvas.getContext('2d').clearRect(0, 0, activatedCanvas.width, activatedCanvas.height);
		this.maskCanvas.getContext('2d').drawImage(activatedCanvas, 0, 0);

		this.afterCanvases.push(deactivatedCvs);
	}

	unstackAfterCanvas() {
		if (this.afterCanvases.length == 0)
			return;

		let deactivatedCvs = MaskEditorDialog.#cloneCanvas(this.maskCanvas);

		this.maskCtx.globalCompositeOperation = "source-over";
		let activatedCanvas = this.afterCanvases.pop();
		this.maskCanvas.getContext('2d').clearRect(0, 0, activatedCanvas.width, activatedCanvas.height);
		this.maskCanvas.getContext('2d').drawImage(activatedCanvas, 0, 0);

		this.beforeCanvases.push(deactivatedCvs);
	}

	changeFillMode(button) {
		if (this.is_magicWand) {
			button.innerText = "✨";

		} else {
			button.innerText = "🖌";
		}

		this.is_magicWand = !this.is_magicWand;
	}

	getBackCanvasForCurrentMode(index) {
		return this.is_sketch 
			? this.backSketchCanvases[index]
			: this.backMaskCanvases[index];
	}

	storeActiveToBack() {
		const backCanvas = this.getBackCanvasForCurrentMode(this.#selectedIndex);
		backCanvas.getContext('2d').clearRect(0, 0, backCanvas.width, backCanvas.height);
		backCanvas.getContext('2d').drawImage(this.maskCanvas, 0, 0, backCanvas.width, backCanvas.height);
	}

	getActiveBrushColor() {
		return this.is_sketch
			? this.colorPicker.value
			: "#ffffff";
	}

	prepareSketchLayer() {
		this.sketchCanvas.getContext('2d').clearRect(0, 0, this.sketchCanvas.width, this.sketchCanvas.height);
		this.sketchCanvas.getContext('2d').drawImage(
			this.backSketchCanvases[this.#selectedIndex], 0, 0, this.sketchCanvas.width, this.sketchCanvas.height);
	}

	updateFrameNumberUi(updateSlider) {
		let newValue = this.#selectedIndex + 1;
		this.frameNumberText.innerText = `${String(newValue)} / ${String(this.#paths.length)}`;
		this.frame_slider_input.min = 1;
		this.frame_slider_input.max = this.#paths.length;
		if (updateSlider)
			this.frame_slider_input.value = newValue;
	}

	moveToPrev() {
		if (this.#selectedIndex > 0) {
			this.beforeCanvases = [];
			this.afterCanvases = [];
			this.storeActiveToBack();
			const params = new URLSearchParams(this.#paths[--this.#selectedIndex]);
			this.image.src = new URL(api.apiURL("/view?" + params.toString()), window.location.href);
			this.updateFrameNumberUi(true);
		}
	}

	moveToNext() {
		if (this.#selectedIndex < this.#paths.length - 1) {
			this.beforeCanvases = [];
			this.afterCanvases = [];
			this.storeActiveToBack();
			const params = new URLSearchParams(this.#paths[++this.#selectedIndex]);
			this.image.src = new URL(api.apiURL("/view?" + params.toString()), window.location.href);
			this.updateFrameNumberUi(true);
		}
	}

	moveTo(newIndex) {
		if (newIndex != this.#selectedIndex 
			&& newIndex >= 0 
			&& newIndex < this.#paths.length) {
			this.storeActiveToBack();
			this.#selectedIndex = newIndex;
			const params = new URLSearchParams(this.#paths[this.#selectedIndex]);
			this.image.src = new URL(api.apiURL("/view?" + params.toString()), window.location.href);
			this.updateFrameNumberUi(true);
		}
	}

	async save() {
		this.storeActiveToBack();

		const uploadImages = async (maskCanvas, i, idSitr) => {
			const body = new FormData();
			const dataURL = maskCanvas.toDataURL();
			const blob = dataURLToBlob(dataURL);
			const extPos = this.#paths[i].filename.lastIndexOf(".");
			const filename = this.#paths[i].filename.substr(0, extPos) + ".png";

			body.append("image", blob, filename);
			body.append("subfolder", "extVideoFrame" + idSitr);
			const resp = await api.fetchApi("/upload/image", {
				method: "POST",
				body,
			});
		};

		this.saveButton.innerText = "Saving...";
		this.saveButton.disabled = true;

		const maskDirId = Date.now();
		const sketchDirId = maskDirId + 1;
		for (let i = 0; i < this.backMaskCanvases.length; i++)
			await uploadImages(this.backMaskCanvases[i], i, String(maskDirId));
		for (let i = 0; i < this.backSketchCanvases.length; i++)
			await uploadImages(this.backSketchCanvases[i], i, String(sketchDirId));

		this.#updatePathDataHnadler(maskDirId, sketchDirId);
		this.#storeBackCanvases();

		this.close();
	}

	static #cloneCanvas(canvas) {
		const backupCanvas = document.createElement('canvas');
		backupCanvas.width = canvas.width;
		backupCanvas.height = canvas.height;
		backupCanvas.getContext('2d').drawImage(canvas, 0, 0, canvas.width, canvas.height);
		return backupCanvas;
	}

	#storeBackCanvases() {
		this.backupMaskCanvases = this.backMaskCanvases.map(MaskEditorDialog.#cloneCanvas);
		this.backupSketchCanvases = this.backSketchCanvases.map(MaskEditorDialog.#cloneCanvas);
	}
	#restoreBackCanvases() {
		this.backMaskCanvases = this.backupMaskCanvases.map(MaskEditorDialog.#cloneCanvas);
		this.backSketchCanvases = this.backupSketchCanvases.map(MaskEditorDialog.#cloneCanvas)
	}

	close() {
		this.beforeCanvases = [];
		this.afterCanvases = [];
		window.removeEventListener("resize", this.resizingEventHandler);
		super.close();
	}


	#_updatePathDataHnadler = null;
	get #updatePathDataHnadler() {
		return this.#_updatePathDataHnadler ?? ((maskDirId, sketchDirId) => {});
	}
	set updatePathDataHnadler(value) {
		this.#_updatePathDataHnadler = value;
	}
}


export default MaskEditorDialog;
