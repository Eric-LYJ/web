import React, { Component } from 'react'
import { Select, Button, isNumeric } from 'amis'

export default class PaginationPanel extends Component {
  gridApi = null;
  paginationProxy = null;
  gridOptionsWrapper = null;
  previousAndFirstButtonsDisabled = false;
  nextButtonDisabled = false;
  lastButtonDisabled = false;
  defaultPageSize = 20;

  constructor(props) {
    super(props);
    this.lbFirstRowOnPage = React.createRef();
    this.lbLastRowOnPage = React.createRef();
    this.lbRecordCount = React.createRef();
    this.btFirst = React.createRef();
    this.btPrevious = React.createRef();
    this.lbCurrent = React.createRef();
    this.lbTotal = React.createRef();
    this.btNext = React.createRef();
    this.btLast = React.createRef();
    this.state = {
      pageIndex: '',
      pageSize: 0,
      ready: false
    };
  }

  componentDidUpdate() {
    if (!this.state.ready && this.props.api) {
      this.gridApi = this.props.api;
      this.paginationProxy = this.props.api.paginationProxy;
      this.gridOptionsWrapper = this.props.api.gridOptionsWrapper;
      this.defaultPageSize = this.paginationProxy.getPageSize();
      this.postConstruct();
      this.setState({ ready: true, pageSize: this.defaultPageSize });
    }
  }

  createIconNoSpan(iconName) {
    var span = document.createElement("span");
    span.setAttribute('class', `ag-icon ag-icon-${iconName}`);
    span.setAttribute('unselectable', 'on');
    span.setAttribute('role', 'presentation');
    return span;
  }

  addManagedListener(service, event, action) {
    this.paginationProxy.addManagedListener(service, event, action);
  }

  postConstruct() {
    const isRtl = this.gridOptionsWrapper.isEnableRtl();
    this.btFirst.current.insertAdjacentElement('afterbegin', this.createIconNoSpan(isRtl ? 'last' : 'first', this.gridOptionsWrapper));
    this.btPrevious.current.insertAdjacentElement('afterbegin', this.createIconNoSpan(isRtl ? 'next' : 'previous', this.gridOptionsWrapper));
    this.btNext.current.insertAdjacentElement('afterbegin', this.createIconNoSpan(isRtl ? 'previous' : 'next', this.gridOptionsWrapper));
    this.btLast.current.insertAdjacentElement('afterbegin', this.createIconNoSpan(isRtl ? 'first' : 'last', this.gridOptionsWrapper));

    this.addManagedListener(this.gridApi.eventService, "paginationChanged", this.onPaginationChanged.bind(this));

    [
      { el: this.btFirst.current, fn: this.onBtFirst.bind(this) },
      { el: this.btPrevious.current, fn: this.onBtPrevious.bind(this) },
      { el: this.btNext.current, fn: this.onBtNext.bind(this) },
      { el: this.btLast.current, fn: this.onBtLast.bind(this) }
    ].forEach(item => {
      const { el, fn } = item;
      this.addManagedListener(el, 'click', fn);
      this.addManagedListener(el, 'keydown', (e) => {
        if (e.key === "Enter" || e.key === "Space") {
          e.preventDefault();
          fn();
        }
      });
    });

    this.onPaginationChanged();
  }

  onPaginationChanged() {
    this.enableOrDisableButtons();
    this.updateRowLabels();
    this.setCurrentPageLabel();
    this.setTotalLabels();
  }

  onBtFirst() {
    if (!this.previousAndFirstButtonsDisabled) {
      this.paginationProxy.goToFirstPage();
    }
  }

  setCurrentPageLabel() {
    const pagesExist = this.paginationProxy.getTotalPages() > 0;
    const currentPage = this.paginationProxy.getCurrentPage();
    const toDisplay = pagesExist ? currentPage + 1 : 0;

    this.lbCurrent.current.innerHTML = this.formatNumber(toDisplay);
  }

