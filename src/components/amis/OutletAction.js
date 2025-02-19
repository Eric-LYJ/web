import { registerAction } from 'amis-core';
import config from "config";

export class RouterOutletAction {
  async run(
    action,
    renderer,
    event
  ) {
    var to = action.args?.to || action.args?.url || action.args?.link;
    var url = to;
    if (typeof url !== 'string' || url.length === 0)
      return;
    const locationFrom = window.location;
    if (url.indexOf('http://')  === -1 && url.indexOf('https://')  === -1) {
      url = locationFrom.origin + (url.indexOf('/') === 0 ? url : '/' + url);
    }
    const locationTo = new URL(url);
    if (locationFrom.origin !== locationTo.origin)
      return;

    var pathnameFrom = locationFrom.pathname;
    var pathnameTo = locationTo.pathname;
    if (locationFrom.hash.indexOf('#/') === 0) {
      pathnameFrom = locationFrom.hash.substring(1).split('#')[0].split('?')[0];
    }
    else if (config.BasePath) {
      pathnameFrom = pathnameFrom.replace(config.BasePath, '');
    }
    if (locationTo.hash.indexOf('#/') === 0) {
      pathnameTo = locationTo.hash.substring(1).split('#')[0].split('?')[0];
    }
    else if (config.BasePath) {
      pathnameTo = pathnameTo.replace(config.BasePath, '');
    }
    const pathsFrom = pathnameFrom.toLowerCase().substring(1).split('/');
    const pathsTo = pathnameTo.toLowerCase().substring(1).split('/');
    
    const moduleFrom = pathsFrom[0];
    const menuidFrom = pathsFrom[1];
    const typeFrom = pathsFrom[2];
    const idFrom = pathsFrom[3];

    const moduleTo = pathsTo[0];
    const menuidTo = pathsTo[1];
    const typeTo = pathsTo[2];
    const idTo = pathsTo[3];

    if (moduleFrom === moduleTo && menuidFrom === menuidTo && !idFrom && typeTo && (!typeFrom || typeFrom && idTo)) {
      const outlet0 = event.context.scoped.getComponentById("#outlet0");
      const outlet1 = event.context.scoped.getComponentById("#outlet1");
      const id = !outlet0 || outlet0.props.show === false ? "#outlet0" : !outlet1 || outlet1.props.show === false ? "#outlet1" : "";
      if (!id)
        return;
      const drawerAction = {
        actionType: 'drawer',
        drawer: {
          width: '100%',
          closeOnOutside: false,
          showCloseButton: false,
          actions: [],
          ...action.outlet,
          id: id,
          type: 'drawer',
          body: {
            type: "outlet"
          }
        }
      };
      if (!drawerAction.drawer.className || typeof drawerAction.drawer.className !== 'string')
        drawerAction.drawer.className = 'outlet';
      else
        drawerAction.drawer.className += ' outlet';
      if (!drawerAction.drawer.closeOnOutside && !drawerAction.drawer.showCloseButton) {
        drawerAction.drawer.showCloseButton = true;
        drawerAction.drawer.className += ' hide-close-btn';
      }
      drawerAction.drawer.onClose = () => {
        if (window.location.href === url)
          renderer.props.onAction?.(event, {actionType: 'link', url: 'goBack'});
      }
      renderer.props.onAction?.(event, drawerAction, action.args);
    }
    if (action.args?.go === false)
      return;
    const linkAction = {
      actionType: 'link',
      url: to
    }
    renderer.props.onAction?.(event, linkAction, action.args);
  }
}
registerAction('outlet', new RouterOutletAction());
