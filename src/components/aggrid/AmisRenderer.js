import React, { Component } from 'react'

export default class AmisRenderer extends Component {
  constructor(props) {
    super(props);
  }

  refresh(params) {
    
  }

  render() {
    return (
      <>
        {
          this.props.context &&
          this.props.context.props &&
          this.props.context.props.render &&
          this.props.body &&
          this.props.context.props.render(`aggrid-renderer-${this.props.colDef?.colId}-${this.props.rowIndex}`, this.props.body, {data:{...this.props.context.props.data,...this.props.data,value:this.props.value,valueFormatted:this.props.valueFormatted}})
        }
      </>
    )
  }
}
