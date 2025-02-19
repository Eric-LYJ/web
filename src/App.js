import React, { Component } from 'react'
import { HashRouter } from 'react-router-dom'
import { ToastComponent, AlertComponent } from 'amis-ui';
import 'amis/lib/themes/cxd.css';
import 'amis/lib/helper.css';
import 'amis/sdk/iconfont.css';
import '@fortawesome/fontawesome-free/css/all.css';
import '@fortawesome/fontawesome-free/css/v4-shims.css';
import "./assets/css/amis/amis-extend.css";
import Loading from "./components/amis/Loading";
import Routes from "./router"
import config from "config";
import axios from 'axios';
import utils from "utils";

export default class App extends Component {

  constructor() {
    super();
    this.axiosInit();
  }

  axiosInit() {
    //axios.defaults.withCredentials = true;
    axios.interceptors.response.use(function (response) {
      response = response || {};
      if (response.data) {
        const status = utils.getObjectValue(response.data, "status") || '';
        if (status.toLowerCase() !== 'success') {
          const code = utils.getObjectValue(response.data, "code") || '';
          if (code === 'E100000010')//未登录或登录失效
            window.top.location.href = './#/admin/login';
          //return Promise.reject(new Error(response.data.message || code || 'Unknown'));
        }
      }
      return response;
    }, function (error) {
      return Promise.reject(error);
    });
  }

  render() {
    const { AmisTheme, AmisLocale } = config;
    return (
      <>
        <HashRouter key="hash">
          <Loading key="loading" show={false} overlay={true} className='top-loading' />
          <ToastComponent theme={AmisTheme} key="toast" position={'top-center'} locale={AmisLocale} />
          <AlertComponent theme={AmisTheme} key="alert" locale={AmisLocale} />
          <Routes/>
        </HashRouter>
      </>
    )
  }
}
