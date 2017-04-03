<template>
    <div class="toolbar">
        <div class="switch-field">
            <div class="switch-title">Zoom</div>
            <div v-for="n in config.zoomValues.length-1">
                <input type="radio" :id="n+'_zoom'" name="zoom" :value="n" :checked="config.zoom === n" @change="updateZoom" />
                <label :id="n+'_zoom_lbl'" :for="n+'_zoom'" class="zoomLabel" :style="'color:'+(zoomIs(n)?'#00A8E8':'#555')+';'">&times; {{ config.zoomValues[n] }}</label>
            </div>
        </div>
        <div class="toolbar-field">
            <input type="checkbox" v-model="config.fPerimeterDrawCenterLine" id="id-drawcenterline" />
            <label for="id-drawcenterline">Draw Perimeter Center Lines</label>
        </div>
        <div class="toolbar-field">
            <input type="checkbox" v-model="config.fRibDrawCenterLine" id="id-drawcenterline" />
            <label for="id-drawcenterline">Draw Rib line Center Line</label>
        </div>
        <div>
            <button :disabled="!stepIs('start')" @click="removeObject" v-show="!stepIs('delete_object')">Delete Objects</button>
            <button  @click="doneDeleting" v-show="stepIs('delete_object')">Stop Deleting</button>
        </div>
        <br/>
        <div class="step">
            <div class="step-title">Step 1 - Scale</div>
            Scale: 1px:{{ config.scale }}mm<br>
            <button :disabled="!stepIs('start')" v-show="!stepIs('set_scale')" @click="setStep('set_scale')">Set Scale</button>
            <div v-show="stepIs('set_scale')">
                <br/>
                <div>
                    Draw a line on the plan and the input the real length(mm) of that line below.
                </div>
                <br/>
                <div class="inputvalue">
                    <label for="real_length">Real length:</label>
                    <input type="text" id="real_length" v-model="physicalLength">
                    <span style="display: block; clear: both;"></span>
                </div>
                <button @click="doneScale">Done</button>
            </div>
        </div>
        <div class="step">
            <div class="step-title">Step 2 - perimeter</div>
            <div>
                <button :disabled="!stepIs('start')" @click="setStep('move_shape')" v-show="!stepIs('move_shape')&&!stepIs('draw_perimeter')">Draw Perimeter</button>
            </div>
            <div v-show="stepIs('move_shape')||stepIs('draw_perimeter')">
                <div class="toolbar-field">
                    <button @click="addShape" :disabled="!stepIs('move_shape') || config.scale<=0">Add Shape</button>
                </div>
                <div class="toolbar-field">
                    <button @click="addHatchedShape" :disabled="!stepIs('move_shape') || config.scale<=0">Add Hatched Shape</button>
                </div>
                <div class="toolbar-field">
                    <button @click="addRibLine" :disabled="!stepIs('move_shape') || config.scale<=0">Add Rib Line</button>
                </div>
                <div class="toolbar-field">
                    <button @click="donePerimeter">Done</button>
                </div>
            </div>
        </div>
        <div class="step">
            <div class="step-title">Step 3 - Pods</div>
            <button :disabled="!stepIs('start')" @click="setStep('draw_squares')" v-show="!stepIsSquareSteps()">Draw Pods</button>

            <div v-show="stepIsSquareSteps()">
                <div class="toolbar-field">
                    <button :disabled="!stepIs('draw_squares')" @click="setStep('edit_squareContainer')" v-show="stepIsSquareSteps()">
            Edit pod container</button>
                    <button @click="setStep('draw_squares')" v-show="stepIs('edit_squareContainer')">Completed</button>
                </div>
                <div class="toolbar-field">
                    <button :disabled="!stepIs('draw_squares')" @click="setStep('choose_origin')" v-show="stepIsSquareSteps()">Choose origin</button>
                    <button @click="setStep('draw_squares')" v-show="stepIs('choose_origin')">Completed</button>
                </div>
                <div class="toolbar-field" v-show="false">
                    <button :disabled="!stepIs('draw_squares')" @click="setStep('hatch_squares')" v-show="stepIsSquareSteps()">Hatch squares</button>
                    <button @click="setStep('draw_squares')" v-show="stepIs('hatch_squares')">Completed</button>
                </div>
                <div class="toolbar-field">
                    Text Size
                </div>
                <div class="toolbar-field">
                    <input type="text" id="podtext_size" v-model="podTextSize">
                </div>
            </div>

            <button @click="doneSquares" v-show="stepIsSquareSteps()">Done</button>
        </div>
        <div class="step">
            <div class="step-title">Step 4 - Piers</div>
            <button :disabled="!stepIs('start')" @click="setStep('draw_circles')" v-show="!stepIs('draw_circles')">Draw Piers</button>
            <div class="toolbar-field">
                <div v-show="stepIs('draw_circles')">Maximum pier distance(mm)</div>
                <input v-show="stepIs('draw_circles')" type="text" v-model="config.maxCircleDis">
                <div v-show="stepIs('draw_circles')">Pier Diameter(mm)</div>
                <select v-show="stepIs('draw_circles')" class="diameterSelect" v-model="config.pierDiameter" @change="changeDiameter">
                    <option v-for="diameter in config.pierDiameterValues"> {{diameter}} </option>
                </select>
                <div v-show="stepIs('draw_circles')" class="toolbar-field"><button @click="addCircle()" :disabled="config.scale<=0">Add pier</button></div>
                <div v-show="stepIs('add_circle')" class="toolbar-field"><button @click="stopAddingCircle()">Stop Adding Piers</button></div>
                <div v-show="stepIs('draw_circles')" class="toolbar-field"><button @click="addCirclePath()" :disabled="config.scale<=0">Add pier path</button></div>
                <div v-show="stepIs('draw_circles')" class="toolbar-field"><button @click="doneCircle()">Done</button></div>
            </div>
        </div>
        <div class="step">
            <div class="step-title">Completion</div>
            <div class="toolbar-field">
                <button @click="render()">Render</button>
                <button @click="done()">Done</button>
            </div>
        </div>
    </div>
