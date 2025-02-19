import React from 'react';
import {
  Renderer,
  FormItem,
  ScopedContext,
  ServerError,
  buildApi,
  isEffectiveApi,
  createRendererEvent,
  getActionByType,
  runAction,
  runActions,
  anyChanged,
  dataMapping,
  evalExpression,
  str2function,
  toast
 } from 'amis';
import { AgGridReact } from 'ag-grid-react';
import { LicenseManager } from 'ag-grid-enterprise';
import * as XLSX from "xlsx";
import moment from 'moment';
import utils from "utils";
import locale from "../../libs/locale";
import { loading } from "../../components/amis/Loading";

import LoadingOverlay from '../aggrid/LoadingOverlay';
import LinkRenderer from '../aggrid/LinkRenderer';
import CellTooltip from '../aggrid/CellTooltip';
import CheckBoxEditor from '../aggrid/CheckBoxEditor';
import CheckBoxRenderer from '../aggrid/CheckBoxRenderer';
import DateEditor from '../aggrid/DateEditor';
import DateTimeEditor from '../aggrid/DateTimeEditor';
import IntegerEditor from '../aggrid/IntegerEditor';
import DecimalEditor from '../aggrid/DecimalEditor';
import AmisEditor from '../aggrid/AmisEditor';
import AmisRenderer from '../aggrid/AmisRenderer';
import PaginationPanel from '../aggrid/PaginationPanel';

import 'ag-grid-community/styles/ag-grid.css'; // Core grid CSS, always needed
//import 'ag-grid-community/styles/ag-theme-alpine.css'; // Optional theme CSS
import 'ag-grid-community/styles/ag-theme-balham.css'; // Optional theme CSS
import "../../assets/css/aggrid/ag-grid-extend.css";

class AgGrid extends React.Component {
  static contextType = ScopedContext;
  constructor(props) {
    super(props);
    this.gridRef = React.createRef();
    this.utils = utils;
    this.columns = null;
    this.primaryColumns = null;
    this.state = {
      ready: false,
      settings: null
    };
    this.timeoutHandler = 0;
    this.cacheColumnMasters = {};
    this.cacheRowDatas = {
      data:[],
      valid:[],
      primary:{},
      newadded:0,
      deleted:0,
      total:0,
      adjustment:0,
    };
    this.cacheColumnStateDelayHandler = 0
    this.editorComponents = {
      CheckBoxEditor,
      DateEditor,
      DateTimeEditor,
      IntegerEditor,
      DecimalEditor,
      AmisEditor
    }
    this.rendererComponents = {
      LinkRenderer,
      CheckBoxRenderer,
      AmisRenderer
    }
    this.filterComponents = {
    }
    this.components = {
      ...this.editorComponents,
      ...this.rendererComponents,
      ...this.filterComponents,
      CellTooltip,
      agLoadingOverlay: LoadingOverlay
    }
    LicenseManager.setLicenseKey(
      "AGGRID_MjUyNzI1NzYwMDAwMA==107c040e945a321e0ff1eb8d8971002c"
    );
    this.getSettings().then((result)=>{
      this.setState({settings:result})
    });
  }

  static shouldComponentUpdate(props, nextProps) {
    if (nextProps.strictMode === false)
      return true;
    const attrs = nextProps.settingsChangeBy;
    if (attrs && typeof attrs === 'string' && anyChanged(attrs, props.data, nextProps.data)) {
      return true;
    }
    return false;
  }

  componentDidUpdate(prevProps, preState) {
    const attrs = this.props.settingsChangeBy;
    if (attrs && typeof attrs === 'string' && anyChanged(attrs, prevProps.data, this.props.data)) {
      this.getSettings().then((result)=>{
        this.setState({settings:result}, () => { this.applyColumnState(this.gridRef?.current?.columnApi) });
        if (this.props.refreshDataWhenSettingChanged === true)
          this.refreshData();
        if (this.props.dispatchEventWhenSettingChanged === true)
          this.props.dispatchEvent("aggrid-setting-change", result);
      });
    }
  }

  componentDidMount() {
    const scoped = this.context;
    scoped.registerComponent(this);
  }

  componentWillUnmount() {
    const scoped = this.context;
    scoped.unRegisterComponent(this);
  }

  notify(error, type) {
    let msg,opts;
    if (error?.type === "ServerError") {
      msg = error.message;
      let conf = error.response;
      conf?.msgTimeout !== undefined && (opts = {closeButton: true, timeout: conf.msgTimeout})
    }
    else if (error?.message)
      msg = error.message;
    else if (typeof error === 'string')
      msg = error;
    else
      return;
    type = type || 'error';
    if (typeof this.props.env?.notify === 'function')
      this.props.env.notify(type, msg, opts)
    else
      toast[type] ? toast[type](msg, opts) : console.warn('[Notify]', type, msg)
  }

  doAction(
    action,
    args
  ) {
    if (!this.state.ready || !this.gridRef.current)
      return;
    switch(action.actionType) {
      case 'addAnEmptyRow':
        this.addNewData(null, false, args?.append === true);
        break;
      case 'addNewData':
        const newData = args?.data;
        if (newData && newData.constructor === Array && newData.length > 0)
          this.addNewData(newData, args?.modifyExistData, args?.append === true);
        break;
      case 'modifyData':
        this.modifyData(args?.data, args?.type);
        break;
      case 'removeSelectedData':
        this.removeSelectedData(args?.confirmed === true, args?.onlyDisplayed === true);
        break;
      case 'reloadData':
        this.reloadData();
        break;
      case 'refreshData':
        this.refreshData();
        break;
      case 'refreshSetting':
        this.getSettings().then((result)=>{
          this.setState({settings:result})
        }, () => { this.applyColumnState(this.gridRef.current.columnApi) } );
        break;
      case 'importData':
        this.importData(args?.file, args);
        break;
      case 'exportData':
        this.exportData();
        break;
      case 'saveData':
        this.props.type === 'aggrid' && this.saveData();
        break;
      case 'deleteData':
        this.props.type === 'aggrid' && this.deleteData(args?.confirmed === true, args?.onlyDisplayed === true);
        break;
      case 'ejectChangedData':
        try {
          const changedData = this.getChangedData(args?.check === true, args?.raw === true);
          if (args?.check === true) {
            const addDatas = changedData.add || [],
              updateDatas = changedData.update || [],
              deleteDatas = changedData.delete || [];
              if (addDatas.length === 0 && updateDatas.length === 0 && deleteDatas.length === 0)
                throw new Error(locale.getLanguageString("NOTHING_CHANGED", "Nothing has changed"));
          }
          this.props.dispatchEvent(args?.eventName || "aggrid-eject-changed-data", {...changedData, flag: args?.flag});
        }
        catch(e) {
          this.notify(e);
        }
        break
      case 'ejectSelectedData':
        try {
          const selectedData = this.getSelectedData(args?.check === true, args?.raw === true);
          if (args?.check === true) {
            const selectDatas = selectedData.select || [];
            if (selectDatas.length === 0)
              throw new Error(locale.getLanguageString("SELECT_ONE", "Please select at least one row"));
          }
          const rowIds = [];
          const statuses = [];
          const nodes = this.gridRef.current.api.getSelectedNodes() || [];
          for (let i = 0; i < nodes.length; i++) {
            rowIds.push(nodes[i].id);
            statuses.push(nodes[i].args?.aggrid_editing_status || '');
          }
          this.props.dispatchEvent(args?.eventName || "aggrid-eject-selected-data", {...selectedData, rowIds: rowIds, statuses: statuses, flag: args?.flag});
        }
        catch(e) {
          this.notify(e);
        }
        break;
      case 'customScript':
        if (typeof action.script === 'string' && action.script.length > 0) {
          let func = str2function(action.script, 'context', 'doAction', 'event', "gridApi");
          if (!func)
            break;
          const eventName = "customScript";
          const event = createRendererEvent(eventName, {
            env: this.props.env,
            nativeEvent: eventName,
            scoped: this.context,
            data: {}
          });
          func(this, (action) => runActions(action, this, event), event, this.gridRef.current.api, action);
        }
        break;
      default:
        if (typeof action.actionType === 'string' && typeof this.gridRef.current.api[action.actionType] === 'function') {
          const params = args?.eventName ? args?.params : args;
          let argList = params === undefined || params === null ? [] : params.constructor === Array ? params : [params];
          this.parseFunction(argList);
          var results = this.gridRef.current.api[action.actionType](...argList);
          args?.eventName && this.props.dispatchEvent(args?.eventName, results);
        }
        break;
    }
  }

  validate() {
    if (this.props.changeValueBy === 'selection') {
      try {
        const datas = this.getSelectedData(true);
        const selectDatas = datas.select || [];
        if (selectDatas.length === 0 && this.props.required)
          throw new Error(locale.getLanguageString("SELECT_ONE", "Please select at least one row"));
      }
      catch(e) {
        return e.message;
      }
    }
    else {
      try {
        this.getChangedData(true);
        if ((this.cacheRowDatas?.total || 0) <= 0 && this.props.required)
          throw new Error(locale.getLanguageString("NEED_ONE", "Please set at least one row"));
      }
      catch(e) {
        return e.message;
      }
    }
    return '';
  }

