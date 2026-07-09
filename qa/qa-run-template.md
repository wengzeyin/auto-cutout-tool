# QA Run Template

日期：
版本 / commit：
测试人：
浏览器：

## 外部参考

- remove.bg：未对照 / 已对照
- Canva：未对照 / 已对照
- WPS AI：未对照 / 已对照

说明：外部服务需要登录、额度或人工上传时，记录为“未对照”，不要估算。

## 总结

- 测试图片数量：
- 通过数量：
- 不通过数量：
- 平均分：
- 是否建议上线：

## 自动门禁

先运行轻量算法回归：

```bash
node qa/test-matte-refine.mjs
node qa/test-image-type.mjs
node qa/test-multi-split.mjs
node qa/test-svg-vector.mjs
node qa/test-validate-report.mjs
node qa/test-runner-health.mjs
node qa/test-summary-risk.mjs
```

批量 ZIP 里会包含 `qa-report.json`。解压后运行：

```bash
node qa/validate-report.mjs path/to/qa-report.json
```

完整浏览器 QA 默认自动分配空闲端口；只有需要固定端口时才传 `PORT=xxxx`。脚本会校验 `/__qa_health` 的一次性 token，不能复用旧服务页面。

通过标准：

- 测试行数不少于 15。
- 平均分 >= 4.0。
- 任一核心项不得低于 3 分。
- 发丝、商品、多元素贴纸、靠近角色、小物体等重点场景的 matte / 元素分不得低于 3.5。
- 不得存在 `releaseBlocker`。
- 每条完成记录必须包含关键算法指标：`alphaCoverage`、`edgeJaggednessScore`、`semiTransparentCoreRatio`、`componentCount`、`largeBoxRisk`、`svgPathCount`。
- 插画、贴纸、logo、靠近角色等场景还必须包含线稿/浅色区域/SVG 路径密度指标，并且不能出现明显大框、漏小元素或 SVG 块状风险。
- SVG 轻量回归需要同时覆盖精准插画路径和照片类自动 SVG：精准模式应有平滑曲线，照片/毛发类自动模式应保持低路径数量、低命令密度，并合并微小噪点。
- QA runner 健康检查回归必须确认 `/__qa_health` token 匹配，端口被旧服务占用时不能误连旧页面。
- QA summary 风险统计需要和门禁阈值保持一致，商品高光、透明材质、低于阻塞阈值的指标不能产生假警报。

## 评分表

| ID | 场景 | 文件 | 背景 | 主体完整度 | 边缘丝滑度 | 透明度质量 | 背景清理 | 导出可用性 | 平均 | 结论 | 备注 |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---|---|
| 01 | 人像发丝模拟 | 01-portrait-hair-simulated.png | 棋盘格/白/黑/彩色 |  |  |  |  |  |  |  |  |
| 02 | 卷发碎发模拟 | 02-curly-hair-simulated.png | 棋盘格/白/黑/彩色 |  |  |  |  |  |  |  |  |
| 03 | 宠物长毛模拟 | 03-pet-long-fur-simulated.png | 棋盘格/白/黑/彩色 |  |  |  |  |  |  |  |  |
| 04 | 宠物短毛模拟 | 04-pet-short-fur-simulated.png | 棋盘格/白/黑/彩色 |  |  |  |  |  |  |  |  |
| 05 | 白底浅色商品 | 05-light-product-white-bg.png | 棋盘格/白/黑/彩色 |  |  |  |  |  |  |  |  |
| 06 | 深色商品 | 06-dark-product.png | 棋盘格/白/黑/彩色 |  |  |  |  |  |  |  |  |
| 07 | 透明材质 | 07-transparent-material.png | 棋盘格/白/黑/彩色 |  |  |  |  |  |  |  |  |
| 08 | 复杂背景人物 | 08-person-complex-bg.png | 棋盘格/白/黑/彩色 |  |  |  |  |  |  |  |  |
| 09 | 复杂背景商品 | 09-product-complex-bg.png | 棋盘格/白/黑/彩色 |  |  |  |  |  |  |  |  |
| 10 | 插画图标 | 10-illustration-icons.png | 棋盘格/白/黑/彩色 |  |  |  |  |  |  |  |  |
| 11 | 多元素贴纸合集 | 11-sticker-pack.png | 棋盘格/白/黑/彩色 |  |  |  |  |  |  |  |  |
| 12 | 靠近多角色 | 12-nearby-characters.png | 棋盘格/白/黑/彩色 |  |  |  |  |  |  |  |  |
| 13 | 小物体细节 | 13-small-details.png | 棋盘格/白/黑/彩色 |  |  |  |  |  |  |  |  |
| 14 | 文字 logo 商品 | 14-logo-text-product.png | 棋盘格/白/黑/彩色 |  |  |  |  |  |  |  |  |
| 15 | 高对比边缘 | 15-high-contrast-edge.png | 棋盘格/白/黑/彩色 |  |  |  |  |  |  |  |  |

## 阻塞项

- 

## 修复建议

- 
