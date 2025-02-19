import React, { useEffect } from 'react'
import { loading } from "./Loading";

export default function LazyLoading(props) {

  useEffect(()=>{
    loading.show();
    return () => {
      loading.hide();
    }
  }, []);
}