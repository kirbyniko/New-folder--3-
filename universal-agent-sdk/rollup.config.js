import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/index.js',
      format: 'cjs',
      sourcemap: true
    },
    {
      file: 'dist/index.esm.js',
      format: 'es',
      sourcemap: true
    },
    {
      file: 'dist/bundle.js',
      format: 'umd',
      name: 'UniversalAgent',
      sourcemap: true
    },
    {
      file: 'dist/bundle.min.js',
      format: 'umd',
      name: 'UniversalAgent',
      sourcemap: true,
      plugins: [terser()]
    }
  ],
  plugins: [
    resolve({
      browser: true
    }),
    commonjs(),
    typescript({
      tsconfig: './tsconfig.json'
    })
  ]
};
