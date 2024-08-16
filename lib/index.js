var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  default: () => src_default,
  name: () => name
});
module.exports = __toCommonJS(src_exports);
var import_koishi = require("koishi");
var import_path = require("path");
var name = "transformers";
var Pipeline = class extends import_koishi.Service {
  static {
    __name(this, "Pipeline");
  }
  pluginConfig;
  constructor(ctx, config) {
    super(ctx, "pipeline", true);
    this.pluginConfig = config;
  }
  async getInstance(task, model, progress_callback = null) {
    let { pipeline, env } = await import("@xenova/transformers");
    let absPath = (0, import_path.resolve)(this.pluginConfig.cacheDir);
    this.ctx.logger.info("Pipeline service initialized cache dir:", absPath);
    env.cacheDir = absPath;
    return pipeline(task, model, { progress_callback });
  }
};
((Pipeline2) => {
  Pipeline2.Config = import_koishi.Schema.object({
    cacheDir: import_koishi.Schema.string().default("node_modules/@xenova/transformers/.cache").description("onnx 模型的缓存目录，填写绝对路径或相对于 koishi 根目录的路径")
  });
})(Pipeline || (Pipeline = {}));
var src_default = Pipeline;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  name
});
