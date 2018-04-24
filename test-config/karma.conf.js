const webpackConfig = require('./webpack.test.js');

module.exports = function (config) {
    const _config = {
        basePath: '',

        frameworks: [
            'jasmine'
            // 'jasmine-matchers'
        ],

        files: [
            '../node_modules/babel-polyfill/browser.js',
            {
                pattern: './karma-test-shim.js',
                watched: true
            }
        ],

        preprocessors: {
            './karma-test-shim.js': ['webpack', 'sourcemap']
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
        browsers: ['PhantomJS'],
        singleRun: false,
    };

    config.set(_config);
};
