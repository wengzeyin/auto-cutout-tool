# 自动抠图切图工具

## 启动

```bash
/Users/wzy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node server.mjs
```

然后打开：

```text
http://localhost:4173
```

## 功能

- 上传、批量拖入或复制图片后直接粘贴。
- 上传图片会在图片队列中显示预览缩略图。
- 自动去背景并生成透明图片。
- 根据透明区域、主体评分、核心种子和投影缝隙自动识别分离元素。
- 识别模式支持完整前景、主体切图、多元素拆分和高级色块拆分。
- 默认过滤疑似文字组件，可切换为包含文字元素。
- 队列中的图片可以删除。
- 单独下载每个元素。
- 下载当前图片的全部元素 ZIP。
- 批量处理队列，并把每张图片的整图抠图和元素图片打包成一个 ZIP。
- 导出格式支持 SVG、PNG 和 WebP。SVG 会导出可编辑色块路径，更适合 logo、贴纸和扁平插画。
- 上传/拖入/粘贴时显示交互反馈，并在图片队列里显示处理状态。
- 对粘连元素可以开启手动框选并导出当前框选。
- 支持载入 15 张 QA 测试图，批量 ZIP 内会生成 `qa-report.json` 和 `qa-report.html`。

## QA 回归

轻量算法回归：

```bash
/Users/wzy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node qa/test-matte-refine.mjs
/Users/wzy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node qa/test-image-type.mjs
/Users/wzy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node qa/test-multi-split.mjs
/Users/wzy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node qa/test-svg-vector.mjs
/Users/wzy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node qa/test-validate-report.mjs
/Users/wzy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node qa/test-runner-health.mjs
/Users/wzy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node qa/test-summary-risk.mjs
```

其中 `qa/test-svg-vector.mjs` 同时覆盖两类 SVG 风险：扁平插画的精准模式必须保留平滑曲线和线稿；照片/毛发类的自动模式必须降噪、合并微小色块，避免导出上千条碎路径。
`qa/test-runner-health.mjs` 会验证完整 QA runner 使用的健康检查 token，避免端口被旧服务占用时误连旧页面。
`qa/test-summary-risk.mjs` 会验证 QA summary 的风险统计口径，避免商品高光、透明材质或低于门禁阈值的指标被误报成风险。

确认测试图片存在：

```bash
/Users/wzy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node qa/check-assets.mjs
```

批量处理并下载 ZIP 后，解压其中的 `qa-report.json`，运行：

```bash
/Users/wzy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node qa/validate-report.mjs path/to/qa-report.json
```

也可以直接运行浏览器端完整 QA，脚本会启动本地服务、加载 15 张测试图、批量导出 ZIP，并自动校验 `qa-report.json`：

```bash
NODE_PATH=/Users/wzy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules QA_TIMEOUT_MS=480000 /Users/wzy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node qa/run-browser-qa.mjs
```

完整 QA runner 会自动分配空闲端口，启动自己的本地服务，并用一次性 token 校验 `/__qa_health`，避免端口被旧服务占用时误连旧页面。如果显式传入 `PORT` 且端口已被占用，脚本会失败并提示更换 `PORT`。

门禁要求平均分不低于 4.0，任一核心项不得低于 3 分；发丝、商品、多元素贴纸、靠近角色、小物体等重点场景的 matte / 元素分不得低于 3.5。校验脚本还会检查 `alphaCoverage`、`edgeJaggednessScore`、`semiTransparentCoreRatio`、`componentCount`、`largeBoxRisk`、`svgPathCount` 等关键指标是否存在，并阻止明显的大框、漏小元素、线稿缺失或 SVG 块状风险进入通过结果。

## 说明

首次运行会从 CDN 下载浏览器端抠图模型，耗时取决于网络。图片处理在浏览器内完成，不需要把图片上传到服务器。