  buildApi(api, data, initFetch, initFetchOn) {
    if (!isEffectiveApi(api, data, initFetch, initFetchOn))
      return null;
    var result = null;
    if (typeof api === 'string') {
      result = buildApi(api, data);
      result && (result.data = {})
    }
    else if (typeof api === 'object') {
      result = {...api, data: {...api.data}}
    }
    return result;
  }

  getPrimaryValues(data, caseSensitive, separator) {
    if (!data || data.constructor !== Object ||
        !this.primaryColumns || this.primaryColumns.constructor !== Array ||
        this.primaryColumns.length === 0)
      return null;
    const values = [];
    this.primaryColumns.forEach(col => {
      let value = data[col.field];
      value = (value === undefined || value === null ? '' : value).toString();
      values.push(col.primaryCaseSensitive === true || caseSensitive === true ? value : value.toLowerCase());
    });
    return values.join(separator || '');
  }

  rowDataCheck(start, end, pageSize) {
    if (start < 0)
      return true;
    let startRow = start * pageSize;
    let endRow = end * pageSize;
    const total = this.cacheRowDatas?.total || 0;
    const datas = this.cacheRowDatas?.valid || [];
    if (total === 0)
      return false;
    if (startRow >= total)
      return true;
    if (endRow > total)
      endRow = total;
    //var thePageRows = [];
    for (let i = startRow; i < endRow; i++) {
      const data = datas[i];
      if (data === undefined)
        return false;
      //thePageRows.push(data);
    }
    return true;
  }

  getParams(params) {
    params = params || { first: true };
    const gridRef = this.gridRef.current;
    const gridSettings = gridRef.props;
    if (gridSettings.rowModelType === "serverSide" && gridSettings.pagination === true) {
      params.pageSize = gridRef.api.paginationProxy.pageSize;
      params.pageIndex = params.pageIndex > 0 ? params.pageIndex : 1;
      params.getPages = 0;
      params.deletedCount = 0;
      params.validCount = 0;
      params.newaddedCount = 0;

      const isLoaded0 = this.rowDataCheck(params.pageIndex - 2, params.pageIndex - 1, params.pageSize); //上一页
      const isLoaded1 = this.rowDataCheck(params.pageIndex - 1, params.pageIndex, params.pageSize); //当前页
      const isLoaded2 = this.rowDataCheck(params.pageIndex, params.pageIndex + 1, params.pageSize); //下一页

      if (isLoaded0 && isLoaded1 && isLoaded2)
        return;
      else if (!isLoaded0 && !isLoaded2) {
        params.getPages = 3;
        params.pageIndex -= 1;
      }
      else if (isLoaded0 && !isLoaded1 && !isLoaded2) {
        params.getPages = 2;
      }
      else if (!isLoaded0 && !isLoaded1 && isLoaded2) {
        params.getPages = 2;
        params.pageIndex -= 1;
      }
      else if (isLoaded0 && isLoaded1 && !isLoaded2) {
        params.getPages = 1;
        params.pageIndex += 1;
      }
      else if (!isLoaded0 && isLoaded1 && isLoaded2) {
        params.getPages = 1;
        params.pageIndex -= 1;
      }
      else if (isLoaded0 && !isLoaded1 && isLoaded2) {
        params.getPages = 1;
      }
      
      var rowDatas = this.cacheRowDatas;
      var deletedTotal = rowDatas?.deleted || 0;
      if (deletedTotal > 0) {
        var datas = rowDatas?.data || [];
        for (let i = 0; i < datas.length; i++) {
          var data = datas[i];
          if (data !== undefined && data.aggrid_editing_status === 'deleted')
            params.deletedCount++;
          else {
            params.validCount++;
            if (data !== undefined && data.aggrid_editing_status === 'newadded')
              params.newaddedCount++;
            if (params.validCount === (params.pageIndex - 1 + params.getPages) * params.pageSize)
              break;
          }
        }
        if (params.deletedCount > params.newaddedCount) {
          params.pageIndex += Math.floor((params.deletedCount - params.newaddedCount) / params.pageSize);
          params.getPages += (params.deletedCount - params.newaddedCount) % params.pageSize > 0 ? 1 : 0;
        }
      }
    }
    return params;
  }

  getData(params) {
    params = params || { first: true };
    var api = this.buildApi(this.props.api, this.props.data, params.initFetch, params.initFetchOn);
    if (!api) {
      if (params.first && this.props.value && this.props.value.constructor === Array) {
        this.fillData({ rowData: this.props.value, total: this.props.value.length });
      }
      params.first && this.hideLoading();
      return;
    }
    if (params.first) {
      if (this.props.type === 'input-aggrid')
        this.props.onChange({});
    }
    if (!this.props.env || typeof this.props.env.fetcher !== 'function')
      return;
    params = this.getParams(params);
    if (!params)
      return;
    const gridRef = this.gridRef.current;
    const gridSettings = gridRef.props;
    const request = {};
    if (gridSettings.rowModelType === "serverSide") {
      if (gridSettings.pagination === true) {
        request.pageSize = params.pageSize;
        request.pageIndex = params.pageIndex;
        request.pages = params.getPages;
      }
      request.filter = utils.getFilter(gridRef.api.getFilterModel()) || [];
      request.sort = utils.getSort(gridRef.columnApi.getColumnState()) || [];
      if (api.appendPaginationFlag !== false) {
        const filter = api.data?.filter;
        const sort = api.data?.sort;
        if (filter) {
          if (filter.constructor === Array)
            request.filter = request.filter.concat(filter);
          else if (filter.constructor === Object)
            request.filter.push(filter);
          delete api.data.filter;
        }
        if (sort) {
          if (sort.constructor === Array)
            request.sort = request.sort.concat(sort);
          else if (sort.constructor === Object)
            request.sort.push(sort);
          delete api.data.sort;
        }
        if (request.filter.length === 0)
          delete request.filter;
        if (request.sort.length === 0)
          delete request.sort;
        utils.extend(api.data, request);
      }
    }
    
    params.first && this.showLoading();
    this.props.env.fetcher(api, utils.extend({}, this.props.data, request))
    .then((result) => {
      if (result.status !== 0)
        throw new ServerError(result.msg || 'Unknown Error', result);
      const data = result.data || {};
      this.fillData(data, params);
      params.first && this.hideLoading();
    }).catch((error) => {
      params.first && this.hideLoading();
      if (this.props.env.isCancel(error)) {
        error.message && this.notify(error);
        return
      }
      this.notify(error);
    });
  }

  fillData(data, params) {
    if (!data)
      return;
    const gridRef = this.gridRef.current;
    if (!gridRef)
      return;
    const gridSettings = gridRef.props;
    const total = data.total || 0;
    const rowData = data.rowData || [];
    
    params = params || { first: true };
    const pageSize = gridRef.api.paginationProxy.pageSize;
    const pageIndex = params.pageIndex > 0 ? params.pageIndex : 1;
    const newaddedCount = params.newaddedCount > 0 ? params.newaddedCount : 0;
    const deletedCount = params.deletedCount > 0 ? params.deletedCount : 0;
    
    var rowDatas = this.cacheRowDatas;
    for (let i = 0; i < rowData.length; i++) {
      const row = rowData[i] || {};
      if (gridSettings.rowModelType === "serverSide") {
        row.aggrid_row_id = i + (pageIndex - 1) * pageSize;
        const dataIndex = row.aggrid_row_id + newaddedCount;
        if (rowDatas.data[dataIndex] === undefined)
          rowDatas.data[dataIndex] = row;
        if (rowDatas.valid[dataIndex - deletedCount] === undefined)
          rowDatas.valid[dataIndex - deletedCount] = row;
      }
      else {
        row.aggrid_row_id = i;
        rowDatas.data.push(row);
      }
      const primaries = this.getPrimaryValues(row);
      if (primaries !== null && typeof rowDatas.primary === 'object') {
        rowDatas.primary[primaries] = (rowDatas.primary[primaries] || 0) + 1;
      }
    };
    
    if (gridSettings.rowModelType === "serverSide") {
      rowDatas.total = total - rowDatas.deleted + rowDatas.newadded;
      if (params.first) {
        gridRef.api.setServerSideDatasource(this.createMyDataSource());
      }
    }
    else {
      rowDatas.total = rowDatas.data.length - rowDatas.deleted + rowDatas.newadded;
      if (params.first) {
        gridRef.api.setRowData(rowDatas.data);
      }
    }
    
    if (params.first) {
      if (this.props.type === 'input-aggrid')
        this.props.onChange({unchanged: rowDatas.data.map(i => this.buildRowData(i))});
      if (this.props.dispatchEventWhenDataLoaded === true)
        this.props.dispatchEvent("aggrid-data-loaded", rowDatas.data);
    }
  }

