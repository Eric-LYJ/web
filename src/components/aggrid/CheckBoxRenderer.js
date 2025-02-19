import React, { Component } from 'react'

export default class CheckBoxRenderer extends Component {

  constructor(props) {
    super(props);
    this.inputRef = React.createRef();
    this.state = {
      value: typeof this.props.value === 'number' && this.props.value !== 0 || this.props.value === true
    }
  }

  refresh(params) {
    this.setState({ value: params.value === true });
  }

  render() {
    return (
      <div className='ag-checkbox-wrapper'>
        <div style={{position:'absolute',width:'16px',height:'100%'}}></div>
        <input type="checkbox" ref={this.inputRef} onChange={()=>false} checked={this.state.value} />
      </div>
    )
  }
}