  formatNumberCommas(value, thousandSeparator, decimalSeparator) {
    if (typeof value !== 'number') {
      return '';
    }
  
    return value.toString().replace('.', decimalSeparator).replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1" + thousandSeparator);
  }

  formatNumber(value) {
    const userFunc = this.gridOptionsWrapper.getPaginationNumberFormatterFunc();

    if (userFunc) {
      const params = { value: value };
      return userFunc(params);
    }

    const localeTextFunc = this.gridOptionsWrapper.getLocaleTextFunc();
    const thousandSeparator = localeTextFunc('thousandSeparator', ',');
    const decimalSeparator = localeTextFunc('decimalSeparator', '.');
    return this.formatNumberCommas(value, thousandSeparator, decimalSeparator);
  }


  onBtNext() {
    if (!this.nextButtonDisabled) {
      this.paginationProxy.goToNextPage();
    }
  }

  onBtPrevious() {
    if (!this.previousAndFirstButtonsDisabled) {
      this.paginationProxy.goToPreviousPage();
    }
  }

  onBtLast() {
    if (!this.lastButtonDisabled) {
      this.paginationProxy.goToLastPage();
    }
  }

  enableOrDisableButtons() {
    const currentPage = this.paginationProxy.getCurrentPage();
    const maxRowFound = this.paginationProxy.isLastPageFound();
    const totalPages = this.paginationProxy.getTotalPages();

    this.previousAndFirstButtonsDisabled = currentPage === 0;
    this.toggleButtonDisabled(this.btFirst.current, this.previousAndFirstButtonsDisabled);
    this.toggleButtonDisabled(this.btPrevious.current, this.previousAndFirstButtonsDisabled);

    const zeroPagesToDisplay = this.isZeroPagesToDisplay();
    const onLastPage = maxRowFound && currentPage === (totalPages - 1);

    this.nextButtonDisabled = onLastPage || zeroPagesToDisplay;
    this.lastButtonDisabled = !maxRowFound || zeroPagesToDisplay || currentPage === (totalPages - 1);

    this.toggleButtonDisabled(this.btNext.current, this.nextButtonDisabled);
    this.toggleButtonDisabled(this.btLast.current, this.lastButtonDisabled);
  }

  toggleButtonDisabled(button, disabled) {
    button.setAttribute("aria-disabled", disabled.toString());//setAriaDisabled(button, disabled);
    button.classList.toggle('ag-disabled', disabled);

    if (disabled) {
      button.removeAttribute('tabindex');
    } else {
      button.setAttribute('tabindex', '0');
    }
  }

  updateRowLabels() {
    const currentPage = this.paginationProxy.getCurrentPage();
    const pageSize = this.paginationProxy.getPageSize();
    const maxRowFound = this.paginationProxy.isLastPageFound();
    const rowCount = this.paginationProxy.isLastPageFound() ?
      this.paginationProxy.getMasterRowCount() : null;

    let startRow;
    let endRow;

    if (this.isZeroPagesToDisplay()) {
      startRow = endRow = 0;
    } else {
      startRow = (pageSize * currentPage) + 1;
      endRow = startRow + pageSize - 1;
      if (maxRowFound && endRow > rowCount) {
        endRow = rowCount;
      }
    }

    this.lbFirstRowOnPage.current.innerHTML = this.formatNumber(startRow);
    if (this.gridApi.rowNodeBlockLoader.isLoading()) {
      this.lbLastRowOnPage.current.innerHTML = '?';
    } else {
      this.lbLastRowOnPage.current.innerHTML = this.formatNumber(endRow);
    }
  }

  isZeroPagesToDisplay() {
    const maxRowFound = this.paginationProxy.isLastPageFound();
    const totalPages = this.paginationProxy.getTotalPages();
    return maxRowFound && totalPages === 0;
  }