  createMyDataSource() {
    var that = this;
    function MyDatasource() {}
    MyDatasource.prototype.getRows = function (params) {
      var times = 30;
      var setData = function() {
        var startRow = params.request.startRow;
        var endRow = params.request.endRow;
        var rowDatas = that.cacheRowDatas;
        var total = rowDatas?.total || 0;
        var datas = rowDatas?.valid || [];
        if (endRow > total)
          endRow = total;
        var rows = [];
        for (let i = startRow; i < endRow; i++) {
          var data = datas[i];
          if (data === undefined) //有数据尚未加载
            return false;
          rows.push(data);
        }
        params.success({
          rowData: rows,
          rowCount: total,
        });
        return true;
      }
      if (params.request?.groupKeys?.length > 0) {
        const groupKeys = params.request.groupKeys;
        var parentData,rowDatas;
        for (let k = 0; k < groupKeys.length; k++) {
          const datas = (k === 0 ? that.cacheRowDatas : rowDatas)?.valid;
          if (!datas)
            break;
          for (let i = 0; i < datas.length; i++) {
            let data = datas[i]
            if (data === undefined)
              continue;
            if ((that.getPrimaryValues(data, true, that.treeDataSeparator) || data.aggrid_row_id) === groupKeys[k]) {
              parentData = data;
              rowDatas = data.aggrid_children;
              break
            }
          }
        }
        if (parentData) {
          if (parentData.aggrid_children === undefined) {
            const parentKey = groupKeys[groupKeys.length - 1];
            const propsData = utils.extend({}, that.props.data, { parentKey: parentKey, parentKeys: groupKeys });
            let api = that.buildApi(that.props.subApi, propsData);
            that.props.env.fetcher(api, propsData)
            .then((result) => {
              if (result.status !== 0)
                throw new ServerError(result.msg || 'Unknown Error', result);
              const data = result.data && result.data.constructor === Array ? result.data : [];
              for (let i = 0; i < data.length; i++) {
                data[i].aggrid_row_id = parentData.aggrid_row_id + '_' + i;
              }
              parentData.aggrid_children = {
                data: data,
                valid: data,
                newadded: 0,
                deleted: 0,
                total: data.length,
                adjustment: 0
              };
              params.success({
                rowData: data.slice(params.request.startRow, params.request.endRow),
                rowCount: data.length,
              });
            }).catch((error) => {
              params.fail();
              if (that.props.env.isCancel(error)) {
                error.message && that.notify(error);
                return
              }
              that.notify(error);
            })
          }
          else if (parentData.aggrid_children) {
            params.success({
              rowData: parentData.aggrid_children.valid.slice(params.request.startRow, params.request.endRow),
              rowCount: parentData.aggrid_children.total,
            });
          }
        }
        else {
          params.fail();
        }
      }
      else {
        if (!setData()) {
          var handler = setInterval(() => {
            times--;
            console.log("setInterval");
            const isSuccess = setData();
            if (isSuccess || times === 0) {
              !isSuccess && params.fail(); //gridRef.api.retryServerSideLoads
              clearInterval(handler);
              console.log("clearInterval");
            }
          }, 1000);
        }
      }
    };
    return new MyDatasource();
  }

  reloadData() {
    if (!this.state.ready || !this.gridRef.current)
      return;
    var rowDatas = this.cacheRowDatas || {};
    rowDatas.data = [];
    rowDatas.valid = [];
    rowDatas.primary = {};
    rowDatas.newadded = 0;
    rowDatas.deleted = 0;
    rowDatas.total = 0;
    rowDatas.adjustment = 0;
    this.gridRef.current.api.deselectAll();
    this.getData();
  }

  refreshData() {
    this.reloadData();
    this.dataChangedListener({type:"refreshData"});
  }

  addNewData(data, modifyExistData, append) {
    const propData = this.props.data;
    const gridRef = this.gridRef.current;
    const gridSettings = gridRef.props;
    const columns = this.columns;
    const rowDatas = this.cacheRowDatas;
    if (!rowDatas || !rowDatas.data || rowDatas.data.constructor !== Array)
      return;
    if (gridSettings.rowModelType === "serverSide" && (!rowDatas.valid || rowDatas.valid.constructor !== Array))
      return;

    function setDefaultValue(nodeData, beAddData) {
      if (!columns || columns.constructor !== Array || columns.length === 0 || !nodeData)
        return nodeData;
      let mergeData;
      for (let j = 0; j < columns.length; j++) {
        const column = columns[j];
        if (column.defaultValue !== undefined && nodeData[column.field] === undefined) {
          if (column.addible !== true) {
            if (mergeData === undefined)
              mergeData = beAddData ? utils.extend({}, propData, beAddData) : (propData || {})
            column.addible = evalExpression(column.addible, mergeData)
          }
          nodeData[column.field] = column.defaultValue
        }
      }
      return nodeData;
    }

    const newDatas = [];
    const modifiedDatas = [];
    const rowid = rowDatas.total + rowDatas.deleted + rowDatas.adjustment + 10000; //加一个常量，避免服务端数据有增加导致rowid重复
    if (!data || data.constructor !== Array || data.length === 0) {
      newDatas.push(setDefaultValue({ aggrid_editing_status: 'newadded', aggrid_row_id: rowid }));
    }
    else {
      function getModifiedData(oldData, newData) {
        if (!columns || columns.constructor !== Array || columns.length === 0 || !oldData || !newData)
          return null;
        let modified = false;
        const modifiedData = {...oldData};
        const status = oldData.aggrid_editing_status;
        for (let j = 0; j < columns.length; j++) {
          const column = columns[j];
          const oldValue = oldData[column.field];
          const value = newData[column.field];
          if (value === undefined || value === oldValue ||
             (status !== 'newadded' && column.primary === true))
            continue;
          modified = true;
          modifiedData[column.field] = value;
        }
        return modified ? modifiedData : null;
      }
      var index = 0;
      for (let i = 0; i < data.length; i++) {
        const item = { ...data[i], aggrid_editing_status: 'newadded', aggrid_row_id: rowid + index };
        const primaries = this.getPrimaryValues(item);
        if (primaries !== null && typeof rowDatas.primary === 'object') {
          if (rowDatas.primary.hasOwnProperty(primaries)) {
            if (modifyExistData === true) {
              const existData = rowDatas.data.filter(dataItem => this.getPrimaryValues(dataItem) === primaries) || [];
              existData.forEach(dataItem => {
                const modified = getModifiedData(dataItem, item);
                if (modified)
                  modifiedDatas.push(modified)
              })
            }
            continue;
          }
          rowDatas.primary[primaries] = (rowDatas.primary[primaries] || 0) + 1;
        }
        newDatas.push(setDefaultValue(item, data[i]));
        index++;
      }
    }

    if (modifiedDatas.length > 0)
      this.modifyData(modifiedDatas);

    if (newDatas.length === 0)
      return;
    
    rowDatas.newadded += newDatas.length;
    rowDatas.total += newDatas.length;
    if (gridSettings.rowModelType === "serverSide") {
      append = false; //server side can't append new
      rowDatas.data.unshift(...newDatas);
      rowDatas.valid.unshift(...newDatas);
      gridRef.api.refreshServerSide();
    }
    else {
      if (append)
        rowDatas.data.push(...newDatas);
      else
        rowDatas.data.unshift(...newDatas);
      gridRef.api.applyTransaction({ add: newDatas, addIndex: append ? undefined : 0 });
      gridRef.api.setFilterModel(null);
    }
    gridRef.api.deselectAll();
    if (append)
      gridRef.api.paginationGoToLastPage();
    else
      gridRef.api.paginationGoToFirstPage();
    this.dataChangedListener({type:"addNewData"});
  }

