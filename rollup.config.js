import terser from '@rollup/plugin-terser';

export default {
    input: 'lib/index.js',
    output: [{
        file: 'dist/index.js',
        format: 'es'
    }, {
        file: 'dist/index.cjs',
        format: 'cjs'
    }],
    sourceMap: 'inline',
    plugins: [
        terser() // for minifying
    ]
};