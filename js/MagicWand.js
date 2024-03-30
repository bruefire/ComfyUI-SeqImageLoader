

class MagicWand {

    static colorDiff(color1, color2) {
        const rDiff = Math.abs(color1.r - color2.r);
        const gDiff = Math.abs(color1.g - color2.g);
        const bDiff = Math.abs(color1.b - color2.b);
        return (rDiff + gDiff + bDiff) / 3; // simple average calculation
    }

    static magicWand(canvas, startX, startY, threshold) {
        const ctx = canvas.getContext('2d');
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imgData.data;
        const startIdx = (startY * canvas.width + startX) * 4;
        const startColor = {
            r: pixels[startIdx],
            g: pixels[startIdx + 1],
            b: pixels[startIdx + 2]
        };
        let selectedPixels = new Set([`${startX},${startY}`]);

        function selectSimilarPixels(x, y) {
            [[x-1, y], [x+1, y], [x, y-1], [x, y+1]].forEach(([nx, ny]) => {
                if (nx < 0 || ny < 0 || nx >= canvas.width || ny >= canvas.height) 
                    return;

                const key = `${nx},${ny}`;
                if (selectedPixels.has(key)) 
                    return;

                const idx = (ny * canvas.width + nx) * 4;
                const pixelColor = {
                    r: pixels[idx],
                    g: pixels[idx + 1],
                    b: pixels[idx + 2]
                };
                if (colorDiff(startColor, pixelColor) <= threshold) {
                    selectedPixels.add(key);
                    selectSimilarPixels(nx, ny);
                }
            });
        }

        selectSimilarPixels(startX, startY);
        return Array.from(selectedPixels).map(p => p.split(',').map(Number));
    }

    execute(startX, startY, threshold) {
        let selectedIndices = MagicWand.magicWand(this.targetCanvas, startX, startY, threshold);
        
        let newMaskCvs = document.createElement('canvas');
        let newMaskCtx = newMaskCvs.getContext('2d');
        newMaskCvs.width = this.targetCanvas.width;
        newMaskCvs.height = this.targetCanvas.height;
        newMaskCtx.drawImage(this.defMaskCanvas, 0, 0, newMaskCvs.width, newMaskCvs.height);
        
        const newMaskData = newMaskCtx.getImageData(0, 0, newMaskCvs.width, newMaskCvs.height);
        selectedIndices.forEach(coords => {
            const index = (coords[1] * newMaskCvs.width + coords[0]) * 4;
            newMaskData.data[index + 0] = this.maskingColor[0];
            newMaskData.data[index + 1] = this.maskingColor[1];
            newMaskData.data[index + 2] = this.maskingColor[2];
        });
		newMaskCtx.putImageData(newMaskData, 0, 0);

        return newMaskCvs;
    }

    constructor(imageCanvas, maskCanvas, sketchCanvas, color) {
        this.targetCanvas = document.createElement('canvas');
        let trgCvs = this.targetCanvas;
        trgCvs.width = imageCanvas.width;
        trgCvs.height = imageCanvas.height;
        trgCvs.getContext('2d').drawImage(imageCanvas, 0, 0, trgCvs.width, trgCvs.height);
        trgCvs.getContext('2d').drawImage(sketchCanvas, 0, 0, trgCvs.width, trgCvs.height);

        this.defMaskCanvas = document.createElement('canvas');
        let dmCvs = this.defMaskCanvas;
        dmCvs.width = maskCanvas.width;
        dmCvs.height = maskCanvas.height;
        dmCvs.getContext('2d').drawImage(maskCanvas, 0, 0, dmCvs.width, dmCvs.height);

        this.maskingColor = color;
    }

}

export default MagicWand;
