import React, { useState, useEffect, useRef } from 'react'
import { useParams, useLocation, useNavigate, useMatch } from "react-router-dom";
import { match } from 'path-to-regexp';
import qs from 'qs';
import config from "config";
import axios from 'axios';
import utils from "utils";
import locale from "../libs/locale";
import { loading } from "../components/amis/Loading";

import {render as renderAmis, normalizeLink, alert, str2function} from 'amis';
import '../components/amis/SuperTree';
import '../components/amis/AgGrid';
import '../components/amis/Outlet';
import '../components/amis/OutletAction';
import '../libs/amis/filters';
import '../libs/amis/functions';

let amisScoped;
const { AmisTheme, AmisLocale } = config;

export default function Module(props) {
  const navigate = useNavigate();
  const match0 = useMatch('/:module/:folder');
  const match1 = useMatch('/:module/:folder/:type');
  const location = useLocation();
  const { module, folder, type, id } = useParams();
  const [schema, setSchema] = useState(null);
  const [data, setData] = useState(null);
  const [showLoading, setShowLoading] = useState();
  const oldTitle = useRef(window.top.window.document.title).current;
  const search = useRef(location.search);
  const typeRef = useRef(type);
  const idRef = useRef(id);
  const firstLevel = typeRef.current && idRef.current ? 2 : typeRef.current ? 1 : 0;
  const factualLevel = type && id ? 2 : type ? 1 : 0;
  const level = props.level || 0;

  let loaded = false;

  useEffect(()=>{
    loaded = true;
    getConfig();
  },[module?.toLowerCase(), folder?.toLowerCase()]);

  useEffect(()=>{
    if (level === 0 || factualLevel >= firstLevel) {
      const outlet = amisScoped && amisScoped.getComponentById("#outlet" + level);
      if (!outlet || outlet.props.show === false || (search.current !== location.search && factualLevel === level)) {
        if (!loaded) {
          loaded = true;
          getConfig();
        }
      }
    }
  },[type?.toLowerCase()]);
  
  useEffect(()=>{
    if (level === 0 || factualLevel >= firstLevel) {
      const outlet = amisScoped && amisScoped.getComponentById("#outlet" + level);
      if (!outlet || outlet.props.show === false || (search.current !== location.search && factualLevel === level)) {
        if (!loaded && data?.id !== id) {
          loaded = true;
          if (!schema) {
            getConfig();
            return;
          }
          const pageData = {...data, id: id};
          const newSchema = {...schema};
          setSchema(null);
          setData(pageData);
          setTimeout(() => {
            setSchema(newSchema);
            search.current = location.search;
          }, 1);
        }
      }
    }
  },[id]);

  useEffect(()=>{
    if (!loaded && schema) {
      let isMatch = true;
      const outlet0 = amisScoped && amisScoped.getComponentById("#outlet0");
      const outlet1 = amisScoped && amisScoped.getComponentById("#outlet1");
      if (outlet0 && outlet0.props.show === true && outlet1 && outlet1.props.show === true)
        isMatch = level === 2;
      else if (outlet0 && outlet0.props.show === true)
        isMatch = level === 1;
      if (isMatch) {
        const pageData = {...data};
        const newSchema = {...schema};
        setSchema(null);
        setData(pageData);
        setTimeout(() => {
          setSchema(newSchema);
          search.current = location.search;
        }, 1);
      }
    }
  },[location.search]);

  useEffect(()=>{
    if (amisScoped) {
      if (firstLevel === 0) {
        if (match0) {
          amisScoped.closeById("#outlet0");
          amisScoped.closeById("#outlet1");
        }
        else if (match1) {
          amisScoped.closeById("#outlet1");
        }
      }
      else {
        if (match0) {
          amisScoped.closeById("#outlet0");
          amisScoped.closeById("#outlet1");
          typeRef.current = undefined;
          idRef.current = undefined;
        }
        else if (match1) {
          if (factualLevel < firstLevel)
            amisScoped.closeById("#outlet0");
          amisScoped.closeById("#outlet1");
          typeRef.current = type;
          idRef.current = undefined;
        }
      }
    }
  });

  useEffect(()=>{
    if (showLoading === true)
      loading.show();
    else if (showLoading === false)
      loading.hide();
  }, [showLoading]);

  useEffect(()=>{
    //页面离开时候，还原title
    return () => {
      loading.hide();
      window.top.window.document.title = oldTitle;
    }
  }, [oldTitle]);

  function getConfig() {
    if (schema)
      setSchema(null);
    setShowLoading(true);
    const {menuid, ref} = utils.getUrlParams(window.location);
    axios({
      url: `${config.Trinity_API}?action=getconfig&module=${module||''}&folder=${ref||folder||''}&menuid=${menuid||ref||folder||''}&type=${type||'index'}`,
      method: 'get'
    }).then((result) => {
      setShowLoading(false);
      const response = utils.parseAPIResponse({content:"@content"}, result.data);
      const content = response.content || {};
      if (!content.config || typeof content.config != 'object') {
        navigate("/404");
        return;
      }
      let title = content.config[AmisLocale]?.pageTitle || content.config.pageTitle || oldTitle;
      if (window.top.window.document.title !== title)
        window.top.window.document.title = title;
      delete content.config[AmisLocale]?.pageTitle;
      delete content.config.pageTitle;

      let permissions = {};
      if (content.permissions && content.permissions.length > 0) {
        for (var i = 0; i < content.permissions.length; i++) {
          const permission = content.permissions[i];
          if (permission && permission.ActionID)
            permissions[permission.ActionID.toLowerCase()] = true;
        }
      }
      if (!permissions.display) {
        alert(locale.getLanguageString("NO_PERMISSION", "You have no right to view this page"));
        return;
      }
      const pageData = {
        permissions,
        id: id,
        pageId: `${module}-${ref||folder}-${type||'index'}`.toLowerCase(),
        userId: content.userId,
        userName: content.userName,
        language: utils.getUserLanguageCode(),
        config: config
      }
      content.config.detectField = "data";
      setData(pageData);
      setTimeout(() => {
        setSchema(content.config);
        search.current = location.search;
      }, 1);
    }).catch((e) => {
      setShowLoading(false);
      alert(locale.getLanguageString("FAILED_TO_GET_CONFIG", "Failed to get configuration") + " " + e);
    })
  }
  
  return (
    <>
      {!showLoading && schema &&
        renderAmis(
        schema,
        {
          // props...
          data: data,
          locale: AmisLocale, // 请参考「多语言」的文档
          scopeRef: (ref) => (ref && (amisScoped = ref))
        },
        {
          toastPosition: "top-center",
          getModalContainer: () => document.querySelector('.ag-amis-cell-edit-popup-wrapper') || document.querySelector('#root'),
          updateLocation: (to, replace) => {
            if (to === 'goBack') {
              return window.history.back();
            }
      
            if (replace && window.history.replaceState) {
              window.history.replaceState('', document.title, to);
              return;
            }
      
            window.location.href = normalizeLink(to);
          },
          isCurrentUrl: (to, ctx) => {
            const link = normalizeLink(to);
            const location = window.location;
            let pathname = link;
            let search = '';
            const idx = link.indexOf('?');
            if (~idx) {
              pathname = link.substring(0, idx);
              search = link.substring(idx);
            }
      
            if (search) {
              if (pathname !== location.pathname || !location.search) {
                return false;
              }
      
              const query = qs.parse(search.substring(1));
              const currentQuery = qs.parse(location.search.substring(1));
      
              return Object.keys(query).every(
                key => query[key] === currentQuery[key]
              );
            } else if (pathname === location.pathname) {
              return true;
            } else if (!~pathname.indexOf('http') && ~pathname.indexOf(':')) {
              return match(link, {
                decode: decodeURIComponent,
                strict: ctx?.strict ?? true
              })(location.pathname);
            }
      
            return false;
          },
          jumpTo: (to, action) => {
            if (to === 'goBack') {
              return window.history.back();
            }
            to = to || '';
            to = to[to.length - 1] === '?' ? to.substring(0, to.length - 1) : to;
            //to = prefix + normalizeLink(to);
      
            if (action && action.actionType === 'url') {
              action.blank === true ? window.open(to) : (window.location.href = to);
              return;
            }
            if (action && action.actionType === 'link') {
              action.blank === true ? window.open(to) : navigate(to.indexOf('/#/')===0?to.substring(2):to.indexOf('#/')===0?to.substring(1):to);
              return;
            }
      
            // 主要是支持 nav 中的跳转
            if (action && to && action.target) {
              window.open(to, action.target);
              return;
            }
      
            if (/^https?:\/\//.test(to)) {
              window.location.replace(to);
            } else {
              window.location.href = to;
            }
          },
          fetcher: (request) => {
            var pathname = window.location.pathname;
            if (window.location.hash.indexOf('#/') === 0) {
              pathname = window.location.hash.substring(1).split('#')[0].split('?')[0];
            }
            else if (config.BasePath) {
              pathname = pathname.replace(config.BasePath, '');
            }
            const module = pathname.substring(1).split('/')[0];
            request = request || {};
            request.url = utils.buildAPIUrl(request.url, config.Trinity_API, module);
            request.adaptor = request.adaptor || function (result) {
              try {
                const data = utils.parseAPIResponse({content:"@content"}, result)
                if (data.status === 1)
                  return data;
                return {
                  data: data,
                  status: 0,
                  msg: locale.getLanguageString("OPERATION_SUCCESS", "Success")
                }
              }
              catch (e) {
                return {
                  status: 1,
                  msg: e
                }
              }
            }
            const data = request.data;
            if (!request.extensionData || (typeof request.extensionData === 'string' && request.extensionData.indexOf('data.') === 0)) {
              const extensionKey = request.extensionData ? request.extensionData.substring(5) : 'extensionData';
              if (data && data.hasOwnProperty(extensionKey)) {
                request.extensionData = data[extensionKey];
                delete data[extensionKey];
                if (request.body && request.body.hasOwnProperty(extensionKey))
                  delete request.body[extensionKey];
                if (request.query && request.query.hasOwnProperty(extensionKey))
                  delete request.query[extensionKey];
              }
            }
            const options = request.config || {};
            options.url = request.url;
            options.method = request.method || 'get';
            if (request.responseType)
              options.responseType = request.responseType
            if (request.headers)
              options.headers = request.headers
            if (request.cancelHandler)
              options.cancelHandler = request.cancelHandler
            if (typeof options.cancelHandler === 'string') {
              options.cancelToken = new axios.CancelToken((cancel) => {
                const func = str2function(options.cancelHandler, 'cancel', 'api');
                func && func(cancel, request)
              })
            }
            else if (typeof options.cancelHandler === 'function') {
              options.cancelToken = new axios.CancelToken((cancel) => {
                options.cancelHandler(cancel, request)
              })
            }
            delete request.cancelHandler;
            delete options.cancelHandler;

            switch (options.method.toLowerCase()) {
              case 'post':
              case 'put':
              case 'patch':
                if (data && data instanceof FormData) {
                  options.headers = options.headers || {};
                  options.headers['Content-Type'] = 'multipart/form-data';
                }
                data && (options.data = data);
                break;
              default:
                data && (options.params = data);
                break;
            }
            if (request.extensionData?.instantResponse && (!!request.extensionData?.instantResponse.expression) !== false)
              return new Promise((resolve, reject) => {
                setTimeout(function () {
                  resolve({
                    data: {
                      status:'success',
                      content:request.extensionData?.instantResponse.data
                    }
                  });
                }, 1);
              })
            return axios(options)
          },
          isCancel: (value) => axios.isCancel(value),
          AmisTheme
        }
      )}
    </>
  )
}