//-----------------------  Polygon ----------------------
export function createCanvasPolygon(canvas, squarePadding) {
    return new CanvasPolygon(canvas, squarePadding);
}

function CanvasPolygon(canvas, squarePadding) {
    const self = this;
    this.canvas = canvas;
    this.squarePadding = squarePadding;

    this.isHatched = false;

    this.isClosed = true;
    this.isPath = false;

    this.pointFill = "";
    this.pointStroke = "#000000";
    this.pointOpacity = 1;

    this.innerStroke = "#000000";
    this.outerStroke = "#FF0000";

    this.midPointObjArray = new Array();
    this.midMaxDis = 1000; //          /scale

    this.circleRadius = 5;

    this.pointObjArray = new Array();
    this.polygonObj = null;
    this.polygonObj1 = null;
    this.polygonObj2 = null;
    // only for ribline padding
    this.polygonObj3 = null;

    this.isAddEnd = false;
    this.lineObjArray = new Array();
    this.activeLineObj = null;
    this.activeShapeObj = null;

    this.originalPoint = { x: 0, y: 0 };


    this.isFirstPointObj = function (options) {
        if (this.pointObjArray.length == 0 || options.target == null) return false;
        return options.target.id == this.pointObjArray[0].id;
    }
    this.setPoints = function (points) {
        this.init();
        for (var i = 0; i < points.length; i++) {
            var circle = new fabric.Circle({
                radius: this.circleRadius,
                fill: this.pointFill,
                stroke: this.pointStroke,
                opacity: this.pointOpacity,
                strokeWidth: 1,
                left: points[i].x,
                top: points[i].y,
                selectable: false,
                hasBorders: false,
                hasControls: false,
                class: 'circle',
                originX: 'center',
                originY: 'center',
                evented: false,
                id: createRandomId(),
            });
            circle.on('modified', function () {
                self.setLayerOrder();
            });
            this.setCursor(circle);
            this.pointObjArray.push(circle);
            this.canvas.add(circle);
        }
        this.generatePolygon();
    }
    this.removeFromCanvas = function () {
        const canvas = this.canvas;
        canvas.remove(this.polygonObj);
        this.polygonObj = null;
        canvas.remove(this.polygonObj1);
        this.polygonObj1 = null;
        canvas.remove(this.polygonObj2);
        this.polygonObj2 = null;
        canvas.remove(this.polygonObj3);
        this.polygonObj3 = null;
        $.each(this.pointObjArray, function (index, pointObj) {
            canvas.remove(pointObj);
        });
    }
    this.removeMidPointsFromCanvas = function () {
        const canvas = this.canvas;
        $.each(this.midPointObjArray, function (index, pointObj) {
            canvas.remove(pointObj);
        });
    }
    this.init = function () {
        this.removeFromCanvas();
        this.pointObjArray.splice(0);
        this.lineObjArray.splice(0);
        this.isAddEnd = false;
        this.polygonObj = null;
    }
    this.addPoint = function (x, y) { //drawing  point by point
        if (this.isAddEnd) return this.isAddEnd;
        var circle = new fabric.Circle({
            radius: this.circleRadius,
            fill: this.pointFill,
            stroke: this.pointStroke,
            opacity: this.pointOpacity,
            strokeWidth: 1,
            left: x,
            top: y,
            selectable: false,
            hasBorders: false,
            hasControls: false,
            class: 'circle',
            originX: 'center',
            originY: 'center',
            evented: false,
            id: createRandomId(),
        });
        circle.on('modified', function () {
            self.setLayerOrder();
        });
        this.setCursor(circle);
        if (this.pointObjArray.length == 0) {
            circle.set({ fill: 'darkred' });
            circle.evented = true;
        }
        var line = createLine(x, y, x, y, '#999999');
        var points;
        if (this.activeShapeObj != null) {
            points = this.activeShapeObj.get("points");
            points.push({ x: x, y: y });
        } else {
            points = [{ x: x, y: y }];
        }
        var polygonObj;
        if (this.isClosed)
            polygonObj = new fabric.Polygon(points, {
                stroke: '#333333',
                strokeWidth: 1,
                fill: '#cccccc',
                opacity: 0.1,
                selectable: false,
                hasBorders: false,
                hasControls: false,
                evented: false
            });
        else
            polygonObj = new fabric.Polyline(points, {
                stroke: '#333333',
                strokeWidth: 1,
                fill: "",
                selectable: false,
                hasBorders: false,
                hasControls: false,
                evented: false
            });

        this.canvas.remove(this.activeShapeObj);
        this.canvas.add(polygonObj);
        this.activeShapeObj = polygonObj;
        this.activeLineObj = line;
        this.pointObjArray.push(circle);
        this.lineObjArray.push(line);

        this.canvas.add(circle);
        this.canvas.add(line);
        this.canvas.selection = false;

        return this.isAddEnd;
    };
    this.generatePolygon = function () {
        if (this.pointObjArray.length < 2) return;
        var points = new Array();
        $.each(this.pointObjArray, function (index, pointObj) {
            var cp = pointObj.getCenterPoint();
            points.push(cp);
            //points.push({x:pointObj.left,y:pointObj.top});
            pointObj.evented = pointObj.selectable = true;
        });
        $.each(this.lineObjArray, function (index, lineObj) { this.canvas.remove(lineObj); });
        this.lineObjArray.splice(0);

        this.canvas.remove(this.activeShapeObj).remove(this.activeLineObj)
            .remove(this.polygonObj).remove(this.polygonObj1).remove(this.polygonObj2).remove(this.polygonObj3);
        if (this.isClosed) {
            this.polygonObj = new fabric.Polygon(points, {
                stroke: this.outerStroke,
                strokeWidth: 2,
                fill: '',
                opacity: 1,
                hasBorders: false,
                hasControls: false,
                id: createRandomId(),
            });
            if (this.isHatched) {
                this.polygonObj.set({ strokeDashArray: [7, 7] });
            }
            this.setPadding(this.squarePadding);
        } else {
            if (this.isPath) {
                this.polygonObj = new fabric.Polyline(points, {
                    stroke: this.outerStroke,
                    strokeWidth: 2,
                    fill: "",
                    hasBorders: false,
                    hasControls: false,
                    id: createRandomId(),
                });
            }
            else {
                this.polygonObj = new fabric.Polyline(points, {
                    stroke: this.outerStroke,
                    strokeWidth: 2,
                    fill: "",
                    hasBorders: false,
                    hasControls: false,
                    id: createRandomId(),
                    strokeDashArray: [3, 3]
                });
                this.setRibLinePadding(this.squarePadding);
                this.polygonObj.set({ class: "ribline" });
            }
        }
        this.canvas.add(this.polygonObj);
        this.polygonObj.on('modified', function () {
            self.setLayerOrder();
        });
        this.activeLineObj = null;
        this.activeShapeObj = null;
        this.originalPoint = this.polygonObj.getCenterPoint();
        if (!this.isClosed && this.isPath) this.createMidPointObjArray(this.midMaxDis, this.circleRadius);
        this.isAddEnd = true;
    };
    this.setPadding = function (squarePadding) {
        this.squarePadding = squarePadding;
        var points = new Array();
        $.each(this.pointObjArray, function (index, pointObj) {
            points.push(pointObj.getCenterPoint());
        });
        this.canvas.remove(this.polygonObj2);
        this.canvas.remove(this.polygonObj1);

        var points1 = makeInnerPolygonPoints(points, this.squarePadding / 2);
        var points2 = makeInnerPolygonPoints(points1, this.squarePadding / 2);

        this.polygonObj1 = new fabric.Polygon(points1, {
            stroke: 'black',
            strokeWidth: 2,
            fill: '',
            opacity: 1,
            hasBorders: false,
            hasControls: false,
            id: createRandomId(),
        });
        this.polygonObj2 = new fabric.Polygon(points2, {
            stroke: this.innerStroke,
            strokeWidth: 2,
            fill: '',
            opacity: 1,
            hasBorders: false,
            hasControls: false,
            id: createRandomId(),
            strokeDashArray: [3, 3],
        });
        this.polygonObj1.evented = this.polygonObj2.evented = false;
        this.polygonObj1.selectable = this.polygonObj2.selectable = false;
        this.canvas.add(this.polygonObj2);
        this.canvas.add(this.polygonObj1);
    };
    this.setRibLinePadding = function (squarePadding) {
        this.squarePadding = squarePadding;
        var points = new Array();
        $.each(this.pointObjArray, function (index, pointObj) {
            points.push(pointObj.getCenterPoint());
        });
        this.canvas.remove(this.polygonObj2);
        this.canvas.remove(this.polygonObj1);
        this.canvas.remove(this.polygonObj3);
        var points1 = makeRibInnerPolyLinePoints(points, this.squarePadding / 2);
        var points2 = makeRibInnerPolyLinePoints(points1, this.squarePadding / 2);
        // var points3 = makeRibInnerPolyLinePoints(points,2);
        // var points4 = makeRibInnerPolyLinePoints(points,this.squarePadding / 2 - 4);
        this.polygonObj1 = new fabric.Polyline(points1, {
            stroke: 'rgb(0,180,0)',
            strokeWidth: 2,
            fill: '',
            opacity: 1,
            hasBorders: false,
            hasControls: false,
            id: createRandomId(),
        });
        this.polygonObj2 = new fabric.Polyline(points2, {
            stroke: this.innerStroke,
            strokeWidth: 2,
            fill: '',
            opacity: 1,
            hasBorders: false,
            hasControls: false,
            id: createRandomId(),
            strokeDashArray: [3, 3],
        });
        var points3 = points2.concat(points.reverse());
        this.polygonObj3 = new fabric.Polygon(points3, {
            fill: 'rgb(255,255,255)',
            opacity: 1,
            hasBorders: false,
            hasControls: false,
            id: createRandomId(),
        });
        this.polygonObj1.evented = this.polygonObj2.evented = this.polygonObj3.evented = false;
        this.polygonObj1.selectable = this.polygonObj2.selectable = this.polygonObj3.selectable = false;
        this.canvas.add(this.polygonObj3);
        this.canvas.add(this.polygonObj2);
        this.canvas.add(this.polygonObj1);
    };
    this.drawPre = function (options) {
        if (this.isAddEnd) return;
        if (this.activeLineObj && this.activeLineObj.class == "line") {
            var pos = this.canvas.getPointer(options.e);
            this.activeLineObj.set({ x2: pos.x, y2: pos.y });
            var points = this.activeShapeObj.get("points");
            points[this.pointObjArray.length] = { x: pos.x, y: pos.y };
            this.activeShapeObj.set({ points: points });

        }
    };
    this.isDeletableObject = function (options) {
        var obj = options.target;
        for (var i = 0; i < this.pointObjArray.length; i++) {
            if (this.pointObjArray[i].id == obj.id) {
                return true;
            }
        }
        if (obj.id == this.polygonObj.id) {
            return true;
        }
        return false;
    }
    this.movingEvent = function (options) {
        var obj = options.target;
        var isOk = false;
        for (var i = 0; i < this.pointObjArray.length; i++) {
            if (this.pointObjArray[i].id == obj.id) { isOk = true; break; }
        }
        if (isOk) {
            var fdcl = true;
            if (this.isClosed) fdcl = this.polygonObj1.visible;
            this.generatePolygon();
            if (this.isClosed) this.polygonObj1.visible = fdcl;
            //this.setLayerOrder();
            //if (!this.isClosed) this.createMidPointObjArray(this.midMaxDis, this.circleRadius);

        } else if (obj.id == this.polygonObj.id) {
            var points = this.getPoints();
            var dx = points[0].x - this.pointObjArray[0].left;
            var dy = points[0].y - this.pointObjArray[0].top;
            for (var i = 0; i < points.length && i < this.pointObjArray.length; i++) {
                this.pointObjArray[i].set({ left: this.pointObjArray[i].left + dx, top: this.pointObjArray[i].top + dy });
                this.pointObjArray[i].setCoords();
            }
            if (!this.isPath) {
                this.polygonObj1.set({ left: this.polygonObj1.left + dx, top: this.polygonObj1.top + dy });
                this.polygonObj2.set({ left: this.polygonObj2.left + dx, top: this.polygonObj2.top + dy });
            }
            if (!this.isPath && !this.isClosed) {
                this.polygonObj3.set({ left: this.polygonObj3.left + dx, top: this.polygonObj3.top + dy });
            }
            this.polygonObj.setCoords();
            if (!this.isClosed) this.createMidPointObjArray(this.midMaxDis, this.circleRadius);

        }
    };
    this.insertPoint = function (x, y) {
        var t0 = (new Date).getTime();
        var points = this.getPoints();
        var bi = points.length - 1,
            si = 0;
        if (!this.isClosed) {
            bi = 0;
            si = 1;
        }
        for (var i = si; i < points.length; bi = i, i++) {
            var d = distanceL2P(points[bi].x, points[bi].y, points[i].x, points[i].y, x, y);
            if (d < 5) {
                var t1 = (new Date).getTime();
                points.splice(bi + 1, 0, { x: x, y: y });
                //console.log("splice=" + ((new Date).getTime() - t1));
                this.setPoints(points);
                //console.log("insertPoint_1=" + ((new Date).getTime() - t0));
                this.setLayerOrder();
                //console.log("insertPoint_2=" + ((new Date).getTime() - t0));
                return true;
            }
        }
        return false;
    }
    this.setCursor = function (obj) {
        if (!this.isPath) {
            obj.hoverCursor = 'crosshair';
            obj.moveCursor = 'crosshair';
        }
    }
    this.setLayerOrder = function () {
        if (this.pointObjArray.length > 0) {
            this.canvas.setActiveObject(this.pointObjArray[0]);
            for (var i = 0; i < this.pointObjArray.length; i++) {
                this.canvas.bringToFront(this.pointObjArray[i]);
            }
        }
    };
    this.showObjectMode = function (b) {
        const self = this;
        $.each(this.pointObjArray, function (index, pointObj) {
            if (self.isPath) {
                pointObj.evented = b;
                pointObj.set({ opacity: (b ? 0.5 : 1) });
            }
        });
        this.polygonObj.evented = b;
        if (this.isPath) {
            this.polygonObj.visible = b;
        }
    };
    this.setSelectable = function (b) {
        const self = this;
        $.each(this.pointObjArray, function (index, pointObj) {
            if (!self.isPath)
                pointObj.visible = b;
            else {
                pointObj.selectable = pointObj.evented = b;
                pointObj.set({ opacity: (b ? 0.5 : 1) });
            }
        });
        this.polygonObj.selectable = this.polygonObj.evented = b;
        if (this.isPath) {
            this.polygonObj.visible = b;
        }
    };
    this.getPoints = function () {
        return this.getMovedPoints(this.polygonObj.get("points"));
    };
    this.getPoints2 = function () {
        return this.getMovedPoints(this.polygonObj2.get("points"));
    };
    this.getMovedPoints = function (points) {
        var dpx = this.polygonObj.getCenterPoint().x - this.originalPoint.x;
        var dpy = this.polygonObj.getCenterPoint().y - this.originalPoint.y;
        var ps = [];
        for (var i = 0; i < points.length; i++)
            ps.push({ x: points[i].x + dpx, y: points[i].y + dpy });
        return ps;
    };
    this.findCircleObj = function (x, y) {
        for (var i = 0; i < this.pointObjArray.length; i++) {
            var pos = this.pointObjArray[i].getCenterPoint();
            if (distanceP2P(x, y, pos.x, pos.y) < 5) return this.pointObjArray[i];
        }
        return null;
    };
    this.createMidPointObjArray = function (max_dis, circleRadius) {
        this.midMaxDis = max_dis;
        this.circleRadius = circleRadius;
        const self = this;
        var pn = 0;
        var points = this.getPoints();
        var bi = points.length - 1,
            si = 0;
        if (!this.isClosed) {
            bi = 0;
            si = 1;
        }
        for (var i = si; i < points.length; bi = i++) {
            var dx = points[i].x - points[bi].x;
            var dy = points[i].y - points[bi].y;
            var l = vLen(dx, dy);
            var cnt = Math.ceil(l / max_dis);
            for (var k = 1; k < cnt; k++ , pn++) {
                var px = points[bi].x + dx / cnt * k;
                var py = points[bi].y + dy / cnt * k;
                var mp;
                if (pn < this.midPointObjArray.length) {
                    mp = this.midPointObjArray[pn];
                    mp.set({ radius: this.circleRadius, left: px, top: py, visible: true });
                } else {
                    mp = new fabric.Circle({
                        radius: this.circleRadius,
                        fill: this.pointFill,
                        stroke: "#000000",
                        opacity: 1,
                        strokeWidth: 1,
                        left: px,
                        top: py,
                        selectable: false,
                        hasBorders: false,
                        hasControls: false,
                        class: 'circle',
                        originX: 'center',
                        originY: 'center',
                        evented: false,
                        id: createRandomId(),
                    });
                    this.midPointObjArray.push(mp);
                    this.canvas.add(mp);
                }
            }
        }
        while (pn < this.midPointObjArray.length)
            this.midPointObjArray[pn++].setVisible(false);
        $.each(this.pointObjArray, function (index, circleObj) {
            circleObj.set({ radius: self.circleRadius });
        });
    };
}
//---------------------End Polygon --------------------

