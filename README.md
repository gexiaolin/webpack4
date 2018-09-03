# 从零开始搭建多入口webpack4项目
## 简介
+ 搭建基础项目架构
+ 开发中（dev-server）
+ 模块（module）配置

## 一、搭建基础项目架构

首先，webpack4对于`Node.js`版本是有要求的：
> webpack4要求Node.js的最低版本为`6.11.5`  

如果你的Node.js版本过低并进行了升级，然后在项目运行时出现了茫茫多的关于`node-sass`的报错，则需要重建node-sass环境。运行指令：

```
npm rebuild node-sass
```

创建一个多入口项目，按照我们的现有项目，目录如下：

```
|- your-project
	|- src
		|- css
		|- js
			|- project1
			|- project2
				|- components
				|- index.js
		|- tpl
			|- project1
			|- project2
				|- components
				|- index.ejs
	|- package.json
```

安装`webpack`和`webpack-cli`（webpack4需要配合webpack-cli使用，社区也有相关的绕过cli的解决方案，但不是很推荐）：

```
cnpm i webpack webpack-cli -D
```

新建默认配置入口`webpack.config.js`，虽然能看到webpack4再往0配置的方向发展，但是在大多数项目中的配置三板斧还是不能少的：

```js
let config = {
	entry: {},
	output: {},
	module: {},
	mode: 'development'
};

module.exports = config;
```

`mode`为webpack4新增配置，默认值为`production`，根据字面意思可以猜到分别对应开发环境和生产环境，该参数可以在cli中追加，也可以在config中配置（如上）。该参数在webpck4中为必需参数。

具体可以参考[**模式(mode)**](https://webpack.docschina.org/concepts/mode/)。

## 二、开发中（dev-server）

webpack4的开发环境搭建有两个推荐：`webpack-dev-server`（node + express）和`webpack-serve`（node + koa2）。

如果要沿用我们比较熟悉的`webpack-dev-server`进行开发环境的搭建，需要安装对应的beta版本：

```
cnpm i webpack-dev-server@next -D
```

而`webpack-serve`（[传送门](https://github.com/webpack-contrib/webpack-serve)）作为升级版本，功能更加强大（也许也有更多的坑？），使用`WebSockets`做HMR(Hot Module Replacement 模块热替换)。这次我们就来体验一下`webpack-serve`，安装依赖：

```
cnpm i webpack-serve -D
```
新建`serve.config.js`，安装依赖项：

```
cnpm i glob yargs koa-router -D
```

> **警告！**如果需要用cli命令启用服务的话，必需使用**CommonJS**规范语法。以下实例因为语法原因只能使用node语法启动，因为我**懒得改了**。

配置我们需要的项目，并在根路由搭建目录列表：

```js
// serve.config.js

const path = require('path');
const glob = require('glob');
const serve = require('webpack-serve');
const argv = require('yargs').argv;
const Router = require('koa-router');
const WebpackConfig = require('./webpack.config.js');

const config = {
    open: true
};

// 新建路由，输出目录结构
let directory = new Router();
directory.get('/', async ctx => {
    let html = `<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"><ul>`;
    let entries = WebpackConfig.entry;

    for (let key in entries) {
        if (key !== 'commons') {
            html += `<li><a href="/pages/${key}.html">${key}</a></li>`;
        }
    }

    html += `</ul>`;

    ctx.body = html;
});

// 装载子路由
let router = new Router();
router.use('/', directory.routes(), directory.allowedMethods());

serve(config, {
    WebpackConfig,
    add: (app, middleware) => {
        middleware.webpack();
        middleware.content();

        // 加载路由中间件
        app.use(router.routes());

        app.listen(8080, () => {
            console.log('serve finish at port http://localhost:8080/');
        });
    }
})
.then((result) => {
    // to do ...
});

```

在目录页的搭建时用到了webpack配置中的entry项，接下来在`webpack.config.js`中获取入口文件，并指定输出：

```js
// webpack.config.js
const path = require('path');
const glob = require('glob');

const SRC_PATH = path.resolve(__dirname, './src');

...

// 多入口项目获取入口对象
let entries = (entryPath => {
    let files = {},
        filesPath;

    filesPath = glob.sync(entryPath + '/**/*.js', {});

    filesPath.forEach((entry, index) => {
        let chunkName = path.relative(entryPath, entry).replace(/\.js$/i, '');

        files[chunkName] = entry;
    });

    return files;
})(path.join(SRC_PATH, 'js'));

let config = {
	entry: entries,
	output: {
		path: path.resolve(__dirname, './dist'),
		filename: 'js/[name].[hash:7].js'
	},
	...
};

