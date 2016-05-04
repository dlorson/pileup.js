/**
 * Visualization of variants
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

function colorForImportance(importance) {

  var colors = ['#008080','#2d8f83','#47a084','#5eaf84','#75bf81','#8ecf7c','#a8de73','#c6ed62','#e8fa40','#ffee2f','#ffcd4d','#ffac5b','#f78a60','#ea6b5c','#da4c52','#c42e41','#ab1228','#8b0000']

  if (!importance && importance != 0)
    return '#aaaaaa';

  var idx = Math.round(importance * colors.length);
  idx = Math.min(idx, colors.length - 1);

  return colors[idx];
}

class VariantTrack extends React.Component {
  props: VizProps & {source: VcfDataSource};
  state: void;  // no state

  constructor(props: Object) {
    super(props);
  }

  render(): any {
    return <canvas onClick={this.handleClick.bind(this)} />;
  }

  componentDidMount() {
    this.updateVisualization();

    this.props.source.on('newdata', () => {
      this.updateVisualization();
    });
  }

  getScale(): Scale {
    return d3utils.getTrackScale(this.props.range, this.props.width);
  }

  componentDidUpdate(prevProps: any, prevState: any) {
    if (!shallowEquals(prevProps, this.props) ||
        !shallowEquals(prevState, this.state)) {
      this.updateVisualization();
    }
  }

  updateVisualization() {
    var canvas = ReactDOM.findDOMNode(this),
        {width, height} = this.props;

    // Hold off until height & width are known.
    if (width === 0) return;

    d3utils.sizeCanvas(canvas, width, height);
    var ctx = canvasUtils.getContext(canvas);
    var dtx = dataCanvas.getDataContext(ctx);
    this.renderScene(dtx);
  }

  renderScene(ctx: DataCanvasRenderingContext2D) {
    var range = this.props.range,
        interval = new ContigInterval(range.contig, range.start, range.stop),
        variants = this.props.source.getFeaturesInRange(interval),
        scale = this.getScale(),
        height = this.props.height,
        y = 4;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.reset();
    ctx.save();

    var level = 0;
    var previousX = -10000;

    variants.forEach(variant => {
      ctx.pushObject(variant);
      var x = Math.round(scale(variant.position));
      var width = Math.max(Math.round(scale(variant.position + 1)) - 1 - x, 1);

      ctx.fillStyle = colorForImportance(variant.info["IMPORTANCE"]);
      ctx.fillRect(x, y, width, style.VARIANT_HEIGHT);

      var text = variant.info["TITLE"];

      var textWidth = ctx.measureText(text).width;

      if (previousX > x + width * 0.5 - textWidth * 0.5 && level < 6) {
        level += 1;
      } else {
        level = 0;
      }

      var textX = x - textWidth * 0.5 + width * 0.5;
      var textY = y + style.VARIANT_HEIGHT + 12 + level * 10;

      previousX = x + textWidth * 0.5 + width * 0.5 + 2;
      ctx.fillStyle = "white";
      ctx.fillRect(textX, textY - 9, textWidth, 9);
      ctx.fillStyle = "black";
      ctx.fillText(text, textX, textY);
      ctx.popObject();

    });

    ctx.restore();
  }

  handleClick(reactEvent: any) {
    var ev = reactEvent.nativeEvent,
        x = ev.offsetX,
        y = ev.offsetY,
        canvas = ReactDOM.findDOMNode(this),
        ctx = canvasUtils.getContext(canvas),
        trackingCtx = new dataCanvas.ClickTrackingContext(ctx, x, y);
    this.renderScene(trackingCtx);
    var variant = trackingCtx.hit && trackingCtx.hit[0];
    var alert = window.alert || console.log;
    if (variant && variant.info && variant.info["LINK"]) {
      window.open(variant.info["LINK"]);
    }
  }
}

VariantTrack.displayName = 'variants';

module.exports = VariantTrack;