  modifyData(data, type) {
    const gridRef = this.gridRef.current;
    const columns = this.columns;
    if (!data)
      return;
    if (data.constructor === Array && data.length === 0)
      return;
    const datas = data.constructor === Array ? data : [data];
    function setDataValue(rowNode, newData) {
      if (!columns || columns.length === 0)
        return;
      if (!rowNode || !newData)
        return;
      const status = rowNode.data.aggrid_editing_status;
      for (let j = 0; j < columns.length; j++) {
        const column = columns[j];
        const oldValue = rowNode.data[column.field];
        const value = newData.constructor === Object ? newData[column.field]: newData;
        if (value === undefined || value === oldValue ||
           (status !== 'newadded' && column.primary === true))
          continue;
        rowNode.setDataValue(column.field, value);
      }
    }

    if (type === 'selected') {
      var selectedNodes = gridRef.api.getSelectedNodes();
      if (!selectedNodes || selectedNodes.length === 0)
        return;
      for (let i = 0; i < selectedNodes.length; i++) {
        setDataValue(selectedNodes[i], datas[0]);
      }
    }
    else if (type === 'range') {
      var ranges = gridRef.api.getCellRanges();
      if (!ranges || ranges.length === 0)
        return;
      ranges.forEach((range) => {
        const newData = {};
        range.columns.forEach((column) => {
          newData[column.colId] = datas[0];
        })
        const startRow = Math.min(range.startRow.rowIndex, range.endRow.rowIndex);
        const endRow = Math.max(range.startRow.rowIndex, range.endRow.rowIndex);
        for (let rowIndex = startRow; rowIndex <= endRow; rowIndex++) {
          const rowNode = gridRef.api.getModel().getRow(rowIndex); 
          setDataValue(rowNode, newData);
        }
      });
    }
    else if (type === 'all') {
      gridRef.api.forEachNode(function (node) {
        setDataValue(node, datas[0]);
      });
    }
    else {
      for (let i = 0; i < datas.length; i++) {
        let item = datas[i];
        if (!item && item.constructor !== Object)
          continue;
        let rowid = item.aggrid_row_id?.toString();
        if (rowid) {
          setDataValue(gridRef.api.getRowNode(rowid), item);
        }
        else {
          const rowDatas = this.cacheRowDatas;
          if (!rowDatas || !rowDatas.data || rowDatas.data.constructor !== Array)
            continue;
          const primaries = this.getPrimaryValues(item);
          if (primaries !== null) { //如果item没有行id，但有设置主键，通过主键匹配数据
            const existData = rowDatas.data.filter(dataItem => this.getPrimaryValues(dataItem) === primaries) || [];
            existData.forEach(dataItem => {
              rowid = dataItem.aggrid_row_id?.toString();
              setDataValue(gridRef.api.getRowNode(rowid), item);
            })
          }
        }
      }
    }
  }

  removeSelectedData(confirmed, onlyDisplayed) {
    const gridRef = this.gridRef.current;
    const gridSettings = gridRef.props;
    const rowDatas = this.cacheRowDatas;
    if (!rowDatas || !rowDatas.data || rowDatas.data.constructor !== Array)
      return;
    if (gridSettings.rowModelType === "serverSide" && (!rowDatas.valid || rowDatas.valid.constructor !== Array))
      return;
    var selectedNodes = gridRef.api.getSelectedNodes();
    if (!selectedNodes || selectedNodes.length === 0) {
      this.notify(locale.getLanguageString("SELECT_ONE", "Please select at least one row"));
      return;
    }

    const confirmAction = () => {
      const selectedRows = [];
      for (let i = 0; i < selectedNodes.length; i++) {
        const selectedNode = selectedNodes[i];
        if (onlyDisplayed === true && selectedNode.displayed !== true)
          continue;
        const selectedRow = selectedNode.data;
        selectedRows.push(selectedRow);
        const indexToRemove = rowDatas.data.indexOf(selectedRow);
        const indexToRemove2 = rowDatas.valid.indexOf(selectedRow);
        if (indexToRemove >= 0) {
          const rowData = rowDatas.data[indexToRemove];
          const primaries = this.getPrimaryValues(rowData);
          if (primaries !== null && typeof rowDatas.primary === 'object') {
            if (rowDatas.primary.hasOwnProperty(primaries)) {
              rowDatas.primary[primaries] -= 1;
              if (rowDatas.primary[primaries] < 1)
                delete rowDatas.primary[primaries]
            }
          }
          if(rowData.aggrid_editing_status === 'newadded') {
            rowDatas.data.splice(indexToRemove, 1);
            rowDatas.newadded -= 1;
            rowDatas.adjustment += 1;
          }
          else {
            rowData.aggrid_editing_status = 'deleted';
            rowDatas.deleted += 1;
          }
          rowDatas.total -= 1;
        }
        if (indexToRemove2 >= 0) {
          rowDatas.valid.splice(indexToRemove2, 1);
        }
      }
      
      if (gridSettings.rowModelType === "serverSide") {
        this.getData({ pageIndex: gridRef.api.paginationGetCurrentPage() + 1 });
        gridRef.api.refreshServerSide();
      }
      else {
        gridRef.api.applyTransaction({ remove: selectedRows });
      }
      gridRef.api.deselectAll();
      this.dataChangedListener({type:"removeSelectedData"});
    }

    if (confirmed === false && typeof this.props.env?.confirm === 'function') {
      this.props.env.confirm(locale.getLanguageString("CONFIRM_DELETE", "Are you sure to delete?"))
      .then((ok) => {
        if (ok === true)
          confirmAction();
      })
      return;
    }
    confirmAction();
  }

