const path = require('path');
const glob = require('glob');
const webpack = require('webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const ProgressBarWebpackPlugin = require('progress-bar-webpack-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');

const SRC_PATH = path.resolve(__dirname, './src');

let entries = (entryPath => {
    let files = {},
        excludes = [],
        filesPath,
        ignoreDirs = ['lib', 'commons', 'components', 'zdm_ui'];

    ignoreDirs.forEach(dir => {
        excludes.push(path.join(entryPath, '/**/' + dir + '/**/*.js'));
    });

    filesPath = glob.sync(entryPath + '/**/*.js', {
        ignore: excludes
    });

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
        filename: 'js/[name].[hash:7].js',
        publicPath: 'https://res.smzdm.com/mobile/wap_v2/dist/'
    },
    mode: 'production',
    resolve: {
        alias: {
            js: path.join(SRC_PATH, 'js'),
            css: path.join(SRC_PATH, 'css'),
            tpl: path.join(SRC_PATH, 'tpl')
        }
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: 'babel-loader'
            },
            {
                test: /\.(c|sa|sc)ss$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    {
                        loader: 'css-loader',
                        options: {
                            importLoaders: 2
                        }
                    },
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
            {
                test: /\.(jpe?g|png|gif|svg)$/i,
                use: [{
                    loader: 'url-loader',
                    options: {
                        limit: 10000,
                        name: 'img/[name].[hash:7]'
                    }
                }]
            },
            {
                test: /\.(woff2?|eot|ttf|svg)(\?[a-z0-9#]*)?$/i,
                use: [
                    {
                        loader: 'url-loader',
                        options: {
                            limit: 1,
                            name: 'fonts/[name].[hash:7].[ext]'
                        }
                    }
                ]
            },
            {
                test: /\.ejs$/i,
                use: 'ejs-compiled-loader'
            },
            {
                test: /\.html$/,
                use: 'html-loader'
            }
        ]
    },
    optimization: {
        splitChunks: {
            chunks: 'async',
            minSize: 30000,
            minChunks: 1,
            maxAsyncRequests: 5,
            maxInitialRequests: 3,
            automaticNameDelimiter: '~',
            name: true,
            cacheGroups: {
                commons: {
                    name: 'commons',
                    chunks: 'initial',
                    minChunks: 2
                },
                default: {
                    minChunks: 2,
                    priority: -20,
                    reuseExistingChunk: true
                }
            }
        },
        minimizer: [
            new OptimizeCSSAssetsPlugin({
                cssProcessorOptions: {
                    autoprefixer: false
                }
            })
        ]
    },
    plugins: [
        new ProgressBarWebpackPlugin(),
        new MiniCssExtractPlugin({
            filename: 'css/[name].[hash:7].css',
            chunkFilename: 'css/commons.[hash:7].css'
        }),
        new CopyWebpackPlugin([
            {
                from: path.join(SRC_PATH, 'img'),
                to: 'img'
            }
        ], {}),
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

module.exports = config;
