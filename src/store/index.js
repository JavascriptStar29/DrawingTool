import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

const state = {
    config: {
        zoomValues: [0.1, 0.2, 0.5, 1, 2, 3, 4, 5, 6],
        zoom: 3,
        scale: 0,
        pierDiameterValues:[300,400,450,500,600],
        pierDiameter:300,
        mode: 'none',
        lineLength: 0,
        step: 'start', // start,
        // set_scale,
        // move_shape, draw_perimeter, draw_perimeter_hatched
        // draw_square, edit_squareContainer, choose_origin, hatch_squares
        // draw_circles, add_circle, add_circlePath
        circleRadius:10,
        preStep: "start",
        podTextSize : 14,
        fPerimeterDrawCenterLine: true,
        fRibDrawCenterLine: true,
        maxCircleDis: 1000,
        canvas: null,
        planImage: null,
        polygonArray: null,
        proposal_id: proposal_id,
        asset_id: asset_id,
        render: null,

    },
};

const mutations = {
    updateConfig(state, { config }) {
        state.config = config
    },
    canvas2png(state) {
        state.config.planImage.setVisible(false);
        $.each(state.config.polygonArray, function(index, poly) {
            poly.outerStroke = "#000000";
            if (poly.isHatched)
                poly.innerStroke = "#000000";
            poly.generatePolygon();
        });
        $.each(state.config.mRibLineObjArray, function(index, mRibLine) {
            mRibLine.polygonObj1.stroke = "#000000";
        });
        
        state.config.canvas.renderAll();
        state.config.render = state.config.canvas.toDataURL('png');
        window.open(state.config.render);
        $.each(state.config.polygonArray, function(index, poly) {
            poly.outerStroke = "#FF0000";
            if (poly.isHatched)
                poly.innerStroke = "#FF0000";
            poly.generatePolygon();
        });
        $.each(state.config.mRibLineObjArray, function(index, mRibLine) {
            mRibLine.polygonObj1.stroke = "rgb(0,180,0)";
        });
        state.config.planImage.setVisible(true);
        state.config.canvas.renderAll();
    },
};

const actions = {
    updateConfig({ commit }, payload) {
        commit('updateConfig', payload);
    },
    canvas2png({ commit, state }, payload) {
        commit('canvas2png', payload);
        const data = {
            render: state.config.render
        };
        $.post('/admin/drawing/submit/' + state.config.asset_id, data, function() {
            window.alert('Successful render!')
        });
    },
    done({ commit, state }, payload) {
        window.location.href = '/admin/proposals/edit/' + state.config.proposal_id;
    },
};

let store = new Vuex.Store({
    state,
    mutations,
    actions
});

export default store;