//----------------------- Line ------------------------
export function createCanvasMobileLine(canvas) {
    return new CanvasMobileLine(canvas);
}

function CanvasMobileLine(canvas) {
    const self = this;
    this.canvas = canvas;
    this.line = null;
    this.circle1 = null;
    this.circle2 = null;
    this.pointNum = 0;
    this.isAddEnd = false;

    function setRadius(radius) {
        this.circle1.set({ radius: radius });
        this.circle2.set({ radius: radius });

    }
    this.addPoint = function (x, y) {
        if (this.pointNum == 2) return;
        this.pointNum++;
        var circle = createPointCircle(x, y);
        circle.set({ strokeWidth: 2, selectable: true, evented: true });
        this.canvas.add(circle);
        circle.on('modified', function () {
            self.setLayerOrder();
        });
        if (this.pointNum == 1) {
            this.circle1 = circle;
        }
        if (this.pointNum == 2) {
            this.circle2 = circle;
            var cp1 = this.circle1.getCenterPoint();
            this.line = createLine(cp1.x, cp1.y, x, y, "red");
            this.line.on('modified', function () {
                self.setLayerOrder();
            });
            this.line.selectable = true;
            this.line.evented = true;
            this.canvas.add(this.line);
            self.setLayerOrder();
            this.isAddEnd = true;
        }
        return this.isAddEnd;
    };
    this.getLength = function () {
        if (this.line == null) return 0;
        var lps = this.line.calcLinePoints();
        return distanceP2P(lps.x1, lps.y1, lps.x2, lps.y2);
    };
    this.getDistance2P = function (x, y) {
        var cp1 = this.circle1.getCenterPoint();
        var cp2 = this.circle2.getCenterPoint();
        var l = distanceL2P(cp1.x, cp1.y, cp2.x, cp2.y, x, y);
        return l;
    };
    this.movingEvent = function (options) {
        var obj = options.target;
        var cp1 = this.circle1.getCenterPoint();
        var cp2 = this.circle2.getCenterPoint();
        var p0 = this.line.getCenterPoint();
        var lps = this.line.calcLinePoints();
        if (obj.id == this.line.id) {
            this.circle1.set({ left: p0.x + lps.x1, top: p0.y + lps.y1 });
            this.circle2.set({ left: p0.x + lps.x2, top: p0.y + lps.y2 });
        } else if (obj.id == this.circle1.id || obj.id == this.circle2.id) {
            this.line.set({ x1: cp1.x, y1: cp1.y, x2: cp2.x, y2: cp2.y });
        }
        this.line.setCoords();
        this.circle1.setCoords();
        this.circle2.setCoords();

    };
    this.setSelectable = function (b) {
        if (this.line != null) {
            this.line.selectable = this.circle1.selectable = this.circle2.selectable = b;
            this.line.evented = this.circle1.evented = this.circle2.evented = b;
        }
    };
    this.setVisible = function (b) {
        if (this.line != null) {
            this.line.visible = this.circle1.visible = this.circle2.visible = b;
        }
    }
    this.removeFromCanvas = function () {
        this.canvas.remove(this.line);
        this.canvas.remove(this.circle1);
        this.canvas.remove(this.circle2);
    };
    this.setLayerOrder = function () {
        this.canvas.setActiveObject(this.circle1);
        this.canvas.bringToFront(this.circle1);
        //this.canvas.setActiveObject(this.circle2);
        this.canvas.bringToFront(this.circle2);
    }
}
//---------------------End Line --------------------

