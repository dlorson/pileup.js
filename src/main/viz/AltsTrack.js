/**
 * Visualization of alts and frequencies
 * @flow
 */

'use strict';

import type {VcfDataSource} from '../sources/VcfDataSource';
import type {Variant} from '../data/vcf';
import type {DataCanvasRenderingContext2D} from 'data-canvas';
import type {VizProps} from '../VisualizationWrapper';
import type {Scale} from './d3utils';

import React from 'react';
import ReactDOM from 'react-dom';

import d3utils from './d3utils';
import shallowEquals from 'shallow-equals';
import ContigInterval from '../ContigInterval';
import canvasUtils from './canvas-utils';
import dataCanvas from 'data-canvas';
import style from '../style';

import _ from 'underscore';

class Alt {

  variant: Variant;

  constructor(variant) {
    this.variant = variant;
  }

  altFrequency() {
    return this.altDepth() / (this.refDepth() + this.altDepth());
  }

  altDepth() {
    return Number(this.variant.info["AO"]);
  }

  refDepth() {
    return Number(this.variant.info["RO"]);
  }

  alt() {
    return this.variant.alt;
  }

  type () {
    return this.variant.info["AT"];
  }

  description() {
    switch (this.type()) {
      case "+":
        return "ins" + this.alt().length + " (" + this.alt() + ")";
      case "-":
        return "del" + this.alt().length + " (" + this.alt() + ")";
      case "s":
        return this.alt();
    }
  }

  ref() {
    return this.variant.ref;
  }

  position() {
    return this.variant.position;
  }

  isIndel() {
    return this.variant.ref.length > 1 || this.variant.alt.length > 1;
  }

  modLength() {
    return Math.max(Math.max(this.variant.ref.length, this.variant.alt.length) - 1, 1);
  }

}


function colorForAlt(alt) {
  return alt.isIndel() ? "#666" : style.BASE_COLORS[alt.alt()];
}

class AltsPopup extends React.Component {

  props: {};

  styleForAlt(alt) {
    return {
      color: "white",
      backgroundColor: colorForAlt(alt)
    };
  }

  totalDepth() {
    var sumAlt = _.reduce(this.props.alts, (sum, alt) => sum + alt.altDepth(), 0)
    var ref = this.props.alts[0] ? this.props.alts[0].refDepth() : 0;

    return sumAlt + ref;
  }

  renderAlt(alt) {
    return <div key={alt.alt()}>
      <b className="alt-base" style={this.styleForAlt(alt)}>{alt.description()}</b>
      <span className="alt-frequency">{(alt.altFrequency() * 100).toFixed(1)}%</span>
    </div>;
  }

  render(): any {
    var alts = this.props.alts;
    return (
      <div className="alts-popup" style={this.props.style}>
        <span>{this.props.alts[0] ? this.props.alts[0].position() : ""}</span>
        <hr/>
        <b className="ref-base" style={ { backgroundColor: "#eee", color: "#aaa"} }>{alts[0].ref()}</b>
        <span className="ref-frequency">{(alts[0].refDepth() / this.totalDepth() * 100).toFixed(1)}%</span>
        <hr/>
        { _.map(alts, alt => this.renderAlt(alt)) }
      </div>
    );
  }


}


class AltsTrack extends React.Component {

  props: VizProps & {source: VcfDataSource};
  state: any;

  constructor(props: Object) {
    super(props);
    this.state = { popup: {show: false, alts: [], x: 10, y: 10 } };
  }

  popupStyle() {
    return {
      left: this.state.popup.x,
      top: this.state.popup.y
    };
  }

  render(): any {
    return (
      <div>
        <canvas onMouseMove={this.handleMouseMove.bind(this)} />
        { this.state.popup.show ? <AltsPopup alts={this.state.popup.alts} style={this.popupStyle()} /> : null }
      </div>
    );
  }

  canvas(): any {
    var node = ReactDOM.findDOMNode(this);
    return node.getElementsByTagName("canvas")[0];
  }

  handleMouseMove(reactEvent: any) {
    var ev = reactEvent.nativeEvent,
    x = ev.offsetX,
    y = ev.offsetY,
    canvas = this.canvas(),
    ctx = canvasUtils.getContext(canvas),
    trackingCtx = new dataCanvas.ClickTrackingContext(ctx, x, y);
    this.renderScene(trackingCtx);
    var alts = trackingCtx.hit && trackingCtx.hit[0];
    this.setState({ 
      popup: { 
        show: !!alts, 
        alts: alts,
        x: Math.round(x) - 0.5,
        y: Math.round(y) + 20.5
      }
    });
  }

  componentDidMount() {
    this.updateVisualization();

    this.props.source.on('newdata', () => {
      this.updateVisualization();
    });
  }

  componentDidUpdate(prevProps: any, prevState: any) {
    if (!shallowEquals(prevProps, this.props) ||
      !shallowEquals(prevState, this.state)) {
      this.updateVisualization();
    }
  }

  getScale(): Scale {
    return d3utils.getTrackScale(this.props.range, this.props.width);
  }

  updateVisualization() {
    var canvas = this.canvas(),
    {width, height} = this.props;

    // Hold off until height & width are known.
    if (width === 0) return;

    d3utils.sizeCanvas(canvas, width, height);
    var ctx = canvasUtils.getContext(canvas);
    var dtx = dataCanvas.getDataContext(ctx);
    this.renderScene(dtx);
  }



  renderScene(ctx: DataCanvasRenderingContext2D) {

    const SNP_HEIGHT = 290;


    var scale = this.getScale(),
    height = this.props.height,
    y = height - SNP_HEIGHT - 1;


    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.reset();
    ctx.save();

    var altsByPosition = _.groupBy(this.visibleAlts(), a => a.position());

    for (const key of Object.keys(altsByPosition)) {
      var alts = _.sortBy(altsByPosition[key], a => a.refDepth());
      var position = alts[0].position();
      var x = Math.round(scale(position));
      var width = Math.round(scale(position + 1)) - 1 - x;

      ctx.pushObject(alts);

      ctx.fillStyle = style.VARIANT_FILL;
      ctx.strokeStyle = "#fff";
      ctx.fillRect(x - 0.5, y - 0.5, width, SNP_HEIGHT);
      ctx.strokeRect(x - 0.5, y - 0.5, width, SNP_HEIGHT);

      var altY = Math.round(y);

      alts.forEach(alt => {

        var height = Math.round(alt.altFrequency() * SNP_HEIGHT);
        height = Math.max(height, 2);

        ctx.fillStyle = colorForAlt(alt);
        ctx.strokeStyle = "#fff";
        ctx.fillRect(x - 0.5, altY - 0.5, width, height);
        ctx.strokeRect(x - 0.5, altY - 0.5, width, height);

        altY += height;
      })

      ctx.popObject();

    }

    ctx.restore();
  }

  visibleAlts() {
    var range = this.props.range;
    var interval = new ContigInterval(range.contig, range.start, range.stop);
    var variants = this.props.source.getFeaturesInRange(interval);
    return _.map(variants, v => new Alt(v));
  }


}


AltsTrack.displayName = 'alts';

module.exports = AltsTrack;