  setTotalLabels() {
    const lastPageFound = this.paginationProxy.isLastPageFound();
    const totalPages = this.paginationProxy.getTotalPages();
    const rowCount = lastPageFound ? this.paginationProxy.getMasterRowCount() : null;

    // When `pivotMode=true` and no grouping or value columns exist, a single 'hidden' group row (root node) is in
    // the grid and the pagination totals will correctly display total = 1. However this is confusing to users as
    // they can't see it. To address this UX issue we simply set the totals to zero in the pagination panel.
    if (rowCount === 1) {
      const firstRow = this.paginationProxy.getRow(0);

      // a group node with no group or agg data will not be visible to users
      const hiddenGroupRow = firstRow && firstRow.group && !(firstRow.groupData || firstRow.aggData);
      if (hiddenGroupRow) {
        this.setTotalLabelsToZero();
        return;
      }
    }

    if (lastPageFound) {
      this.lbTotal.current.innerHTML = this.formatNumber(totalPages);
      this.lbRecordCount.current.innerHTML = this.formatNumber(rowCount);
    } else {
      const moreText = this.gridOptionsWrapper.getLocaleTextFunc()('more', 'more');
      this.lbTotal.current.innerHTML = moreText;
      this.lbRecordCount.current.innerHTML = moreText;
    }
  }

  setTotalLabelsToZero() {
    this.lbFirstRowOnPage.current.innerHTML = this.formatNumber(0);
    this.lbCurrent.current.innerHTML = this.formatNumber(0);
    this.lbLastRowOnPage.current.innerHTML = this.formatNumber(0);
    this.lbTotal.current.innerHTML = this.formatNumber(0);
    this.lbRecordCount.current.innerHTML = this.formatNumber(0);
  }

  changePageSize = (e) => {
    this.gridOptionsWrapper.setProperty("cacheBlockSize", e.value);
    this.gridOptionsWrapper.setProperty('paginationPageSize', e.value);
    this.setState({ pageSize: this.paginationProxy.getPageSize() });
    if (this.props.props.rowModelType === 'serverSide') {
      this.props.props.context.reloadData();
      return;
    }
    this.gridApi.deselectAll();
    this.paginationProxy.goToFirstPage();
  }

  changePageIndex = (e) => {
    const value = e.currentTarget.value;
    this.setState({ pageIndex: isNumeric(value) ? value : '' });
  }

  goToPage = () => {
    const pageIndex = parseInt(this.state.pageIndex, 0);
    const pagesExist = this.paginationProxy.getTotalPages() > 0;
    const currentPage = this.paginationProxy.getCurrentPage();
    const currentPageIndex = pagesExist ? currentPage + 1 : 0;
    if (pageIndex > 0 && pageIndex !== currentPageIndex)
      this.paginationProxy.goToPage(pageIndex - 1);
    this.setState({ pageIndex: '' });
  }

  onPageIndexKeydown = (e) => {
    if(e.keyCode === 13) {
      this.goToPage()
    }
  }

  switchPagingAction = (e) => {
    let parent = e.target.parentNode
    if (e.target.className == "ag-paging-icon fa-solid fa-arrow-right") {
      e.target.className = "ag-paging-icon fa-solid fa-arrow-left"
      parent.className = "ag-paging-row-action-panel expanded"
    }
    else {
      e.target.className = "ag-paging-icon fa-solid fa-arrow-right"
      parent.className = "ag-paging-row-action-panel shrinked"
    }
  }

