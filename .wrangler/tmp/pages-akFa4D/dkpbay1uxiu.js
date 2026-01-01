// <define:__ROUTES__>
var define_ROUTES_default = {
  version: 1,
  include: [
    "/api/*"
  ],
  exclude: []
};

// ../AppData/Roaming/npm/node_modules/wrangler/templates/pages-dev-pipeline.ts
import worker from "C:\\Users\\nikow\\New folder (3)\\.wrangler\\tmp\\pages-akFa4D\\functionsWorker-0.07973560982052952.mjs";
import { isRoutingRuleMatch } from "C:\\Users\\nikow\\AppData\\Roaming\\npm\\node_modules\\wrangler\\templates\\pages-dev-util.ts";
export * from "C:\\Users\\nikow\\New folder (3)\\.wrangler\\tmp\\pages-akFa4D\\functionsWorker-0.07973560982052952.mjs";
var routes = define_ROUTES_default;
var pages_dev_pipeline_default = {
  fetch(request, env, context) {
    const { pathname } = new URL(request.url);
    for (const exclude of routes.exclude) {
      if (isRoutingRuleMatch(pathname, exclude)) {
        return env.ASSETS.fetch(request);
      }
    }
    for (const include of routes.include) {
      if (isRoutingRuleMatch(pathname, include)) {
        const workerAsHandler = worker;
        if (workerAsHandler.fetch === void 0) {
          throw new TypeError("Entry point missing `fetch` handler");
        }
        return workerAsHandler.fetch(request, env, context);
      }
    }
    return env.ASSETS.fetch(request);
  }
};
export {
  pages_dev_pipeline_default as default
};
//# sourceMappingURL=dkpbay1uxiu.js.map
