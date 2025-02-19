import React, { Component } from 'react'
import { Link } from 'react-router-dom'
import { buildApi, createRendererEvent, getActionByType, runAction } from 'amis';
import utils from "utils";

export default class LinkRenderer extends Component {
  static instanceCount = 0;
  static isPressCtrl = false;
  constructor(props) {
    super(props);
    this.inputRef = React.createRef();
    const mergeData = utils.extend({}, this.props.context.props.data, this.props.data);
    const url = this.props.to || this.props.url || this.props.link;
    this.url = url ? buildApi(url, mergeData).url : '';
    this.target = this.props.target || (this.props.blank ? '_blank' : '_self');
    LinkRenderer.isPressCtrl = false;
  }

  setKeyDown(e) {
    if (e && (e.key === 'Control' || e.key === 'Shift') && LinkRenderer.isPressCtrl !== true)
      LinkRenderer.isPressCtrl = true;
  }

  setKeyUp() {
    if (LinkRenderer.isPressCtrl !== false)
      LinkRenderer.isPressCtrl = false;
  }

  componentDidMount() {
    LinkRenderer.instanceCount++;
    window.addEventListener('keydown', this.setKeyDown);
    window.addEventListener('keyup', this.setKeyUp);
    window.onblur = this.setKeyUp;
  }

  componentWillUnmount() {
    LinkRenderer.instanceCount--;
    if (LinkRenderer.instanceCount === 0) {
      window.removeEventListener('keydown', this.setKeyDown)
      window.removeEventListener('keyup', this.setKeyUp)
      window.onblur = null;
    }
  }

  refresh(params) {
    
  }

  dispatchEvent = () => {
    const eventName = 'outlet';
    if (this.props.type === eventName && this.target === '_self' && LinkRenderer.isPressCtrl === false) {
      const eventData = { url: this.url, go: false };
      const actionInstrance = getActionByType(eventName);
      if (actionInstrance) {
        const rendererEvent = createRendererEvent(eventName, {
          env: this.props.context?.props?.env,
          nativeEvent: eventName,
          data: eventData,
          scoped: this.props.context?.context
        });
        runAction(actionInstrance, {outlet: this.props.outlet,args:eventData}, this.props.context, rendererEvent)
      }
    }
  }

  render() {
    return (
      <>
        {this.url ? this.props.type === 'outlet' || this.props.type === 'link' ?
        <Link target={this.props.target || (this.props.blank ? '_blank' : '_self')} to={this.url.indexOf('/#/')===0?this.url.substring(2):this.url.indexOf('#/')===0?this.url.substring(1):this.url} onClick={this.dispatchEvent}>{this.props.value}</Link> :
        <a target={this.props.target || (this.props.blank ? '_blank' : '_self')} href={this.url}>{this.props.value}</a>:
        this.props.value}
      </>
    )
  }
}