  render() {
    const defaultPageSize = this.defaultPageSize;
    const pageSize = this.state.pageSize;
    const localeTextFunc = this.gridOptionsWrapper?.getLocaleTextFunc();
    const strPage = localeTextFunc?localeTextFunc('page', 'Page'):"";
    const strTo = localeTextFunc?localeTextFunc('to', 'to'):"";
    const strOf = localeTextFunc?localeTextFunc('of', 'of'):"";
    const strFirst = localeTextFunc?localeTextFunc('firstPage', 'First Page'):"";
    const strPrevious = localeTextFunc?localeTextFunc('previousPage', 'Previous Page'):"";
    const strNext = localeTextFunc?localeTextFunc('nextPage', 'Next Page'):"";
    const strLast = localeTextFunc?localeTextFunc('lastPage', 'Last Page'):"";
    const strPageSize = localeTextFunc?localeTextFunc('pageSize', 'Page Size'):"";
    const strGoToPage = localeTextFunc?localeTextFunc('goToPage', 'Go To'):"";
    const compId = "pagination-panel";//this.getCompId();
    const pageSizeOptions = [
      { label: '20', value: 20 },
      //{ label: '50', value: 50 },
      { label: '100', value: 100 },
      //{ label: '300', value: 300 },
      { label: '500', value: 500 },
      { label: '1000', value: 1000 }
    ]
    if (defaultPageSize > 0 && !pageSizeOptions.some(i => i.value === defaultPageSize)) {
      pageSizeOptions.push({ label: defaultPageSize.toString(), value: defaultPageSize });
    }
    return <>
      {
        <div className="ag-paging-panel ag-unselectable" id={"ag-"+compId}>
          <div className="ag-paging-row-action-panel">
            <span className="ag-paging-page-size">
              <span className="m-r-none">{strPageSize}&nbsp;</span>
              <Select clearable={false} useMobileUI={false} className="unclearable w-18" options={pageSizeOptions} value={pageSize} onChange={this.changePageSize} />
            </span>
            <span className="ag-paging-goto-page">
              <span className="m-r-none">{strGoToPage}&nbsp;</span>
              <span className="cxd-TextControl--withAddOn inline-flex v-middle">
                <div className="cxd-TextControl-input w-12">
                  <input value={this.state.pageIndex} onChange={this.changePageIndex} onKeyDown={this.onPageIndexKeydown} />
                </div>
                <div className="cxd-TextControl-button">
                  <Button className="py-none px-2" onClick={this.goToPage}>GO</Button>
                </div>
              </span>
            </span>
            <span className="ag-paging-icon fa-solid fa-arrow-right" unselectable="on" onClick={this.switchPagingAction} style={{display:'none'}}>
            </span>
          </div>
          <span className="ag-paging-row-summary-panel" role="status">
            <span id={"ag-"+compId+"-first-row"} ref={this.lbFirstRowOnPage} className="ag-paging-row-summary-panel-number"></span>&nbsp;
            <span id={"ag-"+compId+"-to"}>{strTo}</span>&nbsp;
            <span id={"ag-"+compId+"-last-row"} ref={this.lbLastRowOnPage} className="ag-paging-row-summary-panel-number"></span>&nbsp;
            <span id={"ag-"+compId+"-of"}>{strOf}</span>&nbsp;
            <span id={"ag-"+compId+"-row-count"} ref={this.lbRecordCount} className="ag-paging-row-summary-panel-number"></span>
          </span>
          <span className="ag-paging-page-summary-panel" role="presentation">
            <div ref={this.btFirst} className="ag-paging-button" role="button" aria-label={strFirst}></div>
            <div ref={this.btPrevious} className="ag-paging-button" role="button" aria-label={strPrevious}></div>
            <span className="ag-paging-description" role="status">
              <span id={"ag-"+compId+"-start-page"}>{strPage}</span>&nbsp;
              <span id={"ag-"+compId+"-start-page-number"} ref={this.lbCurrent} className="ag-paging-number"></span>&nbsp;
              <span id={"ag-"+compId+"-of-page"}>{strOf}</span>&nbsp;
              <span id={"ag-"+compId+"-of-page-number"} ref={this.lbTotal} className="ag-paging-number"></span>
            </span>
            <div ref={this.btNext} className="ag-paging-button" role="button" aria-label={strNext}></div>
            <div ref={this.btLast} className="ag-paging-button" role="button" aria-label={strLast}></div>
          </span>
        </div>
      }
    </>
  }
}
