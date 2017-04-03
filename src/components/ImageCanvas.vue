<template>
    <div class="content-canvas">
        <canvas id="id-canvas"></canvas>
    </div>
</template>

<style>
    .content-canvas {
        position: relative;
        margin-left: 250px;
        width: calc(100% - 250px);
        height: 100vh;
        overflow: hidden;
    }
    
    .canvas-container {
        overflow: hidden;
    }
</style>

<script>
    import {
        mapState,
        mapActions
    } from 'vuex'
    import {
        relativeMouseCoords,
        setZoom,
        zoomCalcYpos,
        zoomCalcXpos
    } from '../lib/canvas';
    import {
        createCanvasPolygon,
        createCanvasMobileLine,
        vRot
    } from '../lib/canvaspolygon';

    export default {
        computed: mapState({
            config: state => state.config,
            zoom: state => state.config.zoom,
            step: state => state.config.step,
            pierDiameter: state => state.config.pierDiameter,
            fPerimeterDrawCenterLine: state => state.config.fPerimeterDrawCenterLine,
            fRibDrawCenterLine: state => state.config.fRibDrawCenterLine,
            podTextSize: state => state.config.podTextSize,
            maxCircleDis: state => state.config.maxCircleDis,
            scale: state => state.config.scale,
            custom_event: state => state.config.custom_event,
        }),

        watch: {
            zoom: function(zoom_level) {
                this.zoomFactor = this.config.zoomValues[zoom_level];
                setZoom(this.canvas, this.zoomFactor, this.imgWidth, this.imgHeight);
                this.panToByMouseCoords(0, 0);
            },
            step: function(step) {
                this.handleChangedStep(step);
            },
            pierDiameter: function() {
                this.handleChangePierDiameterSize();
            },
            fPerimeterDrawCenterLine: function(fPerimeterDrawCenterLine) {
                this.handleChangedPerimeterDrawCenterLine(fPerimeterDrawCenterLine);
            },
            fRibDrawCenterLine: function(fRibDrawCenterLine) {
                this.handleChangedRibDrawCenterLine(fRibDrawCenterLine);
            },
            maxCircleDis: function(maxCircleDis) {
                this.handleChangedMaxCircleDis(maxCircleDis);
            },
            podTextSize: function() {
                this.handleChangePodTextSize();
            },
            scale: function(scale) {
                this.handleChangedScale(scale);
            },
            custom_event: function(custom_event) {
                this.handleCustomEvent(custom_event);
            },

        },

        data: function() {
            return {
                canvas: null,
                zoomFactor: 1,
                zoomPreFactor: 1,
                canvasHeight: 500,
                canvasWidth: 500,
                canvasLeft: 0,
                canvasTop: 0,
                imgHeight: 0,
                imgWidth: 0,
                mode: 'edit',
                fabricCanvasCollection: null,
                mouseDown: false,
                timeoutTriggered: false,

                mobileLine: null,
                polygon: null,
                polygonArray: new Array(),
                squareObjArray: new Array(),
                squareObjGroup: null,
                originMark: null,

                mRibLineObjArray: new Array(),
                circleObjArray: new Array(),
                mLineObjArray: new Array(),
                circleRadius: 10,

                planImage: null,

                hatchImageGroup: null,
                hatchImageArray: [],

                pierPattern: null,

            }
        },
        methods: {
            ...mapActions([
                'updateConfig',
            ]),
            sizeCanvasContainer: function() {
                var imagecanvas = $('.content-canvas')[0];
                this.canvasWidth = $($('.content-canvas')[0]).width();
                this.canvasHeight = $($('.content-canvas')[0]).height();
                // $('.canvas-container').width(this.canvasWidth);
                // $('.canvas-container').height(this.canvasHeight);
            },
            panToByMouseCoords(xDelta, yDelta) {
                self = this;
                // There are two canvases present in fabric, so we get both of them and move them
                this.getFabricCanvases().forEach(function(elementValue) {
                    elementValue = $(elementValue);
                    self.canvasTop = Number(elementValue.css("top").replace(/[^\d\.\-]/g, ''));
                    self.canvasLeft = Number(elementValue.css("left").replace(/[^\d\.\-]/g, ''));
                    self.canvasTop = zoomCalcYpos(self.canvas, self.canvasHeight, self.canvasTop + yDelta);
                    self.canvasLeft = zoomCalcXpos(self.canvas, self.canvasWidth, self.canvasLeft + xDelta);
                    /*
                    var sc = self.zoomFactor / self.zoomPreFactor;
                    self.zoomPreFactor = self.zoomFactor;
                    self.canvasTop *= sc;
                    self.canvasLeft *= sc;
                    /**/
                    elementValue.css("top", self.canvasTop);
                    elementValue.css("left", self.canvasLeft);
                });
            },
            getFabricCanvases() {
                if (!this.fabricCanvasCollection) {
                    this.fabricCanvasCollection = $('.canvas-container canvas');
                    this.fabricCanvasCollection = [];
                    var fabricCanvas = $('.canvas-container canvas');
                    const self = this;
                    fabricCanvas.each(function() {
                        self.fabricCanvasCollection.push(this);
                    });
                }
                return this.fabricCanvasCollection;
            },
            modeIs(mode) {
                return mode == this.config.mode
            },
            canvasModeIs(mode) {
                return this.mode == mode;
            },
            handleKeyDown(e) {
                if (e.keyCode == 16) { // Shift key
                    this.mode = 'pan';
                } else if (e.keyCode == 18) { //Alt Key
                    this.mode = 'expand'
                }
            },
            handleKeyUp(e) {
                if (e.keyCode == 16 || e.keyCode == 18) { // Shift or Alt key
                    if(this.config.step == "move_shape" || this.config.step == "draw_circles"){
                        if (this.selectedObject !=null) {
                            this.selectedObject.lockMovementX = false;
                            this.selectedObject.lockMovementY = false;
                            this.selectedObject=null;
                        }
                    }
                    this.mode = 'edit'
                }
            },
            handleMouseDown(options) {
                console.log("down");
                const self = this;
                var pos = {
                    x: options.e.layerX / this.zoomFactor,
                    y: options.e.layerY / this.zoomFactor
                };
                this.mouseDown = true;
                if (this.mode == 'edit') {
                    this.setPodRectPosition();
                    if (this.config.step == 'set_scale') {
                        var r = this.mobileLine.addPoint(pos.x, pos.y);
                        if (r) {
                            this.config.lineLength = this.mobileLine.getLength();
                        }
                    } else if (this.config.step == 'draw_perimeter') {
                        if (this.polygon.isFirstPointObj(options)) {
                            this.polygon.generatePolygon();
                            this.polygonArray.push(this.polygon);
                        } else {
                            var r = this.polygon.addPoint(pos.x, pos.y);
                            if (r) this.config.step = "move_shape";
                        }
                    } else if (this.config.step == 'draw_squares') {

                    } else if (this.config.step == 'hatch_squares') {
                        var squareObj = this.findSquareObj(pos.x, pos.y);
                        if (squareObj) {
                            this.squareObjGroup.remove(squareObj);
                            var f;
                            if (squareObj.fill == '') f = "#eeeeee";
                            else f = '';
                            squareObj.set({
                                fill: f,
                                opacity: 0.4
                            });
                            this.squareObjGroup.add(squareObj);
                            this.canvas.renderAll();
                        }
                    } else if (this.config.step == 'choose_origin') {
                        var squareObj = this.findSquareObj(pos.x, pos.y);
                        if (squareObj) {
                            var pos = squareObj.getCenterPoint();
                            this.createOriginMark(pos.x, pos.y);
                        }
                    } else if (this.config.step == "add_circle") {
                        if (this.config.scale > 0) {
                            var circleObj = new fabric.Circle({
                                radius: self.config.circleRadius,
                                fill: this.pierPattern,
                                class: 'pier_circle',
                                stroke: "#000000",
                                strokeWidth: 1,
                                left: pos.x - self.config.circleRadius,
                                top: pos.y - self.config.circleRadius,
                                hasControls: false,
                                hasBorders: false,
                                evented: false,
                                selectable: false,
                            });
                            circleObj.on("selected",function(){
                                if(self.config.step == "delete_object") {
                                    self.canvas.remove(this);
                                    var index = self.circleObjArray.findIndex(x => x==this);
                                    self.circleObjArray.splice(index,1);
                                    self.canvas.renderAll();
                                }
                            });
                            this.canvas.add(circleObj);
                            this.circleObjArray.push(circleObj);
                            this.canvas.renderAll();
                        }
                    }else if(this.config.step == "delete_object"){
                        var option_class = options.target.class;
                        if(option_class!='pier_circle'){
                            $.each(this.mLineObjArray, function(index, ml) {
                                var isDeletablePolyLine = ml.isDeletableObject(options);    
                                if(isDeletablePolyLine==true){
                                    self.removeSelectedPolyFromCanvas(ml);
                                    return;
                                }
                            }); 
                            $.each(this.polygonArray, function(index, poly) {
                                var isDeletablePolygon = poly.isDeletableObject(options);
                                if(isDeletablePolygon==true){
                                    self.removeSelectedPolyFromCanvas(poly);
                                    return;
                                }
                            });
                            $.each(this.mRibLineObjArray, function(index, ribline) {
                                var isDeletablePolygon = ribline.isDeletableObject(options);
                                if(isDeletablePolygon==true){
                                    self.removeSelectedPolyFromCanvas(ribline);
                                    return;
                                }
                            });
                        }
                    }
                } else if (this.mode == "expand") {
                    if (this.config.step == 'draw_perimeter') {
                        this.insertPoint2PolygonEdge(pos.x, pos.y);
                    }
                } else if ( this.mode == "pan") {
                    if(this.config.step == "move_shape" || this.config.step == "draw_circles"){
                        this.selectedObject = options.target;
                        this.selectedObject.lockMovementX =true;
                        this.selectedObject.lockMovementY = true;
                    }
                }
            },
            handleMouseMove(options) {
                if (this.mode == 'pan' && this.mouseDown) {
                    this.panToByMouseCoords(options.e.movementX, options.e.movementY);
                } else {
                    if (this.config.step == "draw_perimeter") {
                        this.polygon.drawPre(options);
                    }
                }
            },
            handleMouseUp(e) {
                console.log("up");
                this.mouseDown = false;
                const self = this;
                 if ( this.mode == "pan") {
                    if(this.config.step == "move_shape" || this.config.step == "draw_circles"){
                        this.selectedObject = options.target;
                        this.selectedObject.lockMovementX =true;
                        this.selectedObject.lockMovementY = true;
                    }
                }
                /*
                if(this.config.step=="set_scale")
                    this.mobileLine.setLayerOrder();
                if (this.config.step != "edit_squareContainer") {
                    $.each(this.circleObjArray, function(index, circleObj) {
                        this.canvas.bringToFront(circleObj);
                    });
                    $.each(this.polygonArray, function(index, poly) {
                        //self.canvas.setActiveObject(poly.pointObjArray[0]);
                        poly.setLayerOrder();
                    });
                    $.each(this.mLineObjArray, function(index, ml) {
                        //self.canvas.setActiveObject(ml.pointObjArray[0]);
                        ml.setLayerOrder();
                    });
                }
                /**/
            },
            handleMouseHover(e) {
               if(this.config.step == "move_shape"){
                   if(e.target.class=="circle"){
                       e.target.stroke = "rgb(0,180,0)";
                       this.canvas.renderAll();
                   }
                }
            },
            handleMouseOut(e) {
                if(this.config.step == "move_shape"){
                   if(e.target.class=="circle"){
                       e.target.stroke = "rgb(255,150,150)";
                       this.canvas.renderAll();
                   }
                }
            },
            handleDblClick(e) {
                this.insertPoint2PolygonEdge(e.layerX / this.zoomFactor, e.layerY / this.zoomFactor);
            },
            handleObjectMoving(options) {
                if(this.mode== 'edit'){
                    if (this.config.step == 'set_scale') {
                    if (this.mobileLine != null) {
                            this.mobileLine.movingEvent(options);
                            this.config.lineLength = this.mobileLine.getLength();
                        }
                    } else if (this.config.step == 'move_shape') {
                        $.each(this.polygonArray, function(index, poly) {
                            poly.movingEvent(options);
                        });
                        $.each(this.mRibLineObjArray, function(index, ribLine) {
                            ribLine.movingEvent(options);
                        });
                    } else if (this.config.step == 'draw_circles') {
                        $.each(this.mLineObjArray, function(index, ml) {
                            ml.movingEvent(options);
                        });
                    } else if(this.config.step == 'delete_object') {
                            //self.stopDragging(options.target);
                        //options.preventDefault();
                    }
                }else if(this.mode == "pan"){
                }
            },
            handleObjectSelection(options) {
                if(options.target.id == 'firstpodtext') {
                    this.firstPodRect.visible = false;
                }else if(options.target.id == 'secondpodtext') {
                    this.secondPodRect.visible = false;
                }
            },
            handleObjectScaling(options) {
                if (this.config.step == 'edit_squareContainer') {
                    if (options.target && this.squareObjGroup) {
                        if (options.target.id == this.squareObjGroup.id) {
                            $.each(this.squareObjArray, (index, sq) => {
                                sq.left = sq.fixedLeft / this.squareObjGroup.scaleX;
                                sq.top = sq.fixedTop / this.squareObjGroup.scaleY;
                                sq.setScaleX(1 / this.squareObjGroup.scaleX);
                                sq.setScaleY(1 / this.squareObjGroup.scaleY);
                            });
                        }
                    }
                }
            },
            handleChangedStep(step) {
                console.log(step);
                const self = this;
                if (this.config.preStep == "set_scale" || step == "set_scale") {
                    if (this.mobileLine != null) {
                        this.mobileLine.setVisible(this.config.step == 'set_scale');
                    }
                }
                if (this.config.preStep == "move_shape" || step == "move_shape" ||
                    this.config.preStep == "draw_perimeter" || step == "draw_perimeter") {
                    $.each(this.polygonArray, function(index, poly) {
                        poly.setSelectable(self.config.step == 'move_shape');
                        poly.polygonObj1.visible = self.config.fPerimeterDrawCenterLine;
                    });
                }
                if(this.config.preStep == "move_shape" || step == "move_shape" ||
                   this.config.preStep == "draw_ribline" || this.config.step == "draw_ribline"){
                    $.each(this.mRibLineObjArray, function(index, ribline) {
                        ribline.setSelectable(self.config.step == 'move_shape');
                        ribline.polygonObj1.visible = self.config.fRibDrawCenterLine;
                    });
                }
                if (this.config.preStep == "draw_circles" || step == "draw_circles" ) {
                    var b = step == "draw_circles";
                    $.each(this.mLineObjArray, function(index, ml) {
                        ml.setSelectable(b);    
                    });
                    $.each(this.circleObjArray, function(index, circleObj) {
                        circleObj.evented = b;
                        circleObj.selectable = b;
                    });
                }
                if (this.config.preStep == "delete_object" || step == "delete_object") {
                    var b = step == "delete_object";
                    $.each(this.mLineObjArray, function(index, ml) {
                        ml.showObjectMode(b);    
                    });
                    $.each(this.circleObjArray, function(index, circleObj) {
                        circleObj.evented = b;
                        circleObj.selectable = b;
                    });
                    $.each(this.polygonArray, function(index, poly) {
                        poly.showObjectMode(b);
                    });
                    $.each(this.mRibLineObjArray, function(index, ribLine) {
                        ribLine.showObjectMode(b);
                    });
                }
                if(step =="draw_squares"){
                    self.firstPodInput.visible = true;
                    self.secondPodInput.visible = true;
                    self.firstPodRect.visible = true;
                    self.secondPodRect.visible = true;
                    //self.firstPodInput.set('active',true);
                    //self.secondPodInput.set('active',true);
                }
                if (this.config.preStep == "edit_squareContainer" && step == "draw_squares") {
                    this.completeSquareContainer();
                }
                if (this.config.step == "draw_perimeter" || this.config.step == "draw_perimeter_hatched") {
                    /*
                    this.polygon=createCanvasPolygon(this.canvas,this._squarePadding/this.config.scale);
                    /**/
                    this.polygon = createCanvasPolygon(this.canvas, this._squarePadding / this.config.scale);
                    this.polygon.isHatched = this.config.step == "draw_perimeter_hatched";
                    this.polygon.outerStroke = "rgb(255, 0, 0)";
                    if (this.polygon.isHatched)
                        this.polygon.innerStroke = "rgb(255, 0, 0)";
                    else
                        this.polygon.innerStroke = "rgb(0, 0, 0)";
                    this.polygon.pointStroke = "rgb(255, 150, 150)";
                    var l = -self.canvasLeft / self.zoomFactor;
                    var t = -self.canvasTop / self.zoomFactor;
                    var points = [{
                        x: l,
                        y: t
                    }, {
                        x: l,
                        y: t + 200
                    }, {
                        x: l + 200,
                        y: t + 200
                    }, {
                        x: l + 200,
                        y: t
                    }, ];
                    this.polygon.setPoints(points);
                    this.config.step = 'move_shape';
                    this.polygonArray.push(this.polygon);
                    this.polygon.generatePolygon();
                    this.polygon.setLayerOrder();
                    this.handleChangedPerimeterDrawCenterLine();
                } else if (this.config.step == "draw_ribline"){
                    this.ribLine = createCanvasPolygon(this.canvas, this._squarePadding / this.config.scale);
                    this.ribLine.isClosed = false;
                    this.ribLine.outerStroke = "rgb(0, 0, 0)";
                    this.ribLine.innerStroke = "rgb(0, 0, 0)";
                    this.ribLine.pointStroke = "rgb(255, 150, 150)";
                    var l = -self.canvasLeft / self.zoomFactor;
                    var t = -self.canvasTop / self.zoomFactor ;
                    this.ribLine.setPoints([{
                        x: l + 100,
                        y: t + 10
                    },{
                        x: l + 100,
                        y: t + 200
                    }]);
                    this.mRibLineObjArray.push(this.ribLine);
                    this.ribLine.setLayerOrder();
                    this.config.step = 'move_shape';
                } else if (this.config.step == "add_circlePath") {
                    var mLine = createCanvasPolygon(this.canvas);
                    mLine.midMaxDis = self.config.maxCircleDis / self.config.scale;
                    mLine.circleRadius = self.config.circleRadius;
                    mLine.isClosed = false;
                    mLine.isPath = true;
                    mLine.pointFill = this.pierPattern;
                    mLine.pointStrokeColor = "#333333";
                    mLine.pointOpacity = 0.5;
                    var l = -self.canvasLeft / self.zoomFactor + 10;
                    var t = -self.canvasTop / self.zoomFactor + 10;
                    mLine.setPoints([{
                        x: l,
                        y: t
                    }, {
                        x: l + 100,
                        y: t + 100
                    }]);
                    this.mLineObjArray.push(mLine);
                    mLine.setLayerOrder();
                    this.config.step = 'draw_circles';
                } else if (this.config.step == "edit_squareContainer") {
                    var g = this.createSquareContainer();
                } else if (this.config.step == "start") {
                    //this.removeSquaresFromCanvas();
                    if (this.squareObjGroup) {
                        this.squareObjGroup.selectable = false;
                        this.squareObjGroup.evented = false;
                    }
                }
                this.config.preStep = step;
                this.canvas.renderAll();
            },
            handleChangedPerimeterDrawCenterLine(f) {
                const self = this;
                $.each(this.polygonArray, function(index, poly) {
                    poly.polygonObj1.visible = self.config.fPerimeterDrawCenterLine;
                });
                this.canvas.renderAll();
            },
            handleChangedRibDrawCenterLine(f) {
                const self = this;
                $.each(this.mRibLineObjArray, function(index, ribline) {
                    ribline.polygonObj1.visible = self.config.fRibDrawCenterLine;
                });
                this.canvas.renderAll();
            },
            handleChangePierDiameterSize() {
                var self = this;
                $.each(this.circleObjArray,function(index,circleObj) {
                    circleObj.set({
                        radius: self.config.circleRadius
                    });
                });
                $.each(this.mLineObjArray, function(index, ml) {
                    ml.createMidPointObjArray(self.config.maxCircleDis / self.config.scale, self.config.circleRadius);
                });
                this.canvas.renderAll();
            },
            handleChangePodTextSize() {
                this.firstPodInput.fontSize = this.config.podTextSize;
                this.secondPodInput.fontSize = this.config.podTextSize;
                this.canvas.renderAll();
            },
            handleChangedMaxCircleDis(maxCircleDis) {
                if (maxCircleDis < 5) return;
                const self = this;
                $.each(this.mLineObjArray, function(index, ml) {
                    ml.createMidPointObjArray(self.config.maxCircleDis / self.config.scale, self.config.circleRadius);
                });
                this.canvas.renderAll();
            },
            handleChangedScale(scale) {
                const self = this;
                $.each(this.polygonArray, function(index, poly) {
                    poly.setPadding(self._squarePadding / scale);
                });
                $.each(this.mRibLineObjArray,function(index,ribLine){
                    ribLine.setRibLinePadding(self._squarePadding / scale);
                });
                self.config.circleRadius = Math.round(self.config.pierDiameter / (2*self.config.scale));
                $.each(this.circleObjArray, function(index, circleObj) {
                    circleObj.set({
                        radius: self.config.circleRadius
                    });
                });
                this.handleChangedMaxCircleDis(1000);
            },
            handleCustomEvent(custom_event) {
                if (custom_event == "" || custom_event == null || custom_event == undefined) return;
                this.config.custom_event = "";
            },
            setPodRectPosition() {
                if(this.firstPodInput.visible == true && this.secondPodInput.visible == true) {
                    var first_active = this.firstPodInput.get('active');
                    var second_active = this.secondPodInput.get('active');
                    if(!first_active) {
                        this.firstPodRect.left = this.firstPodInput.left-5;
                        this.firstPodRect.top = this.firstPodInput.top-5;
                        this.firstPodRect.angle = this.firstPodInput.angle;
                        this.firstPodRect.width = this.firstPodInput.width+10;
                        this.firstPodRect.height = this.firstPodInput.height+10;
                        this.firstPodRect.visible = true;
                    }
                    if(!second_active) {
                        this.secondPodRect.left = this.secondPodInput.left-5;
                        this.secondPodRect.top = this.secondPodInput.top-5;
                        this.secondPodRect.angle = this.secondPodInput.angle;
                        this.secondPodRect.width = this.secondPodInput.width + 10;
                        this.secondPodRect.height = this.secondPodInput.height + 10;
                        this.secondPodRect.visible = true;
                    }
                    this.canvas.renderAll();
                }
            },
            insertPoint2PolygonEdge(x, y) {
                var t = (new Date).getTime();
                const self = this;
                if (this.config.step == 'move_shape') {
                    for (var i = 0; i < this.polygonArray.length; i++) {
                        var r = this.polygonArray[i].insertPoint(x, y);
                        if (r) {
                            this.polygonArray[i].setSelectable(true);
                            self.handleChangedPerimeterDrawCenterLine();
                            self.canvas.renderAll();
                            //console.log("insertPoint2PolygonEdge=" + ((new Date).getTime() - t));
                            return;
                        }
                    }
                     for (var i = 0; i < this.mRibLineObjArray.length; i++) {
                        var r = this.mRibLineObjArray[i].insertPoint(x, y);
                        if (r) {
                            this.mRibLineObjArray[i].setSelectable(true);
                            self.handleChangedRibDrawCenterLine();
                            self.canvas.renderAll();
                            //console.log("insertPoint2PolygonEdge=" + ((new Date).getTime() - t));
                            return;
                        }
                    }
                    
                } else if (this.config.step == 'draw_circles') {
                    for (var i = 0; i < this.mLineObjArray.length; i++) {
                        var r = this.mLineObjArray[i].insertPoint(x, y);
                        if (r) {
                            this.mLineObjArray[i].setSelectable(true);
                            self.canvas.renderAll();
                            //console.log("insertPoint2PolygonEdge=" + ((new Date).getTime() - t));
                            return;
                        }
                    }
                }
            },
            findActivePolygon(id) {
                for (var i = 0; i < this.polygonArray.length; i++) {
                    if (this.polygonArray[i].polygonObj.id == id) return this.polygonArray[i];
                }
                return null;
            },
            findActiveCircleObj(x, y) {
                for (var i = 0; i < this.polygonArray.length; i++) {
                    var circleObj = this.polygonArray[i].findCircleObj(x, y);
                    if (circleObj) return circleObj;
                }
                return null;
            },
            stopDragging(element) {
                element.lockMovementX = true;
                element.lockMovementY = true;
            },
            removeSelectedPolyFromCanvas(target) {
                if(target!=null){
                    if(target.isClosed){
                        var index = this.polygonArray.findIndex(x => x==target);
                        this.polygonArray.splice(index,1);
                    }else{
                        if(target.isPath){
                            var index = this.mLineObjArray.findIndex(x => x==target);
                            this.mLineObjArray.splice(index,1);
                        }else {
                            var index = this.mRibLineObjArray.findIndex(x => x==target);
                            this.mRibLineObjArray.splice(index,1);
                        }
                    }
                    target.removeFromCanvas();    
                    target.removeMidPointsFromCanvas();
                    this.canvas.renderAll();
                }
            },
            removeSquaresFromCanvas() {
                const self = this;
                $.each(this.squareObjArray, function(index, squareObj) {
                    self.canvas.remove(squareObj);
                });
                this.squareObjArray.splice(0);
                this.canvas.remove(this.squareObjGroup);
                this.squareObjGroup = null;
            },
            createSquareContainer() {
                const self = this;
                if (this.squareObjGroup) {
                    this.squareObjGroup.set({
                        clipTo: function(ctx) {
                            ctx.rect(-10000, -10000, 20000, 20000);
                        },
                        selectable: true,
                        evented: true,
                    });

                    this.canvas.renderAll();
                    return;
                }
                if (this.config.scale <= 0) return;
                var squareInnerSize = this._squareInnerSize / this.config.scale;
                var squareMargin = this._squareMargin / this.config.scale;
                var leftTop = {
                    x: 0,
                    y: 0
                };
                var rightBottom = {
                    x: self.imgWidth,
                    y: self.imgHeight
                };
                $.each(this.polygonArray, function(index, poly) {
                    var points = poly.getPoints();
                    for (var i = 0; i < points.length; i++) {
                        if (leftTop.x > points[i].x) leftTop.x = points[i].x;
                        if (leftTop.y > points[i].y) leftTop.y = points[i].y;
                        if (rightBottom.x < points[i].x) rightBottom.x = points[i].x;
                        if (rightBottom.y < points[i].y) rightBottom.y = points[i].y;
                    }
                });
                this.removeSquaresFromCanvas();
                var expandLength = 2 * (squareInnerSize + squareMargin);
                leftTop.x -= expandLength;
                leftTop.y -= expandLength;
                rightBottom.x += expandLength;
                rightBottom.y += expandLength;
                for (var xx = leftTop.x; xx < rightBottom.x; xx += squareInnerSize + squareMargin) {
                    for (var yy = leftTop.y; yy < rightBottom.y; yy += squareInnerSize + squareMargin) {
                        var squareObj = new fabric.Rect({
                            width: squareInnerSize,
                            height: squareInnerSize,
                            left: xx,
                            top: yy,
                            fixedLeft: 0,
                            fixedTop: 0,
                            opacity: 0.8,
                            fill: '',
                            stroke: 'black',
                            strokeDashArray: [3, 3],
                            selectable: true,
                            evented: true,
                            clipName: "square_" + xx + "_" + yy,
                        });
                        self.squareObjArray.push(squareObj);
                    }
                }
                this.canvas.remove(this.squareObjGroup);
                this.squareObjGroup = new fabric.Group(self.squareObjArray, {
                    left: leftTop.x,
                    top: leftTop.y,
                    cornerSize: 10,
                    selectable: true,
                    evented: true,
                    hasScalingPoint: false,
                    centerRotation: true,
                    centerScaling: true,
                    id: 'MySquareGroupObject'
                });
                this.canvas.add(this.squareObjGroup);
                $.each(this.squareObjGroup.getObjects(), function(index, sq) {
                    sq.fixedLeft = sq.left;
                    sq.fixedTop = sq.top;
                });
                var cnames = ["tl", "ml", "bl", "mb", "br", "mr", "tr", "mt"];
                for (var i = 0; i < cnames.length; i++)
                    this.squareObjGroup.setControlVisible(cnames[i], false);
                return this.squareObjGroup;
            },
            completeSquareContainer() {
                const self = this;
                if (this.squareObjGroup) {
                    this.squareObjGroup.set({
                        clipTo: function(ctx) {
                            ctx.beginPath();
                            $.each(self.polygonArray, function(index, poly) {
                                if (poly.polygonObj) {
                                    var points = poly.getPoints2();
                                    var p = self.affineBySquareGroup(points[points.length - 1].x, points[points.length - 1].y);
                                    ctx.moveTo(p.x, p.y);
                                    for (var i = 0; i < points.length; i++) {
                                        var p = self.affineBySquareGroup(points[i].x, points[i].y);
                                        ctx.lineTo(p.x, p.y);
                                    }
                                }
                            });
                            ctx.closePath();
                        }
                    });
                    this.canvas.renderAll();
                    this.squareObjGroup.selectable = false;
                }
            },
            createOriginMark(x0, y0) {
                if (this.squareObjGroup) {
                    this.squareObjGroup.remove(this.originMark);
                    const self = this;
                    var rad = 100 / this.config.scale;
                    var lineObjArray = new Array();
                    for (var i = 0, al = -Math.PI / 2; i < 5; i++, al += Math.PI * 2 / 5) {
                        var x = x0 + rad * Math.cos(al);
                        var y = y0 + rad * Math.sin(al);
                        var lineObj = new fabric.Line([x, y, x0, y0], {
                            strokeWidth: 2,
                            fill: "black",
                            stroke: 5,
                            class: 'line',
                            originX: 'center',
                            originY: 'center',
                            selectable: false,
                            hasBorders: false,
                            hasControls: false,
                            evented: false,
                        });
                        lineObjArray.push(lineObj);
                    }
                    this.originMark = new fabric.Group(lineObjArray);
                    this.squareObjGroup.add(this.originMark);
                    this.originMark.setScaleX(1 / this.squareObjGroup.scaleX);
                    this.originMark.setScaleY(1 / this.squareObjGroup.scaleY);
                    return this.originMark;
                }
                return null;
            },
            findSquareObj(x, y) {
                if (!this.squareObjGroup) return null;
                var pos = this.affineBySquareGroup(x, y);
                pos.x *= this.squareObjGroup.scaleX;
                pos.y *= this.squareObjGroup.scaleY;
                for (var i = 0; i < this.squareObjArray.length; i++) {
                    var so = this.squareObjArray[i];
                    if (so.fixedLeft < pos.x && pos.x - so.fixedLeft < so.width &&
                        so.fixedTop < pos.y && pos.y - so.fixedTop < so.height) {
                        return so;
                    }
                }
                return null;
            },
            affineBySquareGroup(x, y) {
                var cp = this.squareObjGroup.getCenterPoint();
                var p = vRot(x - cp.x, y - cp.y, -this.squareObjGroup.angle * Math.PI / 180);
                p.x /= this.squareObjGroup.scaleX;
                p.y /= this.squareObjGroup.scaleY;
                return p;
            },
            loadHatchImageById(imageId) {
                const self = this;
                var elmImage = document.getElementById(imageId);
                if (!elmImage) return null;
                var imgArray = [];
                for (var x = 0; x < self.imgWidth; x += elmImage.width) {
                    for (var y = 0; y < self.imgHeight; y += elmImage.height) {
                        var img = new fabric.Image(elmImage, {
                            left: x,
                            top: y
                        });
                        imgArray.push(img);
                    }
                }
                var group = new fabric.Group(imgArray, {
                    left: 0,
                    top: 0,
                    selectable: false,
                    evented: false
                });
                this.canvas.add(group);
                return group;
            },
        },

        created: function() {
            const self = this;
            $(document).ready(function() {
                // set up canvas
                var canvas = new fabric.Canvas('id-canvas', {
                    imageSmoothingEnabled: false,
                    selection: true,
                    renderOnAddRemove: false
                })
                self.canvas = canvas;
                self.canvas.selection = false;
                self.zoomPre = 1;
                self.config.canvas = canvas;
                self.config.polygonArray = self.polygonArray;
                self.config.mRibLineObjArray = self.mRibLineObjArray;
                
                self.mobileLine = createCanvasMobileLine(canvas);
                //const
                self._squareInnerSize = 1090;
                self._squareMargin = 110;
                self._squarePadding = 245;

                self.selectedObject = null;

                self.firstPodText = "Refer to “TYPICAL SLAB AND FOOTING LAYOUT PLAN” and “PIERING OPTION SCHEDULE AND SITE CUT & FILL OPTIONS” for general engineering requirements, recommendations and information";
                self.secondPodText = 'If required (see 2 above), nominal piers shown are 400mm diameter at 2000mm centreline spacing\'s externally and internally (see 2 above) with foundation end bearing material as recommended in the referenced Geotechnical Report ( see "CONSTRUCTION NOTES" ) OR namely, into/onto very stiff natural mottled orange brown silty clay at approximately 600mm below existing/natural ground surface level.';
                
                // fabric.Textbox.prototype.drawBorders = function(ctx) {
                //     if (!this.hasBorders) {
                //         return this;
                //     }
                //     var wh = this._calculateCurrentDimensions(),
                //         strokeWidth = 1 / this.borderScaleFactor,
                //         width = wh.x + strokeWidth,
                //         height = wh.y + strokeWidth;
                //     ctx.save();
                //     ctx.strokeStyle = this.borderColor;
                //     this._setLineDash(ctx, this.borderDashArray, null);
                //     ctx.strokeRect(
                //         -width / 2,
                //         -height / 2,
                //         width,
                //         height
                //     );
                //     ctx.restore();
                //     return this;
                // };
                fabric.Textbox.prototype._renderControls = function(ctx, noTransform) {
                    var degreesToRadians = fabric.util.degreesToRadians;
                    if (noTransform
                        || (this.group && this.group !== this.canvas.getActiveGroup())) {
                        return;
                    }
                    var vpt = this.getViewportTransform(),
                        matrix = this.calcTransformMatrix(),
                        options;
                    matrix = fabric.util.multiplyTransformMatrices(vpt, matrix);
                    options = fabric.util.qrDecompose(matrix);
                    ctx.save();
                    ctx.translate(options.translateX, options.translateY);
                    ctx.lineWidth = 1 * this.borderScaleFactor;
                    if (!this.group) {
                        ctx.globalAlpha = this.isMoving ? this.borderOpacityWhenMoving : 1;
                    }
                    if (this.group && this.group === this.canvas.getActiveGroup()) {
                        ctx.rotate(degreesToRadians(options.angle));
                        this.drawBordersInGroup(ctx, options);
                    }
                    else {
                        ctx.rotate(degreesToRadians(this.angle));
                        this.drawBorders(ctx);
                    }
                    this.drawControls(ctx);
                    ctx.restore();
                };
                fabric.Textbox.prototype._drawObjectsControls =  function(ctx) {  
                    for (var i = 0, len = this._objects.length; i < len; ++i) {
                        if (!this._objects[i]) {
                        continue;
                        }
                        this._objects[i]._renderControls(ctx);
                    }
                 }
                self.firstPodInput = new fabric.Textbox(self.firstPodText, {
                    id:"firstpodtext",
                    left:50,
                    top:50,
                    padding: 5,
                    fontFamily: 'Helvetica',
                    width:700,
                    lineHeight: 1.1,
                    borderColor:'rgb(0,0,0)',
                    borderWidth:1,
                    visible:false,
                    fontSize:self.config.podTextSize
                });
                self.secondPodInput = new fabric.Textbox(self.secondPodText, {
                    id:"secondpodtext",
                    left:50,
                    top:150,
                    padding: 5,
                    fontFamily: 'Helvetica',
                    width:700,
                    lineHeight: 1.1,
                    borderColor:'rgb(0,0,0)',
                    borderWidth:1,
                    visible:false,
                    fontSize:self.config.podTextSize
                });
                self.firstPodRect = new fabric.Rect({
                    left: self.firstPodInput.left-5,
                    top: self.firstPodInput.top-5,
                    width: self.firstPodInput.width+10,
                    height: self.firstPodInput.height+10,
                    stroke:'rgb(0,0,0)',
                    strokeWidth:1,
                    fill: 'rgba(0,0,0,0)',
                    visible:false,
                    evented:false,
                    selectable: false,
                    hasBorders: false,
                    hasControls: false,
                });
                self.secondPodRect = new fabric.Rect({
                    left: self.secondPodInput.left-5,
                    top: self.secondPodInput.top-5,
                    width: self.secondPodInput.width+10,
                    height: self.secondPodInput.height+10,
                    stroke:'rgb(0,0,0)',
                    strokeWidth:1,
                    fill: 'rgba(0,0,0,0)',
                    visible:false,
                    evented:false,
                    selectable: false,
                    hasBorders: false,
                    hasControls: false,
                });
                canvas.on('mouse:move', function(options) {
                    self.handleMouseMove(options);
                });
                canvas.on('mouse:down', function(options) {
                    self.handleMouseDown(options);
                });
                canvas.on('mouse:up', function(options) {
                    self.handleMouseUp(options);
                });
                canvas.on('mouse:over',function(options){
                    self.handleMouseHover(options);
                });
                canvas.on('mouse:out',function(options){
                    self.handleMouseOut(options);
                });
                window.fabric.util.addListener(canvas.upperCanvasEl, 'dblclick', function(e) {
                    self.handleDblClick(e);
                });
                canvas.on('object:moving', function(options) {
                    self.handleObjectMoving(options);
                });
                canvas.on('object:selected',function(options) {
                    self.handleObjectSelection(options);
                });
                canvas.on('object:scaling', function(options) {
                    self.handleObjectScaling(options);
                });
                window.addEventListener('keydown', self.handleKeyDown);
                window.addEventListener('keyup', self.handleKeyUp);
                // load image
                fabric.Image.fromURL(plan_path, function(img) {
                    img.selectable = false
                    img.hoverCursor = 'default';
                    self.imgHeight = img.getHeight();
                    self.imgWidth = img.getWidth();
                    canvas.setHeight(img.getHeight());
                    canvas.setWidth(img.getWidth());
                    canvas.add(img);
                    canvas.renderAll();
                    self.sizeCanvasContainer();
                    self.config.planImage = self.planImage = img;

                    self.hatchImageArray = [];
                    //self.loadHatchImage(0,0);
                    var perimeterHatchGroup = self.loadHatchImageById("img-hatch");
                    if (perimeterHatchGroup) {
                        perimeterHatchGroup.set({
                            clipTo: function(ctx) {
                                var p0 = this.getCenterPoint();
                                ctx.beginPath();
                                $.each(self.polygonArray, function(index, poly) {
                                    if (poly.isHatched && poly.polygonObj) {
                                        var points = poly.getPoints2();
                                        var p = points[points.length - 1];
                                        ctx.moveTo(p.x - p0.x, p.y - p0.y);
                                        for (var i = 0; i < points.length; i++) {
                                            var p = points[i];
                                            ctx.lineTo(p.x - p0.x, p.y - p0.y);
                                        }
                                    }
                                });
                                ctx.closePath();
                            },
                        });
                    }
                    self.canvas.add(perimeterHatchGroup);
                    self.canvas.add(self.firstPodInput);
                    self.canvas.add(self.secondPodInput);
                    self.canvas.add(self.firstPodRect);
                    self.canvas.add(self.secondPodRect);
                });
                fabric.Image.fromURL(pier_stripe_path, function(img) {
                    var patternSourceCanvas = new fabric.StaticCanvas();
                    patternSourceCanvas.add(img);
                    self.pierPattern = new fabric.Pattern({
                        source: function() {
                            patternSourceCanvas.setDimensions({
                                width: img.getWidth(),
                                height: img.getHeight()
                            });
                            return patternSourceCanvas.getElement();
                        },
                        repeat: 'repeat'
                    });
                });
            });
        },
    }
</script>