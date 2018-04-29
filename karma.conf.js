module.exports = function (config) {

    const _config = {
        basePath: '',

        frameworks: [
            'jasmine',
            'karma-typescript'
        ],

        files: [
            "test-config/base.spec.ts",
            "src/**/*.ts"
        ],

        preprocessors: {
            "src/**/*.ts": "karma-typescript" // *.tsx for React Jsx
        },

        karmaTypescriptConfig: {
            compilerOptions: {
                // allowSyntheticDefaultImports: true,
                emitDecoratorMetadata: true,
                experimentalDecorators: true,
                lib: [
                    "dom",
                    "es2015",
                    "esnext.asynciterable"
                ]
            },
            bundlerOptions: {
                transforms: [
                    require("karma-typescript-es6-transform")(),
                    require("karma-typescript-angular2-transform")
                ]
            }
        },

        reporters: ["progress", "karma-typescript"],
        browsers: ["Chrome"]
    };

    config.set(_config);
};