function createRandomId() {
    var random = Math.floor(Math.random() * 10000);
    var id = new Date().getTime() + random;
    return id;
}

function createPointCircle(x, y) {
    return new fabric.Circle({
        radius: 5,
        fill: "",
        stroke: "black",
        strokeWidth: 1,
        left: x,
        top: y,
        selectable: false,
        hasBorders: false,
        hasControls: false,
        class: 'circle',
        originX: 'center',
        originY: 'center',
        evented: false,
        id: createRandomId(),
    });
}
export function createLine(x1, y1, x2, y2, colorStr) {
    return new fabric.Line([x1, y1, x2, y2], {
        strokeWidth: 2,
        fill: colorStr,
        stroke: colorStr,
        class: 'line',
        originX: 'center',
        originY: 'center',
        selectable: false,
        hasBorders: false,
        hasControls: false,
        evented: false,
        id: createRandomId()
    });
}

function createPolygon(points) {
    if (points.length < 2) return;
    var polygonObj = new fabric.Polygon(points, {
        stroke: 'red',
        strokeWidth: 2,
        fill: '',
        opacity: 1,
        hasBorders: false,
        hasControls: false,
        id: createRandomId(),
    });
    return polygonObj;
}

function distanceP2P(px1, py1, px2, py2) {
    var dx = px1 - px2,
        dy = py1 - py2;
    return vLen(dx, dy);
}