  importData(input, options) {
    var file;
    var columns = this.columns;
    if (!columns || columns.length === 0)
      return;
    if (!input)
      return;
    if (input.value?.constructor === File) {
      file = input.value;
    }
    else if (input.constructor === Array && input.length > 0) {
      file = input[0].value;
    }
    else if (input.files && input.files.constructor === FileList && input.files.length > 0) {
      file = input.files[0];
    }
    if (!file || file.constructor !== File)
      return;
      
    var extend = file.name.substring(file.name.lastIndexOf(".") + 1);
    if (extend !== "xls" && extend !== "xlsx" && extend !== "csv") {
      input.value = "";
      this.notify(locale.getLanguageString("INVALID_EXCEL_FILE"));
      return;
    }

    var that = this;
    var excelColumns = [];
    for (let i = 0; i < 256; i++) {
      var flag0 = i % 26;
      var flag1 = Math.floor(i / 26);
      excelColumns[i] = (flag1 > 0 ? String.fromCharCode(flag1 + 64) : "") + String.fromCharCode(flag0 + 65)
    }
    var reader = new FileReader();
    reader.onload = function(event) {
      const data = event.target.result;
      const workbook = XLSX.read(data, { type: 'binary' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      let success = false;
      if (worksheet && worksheet.constructor === Object) {
        const keys = Object.keys(worksheet);
        if (keys.length > 0) {
          const addDatas = [];
          const maxRowIndex = keys.map(i => parseInt(i.replace(/^[A-Z]+/, ''), 10) || 0)
                          .sort((a, b) => b - a)[0];
          let rowIndex = 2;
          while (maxRowIndex >= rowIndex) {
            const rowData = {};
            let anything = false;
            let k = 0;
            for (let j = 0; j < columns.length; j++) {
              const column = columns[j];
              if (column.hide === true)
                continue;
              const headerKey = excelColumns[k] + 1;
              const key = excelColumns[k] + rowIndex;
              if (worksheet.hasOwnProperty(headerKey) &&
                  (options?.ignoreEditable === true || column.addible === true)) {
                let value = worksheet[key]?.w;
                if (value !== undefined && value !== null) {
                  switch (column.cellEditor) {
                    case 'CheckBoxEditor':
                      value = value > 0 || (typeof value === 'string' && (Number(value) > 0 || value === '是' || value.toLowerCase() === 'true' || value.toLowerCase() === 'y' || value.toLowerCase() === 'yes'))
                      break;
                    case 'DateEditor':
                      value = utils.dateFormat(value, 'YYYY-MM-DD')
                      break;
                    case 'DateTimeEditor':
                      value = utils.dateFormat(value, 'YYYY-MM-DD HH:mm:ss')
                      break;
                    case 'IntegerEditor':
                    case 'DecimalEditor':
                      let val = Number(value);
                      value = isNaN(val) ? null : val;
                      break;
                    default:
                      if (typeof value !== 'string')
                        value = value?.toString();
                      break;
                  }
                  rowData[column.field] = value;
                  anything = true;
                }
                else {
                  rowData[column.field] = null;
                }
              }
              k++;
            }
            if (anything)
              addDatas.push(rowData);
            rowIndex++;
          }
          if (addDatas.length > 0) {
            success = true;
            if (options?.suppressAddNewRows !== true)
              that.addNewData(addDatas, options?.modifyExistData !== false, options?.append === true);
            if (options?.dispatchEventWhenImportSucceed === true)
              that.props.dispatchEvent("aggrid-import-data", addDatas);
          }
        }
      }
      if (success)
        options?.suppressAddNewRows !== true && that.notify(locale.getLanguageString("IMPORT_SUCCESS"), "success");
      else
        that.notify(locale.getLanguageString("IMPORT_FAIL"));
      input.value = "";
      if (options?.clearId) {
        const eventName = 'component';
        const actionInstrance = getActionByType(eventName);
        if (actionInstrance) {
          const rendererEvent = createRendererEvent(eventName, {
            env: that.props.env,
            nativeEvent: eventName,
            scoped: that.context
          });
          const actionConfig = {
            componentId: options.clearId,
            actionType: 'clear' 
          }
          runAction(actionInstrance, actionConfig, that, rendererEvent);
        }
      }
    }
    reader.readAsBinaryString(file);
  }
  
  exportData() {
    this.gridRef.current.api.exportDataAsExcel();
  }

  saveData() {
    var api = this.buildApi(this.props.saveApi, this.props.data);
    if (!api) {
      this.notify(locale.getLanguageString("NO_SAVE_API", "No save api"));
      return;
    }
    if (!this.props.env || typeof this.props.env.fetcher !== 'function')
      return;

    var datas;
    try {
      datas = this.getChangedData(true);
      const addDatas = datas.add || [],
        updateDatas = datas.update || [],
        deleteDatas = datas.delete || [];
      if (addDatas.length === 0 && updateDatas.length === 0 && deleteDatas.length === 0)
        throw new Error(locale.getLanguageString("NOTHING_TO_SAVE", "Nothing to save"));
    }
    catch(e) {
      this.notify(e);
      return;
    }

    this.showLoading();
    this.props.env.fetcher(api, utils.extend({}, this.props.data, datas))
    .then((result) => {
      if (result.status !== 0)
        throw new Error(result.msg || 'Unknown Error');
      this.hideLoading();
      this.notify(locale.getLanguageString("SAVE_SUCCESS", "Save success"), "success");
      this.reloadData();
    }).catch((error) => {
      this.hideLoading();
      if (this.props.env.isCancel(error)) {
        error.message && this.notify(error);
        return
      }
      this.notify(error);
    });
  }

  deleteData(confirmed, onlyDisplayed) {
    const gridRef = this.gridRef.current;
    const gridSettings = gridRef.props;
    const rowDatas = this.cacheRowDatas;
    if (!rowDatas || !rowDatas.data || rowDatas.data.constructor !== Array)
      return;
    if (gridSettings.rowModelType === "serverSide" && (!rowDatas.valid || rowDatas.valid.constructor !== Array))
      return;
    var selectedNodes = gridRef.api.getSelectedNodes();
    if (!selectedNodes || selectedNodes.length === 0) {
      this.notify(locale.getLanguageString("SELECT_ONE", "Please select at least one row"));
      return;
    }
    
    const confirmAction = () => {
      const deleteData = []
      for (let i = 0; i < selectedNodes.length; i++) {
        const selectedNode = selectedNodes[i];
        if (onlyDisplayed === true && selectedNode.displayed !== true)
          continue;
        const selectedRow = selectedNode.data;
        if (selectedRow.aggrid_editing_status !== 'newadded')
          deleteData.push(selectedRow);
      }

      if (deleteData.length === 0) {
        this.removeSelectedData(true);
        return;
      }
      
      var api = this.buildApi(this.props.deleteApi, this.props.data);
      if (!api) {
        this.notify(locale.getLanguageString("NO_DELETE_API", "No delete api"));
        return;
      }
      if (!this.props.env || typeof this.props.env.fetcher !== 'function')
        return;
      
      this.showLoading();
      this.props.env.fetcher(api, utils.extend({}, this.props.data, { delete: deleteData }))
      .then((result) => {
        if (result.status !== 0)
          throw new Error(result.msg || 'Unknown Error');
        this.hideLoading();
        this.notify(locale.getLanguageString("OPERATION_SUCCESS", "Success"), "success");
        this.reloadData();
      }).catch((error) => {
        this.hideLoading();
        if (this.props.env.isCancel(error)) {
          error.message && this.notify(error);
          return
        }
        this.notify(error);
      });
    }

    if (confirmed === false && typeof this.props.env?.confirm === 'function') {
      this.props.env.confirm(locale.getLanguageString("CONFIRM_DELETE", "Are you sure to delete?"))
      .then((ok) => {
        if (ok === true)
          confirmAction();
      })
      return;
    }
    confirmAction();
  }

  getChangedData(checkData, rawData) {
    const datas = {add: [], update: [], delete: []};
    const columns = this.columns;
    if (!columns || columns.length === 0)
      return datas;
    const rowDatas = this.cacheRowDatas;
    if (!rowDatas || !rowDatas.data || rowDatas.data.constructor !== Array)
      return datas;
    for (let i = 0; i < rowDatas.data.length; i++) {
      const data = rowDatas.data[i];
      if (!data)
        continue;
      const status = data.aggrid_editing_status;
      const statusMap = {newadded: "add", modified: "update", deleted: "delete"};
      if (!statusMap.hasOwnProperty(status))
        continue;
      if (rawData === true && checkData !== true) {
        datas[statusMap[status]].push(data);
        continue;
      }
      const rowData = this.buildRowData(data, checkData);
      datas[statusMap[status]].push(rawData === true ? data : rowData);
    }
    return datas;
  }

  getSelectedData(checkData, rawData) {
    const datas = {select: []};
    const gridRef = this.gridRef.current;
    const columns = this.columns;
    if (!columns || columns.length === 0)
      return datas;
    const rowDatas = gridRef.api.getSelectedRows();
    if (!rowDatas || rowDatas.constructor !== Array)
      return datas;
    for (let i = 0; i < rowDatas.length; i++) {
      const data = rowDatas[i];
      if (rawData === true && checkData !== true) {
        datas.select.push(data);
        continue;
      }
      const rowData = this.buildRowData(data, checkData);
      datas.select.push(rawData === true ? data : rowData);
    }
    return datas;
  }

  buildRowData(data, checkData) {
    const columns = this.columns;
    if (!data || data.constructor !== Object ||
        !columns || columns.constructor !== Array || columns.length === 0)
      return null;
    const primaryData = this.cacheRowDatas?.primary || {};
    const status = data.aggrid_editing_status;
    const rowData = {};
    for (let j = 0; j < columns.length; j++) {
      const column = columns[j];
      const value = data[column.field];
      if (checkData === true && column.required === true && status !== "deleted") {
        if (value === undefined || value === null || (typeof value === 'string' && value === ''))
          throw new Error(column.headerName + locale.getLanguageString("REQUIRED", " is required"));
      }
      if (checkData === true && column.primary === true && status === 'newadded') {
        const primaries = this.getPrimaryValues(data);
        if (primaryData[primaries] > 1)
          throw new Error(locale.getLanguageString("DUPLICATE", "Data duplication"));
      }
      rowData[column.field] = value === undefined ? null : value;
    }
    return rowData;
  }

  showLoading() {
    const gridRef = this.gridRef.current;
    if (!gridRef?.props || gridRef.props.suppressLoadingOverlay === true)
      loading.show();
    else
      gridRef?.api.showLoadingOverlay();
  }

  hideLoading() {
    const gridRef = this.gridRef.current;
    if (!gridRef?.props || gridRef.props.suppressLoadingOverlay === true)
      loading.hide();
    else
      gridRef?.api.hideOverlay();
  }

  // cellClickedListener = (event) => {
  //   this.props.dispatchEvent("aggrid-cell-click", event);
  // }

  dataChangedListener = (event) => {
    const changeValue = this.props.type === 'input-aggrid' && (!this.props.changeValueBy || this.props.changeValueBy === 'dataChange');
    if (changeValue || this.props.dispatchEventWhenDataChanged === true) {
      const datas = this.getChangedData();
      if (changeValue)
        this.props.onChange({...datas, unchanged: (this.cacheRowDatas?.data || []).filter(i => i.aggrid_editing_status === undefined).map(i => this.buildRowData(i)) });
      this.props.dispatchEvent("aggrid-data-change", datas);
    }
  }

  selectionChangedListener = (event) => {
    if (typeof this.state.settings.onSelectionChanged === 'function' && event)
      this.state.settings.onSelectionChanged(event);
    const changeValue = this.props.type === 'input-aggrid' && this.props.changeValueBy === 'selection';
    if (changeValue || this.props.dispatchEventWhenSelectionChanged === true) {
      const datas = this.getSelectedData();
      if (changeValue)
        this.props.onChange(datas);
      const rowIds = [];
      const statuses = [];
      const nodes = this.gridRef.current.api.getSelectedNodes() || [];
      for (let i = 0; i < nodes.length; i++) {
        rowIds.push(nodes[i].id);
        statuses.push(nodes[i].data?.aggrid_editing_status || '');
      }
      this.props.dispatchEvent("aggrid-selection-change", {...datas, rowIds: rowIds, statuses: statuses});
    }
  }

  cellValueChangedListener = (event) => {
    if (typeof this.state.settings.onCellValueChanged === 'function' && event)
      this.state.settings.onCellValueChanged(event);
    this.dataChangedListener(event);
    var rowDatas = event.api.getSelectedRows() || [];
    if (rowDatas.indexOf(event.data) > -1)
        this.selectionChangedListener();
  }

  rowClickedListener = (event) => {
    if (typeof this.state.settings.onRowClicked === 'function' && event)
      this.state.settings.onRowClicked(event);
    if (this.props.dispatchEventWhenRowClicked === true) {
      this.props.dispatchEvent("aggrid-row-click", {...event.data});
    }
  }

  rowDoubleClickedListener = (event) => {
    if (typeof this.state.settings.onRowDoubleClicked === 'function' && event)
      this.state.settings.onRowDoubleClicked(event);
    if (this.props.dispatchEventWhenRowDoubleClicked === true) {
      this.props.dispatchEvent("aggrid-row-double-click", {...event.data});
    }
  }

  gridReadyListener = (event) => {
    this.setState({ready: true}, () => {
      if (typeof this.state.settings.onGridReady === 'function')
        this.state.settings.onGridReady(event);
      if (this.props.dispatchEventWhenReady === true)
        this.props.dispatchEvent("aggrid-ready", this.state.settings);
      this.getData({first: true, initFetch: this.props.initFetch, initFetchOn: this.props.initFetchOn});
      this.applyColumnState(event?.columnApi)
    });
  }

  columnVisibleListener = (event) => {
    if (typeof this.state.settings.onColumnVisible === 'function')
      this.state.settings.onColumnVisible(event);
    this.cacheColumnState(event?.columnApi)
  }

  columnResizedListener = (event) => {
    if (typeof this.state.settings.onColumnResized === 'function')
      this.state.settings.onColumnResized(event);
    this.cacheColumnState(event?.columnApi)
  }

  columnMovedListener = (event) => {
    if (typeof this.state.settings.onColumnMoved === 'function')
      this.state.settings.onColumnMoved(event);
    this.cacheColumnState(event?.columnApi)
  }

  columnPinnedListener = (event) => {
    if (typeof this.state.settings.onColumnPinned === 'function')
      this.state.settings.onColumnPinned(event);
    this.cacheColumnState(event?.columnApi)
  }

  cacheColumnState(columnApi) {
    if (this.props.cacheColumnState === true) {
      if (this.cacheColumnStateDelayHandler)
        clearTimeout(this.cacheColumnStateDelayHandler);
      this.cacheColumnStateDelayHandler = setTimeout(()=>{
        const state = columnApi?.getColumnState();
        state && localStorage.setItem(`${this.props.data.pageId}-${this.props.id}`, JSON.stringify(state.map(i => { return {...i, sort: null, sortIndex: null} })));
      }, 300);
    }
  }

  applyColumnState(columnApi) {
    if (this.props.cacheColumnState === true) {
      const json = localStorage.getItem(`${this.props.data.pageId}-${this.props.id}`);
      json && columnApi?.applyColumnState({state: JSON.parse(json), applyOrder: true})
    }
  }

  getPermissions(data) {
    if (data) {
      if (data.permissions)
        return data.permissions;
      if (data.__super)
        return this.getPermissions(data.__super);
    }
    return null;
  }

  parseFunction(setting) {
    if (setting) {
      if (setting.constructor === Object || setting.constructor === Array) {
        for (let settingKey in setting) {
          setting[settingKey] = this.parseFunction(setting[settingKey]);
        }
      }
      else if (typeof setting === 'string') {
        setting = setting.trim();
        if (setting.indexOf('(') === 0 || setting.indexOf('function') === 0 || setting.indexOf('=>') > 0) {
          let matchs = setting.match(/^function\s*\(([a-zA-Z0-9$_]+(?:\s*,\s*[a-zA-Z0-9$_]+)?)?\)(.+)/);
          if (matchs === null || matchs.length !== 3) {
            if (setting.indexOf('(') === 0)
              matchs = setting.match(/^\(([a-zA-Z0-9$_]+(?:\s*,\s*[a-zA-Z0-9$_]+)?)?\)\s*=>(.+)/);
            else
              matchs = setting.match(/^([a-zA-Z0-9$_]+)\s*=>(.+)/);
          }
          if (matchs !== null && matchs.length === 3) {
            const script = matchs[2].trim();
            if (script) {
              const argList = [];
              const args = matchs[1]?.trim();
              if (args)
                args.split(',').forEach(arg => argList.push(arg.trim()))
              setting = str2function(script, ...argList);
            }
          }
        }
      }
    }
    return setting;
  }

  async getColumnDefs(cols, rowModelType) {
    if (!cols || cols.constructor !== Array || cols.length === 0)
      return cols;

    if (!this.columns)
      this.columns = [];
    if (!this.primaryColumns)
      this.primaryColumns = [];
    const columns = this.columns;
    const primaryColumns = this.primaryColumns;
    const headerNames = this.props.headerNames || {};
    const propData = this.props.data;

    var masterDataApis = [];
    var columnDefs = [];
    for (let i = 0; i < cols.length; i++) {
      let columnDef = {};
      let column = cols[i];
      column.headerName = headerNames[column.field] || column.headerName;
      if (column.children && column.children.constructor === Array && column.children.length > 0) {
        for (let colKey in column) {
          if (['en-US' ,'zh-TW' ,'zh-CN'].includes(colKey))
            continue;
          columnDef[colKey] = column[colKey];
        }
        columnDef.children = await this.getColumnDefs(column.children);
        columnDefs.push(columnDef);
        continue;
      }
      if (!column.field || columns.some(item => item.field === column.field))
        continue;
      if (column.field.indexOf('aggrid_') === 0) //aggrid_开头的是预留字段
        continue;
      let rendererParams = column.cellRendererParams;
      let editorParams = column.cellEditorParams;
      let filterParams = column.filterParams;
      const cacheColumnMaster = this.cacheColumnMasters[column.field];
      if (rendererParams !== undefined && !Object.keys(this.rendererComponents).includes(column.cellRenderer)) {
        column.cellRendererParams = dataMapping(rendererParams, propData);
      }
      if (cacheColumnMaster?.editorParams && column.suppressMasterCache !== true) {
        masterDataApis.push({column: column, columnDef: columnDef, apply: "editor", refData: cacheColumnMaster.refData, params: cacheColumnMaster.editorParams});
      }
      else if ((typeof editorParams === 'object' && (typeof editorParams.api === 'object' || typeof editorParams.api === 'string' || typeof editorParams.url === 'string')) || typeof editorParams === 'string') {
        if (editorParams?.async !== true) {
          let api = this.buildApi(editorParams?.api || editorParams, propData);
          if (api && typeof api.url === 'string' && api.url.length > 0) {
            const apply = editorParams?.apply || "editorAndFilter";
            masterDataApis.push({column: column, columnDef: columnDef, apply: apply, api});
          }
        }
      }
      else if (editorParams !== undefined && !Object.keys(this.editorComponents).includes(column.cellEditor)) {
        column.cellEditorParams = dataMapping(editorParams, propData);
      }
      
      if (cacheColumnMaster?.filterParams && column.suppressMasterCache !== true) {
        masterDataApis.push({column: column, columnDef: columnDef, apply: 'filter', refData: cacheColumnMaster.refData, params: cacheColumnMaster.filterParams});
      }
      else if ((typeof filterParams === 'object' && (typeof filterParams.api === 'object' || typeof filterParams.api === 'string' || typeof filterParams.url === 'string')) || typeof filterParams === 'string') {
        let api = this.buildApi(filterParams?.api || filterParams, propData);
        if (api && typeof api.url === 'string' && api.url.length > 0) {
          const apply = filterParams?.apply || "filter";
          masterDataApis.push({column: column, columnDef: columnDef, apply: apply, api});
        }
      }
      else if (filterParams !== undefined && !Object.keys(this.filterComponents).includes(column.filter)) {
        column.filterParams = dataMapping(filterParams, propData);
      }
      if (column.primary === true) {
        column.editable = false;
        if (column.required !== false)
          column.required = true;
        primaryColumns.push(column);
      }
      for (let colKey in column) {
        if (['addible'
            ,'required'
            ,'primary'
            ,'primaryCaseSensitive'
            ,'defaultValue'
            ,'suppressKeyboardEvents'
            ,'suppressMasterCache'
            ,'en-US'
            ,'zh-TW'
            ,'zh-CN'
          ].includes(colKey))
          continue;
        columnDef[colKey] = column[colKey];
      }
      columnDef.colId = columnDef.field;
      columnDef.editable = function (params) {
        if (columns && columns.constructor === Array) {
          var colDef = columns.find(i => i.field === params.colDef.colId);
          if (colDef) {
            var data = params.data || {};
            const mergeData = utils.extend({}, propData, data)
            if (params.data.aggrid_editing_status === 'newadded')
              return colDef.addible === true || evalExpression(colDef.addible, mergeData);
            else
              return colDef.editable === true || evalExpression(colDef.editable, mergeData);
          }
        }
        return false;
      }
      if (!columnDef.cellClass) {
        columnDef.cellClass = "string";
      }
      if (column.cellClassRules && column.cellClassRules.constructor === Object) {
        const keys = Object.keys(column.cellClassRules);
        for (let ruleIndex = 0; ruleIndex < keys.length; ruleIndex++) {
          const classRule = keys[ruleIndex];
          const cellClass = column.cellClassRules[classRule];
          if (typeof cellClass === 'string') {
            column.cellClassRules[classRule] = (params) => {
              const func = str2function(cellClass, 'params');
              return func ? func(params) : false;
            }
          }
          else if (typeof cellClass !== 'function') {
            delete column.cellClassRules[classRule];
          }
        }
      }
      columnDef.cellClassRules = {
        ...column.cellClassRules,
        'ag-cell-empty': (params) => {
          var data = params.data || {};
          if (data.aggrid_editing_status === 'newadded' || data.aggrid_editing_status === 'modified') {
            if (params.value === undefined || params.value === null || (typeof params.value === 'string' && params.value === '')) {
              if (columns && columns.constructor === Array) {
                var colDef = columns.find(i => i.field === params.colDef.colId);
                if (colDef && colDef.required === true) {
                  return true;
                }
              }
            }
          }
          return false;
        },
        'ag-cell-data-duplication': (params) => {
          var data = params.data || {};
          if (data.aggrid_editing_status === 'newadded') {
            if (columns && columns.constructor === Array) {
              var colDef = columns.find(i => i.field === params.colDef.colId);
              if (colDef && colDef.primary === true) {
                const primaryData = params.context?.cacheRowDatas?.primary || {};
                const primaries = params.context?.getPrimaryValues(data);
                return primaryData[primaries] > 1;
              }
            }
          }
          return false;
        },
        'ag-cell-modified': (params) => {
          var data = params.data || {};
          if (data.aggrid_editing_status === 'modified') {
            return data.hasOwnProperty('aggrid_original_value_' + params.colDef.field)
          }
        },
        'ag-cell-checkbox': (params) => {
          var data = params.data || {};
          if (data.aggrid_editing_status === 'newadded' || data.aggrid_editing_status === 'modified') {
            if (columns && columns.constructor === Array) {
              var colDef = columns.find(i => i.field === params.colDef.colId);
              if (colDef && colDef.checkboxSelection === true) {
                return true;
              }
            }
          }
          return false;
        },
        'ag-cell-overflow-visible': (params) => {
          return params.colDef.cellEditor && ['AmisEditor'].includes(params.colDef.cellEditor);
        }
      }
      if (column.suppressKeyboardEvents && column.suppressKeyboardEvents.constructor === Array && column.suppressKeyboardEvents.length > 0) {
        columnDef.suppressKeyboardEvent = (params) => {
          if (columns && columns.constructor === Array) {
            var colDef = columns.find(i => i.field === params.colDef.colId);
            for (let eventIndex in colDef.suppressKeyboardEvents) {
              var event = colDef.suppressKeyboardEvents[eventIndex];
              if (event.toLowerCase() === params.event.key.toLowerCase())
                return true;
            }
          }
        }
      }
      columnDef.valueSetter = (params) => {
        var data = params.data || {};
        var oldValue = params.oldValue;
        var newValue = params.newValue;
        if (data[params.colDef.field] !== newValue) {
          data[params.colDef.field] = newValue;
          newValue = params.api.getValue(params.column, params.node);
        }
        if (newValue !== oldValue &&
            (typeof oldValue !== 'object' || typeof newValue !== 'object' || JSON.stringify(oldValue) !== JSON.stringify(newValue))) {
          if (data.aggrid_editing_status === 'newadded') {
            if (columns && columns.constructor === Array) {
              var colDef = columns.find(i => i.field === params.colDef.colId);
              if (colDef && colDef.primary === true) {
                let oldPrimaries = '';
                let newPrimaries = '';
                var primaryData = params.context?.cacheRowDatas?.primary || {};
                primaryColumns.forEach(col => {
                  let oldVal = col.field === params.colDef.colId ? oldValue : data[col.field];
                  let newVal = col.field === params.colDef.colId ? newValue : data[col.field];
                  oldVal = (oldVal === undefined || oldVal === null ? '' : oldVal).toString();
                  newVal = (newVal === undefined || newVal === null ? '' : newVal).toString();
                  oldPrimaries += col.primaryCaseSensitive === true ? oldVal : oldVal.toLowerCase();
                  newPrimaries += col.primaryCaseSensitive === true ? newVal : newVal.toLowerCase();
                });
                if (oldPrimaries !== newPrimaries) {
                  if (primaryData.hasOwnProperty(oldPrimaries)) {
                    primaryData[oldPrimaries] -= 1;
                    if (primaryData[oldPrimaries] < 1)
                      delete primaryData[oldPrimaries]
                  }
                  primaryData[newPrimaries] = (primaryData[newPrimaries] || 0) + 1;
                }
              }
            }
            if (params.colDef.cellEditorParams?.affectedColumns?.constructor === Array) {
              for (let i = 0; i < params.colDef.cellEditorParams.affectedColumns.length; i++) {
                let affectedColumn = params.colDef.cellEditorParams.affectedColumns[i];
                if (affectedColumn === params.colDef.colId)
                  continue;
                params.node.setDataValue(affectedColumn, null)
              }
            }
          }
          else {
            var originalValueKey = 'aggrid_original_value_' + params.colDef.field;
            if (!data.hasOwnProperty(originalValueKey))
              data[originalValueKey] = oldValue;
            else if (data[originalValueKey] === newValue)
              delete data[originalValueKey];
            else if (typeof data[originalValueKey] === 'object' && typeof newValue === 'object' &&
              JSON.stringify(data[originalValueKey]) === JSON.stringify(newValue))
              delete data[originalValueKey];

            if (params.colDef.cellEditorParams?.affectedColumns?.constructor === Array) {
              for (let i = 0; i < params.colDef.cellEditorParams.affectedColumns.length; i++) {
                let affectedColumn = params.colDef.cellEditorParams.affectedColumns[i];
                if (affectedColumn === params.colDef.colId)
                  continue;
                const key = 'aggrid_original_value_' + params.colDef.field + '_' + affectedColumn;
                let value = null;
                if (!data.hasOwnProperty(originalValueKey)) {
                  value = data[key] || null;
                  delete data[key];
                }
                else if (!data.hasOwnProperty(key)) {
                  data[key] = data[affectedColumn];
                }
                params.node.setDataValue(affectedColumn, value)
              }
            }

            if (Object.keys(data).some(key => key.indexOf('aggrid_original_value_') === 0))
              data.aggrid_editing_status = 'modified'
            else
              delete data.aggrid_editing_status;
          }
        }
        return true;
      }
      columns.push(column);
      if (column.type !== 'backend' && column.type !== 'children')
        columnDefs.push(columnDef);
    }

    if (masterDataApis.length > 0) {
      var promises = [];
      for (let item in masterDataApis) {
        const apiConfig = masterDataApis[item];
        if (apiConfig.api)
          promises.push(this.props.env.fetcher(apiConfig.api, propData))
        else {
          let columnDef = apiConfig.columnDef;
          if (columnDef) {
            if (apiConfig.refData)
              columnDef.refData = apiConfig.refData;
            if (apiConfig.apply === 'editor') {
              columnDef.cellEditorParams = apiConfig.params
            }
            if (apiConfig.apply === 'filter') {
              if (columnDef.filter === "agSetColumnFilter") {
                columnDef.filterParams = apiConfig.params
              }
            }
          }
        }
      }
      if (promises.length > 0) {
        try {
          loading.show();
          const results = await Promise.all(promises);
          for (let i = 0; i < results.length; i++) {
            if (results[i].status !== 0)
              throw new Error(results[i].msg || 'Unknown Error');
            const apiConfig = masterDataApis[i];
            const response = results[i].data;
            const rawValues = response.rawValues;
            const options = response.options || response.values || [];
            var values = [];
            var refData = {};
            for (let i = 0; i < options.length; i++) {
              const item = options[i];
              if (item.value === undefined || item.label === undefined) {
                values.push(item);
              }
              else {
                values.push(item.value);
                refData[item.value] = item.label;
              }
            }

            let column = apiConfig.column;
            let columnDef = apiConfig.columnDef;
            if (columnDef) {
              this.cacheColumnMasters[columnDef.field] = {};
              if (Object.keys(refData).length === values.length) {
                columnDef.refData = refData;
                this.cacheColumnMasters[columnDef.field].refData = refData;
              }
              if (apiConfig.apply === 'editorAndFilter' || apiConfig.apply === 'editor') {
                columnDef.cellEditorParams = {
                  ...column.cellEditorParams,
                  rawValues: rawValues,
                  values: values
                }
                this.cacheColumnMasters[columnDef.field].editorParams = columnDef.cellEditorParams
              }
              if (apiConfig.apply === 'editorAndFilter' || apiConfig.apply === 'filter') {
                if (columnDef.filter === "agSetColumnFilter") {
                  columnDef.filterParams = {
                    ...column.filterParams, 
                    rawValues: rawValues,
                    values: values
                  }
                  this.cacheColumnMasters[columnDef.field].filterParams = columnDef.filterParams
                }
              }
            }
          }
          loading.hide();
        }
        catch (error) {
          loading.hide();
          if (this.props.env.isCancel(error)) {
            error.message && this.notify(error);
            return
          }
          this.notify(error);
          return;
        }
      }
    }

    for (let i = 0; i < columnDefs.length; i++) {
      let columnDef = columnDefs[i];
      if (typeof columnDef.filterParams?.comparator === 'string') {
        if (columnDef.filter === "agSetColumnFilter") {
          const comparator = columnDef.filterParams.comparator;
          columnDef.filterParams.comparator = (a, b) => {
            const func = str2function(comparator, 'a', 'b');
            if (func) {
              const result = func(a, b);
              return result >= 0 ? result : -1;
            }
            return -1;
          }
        }
      }
      if (rowModelType !== 'serverSide') {
        if (columnDef.filter === "agDateColumnFilter") {
          columnDef.filterParams = {
            comparator: (filterLocalDateAtMidnight, cellValue) => {
              const date = moment(cellValue);
              if (!date.isValid()) {
                  return -1;
              }
              const cellDate = new Date(date.year(), date.month(), date.date());
              if (cellDate < filterLocalDateAtMidnight) {
                  return -1;
              } else if (cellDate > filterLocalDateAtMidnight) {
                  return 1;
              }
              return 0;
            }
          }
        }
      }
      if (columnDef.cellEditorParams !== undefined && columnDef.cellEditorParams.values?.constructor !== Array)
        columnDef.cellEditorParams.values = []
      if (columnDef.filterParams !== undefined && columnDef.filterParams.values?.constructor !== Array)
        columnDef.filterParams.values = []
    }
    return columnDefs;
  }

  async getSettings() {
    if (!this.props.settings || typeof this.props.settings !== 'object')
      return null;
    var gridSetting = {...this.props.settings};
    var cols = gridSetting.columnDefs || gridSetting.columns;
    const propData = this.props.data;

    delete gridSetting.columns;
    delete gridSetting.columnDefs;
    gridSetting = dataMapping(gridSetting, propData, key => (gridSetting.detailCellRenderer ? [
      'detailCellRendererParams'
    ] : []).includes(key));
    if (typeof cols === 'string')
      cols = dataMapping(cols, propData);
    cols = dataMapping(cols, propData, key => [
      'cellRendererParams',
      'cellEditorParams',
      'filterParams',
      'addible',
      'editable'
    ].includes(key));
    
    if (!cols || cols.constructor !== Array || cols.length === 0)
      return null;
    this.parseFunction(gridSetting);
    this.parseFunction(cols);
    this.columns = [];
    this.primaryColumns = [];
    var columnDefs = await this.getColumnDefs(cols, gridSetting.rowModelType);
    
    if (gridSetting.pageSize !== undefined) {
      if (gridSetting.paginationPageSize === undefined)
        gridSetting.paginationPageSize = gridSetting.pageSize;
      delete gridSetting.pageSize;
    }
    gridSetting.cacheBlockSize = gridSetting.paginationPageSize;
    gridSetting.defaultColDef = utils.extend({
      sortable: true,
      resizable: true,
      //editable: true,
      singleClickEdit: true,
      floatingFilter: true,
      filterParams: {
        defaultJoinOperator: "OR",
        defaultToNothingSelected: true,
        inRangeInclusive: true,
        closeOnApply: true,
        buttons: ["reset","apply"]
      },
      tooltipComponent: 'CellTooltip',
    }, gridSetting.defaultColDef);

    const that = this;
    let filterDelayHandler = 0;
    gridSetting.gridOptions = utils.extend({
      onPaginationChanged: function(e) {
        if (gridSetting.rowModelType !== "serverSide")
          return;
        if (e.newPage) {
          that.getData({ pageIndex: e.api.paginationGetCurrentPage() + 1 });
        }
      },
      onSortChanged: function(e) {
        if (gridSetting.rowModelType !== "serverSide")
          return;
        that.refreshData();
      },
      onFilterChanged: function(e) {
        if (gridSetting.rowModelType !== "serverSide")
          return;
        let columns = e?.columns || [];
        if (columns[0]?.colDef?.filter === 'agDateColumnFilter') {
          if (filterDelayHandler)
            clearTimeout(filterDelayHandler);
          filterDelayHandler = setTimeout(()=>{ that.refreshData() }, 300);
        }
        else {
          that.refreshData()
        }
      }
    }, gridSetting.gridOptions);

    if (gridSetting.treeData === true) {
      const treeHierarchyKey = gridSetting.treeHierarchyKey || 'aggrid_tree_hierarchy';
      const treeDataSeparator = gridSetting.treeDataSeparator || ',';
      delete gridSetting.treeHierarchyKey;
      delete gridSetting.treeDataSeparator;
      this.treeDataSeparator = treeDataSeparator;
      if (gridSetting.rowModelType === 'serverSide') {
        gridSetting.isServerSideGroup = (data) => {
          return !!data[treeHierarchyKey];
        }
        gridSetting.getServerSideGroupKey = (data) => {
          return this.getPrimaryValues(data, true, treeDataSeparator) || data.aggrid_row_id;
        }
      }
      else {
        gridSetting.getDataPath = (data) => {
          const hierarchy = data[treeHierarchyKey];
          if (hierarchy) {
            if (typeof hierarchy === 'string' && hierarchy.length > 0)
              return hierarchy.split(treeDataSeparator);
            else if (typeof hierarchy === 'object' && hierarchy.constructor === Array)
              return hierarchy;
          }
          return [data.aggrid_row_id];
        }
      }
    }

    if (typeof gridSetting.popupParent === 'string') {
      gridSetting.popupParent = document.querySelector(gridSetting.popupParent);
    }

    gridSetting.getRowId = (params) => {
      return params.data.aggrid_row_id;
    }

    //let permissions = this.getPermissions(this.props.data) || {};

    return utils.extend(true, {
      id: this.props.id || "mainGrid",
      context: this,
      pagination: false,
      paginationPageSize: 20,
      cacheBlockSize: 20,
      headerHeight: 32,
      floatingFiltersHeight: 32,
      rowHeight: 28,
      tooltipShowDelay: 0,
      tooltipHideDelay: 10000,
      gridOptions: null,
      defaultColDef: null,
      columnDefs: columnDefs,
      localeText: locale.getAgGridLanguages(),
      rowSelection: "multiple",
      rowModelType: "clientSide",
      serverSideInfiniteScroll: true,
      stopEditingWhenCellsLoseFocus: true,
      suppressLoadingOverlay: true,
      suppressPaginationPanel: true,
      //suppressExcelExport: permissions.export !== true,
      //suppressCsvExport: permissions.export !== true,
      sideBar: null,
      aggFuncs: {
        'decimalSum': params => {
            let sum = 0;
            params.values.forEach(value => sum=utils.add(sum, value));
            return sum;
        }
      },
      excelStyles: [
        {
          id: "currency",
          numberFormat: {
            format: "#,##0.00",
          }
        },
        {
          id: "number",
          dataType: "Number"
        },
        {
          id: "boolean",
          dataType: "Boolean"
        },
        {
          id: "string",
          dataType: "String"
        },
        {
          id: "datetime",
          dataType: "DateTime"
        }
      ],
      rowClassRules: {
        'ag-row-newadded': (params) => {
          var data = params.data || {};
          return data.aggrid_editing_status === 'newadded';
        }
      }
    }, gridSetting);
  }

  render() {
    if (!this.state.settings)
      return <></>
    //当value发生变化时更新数据
    if (this.state.ready === true && this.props.value && this.props.value.constructor === Array) {
      this.timeoutHandler && clearTimeout(this.timeoutHandler)
      this.timeoutHandler = setTimeout(() => { //不设置setTimeout异步操作会报告一个警告
        if (this.props.value && this.props.value.constructor === Array)
          this.reloadData();
      }, 1);
    }
    return (
      <>
        <div className={"ag-theme-balham ag-theme-extend"+(this.props.className?" "+this.props.className:"")}
          style={{width: this.props.width || '100%', height: this.props.height || 500}}>
          <div className="ag-main-wrapper">
            <div className="ag-main-body">
              <AgGridReact
                ref={this.gridRef} // Ref for accessing Grid's API
                {...this.state.settings}
                components={this.components}
                // onCellClicked={this.cellClickedListener}
                onCellValueChanged={this.cellValueChangedListener}
                onSelectionChanged={this.selectionChangedListener}
                onRowClicked={this.rowClickedListener}
                onRowDoubleClicked={this.rowDoubleClickedListener}
                onColumnVisible={this.columnVisibleListener}
                onColumnResized={this.columnResizedListener}
                onColumnMoved={this.columnMovedListener}
                onColumnPinned={this.columnPinnedListener}
                onGridReady={this.gridReadyListener}
                />
            </div>
            {
              this.state.settings.suppressPaginationPanel === true && this.state.settings.pagination === true &&
              <PaginationPanel {...this.gridRef.current} />
            }
          </div>
        </div>
      </>
    );
  }
}

FormItem({
  shouldComponentUpdate: AgGrid.shouldComponentUpdate,
  type: 'input-aggrid',
  autoVar: true
})(AgGrid);

Renderer({
  shouldComponentUpdate: AgGrid.shouldComponentUpdate,
  type: 'aggrid',
  autoVar: true
})(AgGrid);