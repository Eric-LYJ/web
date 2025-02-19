import React, { Component } from 'react'
import utils from "utils";

export default class CellTooltip extends Component {

  constructor(props) {
    super(props);
    this.content = props.value;
    if (props.colDef.tooltipField !== undefined) {
      const data = props.api.getDisplayedRowAtIndex(props.rowIndex).data;
      this.content = data[props.colDef.tooltipField];
    }
  }

  render() {
    let style = utils.extend({
      padding: '10px',
      width: '250px',
      minHeight: '70px',
      border: '1px solid #babfc7',
      overflow: 'hidden',
      backgroundColor: '#ffffff',
      borderRadius: '5px'
    }, this.props.style); 
    return (
      <>
        {this.content &&
        <div className="custom-tooltip" style={style}>
          <span dangerouslySetInnerHTML={{ __html: (this.content).replace(/\n/g,'<br>') }}></span>
        </div>
        }
      </>
    )
  }
}
