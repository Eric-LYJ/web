import { lazy,Suspense } from 'react'
import { useRoutes, Navigate } from 'react-router-dom'
import Home from "../views/Home";
import NotFound from '../views/NotFound'
import LazyLoading from '../components/amis/LazyLoading'
 
const routes = [
  {
    path: '/',
    component: Home
  },
  {
    path: '/:module/:folder',
    component: lazy(() => import("../views/Module")),
    children: [
      {
        path: ':type',
        props: {
          level: 1
        },
        component: lazy(() => import("../views/Module")),
        children: [
          {
            path: ':id',
            props: {
              level: 2
            },
            component: lazy(() => import("../views/Module"))
          }
        ]
      }
    ]
  },
  {
    path: '/404',
    component: NotFound
  },
  {
    path: '*',
    redirect : '/404'
  }
]

const syncRouter = (routes) => {
  let mRouteTable = []
  routes.forEach(route => {
    mRouteTable.push({
      path: route.path,
      element: (
        route.redirect ?
        <Navigate to={ route.redirect } /> :
        <Suspense fallback={ <LazyLoading /> }>
          <route.component {...route.props} />
        </Suspense>
      ),
      children: route.children && syncRouter(route.children)
    })
  })
  return mRouteTable
}

export default () => useRoutes(syncRouter(routes))