import React, { Component } from 'react'
import { registerAction } from 'amis-core';
import { Spinner } from 'amis-ui';

let loadingRef = null;
export const loading = {
  show: () => {
    loadingRef&&!loadingRef.isShow()&&loadingRef.show()
  },
  hide: () => {
    loadingRef&&loadingRef.hide()
  }
};

export default class Loading extends Component {
  constructor(props) {
    super(props);
    this.state = {
      show: props.show !== false ? true : props.show
    };
    this.loadingProps = {...props};
    if (!this.loadingProps.size)
      this.loadingProps.size = 'lg';
    delete this.loadingProps.show;
  }

  hasRendered = false;
  componentDidMount() {
    this.hasRendered = true;
    loadingRef = this;
  }

  componentWillUnmount() {
    if (this.hasRendered) {
      loadingRef = null;
    }
  }

  isShow() {
    return this.state.show;
  }

  show() {
    this.setState({show:true});
  }

  hide() {
    this.setState({show:false});
  }

  render() {
    return (
      <>
      {this.state.show &&
      <div className={this.props.className}>
        <Spinner show={this.state.show} {...this.loadingProps} />
      </div>}
      </>
    )
  }
}
export class LoadingAction {
  async run(
    action,
    renderer,
    event
  ) {
    loading.show()
  }
}
export class CloseLoadingAction {
  async run(
    action,
    renderer,
    event
  ) {
    loading.hide()
  }
}
registerAction('loading', new LoadingAction());
registerAction('closeLoading', new CloseLoadingAction());