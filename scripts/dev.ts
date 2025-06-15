import * as esbuild from "esbuild";

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

async function runBuild() {
  try {
    // 创建构建上下文
    const ctx = await esbuild.context({
      entryPoints: [resolve(__dirname, `../packages/${target}/src/index.ts`)],
      outfile: outputFile,
      bundle: true,
      sourcemap: true,
      format: outputFormat,
      globalName: pkg.buildOptions?.name,
      platform: format === "cjs" ? "node" : "browser",
      logLevel: "info", // 添加日志级别，以便在重建时显示信息
    });

    console.log(`Watching ${target} package in ${format} format...`);

    // 设置进程退出时清理资源
    process.on("SIGINT", async () => {
      await ctx.dispose();
      process.exit(0);
    });

    // 启动监视模式
    await ctx.watch();
    console.log("watching~~~~");
  } catch (error) {
    console.error("Build failed:", error);
    process.exit(1);
  }
}

runBuild();
