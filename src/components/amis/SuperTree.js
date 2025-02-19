import React from 'react';
import cx from 'classnames';
import {Tree as TreeSelector} from 'amis-ui';
import {
  createObject,
  OptionsControl,
  autobind,
  isPureVariable,
  resolveVariableAndFilter,
  resolveEventData,
  toNumber
} from 'amis-core';
import {Spinner} from 'amis-ui';
import utils from "utils";


export default class SuperTree extends React.Component {
  static defaultProps = {
    placeholder: 'loading',
    multiple: false,
    rootLabel: 'Tree.root',
    rootValue: '',
    showIcon: true,
    enableNodePath: false,
    pathSeparator: '/'
  };
  treeRef;

  reload() {
    const reload = this.props.reloadOptions;
    reload && reload();
  }

  doAction(action, data, throwErrors) {
    const actionType = action?.actionType;
    const {resetValue, onChange} = this.props;

    if (actionType === 'clear') {
      onChange?.('');
    } else if (actionType === 'reset') {
      onChange?.(resetValue ?? '');
    } else if (action.actionType === 'expand') {
      this.treeRef.syncUnFolded(this.props, action.args?.openLevel);
    } else if (action.actionType === 'collapse') {
      this.treeRef.syncUnFolded(this.props, 1);
    }
  }

  async handleChange(value) {
    const {onChange, dispatchEvent} = this.props;

    const rendererEvent = await dispatchEvent(
      'change',
      resolveEventData(this.props, {value}, 'value')
    );

    if (rendererEvent?.prevented) {
      return;
    }

    onChange && onChange(value);
  }

  domRef(ref) {
    this.treeRef = ref;
  }

  validate() {
    const {value, minLength, maxLength, delimiter} = this.props;

    let curValue = Array.isArray(value)
      ? value
      : (value ? String(value) : '').split(delimiter || ',');
    if (minLength && curValue.length < minLength) {
      return `已选择数量低于设定的最小个数${minLength}，请选择更多的选项。`;
    } else if (maxLength && curValue.length > maxLength) {
      return `已选择数量超出设定的最大个数${maxLength}，请取消选择超出的选项。`;
    }
  }

  renderOptionItem(option, states) {
    const {menuTpl, render, data} = this.props;

    return render(`option/${states.index}`, menuTpl, {
      data: createObject(createObject(data, {...states}), option)
    });
  }

  render() {
    const {
      className,
      style,
      treeContainerClassName,
      classPrefix: ns,
      value,
      enableNodePath,
      pathSeparator = '/',
      disabled,
      joinValues,
      extractValue,
      delimiter,
      placeholder,
      options,
      multiple,
      valueField,
      initiallyOpen,
      unfoldedLevel,
      withChildren,
      onlyChildren,
      onlyLeaf,
      loading,
      hideRoot,
      rootLabel,
      autoCheckChildren,
      cascade,
      rootValue,
      showIcon,
      showRadio,
      showOutline,
      onAdd,
      creatable,
      createTip,
      addControls,
      onEdit,
      editable,
      editTip,
      editControls,
      removable,
      removeTip,
      onDelete,
      rootCreatable,
      rootCreateTip,
      labelField,
      iconField,
      nodePath,
      deferLoad,
      expandTreeOptions,
      translate: __,
      data,
      virtualThreshold,
      itemHeight,
      loadingConfig,
      menuTpl
    } = this.props;
    let {highlightTxt} = this.props;

    if (isPureVariable(highlightTxt)) {
      highlightTxt = resolveVariableAndFilter(highlightTxt, data);
    }

    return (
      <div
        className={cx(`${ns}TreeControl`, className, treeContainerClassName)}
      >
        <Spinner
          size="sm"
          key="info"
          show={loading}
          loadingConfig={loadingConfig}
        />
        {loading ? null : (
          <TreeSelector
            classPrefix={ns}
            onRef={this.domRef}
            labelField={labelField}
            valueField={valueField}
            iconField={iconField}
            disabled={disabled}
            onChange={this.handleChange}
            joinValues={joinValues}
            extractValue={extractValue}
            delimiter={delimiter}
            placeholder={__(placeholder)}
            options={options}
            highlightTxt={highlightTxt}
            multiple={multiple}
            initiallyOpen={initiallyOpen}
            unfoldedLevel={unfoldedLevel}
            withChildren={withChildren}
            onlyChildren={onlyChildren}
            onlyLeaf={onlyLeaf}
            hideRoot={hideRoot}
            rootLabel={__(rootLabel)}
            rootValue={rootValue}
            showIcon={showIcon}
            showRadio={showRadio}
            showOutline={showOutline}
            autoCheckChildren={autoCheckChildren}
            cascade={cascade}
            foldedField="collapsed"
            value={value || ''}
            nodePath={nodePath}
            enableNodePath={enableNodePath}
            pathSeparator={pathSeparator}
            selfDisabledAffectChildren={false}
            onAdd={onAdd}
            creatable={creatable}
            createTip={createTip}
            rootCreatable={rootCreatable}
            rootCreateTip={rootCreateTip}
            onEdit={onEdit}
            editable={editable}
            editTip={editTip}
            removable={removable}
            removeTip={removeTip}
            onDelete={onDelete}
            bultinCUD={!addControls && !editControls}
            onDeferLoad={deferLoad}
            onExpandTree={expandTreeOptions}
            virtualThreshold={virtualThreshold}
            itemHeight={
              toNumber(itemHeight) > 0 ? toNumber(itemHeight) : undefined
            }
            itemRender={menuTpl ? this.renderOptionItem : undefined}
          />
        )}
      </div>
    );
  }
}

utils.decorate([autobind], SuperTree.prototype, "handleChange", null);
utils.decorate([autobind], SuperTree.prototype, "domRef", null);
utils.decorate([autobind], SuperTree.prototype, "renderOptionItem", null);

OptionsControl({
  type: 'super-tree'
})(SuperTree);