function distanceL2P(lx1, ly1, lx2, ly2, px, py) {
    var vx = lx2 - lx1,
        vy = ly2 - ly1;
    var vx1 = px - lx1,
        vy1 = py - ly1;
    var vx2 = px - lx2,
        vy2 = py - ly2;
    var a1 = sPrd(vx, vy, vx1, vy1);
    if (a1 < 0) return vLen(vx1, vy1);
    var a2 = -sPrd(vx, vy, vx2, vy2);
    if (a2 < 0) return vLen(vx2, vy2);
    var l = vLen(vx, vy);
    var s = Math.abs(vPrd(vx, vy, vx1, vy1));
    if (l == 0) {
        var l1 = vLen(vx1, vy1);
        var l2 = vLen(vx2, vy2);
        return (li < l2) ? l1 : l2; //min
    }
    return s / l;
}

function intersect(l1x1, l1y1, l1x2, l1y2, l2x1, l2y1, l2x2, l2y2) {
    var vx11_21 = l2x1 - l1x1;
    var vy11_21 = l2y1 - l1y1;
    var vx11_12 = l1x2 - l1x1;
    var vy11_12 = l1y2 - l1y1;
    var vx21_22 = l2x2 - l2x1;
    var vy21_22 = l2y2 - l2y1;
    var s = vPrd(vx11_12, vy11_12, vx21_22, vy21_22);
    var s1 = vPrd(vx11_21, vy11_21, vx21_22, vy21_22);
    var s2 = vPrd(vx11_21, vy11_21, vx11_12, vy11_12);
    if (s == 0) { // =
        if (s1 == 0 || s2 == 0) { // -
            return [-1, s1, s2];
        }
        return [0, s1, s2];
    } else {
        s1 /= s;
        s2 /= s;
        return [1, s1, s2, l1x1 + vx11_12 * s1, l1y1 + vy11_12 * s1];
    }

}
//---------  Vector  -------------
function vPrd(vx1, vy1, vx2, vy2) {
    return vx1 * vy2 - vx2 * vy1;
}

