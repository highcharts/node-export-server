// rollup plugin for minifying the code
import terser from '@rollup/plugin-terser';

// exporting the rollup config
export default {
  input: 'lib/index.js',
  output: [
    {
      file: 'dist/index.esm.js',
      format: 'es',
      sourcemap: true
    },
    {
      file: 'dist/index.cjs',
      format: 'cjs',
      sourcemap: 'inline'
    }
  ],
  plugins: [terser()]
};