...
```

在`package.json`中写入启动脚本（**再次友情提示！建议使用CommonJS规范书写`serve.config.js`，以便使用推荐的cli命令！**）：

```json
{
	...
	"scripts": {
		"dev": "node ./serve.config.js"
	},
	...
}
```

## 三、模块（module）配置

> webpack4依然不支持把`css`和`html`作为模块，相关的loader配置仍然是必需项，看社区的开发计划，webpack5也许会解决这个问题。

#### 1、处理scss文件

在webpack4之前我们都是用`extract-text-webpack-plugin`来抽离css为独立文件并引入，它的beta版本也对webpack4做了支持，但是仅支持`4.2.0`以下版本。

**解决方案：**使用官方新推荐的`mini-css-extract-plugin`作替代。

**注意：**loader的解析顺序为从后往前，顺序混乱可能会引起一些报错。

安装依赖项目：

```
cnpm i mini-css-extract-plugin css-loader postcss-loader node-sass sass-loader -D
cnpm i autoprefixer -D
```

配置如下：

```js
// webpack.config.js
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

...
let config = {
	...
	module: {
		{
			test: /\.(c|sa|sc)ss$/,
			use: [
			    MiniCssExtractPlugin.loader,
			    'css-loader',
			    {
			        loader: 'postcss-loader',
			        options: {
			            plugins: () => [
			                require('autoprefixer')({
			                    'browsers': ['> 1%', 'last 10 versions']
			                })
			            ]
			        }
			    },
			    'sass-loader'
			]
		},
		...
		plugins: [
			// 指定抽离出的css文件的输出规则
			new MiniCssExtractPlugin({
				filename: 'css/[name].[hash:7].css'
			})
		]
	},
	...
};
...
```

> module模块不再支持loader配置项，需要使用use项做升级

#### 2、ejs模版语言处理

正常情况下，使用我们之前的`ejs-compiled-loader`仍然可以正常解析ejs模版，但是在一些未知的条件下会出现this指针相关的报错（如pc_v1项目）。目前没有找到合适的替代依赖。

**解决方案：**根据热心网友提供的PR，可以暂时使用`ejs-zdm-loader`做应急策略。

安装依赖项：

```
cnpm i ejs-zdm-loader -D
```

配置如下：

```js
// webpack.config.js

...
let config = {
	...
	module: {
		...
		{
			test: /\.ejs$/i,
			use: 'ejs-compiled-loader'
		},
	},
	...
};
...
```

#### 3、js公共模块抽离

在webpack4之前，对于公共依赖的抽离使用的是`CommonsChunkPlugin`，webpack4对于该插件已经做了**废弃处理**，相对的，提供了更便捷的[SplitChunksPlugin](https://webpack.docschina.org/plugins/split-chunks-plugin/)作为新的解决方案。相关api在官方文档处都可以查到，本次不做详细解读。

配置如下：

```js
// webpack.config.js
...
let config = {
	...
	optimization: {
		splitChunks: {
            chunks: 'all',
            minChunks: 1,
            name: true,
            cacheGroups: {
                commons: {
                    name: 'commons',
                    minChunks: 2,
                    // minSize设置为0只为demo体现抽离效果，建议保持默认的30000
                    // 该设置过小会可能导致网络请求无必要的增加一次
                    minSize: 0
                }
            }
        }
	},
	...
};
...
```

#### 4、其他plugins

到目前为止我们已经做了入口文件的获取，各种文件格式的解析抽离，并指定了输出规则，但是并没有实际的输出html文件。

仍然使用`html-webpack-plugin`，升级到支持webpack4的最新版本。

安装依赖：

```
cnpm i html-webpack-plugin -D
```

**注意：**`html-webpack-plugin`每次只能生成一个.html文件，所以在多入口项目中需要对入口文件进行遍历。

配置如下：

```js
// webpack.config.js
const webpack = require('webpack');
...
const HtmlWebpackPlugin = require('html-webpack-plugin');
...
let config = {
	...
	plugins: [
		...
		// 把$变量暴露到全局
		new webpack.ProvidePlugin({
			$: 'jquery',
			jQuery: 'jquery',
			'window.jQuery': 'jquery'
		})
	]
};

let pages = Object.keys(entries);
pages.forEach(item => {
    config.plugins.push(new HtmlWebpackPlugin({
        showErrors: false,
        filename: path.join(__dirname, `/dist/pages/${item}.html`),
        template: path.join(__dirname, `/src/tpl/${item}.ejs`),
        chunks: ['commons', item]
    })); 
});
...
```

> 到目前为止，我们已经完成了开发环境的所有配置，可以使用`npm run dev`来看看项目是否已经正常启动。完整配置可以参考[这里](https://github.com/hinapudao/webpack4/blob/master/webpack.config.js)。