function sPrd(vx1, vy1, vx2, vy2) {
    return vx1 * vx2 + vy1 * vy2;
}

function vLen(vx, vy) { return Math.sqrt(vx * vx + vy * vy); }
export function vRot(x, y, al) {
    return ({ x: Math.cos(al) * x - Math.sin(al) * y, y: Math.sin(al) * x + Math.cos(al) * y });
}
//---------  End Vector  -------------
//---------  End Vector  -------------
function makeRibInnerPolyLinePoints(points, squarePadding) {
    var newPoints = [];
    var dir = -1;
    for (var i = 1; i < points.length; i++) {
        var bi = i - 1;
        var vx = points[i].x - points[bi].x;
        var vy = points[i].y - points[bi].y;
        var vl = vLen(vx, vy);
        if (vl < 1) continue;
        var nx = dir * vy / vl * squarePadding; //Normal Vector is inside
        var ny = -dir * vx / vl * squarePadding;
        var p1 = { x: points[bi].x + nx, y: points[bi].y + ny };
        var p2 = { x: points[i].x + nx, y: points[i].y + ny };
        if (newPoints.length == 0) {
            newPoints.push(p1);
            newPoints.push(p2);
        } else {
            var k = newPoints.length - 1;
            var is = intersect(newPoints[k - 1].x, newPoints[k - 1].y, newPoints[k].x, newPoints[k].y,
                p1.x, p1.y, p2.x, p2.y);
            if (is[0] == 1) {
                newPoints[k].x = is[3];
                newPoints[k].y = is[4];
                newPoints.push(p2);
            } else {
                newPoints[k] = p2;
            }
        }
    }
    return newPoints;
}
function makeInnerPolygonPoints(points, squarePadding) {
    var newPoints = [];
    var bi = points.length - 1;
    var dir = 1;
    if (calcPolygonSquare(points) > 0) dir = -1;
    for (var i = 0; i < points.length; bi = i++) {
        var vx = points[i].x - points[bi].x;
        var vy = points[i].y - points[bi].y;
        var vl = vLen(vx, vy);
        if (vl < 1) continue;
        var nx = dir * vy / vl * squarePadding; //Normal Vector is inside
        var ny = -dir * vx / vl * squarePadding;
        var p1 = { x: points[bi].x + nx, y: points[bi].y + ny };
        var p2 = { x: points[i].x + nx, y: points[i].y + ny };
        if (newPoints.length == 0) {
            newPoints.push(p1);
            newPoints.push(p2);
        } else {
            var k = newPoints.length - 1;
            var is = intersect(newPoints[k - 1].x, newPoints[k - 1].y, newPoints[k].x, newPoints[k].y,
                p1.x, p1.y, p2.x, p2.y);
            if (is[0] == 1) {
                newPoints[k].x = is[3];
                newPoints[k].y = is[4];
                newPoints.push(p2);
            } else {
                newPoints[k] = p2;
            }
        }
    }
    var k = newPoints.length - 1;
    var is = intersect(newPoints[k - 1].x, newPoints[k - 1].y, newPoints[k].x, newPoints[k].y,
        newPoints[0].x, newPoints[0].y, newPoints[1].x, newPoints[1].y);
    if (is[0] == 1) {
        newPoints[0].x = is[3];
        newPoints[0].y = is[4];
        newPoints.splice(k);
    } else {
        newPoints.splice(0, 1);
    }
    return newPoints;
}

function calcPolygonSquare(points) {
    var s = 0;
    for (var i = 2; i < points.length; i++) {
        var vx1 = points[i - 1].x - points[0].x;
        var vy1 = points[i - 1].y - points[0].y;
        var vx2 = points[i].x - points[0].x;
        var vy2 = points[i].y - points[0].y;
        var ss = vPrd(vx1, vy1, vx2, vy2);
        s += ss;
    }
    return s / 2;
}