</template>

<script>
    import {
        mapState,
        mapActions
    } from 'vuex'

    export default {
        computed: {
            ...mapState({
                config: state => state.config,
                lineLength: state => state.config.lineLength,
                podTextSize: state => state.config.podTextSize,
                shapeCount: state => state.shapeCount,
            })
        },
        watch: {
            lineLength: function(lineLength) {
                this.calcScale();
            },
            physicalLength: function(val, oldVal) {
                this.calcScale();
            },
            podTextSize: function(val , oldVal) {
                this.setPodTextSize();
            }
        },
        methods: {
            ...mapActions([
                'updateConfig',
            ]),
            changeDiameter() {
                this.config.circleRadius = Math.round(this.config.pierDiameter / (2*this.config.scale));
            },
            updateZoom(e) {
                this.config.zoom = e.target.value;
            },
            doneScale() {
                if (this.calcScale())
                    this.setStep('start');
            },
            setStep(step) {
                this.config.step = step; //this.updateConfig({ config: this.config });
            },
            stepIs(step) {
                return step == this.config.step;
            },
            stepIsSquareSteps() {
                return this.config.step == "draw_squares" ||
                    this.config.step == "edit_squareContainer" ||
                    this.config.step == "choose_origin" ||
                    this.config.step == "hatch_squares";
            },
            zoomIs(zoom) {
                return zoom == this.config.zoom;
            },
            calcScale() {
                var pl = parseInt(this.physicalLength);
                if (this.config.lineLength > 0 && pl > 0) {
                    var s = pl / this.config.lineLength;
                    if (s < 3) return false;
                    this.config.scale = Math.round(s * 100) / 100;
                    return true;
                }
                return false;
            },
            setPodTextSize() {
                var text_size = parseInt(this.podTextSize);
                if (text_size>0) {
                    this.config.podTextSize = text_size;
                    return true;
                }
                return false;
            },
            donePerimeter() {
                this.setStep("start");
            },
            addShape() {
                this.setStep("draw_perimeter");
            },
            addHatchedShape() {
                this.setStep("draw_perimeter_hatched");
            },
            addRibLine() {
                this.setStep("draw_ribline");
            },
            doneSquares() {
                this.setStep("start");
            },
            addCirclePath() {
                this.setStep("add_circlePath");
            },
            addCircle() {
                this.setStep("add_circle");
            },
            stopAddingCircle() {
                this.setStep("draw_circles");
            },
            doneCircle() {
                this.setStep("start");
            },
            removeObject() {
                this.setStep("delete_object");
            },
            doneDeleting(){
                this.setStep("start");
            },
            render() {
                this.$store.dispatch('canvas2png');
            },
            done() {
                this.$store.dispatch('done');
            }
        },

        data: function() {
            return {
                physicalLength: '',
                podTextSize:'14'
            };
        },
    }
</script>

<style>
    .toolbar {
        width: 250px;
        position: fixed;
        top: 0;
        left: 0;
        height: 100%;
        padding: 10px;
        box-sizing: border-box;
        background-color: #eee;
        border-right: 3px solid #ddd;
        color: #555;
    }
    
    button {
        border: none;
        border-radius: 5px;
        background-color: #999;
        color: white;
        padding: 8px 10px;
        font-size: 80%;
        font-family: 'Quattrocento Sans', sans-serif;
        cursor: pointer;
    }
    
    button:hover {
        background-color: #aaa;
    }
    
    button[disabled] {
        opacity: 0.5;
    }
    
    .on {
        background-color: #247BA0;
        color: white;
    }
    
    .switch-field {
        overflow: hidden;
    }
    
    .switch-title {
        margin-bottom: 6px;
    }
    
    .switch-field input {
        display: none;
    }
    
    .switch-field label {
        float: left;
    }
    
    .switch-field label {
        display: inline-block;
        background-color: #e4e4e4;
        color: #555;
        font-weight: normal;
        text-align: center;
        text-shadow: none;
        padding: 5px;
    }
    
    .switch-field label:hover {
        cursor: pointer;
    }
    
    .toolbar-field {
        margin-bottom: 5px;
        margin-top: 5px;
    }
    
    .step {
        display: inline-block;
        margin-bottom: 20px;
    }
    
    .step-title {
        font-size: 120%;
        text-transform: uppercase;
        margin-bottom: 5px;
    }
    
    input[type=text] {
        padding: 0 10px;
        font-size: 80%;
        font-family: 'Quattrocento Sans', sans-serif;
        border: 3px solid #ddd;
        line-height: 2.2em;
    }
    
    select {
        -webkit-appearance:none;
        -moz-appearance:none;
        appearance:none;
        padding: 0 10px;
        font-size: 80%;
        font-family: 'Quattrocento Sans', sans-serif;
        border: 3px solid #ddd;
        line-height: 2.2em;
    }
    
    div.inputvalue input[type=text] {
        width: 40%;
        float: right;
    }
    
    div.inputvalue label {
        float: left;
        line-height: 2.2em;
    }
    
    .zoomLabel {
        font-size: 0.8em
    }
    
    /*.diameterSelect {
        font-size: 0.8em;
        padding: 3px;
        margin-left: 4px;
    }*/
</style>