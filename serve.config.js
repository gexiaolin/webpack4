const path = require('path');
const glob = require('glob');
const serve = require('webpack-serve');
const argv = require('yargs').argv;
const Router = require('koa-router');
const WebpackConfig = require('./webpack.config.js');

const config = {
    open: true
};

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
    // console.log(result);
    // to do ...
});
