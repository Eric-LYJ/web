import React, { Component } from 'react'

export default class CheckBoxEditor extends Component {

  constructor(props) {
    super(props);
    this.inputRef = React.createRef();
    this.state = {
      value: !(typeof this.props.value === 'number' && this.props.value !== 0 || this.props.value === true)
    }
  }

  handleChange = (event) => {
    this.setState({ value: this.state.value !== true });
  }

  getValue() {
    return this.props.parseValue(this.state.value === true);
  }

  render() {
    return (
      <div className='ag-checkbox-wrapper' style={{backgroundColor:'#fff',padding:'0 11px'}} onClick={this.handleChange}>
        <input type="checkbox" ref={this.inputRef} onChange={this.handleChange} checked={this.state.value} />
      </div>
    )
  }
}
