import { build, type BuildFailure, type BuildResult } from "esbuild";

const args = require("minimist")(process.argv.slice(2));
const { resolve } = require("path");

// {
//   _: [ "reactivity" ],
//   f: "global",
// }

// minist 用来解析命令行参数的

const target = args._[0] || "reactivity";
const format = args.f || "global";
const pkg = require(resolve(__dirname, `../packages/${target}/package.json`));

/**
 * iife 立即执行函数
 * cjs  commonjs 模块
 * es   es module 模块
 */
const outputFormat = format.startsWith("global")
  ? "iife"
  : format.startsWith("cjs")
  ? "cjs"
  : "esm";
const outputFile = resolve(
  __dirname,
  `../packages/${target}/dist/${target}.${format}.js`
);

build({
  entryPoints: [resolve(__dirname, `../packages/${target}/src/index.ts`)],
  outfile: outputFile,
  bundle: true,
  sourcemap: true,
  format: outputFormat,
  globalName: pkg.buildOptions?.name,
  platform: format === "cjs" ? "node" : "browser",
  watch: {
    onRebuild(error: BuildFailure | null, result: BuildResult | null) {
      if (error) {
        console.error("rebuild failed:", error);
      } else {
        console.log("rebuild successful!");
        // console.log("result:", result); // 可以查看 result 包含什么
      }
      // 不需要返回值
    },
  },
}).then(() => {
  console.log("watching~~~~");
});
