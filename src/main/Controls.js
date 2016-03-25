/**
 * Controls for zooming to particular ranges of the genome.
 * @flow
 */
'use strict';

import type {PartialGenomeRange} from './types';

import React from 'react';
import _ from 'underscore';

import utils from './utils';
import Interval from './Interval';
import type {BigBedDataSource} from './sources/BigBedDataSource';

type Props = {
  range: ?GenomeRange;
  regionSource: BigBedDataSource;
  contigList: string[];
  onChange: (newRange: GenomeRange)=>void;
};

class Controls extends React.Component {
  props: Props;
  state: void;  // no state

  constructor(props: Object) {
    super(props);
  }

  makeRange(): GenomeRange {
    return {
      contig: this.refs.contig.value,
      start: Number(this.refs.start.value),
      stop: Number(this.refs.stop.value)
    };
  }

  completeRange(range: ?PartialGenomeRange): GenomeRange {
    range = range || {};
    if (range.start && range.stop === undefined) {
      // Construct a range centered around a value. This matches IGV.
      range.stop = range.start + 20;
      range.start -= 20;
    }

    if (range.contig) {
      // There are major performance issues with having a 'chr' mismatch in the
      // global location object.
      const contig = range.contig;
      var altContig = _.find(this.props.contigList, ref => utils.isChrMatch(contig, ref));
      if (altContig) range.contig = altContig;
    }

    return (_.extend({}, this.props.range, range) : any);
  }

  handleContigChange(e: SyntheticEvent) {
    this.props.onChange(this.completeRange({contig: this.refs.contig.value}));
  }

  handleRegionChange(e: SyntheticEvent) {
    var gene = _.findWhere(this.props.regionSource.getGenes(), { id: this.refs.region.value });
    if (!gene) {
      return;
    }

    var range = {
      contig: gene.position.contig,
      start: gene.position.interval.start - 100,
      stop: gene.position.interval.stop + 100
    };

    this.props.onChange(range);
  }

  handleFormSubmit(e: SyntheticEvent) {
    e.preventDefault();
    var range = this.completeRange(utils.parseRange(this.refs.position.value));
    this.props.onChange(range);
  }

  // Sets the values of the input elements to match `props.range`.
  updateRangeUI() {
    const r = this.props.range;
    if (!r) return;

    this.refs.position.value = utils.formatInterval(new Interval(r.start, r.stop));

    if (this.props.contigList) {
      var contigIdx = this.props.contigList.indexOf(r.contig);
      this.refs.contig.selectedIndex = contigIdx;
    }
  }

  zoomIn(e: any) {
    e.preventDefault();
    this.zoomByFactor(0.5);
  }

  zoomOut(e: any) {
    e.preventDefault();
    this.zoomByFactor(2.0);
  }

  zoomByFactor(factor: number) {
    var r = this.props.range;
    if (!r) return;

    var iv = utils.scaleRange(new Interval(r.start, r.stop), factor);
    this.props.onChange({
      contig: r.contig,
      start: iv.start,
      stop: iv.stop
    });
  }

  render(): any {
    var contigOptions = this.props.contigList
        ? this.props.contigList.map((contig, i) => <option key={i}>{contig}</option>)
        : null;

    var regionOptions = this.props.regionSource.getGenes().map((gene, i) => <option key={i}>{gene.id}</option>);

    // Note: input values are set in componentDidUpdate.
    return (
      <form className='controls' onSubmit={this.handleFormSubmit.bind(this)}>
        <select ref='region' onChange={this.handleRegionChange.bind(this)}>
          <option key="-1">Select a region...</option>
          {regionOptions}
        </select>{' '}
        <select ref='contig' onChange={this.handleContigChange.bind(this)}>
          {contigOptions}
        </select>{' '}
        <input ref='position' type='text' />{' '}
        <button className='btn-submit' onClick={this.handleFormSubmit.bind(this)}>Go</button>{' '}
        <div className='zoom-controls'>
          <button className='btn-zoom-out' onClick={this.zoomOut.bind(this)}></button>{' '}
          <button className='btn-zoom-in' onClick={this.zoomIn.bind(this)}></button>
        </div>
      </form>
    );
  }

  componentDidUpdate(prevProps: Object) {
    if (!_.isEqual(prevProps.range, this.props.range)) {
      this.updateRangeUI();
    }
  }

  componentDidMount() {
    this.updateRangeUI();
    this.props.regionSource.on('newdata', () => {
      this.forceUpdate();
    });
    this.props.regionSource.fetchAll();
  }
}

module.exports = Controls;
