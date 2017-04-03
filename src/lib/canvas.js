export function relativeMouseCoords(currentElement, event) {
    var totalOffsetX = 0;
    var totalOffsetY = 0;
    var canvasX = 0;
    var canvasY = 0;

    do {
        totalOffsetX += currentElement.offsetLeft - currentElement.scrollLeft;
        totalOffsetY += currentElement.offsetTop - currentElement.scrollTop;
    }
    while (currentElement = currentElement.offsetParent)

    canvasX = event.pageX - totalOffsetX;
    canvasY = event.pageY - totalOffsetY;

    return { x: canvasX, y: canvasY }
}

export function zoom(canvas, zoomFactor) {
    canvas.setZoom(canvas.getZoom() * zoomFactor);
    canvas.setHeight(canvas.getHeight() * zoomFactor);
    canvas.setWidth(canvas.getWidth() * zoomFactor);
    canvas.renderAll();
}

export function setZoom(canvas, zoomFactor, imgWidth, imgHeight) {
    canvas.setZoom(zoomFactor);
    canvas.setHeight(imgHeight * zoomFactor);
    canvas.setWidth(imgWidth * zoomFactor);
    canvas.renderAll();
}

// canvasWidth is the fixed visible height of the canvas
export function zoomCalcXpos(canvas, canvasWidth, xPos) {
    if (xPos + canvas.getWidth() < canvasWidth)
        xPos = canvasWidth - canvas.getWidth();
    if (xPos > 0) xPos = 0;
    return xPos;
}

function zoomInCalcXpos(canvas, canvasWidth, xPos) {
    xPos *= canvas.getZoom();
    return zoomCalcXpos((canvasWidth / 2) - xPos);
}

// canvasHeight is the fixed visible height of the canvas
export function zoomCalcYpos(canvas, canvasHeight, yPos) {
    if (yPos + canvas.getHeight() < canvasHeight)
        yPos = canvasHeight - canvas.getHeight();
    if (yPos > 0) yPos = 0;
    return yPos;
}

function zoomInCalcYpos(canvas, canvasHeight, yPos) {
    yPos *= canvas.getZoom();
    return zoomCalcYpos((canvasHeight / 2) - yPos);
}