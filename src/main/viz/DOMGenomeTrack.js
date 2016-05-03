/**
 * A track which displays a reference genome.
 * @flow
 */
'use strict';

import type {VizProps} from '../VisualizationWrapper';
import type {TwoBitSource} from '../sources/TwoBitDataSource';
import type {Scale} from './d3utils';

import React from 'react';
import ReactDOM from 'react-dom';
import shallowEquals from 'shallow-equals';
import ContigInterval from '../ContigInterval';
import DisplayMode from './DisplayMode';
import style from '../style';
import d3utils from './d3utils';

class DOMGenomeTrack extends React.Component {
  props: VizProps & {source: TwoBitSource};
  state: void;  // no state


  renderBase(base, start, scale, i): any {
    var prevCenter = scale(start + i + 0.5);
    var center = scale(start + i + 1 + 0.5);
    var width = center - prevCenter;
    var s = { 
      color: style.BASE_COLORS[base],
      left: (center - width*0.5) + "px",
      textAlign: "center",
      position: "absolute",
      width: width + "px"
    };
    return <div key={i} style={s}>{base}</div>;
  }


  render(): any {

    var start = this.props.range.start;
    var scale = this.getScale();

    var pxPerLetter = scale(1) - scale(0);
    var mode = DisplayMode.getDisplayMode(pxPerLetter);
    var showText = DisplayMode.isText(mode);

    var baseEls = [];

    if (showText)
      baseEls = this.props.source.getRangeAsString(this.props.range).split("").map((base, i) => this.renderBase(base, start, scale, i));

    return <div>
      <div className="fwd" ref="fwd" style={ {width: this.props.width, height: this.props.height} }>
        {baseEls}
      </div>
    </div>;
  }

  componentDidMount() {
    // Visualize new reference data as it comes in from the network.
    this.props.source.on('newdata', range => {
      this.updateVisualization();
    });

    this.updateVisualization();
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
    this.forceUpdate();
  }

}

DOMGenomeTrack.displayName = 'dom-reference';

module.exports = DOMGenomeTrack;
