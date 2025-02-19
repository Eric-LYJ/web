import React, { Component } from 'react'
import { Outlet } from "react-router-dom";
import { Renderer } from 'amis';

class RouterOutlet extends Component {
  render() {
    return (
      <Outlet />
    )
  }
}
Renderer({
  type: 'outlet',
  autoVar: true
})(RouterOutlet);
