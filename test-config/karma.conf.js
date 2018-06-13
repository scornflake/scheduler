const webpackConfig = require('./webpack.test.js');

module.exports = function (config) {

    const _config = {
        basePath: '.',

        frameworks: [
            'jasmine'
        ],
        files: [
            // '../node_modules/babel-polyfill/browser.js',
            {
                pattern: './karma-test-shim.js',
                watched: true
            }
            // {
            //     pattern: '../**/*.spec.js',
            //     watched: false,
            // }
        ],

        preprocessors: {
            // './karma-test-shim.js': ['webpack', 'sourcemap']
            './karma-test-shim.js': ['webpack']
            // '../**/*.spec.js': ['webpack']
        },

        phantomJsLauncher: {
            exitOnResourceError: true
        },

        webpack: webpackConfig,

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

        // reporters: ['kjhtml', 'dots'],
        reporters: ['dots'],
        // reporters: ['kjhtml'],
        port: 9876,
        colors: true,
        logLevel: config.LOG_INFO,
        autoWatch: true,
        browsers: ['Chrome'],
        singleRun: false,
    };

    config.set(_config);
};
