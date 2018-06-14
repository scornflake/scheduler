var webpack = require('webpack');
var path = require('path');

function root(localPath) {
    return path.resolve(__dirname, localPath);
}

module.exports = function (config) {

    const _config = {
        basePath: '..',

        frameworks: [
            'jasmine'
        ],
        files: [
            {
                pattern: 'test-config/karma-test-shim.js',
                watched: true
            }
            // {
            //     pattern: 'src/tests/unit/**/*.spec.ts',
            //     watched: false,
            // }
        ],

        mime: {
            'text/x-typescript': ['ts', 'tsx']
        },

        preprocessors: {
            'test-config/karma-test-shim.js': ['webpack'],
            // 'src/tests/unit/**/*.spec.ts': ['karma-typescript', 'webpack']
        },

        phantomJsLauncher: {
            exitOnResourceError: true
        },
        karmaTypescriptConfig: {
            bundlerOptions: {
                entrypoints: /\.spec\.ts$/
            },
            tsconfig: "tsconfig.json"
        },

        webpack: {
            mode: "development",
            // devtool: 'eval',
            devtool: 'eval-source-map',
            // devtool: 'source-map',
            // target: 'node',
            resolve: {
                extensions: ['.ts', '.js']
            },
            module: {
                rules: [{
                    test: /\.ts$/,
                    loaders: [{
                        loader: 'ts-loader'
                    }, 'angular2-template-loader']
                },
                    {
                        test: /\.html$/,
                        loader: 'html-loader?attrs=false'
                    },
                    {
                        test: /\.(png|jpe?g|gif|svg|woff|woff2|ttf|eot|ico)$/,
                        loader: 'null-loader'
                    }
                ]
            },
            plugins: [
                new webpack.ContextReplacementPlugin(
                    // The (\\|\/) piece accounts for path separators in *nix and Windows
                    /(ionic-angular)|(angular(\\|\/)core(\\|\/)@angular)/,
                    root('./src'), // location of your src
                    {} // a map of your routes
                )
            ]
        },

        webpackMiddleware: {
            stats: 'errors-only'
        },

        webpackServer: {
            noInfo: true
        },

        browserConsoleLogOptions: {
            level: 'log',
            format: '%b %T: %m',
            terminal: true
        },

        reporters: ['progress'],
        port: 9876,
        colors: true,
        logLevel: config.LOG_INFO,
        autoWatch: true,
        browsers: ['Chrome'],
        singleRun: false,
    };

    config.set(_config);
};
