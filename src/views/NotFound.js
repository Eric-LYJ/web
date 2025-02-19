import React from 'react'
//import { Link } from 'react-router-dom'
import { NotFound as AmisNotFound } from 'amis-ui';

export default function NotFound() {
  return (
    <div className='cxd-Page' style={{overflow:'hidden'}}>
      <AmisNotFound>
        {/* <div className="text-center text-xl">页面不存在 <Link to='/'>返回首页&gt;&gt;</Link></div> */}
        <div className="text-center text-xl">页面不存在</div>
      </AmisNotFound>
    </div>
  )
}
