import React, { Component } from 'react'

export default class DecimalEditor extends Component {

  constructor(props) {
    super(props);
    this.inputRef = React.createRef();
    this.state = {
      value: typeof this.props.value !== 'number' || isNaN(this.props.value) ? '' : this.props.value
    }
  }

  handleChange = (event) => {
    this.setState({ value: event.target.value });
  }

  getValue() {
    const value = parseFloat(this.state.value);
    return this.props.parseValue(isNaN(value) ? null : value);
  }

  // for testing
  setValue(newValue) {
    this.setState({
      value: newValue
    })
  }

  isCancelBeforeStart() {
    return false;
  }

  isCancelAfterEnd() {
    return false;
  };

  componentDidMount() {
    this.inputRef.current.focus();
    this.inputRef.current.select();
  }

  render() {
    return (
      <div className="ag-cell-edit-wrapper">
        <div className="ag-cell-editor ag-labeled ag-label-align-left ag-text-field ag-input-field">
            <div className="ag-wrapper ag-input-wrapper ag-text-field-input-wrapper">
                <input type="number" className="ag-input-field-input ag-text-field-input" ref={this.inputRef} onChange={this.handleChange} value={this.state.value} />
            </div>
        </div>
      </div>
    )
  }
}
