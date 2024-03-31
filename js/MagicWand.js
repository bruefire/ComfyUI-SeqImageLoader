

class MagicWand {

    static colorDiff(color1, color2) {
        const rDiff = Math.abs(color1.r - color2.r);
        const gDiff = Math.abs(color1.g - color2.g);
        const bDiff = Math.abs(color1.b - color2.b);
        return (rDiff + gDiff + bDiff) / 3.0; // simple average calculation
    }

    static magicWand(canvas, startX, startY, threshold) {
        const ctx = canvas.getContext('2d', {willReadFrequently:true});
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imgData.data;
        const startIdx = (startY * canvas.width + startX) * 4;
        const startColor = {
            r: pixels[startIdx],
            g: pixels[startIdx + 1],
            b: pixels[startIdx + 2]
        };
        let selectedPixels = new Set([`${startX},${startY}`]);
        let visitedPixels = new Set([`${startX},${startY}`]);
        let targetPixels = [[startX, startY]];

        while (targetPixels.length != 0) {
            let coords = targetPixels.shift();
            const x = coords[0];
            const y = coords[1];

            [[x-1, y], [x+1, y], [x, y-1], [x, y+1]].forEach(([nx, ny]) => {
                if (nx < 0 || ny < 0 || nx >= canvas.width || ny >= canvas.height) 
                    return;

                const key = `${nx},${ny}`;
                if (visitedPixels.has(key)) 
                    return;

                const idx = (ny * canvas.width + nx) * 4;
                const pixelColor = {
                    r: pixels[idx],
                    g: pixels[idx + 1],
                    b: pixels[idx + 2]
                };
                
                visitedPixels.add(key);
                if (MagicWand.colorDiff(startColor, pixelColor) <= threshold) {
                    selectedPixels.add(key);
                    targetPixels.push([nx, ny]);
                }
            });
        }

        return Array.from(selectedPixels).map(p => p.split(',').map(Number));
    }

    execute(startX, startY, deviation, overrivedCvs) {
        let selectedIndices = MagicWand.magicWand(
            this.targetCanvas, Math.floor(startX), Math.floor(startY), this.threshold + deviation);
        
        let newMaskCvs = document.createElement('canvas');
        let newMaskCtx = newMaskCvs.getContext('2d');
        newMaskCvs.width = this.targetCanvas.width;
        newMaskCvs.height = this.targetCanvas.height;
        newMaskCtx.drawImage(this.defMaskCanvas, 0, 0, newMaskCvs.width, newMaskCvs.height);
        
        const newMaskData = newMaskCtx.getImageData(0, 0, newMaskCvs.width, newMaskCvs.height);
        selectedIndices.forEach(coords => {
            const index = (coords[1] * newMaskCvs.width + coords[0]) * 4;
            newMaskData.data[index + 0] = parseInt(this.maskingColor.substr(1,2), 16);
            newMaskData.data[index + 1] = parseInt(this.maskingColor.substr(3,2), 16);
            newMaskData.data[index + 2] = parseInt(this.maskingColor.substr(5,2), 16);
            newMaskData.data[index + 3] = this.adding ? 255 : 0;
        });
		newMaskCtx.putImageData(newMaskData, 0, 0);

        if (overrivedCvs) {
            overrivedCvs.getContext('2d').clearRect(0, 0, newMaskCvs.width, newMaskCvs.height);
            overrivedCvs.getContext('2d').drawImage(newMaskCvs, 0, 0);
        }

        return newMaskCvs;
    }

    constructor(imageCanvas, maskCanvas, sketchCanvas, colorStr, threshold, adding) {
        this.targetCanvas = document.createElement('canvas');
        let trgCvs = this.targetCanvas;
        trgCvs.width = maskCanvas.width;
        trgCvs.height = maskCanvas.height;
        trgCvs.getContext('2d').drawImage(imageCanvas, 0, 0);
        trgCvs.getContext('2d').drawImage(sketchCanvas, 0, 0, trgCvs.width, trgCvs.height);

        this.defMaskCanvas = document.createElement('canvas');
        let dmCvs = this.defMaskCanvas;
        dmCvs.width = maskCanvas.width;
        dmCvs.height = maskCanvas.height;
        dmCvs.getContext('2d').drawImage(maskCanvas, 0, 0, dmCvs.width, dmCvs.height);

        this.maskingColor = colorStr;
        this.threshold = threshold;
        this.adding = adding;
    }

}

export default MagicWand;
