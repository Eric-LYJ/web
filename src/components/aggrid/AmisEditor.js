import React, { Component } from 'react'
import { ValueFormatterService } from 'ag-grid-community';
import { dataMapping } from 'amis'
import utils from "utils";

export default class AmisEditor extends Component {
  constructor(props) {
    super(props);
    this.wrapperRef = React.createRef();
    this.inputRef = React.createRef();
    this.editing = true;
    this.newValue = null;
    this.value = props.value;
    this.rawValues = props.rawValues || [];
    this.values = [];
    const valueFormatterService = new ValueFormatterService()
    const values = props.values && props.values.constructor === Array ? props.values : [];
    for (let i = 0; i < values.length; i++) {
      let value = values[i];
      if (typeof value !== 'object') {
        const valueFormatted = valueFormatterService.formatValue(props.column, null, value);
        const valueFormattedExits = valueFormatted !== null && valueFormatted !== undefined;
        const label = valueFormattedExits ? valueFormatted : value;
        value = { label: label || value, value: value };
      }
      this.values.push(value);
    }
    
    const userComponentFactory = props.api?.context?.beanWrappers?.userComponentFactory?.beanInstance;
    const compDetails = userComponentFactory?.getCellEditorDetails(props.colDef, props);
    this.cellEditorPopup = compDetails?.popupFromSelector != null ? compDetails.popupFromSelector : !!props.colDef.cellEditorPopup;
    this.cellEditorPopupPosition = compDetails?.popupPositionFromSelector != null ? compDetails.popupPositionFromSelector : props.colDef.cellEditorPopupPosition;
  }

  handleChange = (value, name, isSubmit, isPristine) => {
    if (!isPristine) {
      const params = this.props;
      let valueTemplate = params.valueTpl || params.valueTemplate;
      this.newValue = (valueTemplate && typeof valueTemplate === 'string' ? dataMapping(valueTemplate, { data: value }) : value) || null;
      this.value = params.api.getValue(params.column, {...params.node, data: {...params.data, [params.colDef.colId]: params.parseValue(this.newValue)}});
      if (!this.editing) {
        //由于Amis的更新是异步的，可能有编辑器已经结束编辑，还没更新内容的情况。所以需要主动更新单元格的值
        if (this.value === this.props.value) {
          params.node.setDataValue(params.colDef.colId, this.newValue);
        }
      }
      else if (params.autoStopEditing === true) {
        params.stopEditing();
      }
    }
  }

  getValue() {
    return this.props.parseValue(this.newValue);
  }

  isCancelBeforeStart() {
    return false;
  }

  isCancelAfterEnd() {
    if (this.hidePopup)
      this.hidePopup();
    this.editing = false;
    if (this.value === this.props.value)
      return true;
    return false;
  };

  setFocus = (scoped, child) => {
    if (scoped && this.props.autoFocus !== false) {
      const components = scoped.getComponents();
      const focuableInput = components.find(
        comp => (comp.props?.$path?.indexOf('/aggrid-editor-') > -1 || child === true) &&
          comp.input?.nodeName?.toUpperCase() === 'INPUT'
      );
      if (!focuableInput) {
        const wrappers = components.filter(
          comp => (comp.props?.$path?.indexOf('/aggrid-editor-') > -1 || child === true) &&
            comp.context !== scoped && comp.context?.children?.length > 0
        );
        if (!wrappers || wrappers.length === 0)
          return false;
        for (let i = 0; i < wrappers.length; i++) {
          const wrapper = wrappers[i];
          if (this.setFocus(wrapper.context, true))
            return true;
        }
      }
      else {
        setTimeout(() => {
          focuableInput.input.focus();
          this.props.autoSelect !== false && focuableInput.input.select()
        }, 1);
        return true;
      }
    }
  }

  setPopup = () => {
    if (this.wrapperRef.current && !this.wrapperRef.current.firstChild?.childElementCount) {
      this.props.stopEditing();
      return;
    }
    const popupService = this.props.api?.context?.beanWrappers?.popupService?.beanInstance;
    if (this.cellEditorPopup === true && typeof popupService === 'object') {
      const activePopups = popupService.getActivePopups();
      if (activePopups?.length > 0) {
        const positionParams = {
          column: this.props.column,
          rowNode: this.props.node,
          type: 'popupCellEditor',
          eventSource: this.props.eGridCell,
          ePopup: activePopups[activePopups.length - 1],
          keepWithinBounds: true
        };
        const positionCallback = this.cellEditorPopupPosition === 'under' ? popupService.positionPopupUnderComponent.bind(popupService, positionParams) : popupService.positionPopupOverComponent.bind(popupService, positionParams);
        positionCallback();
      }
    }
    else if (this.cellEditorPopup !== true && typeof popupService === 'object' && this.props.suppressPopupWrapper !== true) {
      const eChild = document.createElement('div');
      eChild.className = 'ag-amis-cell-edit-popup-wrapper';
      eChild.tabIndex = 0;
      eChild.style.position = 'absolute';
      const destroyFocusOutFunc = popupService.addManagedListener(eChild, 'DOMNodeRemoved', (e) => {
        if (e.currentTarget.firstChild === e.target) {
          setTimeout(() => {
            if (this.wrapperRef.current)
              this.wrapperRef.current.focus();
          }, 1);
        }
      });
      const addPopupRes = popupService.addPopup({
        modal: false,
        eChild: eChild,
        closeOnEsc: true,
        closedCallback: () => {
          this.hidePopup = null;
          destroyFocusOutFunc();
        }
      });

      if (addPopupRes) {
        this.hidePopup = addPopupRes.hideFunc;
      }
    }
  }

  componentDidMount() {
    this.setPopup();
    this.setFocus(this.props.context?.context);
  }

  render() {
    const popupStyle = this.cellEditorPopup === true ? {width:this.props.column.actualWidth||'auto'} : {}
    const mergeData = utils.extend({}, this.props.context.props.data, this.props.data);
    return (
      <div className="ag-cell-edit-wrapper" tabIndex="0" ref={this.wrapperRef}>
        <div style={popupStyle}>
          {
            this.props.context &&
            this.props.context.props &&
            this.props.context.props.render &&
            this.props.body &&
            this.props.context.props.render(`aggrid-editor-${this.props.colDef?.colId}-${this.props.rowIndex}`, this.props.body, {data:{...mergeData,rawValues:this.rawValues,values:this.values,value:this.props.value},onChange: this.handleChange,popOverContainer:this.props.context.props.env?.getModalContainer})
          }
        </div>
        {this.cellEditorPopup === true && this.props.suppressPopupWrapper !== true && <div className="ag-amis-cell-edit-popup-wrapper"></div>}
      </div>
    )
  }
}
