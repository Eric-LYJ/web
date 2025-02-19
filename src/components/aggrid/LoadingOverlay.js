import React, { Component } from 'react'
import { Spinner } from 'amis';

export default class LoadingOverlay extends Component {
  render() {
    return <Spinner show={true} size='lg' />
  }
}
