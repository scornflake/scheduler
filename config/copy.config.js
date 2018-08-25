var envDirectory = process.env['IONIC_ENV'] || "default";
// process.stdout.write(`Process env: '${JSON.stringify(process.env)}'`);
process.stdout.write("Using environment '" + envDirectory + "'\n");

module.exports = {
    copyAssets: {
        src: ['{{SRC}}/assets/**/*'],
        dest: '{{WWW}}/assets'
    },
    copyIndexContent: {
        src: ['{{SRC}}/index.html', '{{SRC}}/manifest.json', '{{SRC}}/service-worker.js'],
        dest: '{{WWW}}'
    },
    copyFonts: {
        src: ['{{ROOT}}/node_modules/ionicons/dist/fonts/**/*', '{{ROOT}}/node_modules/ionic-angular/fonts/**/*'],
        dest: '{{WWW}}/assets/fonts'
    },
    copyPolyfills: {
        src: [`{{ROOT}}/node_modules/ionic-angular/polyfills/${process.env.IONIC_POLYFILL_FILE_NAME}`],
        dest: '{{BUILD}}'
    },
    copySwToolbox: {
        src: ['{{ROOT}}/node_modules/sw-toolbox/sw-toolbox.js'],
        dest: '{{BUILD}}'
    },
    copySettings: {
        src: ['{{ROOT}}/environments/' + envDirectory + "/*.json"],
        dest: '{{WWW}}/assets'
    },
    copyAGGridCSS: {
        src: ['{{ROOT}}/node_modules/ag-grid/dist/styles/**'],
        dest: '{{WWW}}/assets/css'
    }
};

