# WebAutoTest

这是一个由 JSON 配置驱动的 Playwright 网页测试程序。后续只需要修改配置文件，然后执行主程序即可。

## 运行
第一次运行执行
```bash
npm install
```
正常执行
```bash
npm start
```

也可以指定其他配置文件：

```bash
node src/main.js config/another.config.json
```

默认配置是 [config/test.config.json](config/test.config.json)。其中的 URL、选择器、账号、输入值和 Sheet 名称都可以按项目修改。

## 支持的步骤

# WebAutoTest

配置驱动的 Playwright 网页测试工具。它可以自动打开网页、登录、填写表单、点击按钮、在每次跳转后截图，并把截图写入指定 Excel Sheet。

## 环境要求

- Node.js 18 或更高版本
- 可访问被测网站
- Windows、macOS 或 Linux

## 安装

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd WebAutoTest
npm install
npm run install:browsers
```

`npm install` 安装 Node.js 依赖，`npm run install:browsers` 安装 Playwright Chromium 浏览器。

## 创建配置

复制示例配置：

```bash
copy config\test.config.example.json config\test.config.json
```

macOS/Linux：

```bash
cp config/test.config.example.json config/test.config.json
```

然后编辑 [config/test.config.json](config/test.config.json)，填写真实网页地址、账号、密码和元素定位。该文件被 `.gitignore` 忽略，不会上传到 GitHub。

## 运行

```bash
npm start
```

也可以指定其他配置文件：

```bash
node src/main.js config/my-test.config.json
```

## 配置步骤

- `goto`: 打开网页，需要 `url`
- `fill`: 输入内容，需要 `selector` 和 `value`
- `click`: CSS 定位使用 `selector`；没有 id 时可以使用 `role` 和 `name`
- `waitForTimeout`: 等待，需要 `ms`
- `screenshot`: 手动截图，需要 `name`

每个 `goto` 完成后都会自动生成一张完整页面截图，包含滚动区域。`includeUrl` 默认开启，会在截图顶部加入当前页面 URL。

无 id 的按钮示例：

```json
{
	"action": "click",
	"role": "button",
	"name": "CRF設計"
}
```

## Excel 配置

```json
"excel": {
	"path": "output/result.xlsx",
	"sheetName": "test",
	"imageStartColumn": "B",
	"maxImageWidth": null,
	"rowHeight": 18,
	"gapRows": 2,
	"imageSafetyRows": 4
}
```

- `sheetName`: Sheet 存在时复用，不存在时创建
- `imageStartColumn`: 图片起始列，例如 `B`
- `maxImageWidth`: 可选最大显示宽度；`null` 使用截图原始宽度
- `rowHeight`: Excel 行高换算值
- `gapRows`: 图片之间的空白行
- `imageSafetyRows`: 防止 Excel 单位误差导致重叠的额外安全行

每次运行会清除指定 Sheet 中的旧行和旧图片，再写入本次结果。图片尺寸按 PNG 实际宽高计算，下一张图片会自动放到上一张图片之后。

## 输出

- 截图：`screenshots/`
- Excel 报告：`output/result.xlsx`

这些生成文件默认不会提交到 GitHub。

## 发布到 GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <YOUR_GITHUB_REPOSITORY_URL>
git push -u origin main
```

提交前确认没有把账号、密码、私有 URL 或 `config/test.config.json` 加入 Git。

## 常见问题

如果出现 `EBUSY: resource busy or locked`，请关闭 Excel 中已经打开的 `result.xlsx`，再重新运行。

如果出现浏览器未安装错误，执行：

```bash
npm run install:browsers
```
