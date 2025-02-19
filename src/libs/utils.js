import moment from 'moment';
export default (function () {
  return {
    isPlainObject: function (obj) {
      var class2type = {
        "[object Boolean]": "boolean",
        "[object Number]": "number",
        "[object String]": "string",
        "[object Function]": "function",
        "[object Array]": "array",
        "[object Date]": "date",
        "[object RegExp]": "regexp",
        "[object Object]": "object",
        "[object Error]": "error",
        "[object Symbol]": "symbol"
      };
      var proto, Ctor,
        toString = class2type.toString,
        hasOwn = class2type.hasOwnProperty;

      // Detect obvious negatives
      // Use toString instead of jQuery.type to catch host objects
      if (!obj || toString.call(obj) !== "[object Object]") {
        return false;
      }

      proto = Object.getPrototypeOf(obj);

      // Objects with no prototype (e.g., `Object.create( null )`) are plain
      if (!proto) {
        return true;
      }

      // Objects with prototype are plain iff they were constructed by a global Object function
      Ctor = hasOwn.call(proto, "constructor") && proto.constructor;
      return typeof Ctor === "function" && hasOwn.toString.call(Ctor) === hasOwn.toString.call(Object);
    },
    extend: function () {
      var options, name, src, copy, copyIsArray, clone,
        target = arguments[0] || {},
        i = 1,
        length = arguments.length,
        deep = false;

      // Handle a deep copy situation
      if (typeof target === "boolean") {
        deep = target;

        // Skip the boolean and the target
        target = arguments[i] || {};
        i++;
      }

      var isFunction = typeof target === "function" && typeof target.nodeType !== "number";

      // Handle case when target is a string or something (possible in deep copy)
      if (typeof target !== "object" && !isFunction) {
        target = {};
      }

      // Extend jQuery itself if only one argument is passed
      if (i === length) {
        target = this;
        i--;
      }

      for (; i < length; i++) {

        // Only deal with non-null/undefined values
        if ((options = arguments[i]) != null) {

          // Extend the base object
          for (name in options) {
            src = target[name];
            copy = options[name];

            // Prevent never-ending loop
            if (target === copy) {
              continue;
            }

            // Recurse if we're merging plain objects or arrays
            if (deep && copy && (this.isPlainObject(copy) ||
              (copyIsArray = Array.isArray(copy)))) {

              if (copyIsArray) {
                copyIsArray = false;
                clone = src && Array.isArray(src) ? src : [];

              } else {
                clone = src && this.isPlainObject(src) ? src : {};
              }

              // Never move original objects, clone them
              target[name] = this.extend(deep, clone, copy);

              // Don't bring in undefined values
            } else if (copy !== undefined) {
              target[name] = copy;
            }
          }
        }
      }
      // Return the modified object
      return target;
    },
    cookie: function (name, value, options) {
      if (typeof value !== 'undefined') { // name and value given, set cookie
        options = options || {};
        if (value === null) {
          value = '';
          options.expires = -1;
        }
        var expires = '';
        if (options.expires && (typeof options.expires == 'number' || options.expires.toUTCString)) {
          var date;
          if (typeof options.expires == 'number') {
            date = new Date();
            date.setTime(date.getTime() + (options.expires * 24 * 60 * 60 * 1000));
          } else {
            date = options.expires;
          }
          expires = '; expires=' + date.toUTCString(); // use expires attribute, max-age is not supported by IE
        }
        var path = options.path ? '; path=' + options.path : '';
        var domain = options.domain ? '; domain=' + options.domain : '';
        var secure = options.secure ? '; secure' : '';
        document.cookie = [name, '=', encodeURIComponent(value), expires, path, domain, secure].join('');
      } else { // only name given, get cookie
        var cookieValue = null;
        if (document.cookie && document.cookie !== '') {
          var cookies = document.cookie.split(';');
          for (var i = 0; i < cookies.length; i++) {
            var cookie = this.trim(cookies[i]);
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
              cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
              break;
            }
          }
        }
        return cookieValue;
      }
    },
    add: function (a, b) {
      const at = typeof a === 'number' && !isNaN(a);
      const bt = typeof b === 'number' && !isNaN(b);
      if (!at && !bt)
        a = b = 0;
      else if (at && !bt)
        b = 0;
      else if (!at && bt)
        a = 0;
      var c, d, e;
      try {
        c = a.toString().split(".")[1].length;
      } catch (f) {
        c = 0;
      }
      try {
        d = b.toString().split(".")[1].length;
      } catch (f) {
        d = 0;
      }
      e = Math.pow(10, Math.max(c, d));
      var r = (this.mul(a, e) + this.mul(b, e)) / e;
      if (arguments.length > 2) {
        for (var i = 2; i < arguments.length; i++)
          r = this.add(r, arguments[i]);
      }
      return r;
    },
    sub: function (a, b) {
      const at = typeof a === 'number' && !isNaN(a);
      const bt = typeof b === 'number' && !isNaN(b);
      if (!at && !bt)
        a = b = 0;
      else if (at && !bt)
        b = 0;
      else if (!at && bt)
        a = 0;
      var c, d, e;
      try {
        c = a.toString().split(".")[1].length;
      } catch (f) {
        c = 0;
      }
      try {
        d = b.toString().split(".")[1].length;
      } catch (f) {
        d = 0;
      }
      e = Math.pow(10, Math.max(c, d));
      var r = (this.mul(a, e) - this.mul(b, e)) / e;
      if (arguments.length > 2) {
        for (var i = 2; i < arguments.length; i++)
          r = this.sub(r, arguments[i]);
      }
      return r;
    },
    mul: function (a, b) {
      const at = typeof a === 'number' && !isNaN(a);
      const bt = typeof b === 'number' && !isNaN(b);
      if (!at && !bt)
        a = b = 0;
      else if (at && !bt)
        b = 0;
      else if (!at && bt)
        a = 0;
      var c = 0,
        d = a.toString(),
        e = b.toString();
      try {
        c += d.split(".")[1].length;
      } catch (f) { }
      try {
        c += e.split(".")[1].length;
      } catch (f) { }
      var r = Number(d.replace(".", "")) * Number(e.replace(".", "")) / Math.pow(10, c);
      if (arguments.length > 2) {
        for (var i = 2; i < arguments.length; i++)
          r = this.mul(r, arguments[i]);
      }
      return r;
    },
    div: function (a, b) {
      const at = typeof a === 'number' && !isNaN(a);
      const bt = typeof b === 'number' && !isNaN(b);
      if (!at && !bt)
        a = b = 0;
      else if (at && !bt)
        b = 0;
      else if (!at && bt)
        a = 0;
      var c, d, e = 0,
        f = 0;
      try {
        e = a.toString().split(".")[1].length;
      } catch (g) { }
      try {
        f = b.toString().split(".")[1].length;
      } catch (g) { }
      c = Number(a.toString().replace(".", ""));
      d = Number(b.toString().replace(".", ""));
      var r = this.mul(c / d, Math.pow(10, f - e));
      if (arguments.length > 2) {
        for (var i = 2; i < arguments.length; i++)
          r = this.div(r, arguments[i]);
      }
      return r;
    },
    dateFormat(d, s, f) {
      if (!d)
        return '';
      var date =  f ? moment(d, f) : moment(d);
      return date.isValid() ? date.format(s) : '';
    },
    trim: function (text) {
      return text == null ? "" : (text + "").replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, "");
    },
    objectContaionsKey: function (obj, key) {
      if (!obj || !key || typeof obj != 'object' || typeof key != 'string')
        return false;
      var objectKeys = Object.keys(obj);
      for (var objectKeyIndex in objectKeys) {
        var itemKey = objectKeys[objectKeyIndex];
        if (itemKey.toLocaleLowerCase() === key.toLocaleLowerCase()) {
          return true;
        }
      }
      return false;
    },
    getObjectValue: function (obj, key) {
      if (!obj || !key || typeof obj != 'object' || typeof key != 'string')
        return null;

      if (obj.hasOwnProperty(key))
        return obj[key];
      else {
        var objectKeys = Object.keys(obj);
        for (var objectKeyIndex in objectKeys) {
          var itemKey = objectKeys[objectKeyIndex];
          if (itemKey.toLocaleLowerCase() === key.toLocaleLowerCase()) {
            return obj[itemKey];
          }
        }
      }
      return null;
    },
    getValueByPath: function (path, dataset) {
      if (!path || !dataset || typeof path != 'string' || typeof dataset != 'object')
        return null;

      var data = dataset;
      var paths = path.split('.');
      var prefix = paths[0];
      var keys = prefix.split('[');
      var key = keys.length > 1 ? keys[0] : prefix;
      var result = !key ? data : this.getObjectValue(data, key);
      if (!result) {
        return null;
      }
      else if (keys.length > 1) {
        for (var i = 1; i < keys.length; i++) {
          if (result.constructor !== Array)
            return null;
          var paramArray = result;
          var index = -1;
          var num = keys[i].substring(0, keys[i].length - 1);
          if (num.toLocaleLowerCase() === "n")
            index = paramArray.length - 1;
          else {
            index = parseInt(num, 10) || -1
          }

          if (index < 0 || paramArray.length <= index)
            return null;
          result = paramArray[index];
        }
      }

      if (paths.length > 1) {
        return this.getValueByPath(path.substring(prefix.length + 1), result);
      }
      else {
        return result;
      }
    },
    convertAPIParameter: function (config, source) {
      if (!source || typeof source !== 'object' || Object.keys(source).length === 0)
        return null;
      var rsArray = [];
      var dsArray = [];
      if (source.constructor !== Array)
        dsArray.push(source);
      else
        dsArray = source;
      for (var dsArrayIndex in dsArray) {
        var n = dsArray[dsArrayIndex];
        if (typeof n != 'object' || n.constructor === Array)
          continue;
        if (!config || typeof config !== 'object' || Object.keys(config).length === 0) {
          rsArray.push(n);
          continue;
        }
        var d = {};
        for (var configIndex in config) {
          var j = config[configIndex];
          var col = '';
          var val = '';
          if (config.constructor === Array && typeof j === 'string') {
            col = j;
            val = j;
          }
          else if (typeof configIndex === 'string' && typeof j === 'string') {
            col = configIndex;
            val = j;
          }
          if (col && val) {
            var exists = false;
            for (var i in n) {
              if (i.toLocaleLowerCase() === val.toLocaleLowerCase()) {
                d[col] = n[i];
                exists = true;
                break;
              }
            }
            if (!exists) {
              if (col === val)
                d[col] = null;
              else
                d[col] = val;
            }
          }
        }
        rsArray.push(d);
      }
      var data = null;
      if (source.constructor !== Array)
        data = rsArray[0];
      else
        data = rsArray;
      return data;
    },
    mergeAPIParameter: function (target, data) {
      if (!target || typeof target !== 'object')
        return;
      if (!data || typeof data !== 'object' || Object.keys(data).length === 0)
        return;


      if (target.constructor !== Array) {
        let r = target;
        let d = data.constructor === Array ? data[0] : data;
        if (d && typeof d === 'object' && d.constructor !== Array) {
          for (let i in d) {
            if (!this.objectContaionsKey(i))
              r[i] = d[i];
          }
        }
      }
      else {
        var targetArray = target;
        var dataArray = data.constructor === Array ? data : [data];
        if (targetArray.length > 0) {
          for (var rindex = 0; rindex < targetArray.length; rindex++) {
            for (var dindex = 0; dindex < dataArray.length; dindex++) {
              if (rindex === dindex || data.constructor !== Array) //如果data是Array，按顺序合并到target的对应项，如果data是Object，分别合并到target每一项
              {
                let r = targetArray[rindex];
                let d = dataArray[dindex];
                if (d && typeof d === 'object' && d.constructor !== Array) {
                  for (let i in d) {
                    if (!this.objectContaionsKey(i))
                      r[i] = d[i];
                  }
                }
                break;
              }
            }
          }
        }
        else {
          for (var dataArrayIndex in dataArray) {
            var ditem = dataArray[dataArrayIndex];
            if (typeof ditem === 'object' && ditem.constructor !== Array)
              targetArray.push(ditem);
          }
        }
      }
    },
    parseAPIParameter: function (config, dataset) {
      if (!config)
        return config;
      if (typeof config !== 'object' || Object.keys(config).length === 0) {
        if (typeof config == 'string') {
          var value = config;
          if (value.indexOf("@") === 0)//value是一个@参数，解析后再返回
          {
            var key = value.substring(1);
            return this.getValueByPath(key, dataset);
          }
        }
        return config;
      }

      var result = null;
      if (config.constructor === Array)
        result = [];
      else
        result = {};

      if (config.constructor === Array) {
        var index = 0;
        var results = result;
        for (var configIndex in config) {
          var node = config[configIndex];
          if (typeof node !== 'object' || node.constructor === Array) //非对象实体
          {
            let value = this.parseAPIParameter(node, dataset);
            results.push(value);
            index++;
            continue;
          }
          var containAtParam = false;
          var itemResults = [];
          for (let nodeKey in node) {
            if (nodeKey.indexOf("@") !== 0)
              continue;
            containAtParam = true;
            let ds = this.parseAPIParameter(nodeKey, dataset);
            let data = this.convertAPIParameter(node[nodeKey], ds);
            this.mergeAPIParameter(itemResults, data);
          }

          if (!containAtParam) {
            let value = this.parseAPIParameter(node, dataset);
            results.push(value);
            index++;
            continue;
          }

          for (var item in itemResults) {
            results.push(itemResults[item]);
          }

          for (let nodeKey in node) {
            if (nodeKey.indexOf("@") === 0)
              continue;

            for (var i = index; i < results.length; i++) {
              results[i][nodeKey] = this.parseAPIParameter(node[nodeKey], dataset);
            }
          }
          index += itemResults.length;
        }
      }
      else {
        for (var configKey in config) {
          if (configKey.indexOf("@") !== 0)
            continue;
          let ds = this.parseAPIParameter(configKey, dataset);
          let data = this.convertAPIParameter(config[configKey], ds);
          this.mergeAPIParameter(result, data);
        }

        for (let configKey in config) {
          if (configKey.indexOf("@") === 0)
            continue;
          result[configKey] = this.parseAPIParameter(config[configKey], dataset);
        }
      }

      if (typeof result === 'object' && result.constructor !== Array && Object.keys(result).length === 0)
        return null;

      return result;
    },
    parseAPIResponse: function (config, data) {
      var total = 0;
      var apiResponseConfig = config || {};
      if (!this.objectContaionsKey(apiResponseConfig, "code"))
        apiResponseConfig["code"] = "@code";
      if (!this.objectContaionsKey(apiResponseConfig, "status"))
        apiResponseConfig["status"] = "@status";
      if (!this.objectContaionsKey(apiResponseConfig, "message"))
        apiResponseConfig["message"] = "@message";
      if (!this.objectContaionsKey(apiResponseConfig, "msgTimeout"))
        apiResponseConfig["msgTimeout"] = "@msgTimeout";
      if (!this.objectContaionsKey(apiResponseConfig, "total"))
        apiResponseConfig["total"] = "@totalRecords";
      if (!this.objectContaionsKey(apiResponseConfig, "content"))
        apiResponseConfig["content"] = [{ "@content.list": [] }];

      var resultObject = this.parseAPIParameter(apiResponseConfig, data);
      var successCode = this.getObjectValue(resultObject, "successcode");
      var responseCode = this.getObjectValue(resultObject, "code");
      if (responseCode == null) {
        responseCode = this.getObjectValue(resultObject, "status");
        if (successCode == null)
          successCode = "success";
      }
      else {
        if (successCode == null)
          successCode = "0";
      }
      if (responseCode && responseCode === successCode) {
        var responseTotal = this.getObjectValue(resultObject, "total");
        if (responseTotal && typeof responseTotal == 'number' && !isNaN(responseTotal))
          total = responseTotal;
        return { content: this.getObjectValue(resultObject, "content"), total: total };
      }
      else {
        var responseMessage = this.getObjectValue(resultObject, "message");
        var message = responseMessage ? responseMessage : "Unknown Error";
        var msgTimeout = this.getObjectValue(resultObject, "msgTimeout");
        if (typeof msgTimeout === 'number' && !isNaN(msgTimeout))
          return { status: 1, msg: message, msgTimeout: msgTimeout };
        throw message;
      }
    },
    buildAPIUrl: function (url, baseUrl, module) {
      if (url) {
        url = url.replace('/?action=', '?action=');
        if (url[0] === '?')
          url = baseUrl + url + (module ? '&module=' + module : '');
      }
      return url || '';
    },
    getUrlParams: function (location) {
      const result = {};
      let search = location?.search;
      if (!search && location?.hash?.indexOf('#/') === 0) {
        search = location.hash.split('?')[1];
      }
      if (search) {
        const params = search.split('&');
        for (let i in params) {
          const param = params[i].split('=');
          result[param[0]] = param[1];
        }
      }
      return result;
    },
    getUrlParam: function (location, param) {
      return this.getUrlParams(location)[param];
    },
    getFilter: function (filters) {
      filters = filters || {};
      var result = [];
      var convert = function(filter, field) {
        let result = null;
        if (filter.type === 'blank' || filter.type === 'notBlank') {
          result = { value: '', operator: filter.type === 'blank' ? 'equalWhenNullAsEmpty' : 'notEqualWhenNullAsEmpty' };
        }
        else if (filter.dateFrom !== undefined) {
          let dateFrom = moment(filter.dateFrom).format('YYYY-MM-DD');
          let dateTo = filter.dateTo ? moment(filter.dateTo).format('YYYY-MM-DD') : ['equals','notEqual'].includes(filter.type) ? moment(filter.dateFrom).add(1,'d').format('YYYY-MM-DD') : null;
          if (filter.dateTo)
            result = { mode: 'and', groups: [{ value: dateFrom, operator: "greaterThanOrEqual" }, { value: dateTo, operator: "lessThanOrEqual" }] };
          else if (filter.type === 'equals')
            result = { mode: 'and', groups: [{ value: dateFrom, operator: "greaterThanOrEqual" }, { value: dateTo, operator: "lessThan" }] };
          else if (filter.type === 'notEqual')
            result = { mode: 'or', groups: [{ value: dateFrom, operator: "lessThan" }, { value: dateTo, operator: "greaterThanOrEqual" }] };
          else
            result = { value: filter.dateFrom, operator: filter.type };
        }
        else if (filter.filter !== undefined) {
          if (filter.filterTo)
            result = { mode: 'and', groups: [{ value: filter.filter, operator: "greaterThanOrEqual" }, { value: filter.filterTo, operator: "lessThanOrEqual" }] };
          else
            result = { value: filter.filter, operator: filter.type };
        }
        if (result && field)
          result.field = field;
        return result;
      }
      for (var i in filters) {
        const item = filters[i];
        if (item.filterType === 'text' || item.filterType === 'number' || item.filterType === 'date') {
          const filter = convert(item, i);
          if (filter !== null) {
            result.push(filter);
            continue;
          }
          const groups = [];
          for (var j in item) {
            if (j.indexOf("condition") === -1)
              continue;
            const group = convert(item[j]);
            if (group !== null)
              groups.push(group);
          }
          if (groups.length > 0)
            result.push({ field: i, mode: item.operator, groups: groups });
        }
        else if (item.filterType === 'set') {
          if (item.values && item.values.constructor === Array) {
            var groups = item.values.map(val => { return { value: val, operator: "equals" } });
            result.push({ field: i, mode: 'in', groups: groups });
          }
        }
      }
      return result;
    },
    getSort: function (columnStates) {
      columnStates = columnStates || [];
      var result = [];
      var sorts = [];
      for (let i in columnStates) {
        var columnState = columnStates[i];
        if (columnState.sort) {
          sorts.push(columnState);
        }
      }
      sorts.sort((a, b) => a.sortIndex - b.sortIndex);
      for (let i in sorts) {
        var sort = sorts[i];
        result.push({ field: sort.colId, mode: sort.sort });
      }
      return result;
    },
    getUserLanguageCode() {
      return (this.cookie("UserLanguage") || 'S').toUpperCase();
    },
    arrayToObject(arr, key, val) {
      if (!arr || arr.constructor !== Array ||
        !key || typeof key !== 'string' ||
        !val || typeof val !== 'string')
        return null;
      const func = (prev,cur,index) => {
        let obj = prev;
        if (index === 1 || typeof prev !== 'object' || prev.constructor === Array) {
          obj = {};
          if (typeof prev === 'object' && prev.constructor !== Array && prev[key])
            obj[prev[key]] = prev[val];
        }
        if (typeof cur === 'object' && cur.constructor !== Array && cur[key])
          obj[cur[key]] = cur[val];
        return obj;
      };
      const result = arr.length > 1 ? arr.reduce(func) : func(arr[0], {}, 1);
      return result;
    },
    decorate(decorators, target, key, desc) {
      var c = arguments.length,
          r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc,
          d;
      if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
      return c > 3 && r && Object.defineProperty(target, key, r), r;
    }
  }
})()