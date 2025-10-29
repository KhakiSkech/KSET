import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { terser } from 'rollup-plugin-terser';
import json from '@rollup/plugin-json';
import replace from '@rollup/plugin-replace';

const production = !process.env.ROLLUP_WATCH;
const version = require('./package.json').version;
const buildDate = new Date().toISOString();

const banner = `/**
 * KSET - Korea Stock Exchange Trading Library
 * Korea's Standard Trading Interface
 * Version: ${version}
 * Built: ${buildDate}
 * License: MIT
 */`;

export default [
  // Node.js build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/node/kset.cjs.js',
      format: 'cjs',
      exports: 'named',
      banner,
      sourcemap: !production
    },
    external: [
      'ws',
      'node-fetch',
      'crypto',
      'big.js',
      'lodash',
      'moment-timezone',
      'uuid'
    ],
    plugins: [
      nodeResolve({
        preferBuiltins: true
      }),
      commonjs(),
      json(),
      typescript({
        tsconfig: './tsconfig.prod.json',
        typescript: require('typescript'),
        sourceMap: !production,
        declaration: true,
        declarationDir: 'dist/node/types'
      }),
      replace({
        'process.env.NODE_ENV': JSON.stringify(production ? 'production' : 'development'),
        'process.env.KSET_VERSION': JSON.stringify(version),
        'process.env.KSET_BUILD_DATE': JSON.stringify(buildDate),
        preventAssignment: true
      }),
      production && terser({
        format: {
          preamble: banner
        },
        compress: {
          drop_console: production,
          drop_debugger: production
        }
      })
    ].filter(Boolean)
  },

  // ES Module build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/node/kset.esm.js',
      format: 'es',
      banner,
      sourcemap: !production
    },
    external: [
      'ws',
      'node-fetch',
      'crypto',
      'big.js',
      'lodash',
      'moment-timezone',
      'uuid'
    ],
    plugins: [
      nodeResolve({
        preferBuiltins: true
      }),
      commonjs(),
      json(),
      typescript({
        tsconfig: './tsconfig.prod.json',
        typescript: require('typescript'),
        sourceMap: !production
      }),
      replace({
        'process.env.NODE_ENV': JSON.stringify(production ? 'production' : 'development'),
        'process.env.KSET_VERSION': JSON.stringify(version),
        'process.env.KSET_BUILD_DATE': JSON.stringify(buildDate),
        preventAssignment: true
      }),
      production && terser({
        format: {
          preamble: banner
        },
        compress: {
          drop_console: production,
          drop_debugger: production
        }
      })
    ].filter(Boolean)
  },

  // Browser UMD build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/browser/kset.umd.js',
      format: 'umd',
      name: 'KSET',
      banner,
      sourcemap: !production
    },
    external: [
      'ws',
      'node-fetch',
      'crypto'
    ],
    plugins: [
      nodeResolve({
        browser: true,
        preferBuiltins: false
      }),
      commonjs(),
      json(),
      typescript({
        tsconfig: './tsconfig.browser.json',
        typescript: require('typescript'),
        sourceMap: !production
      }),
      replace({
        'process.env.NODE_ENV': JSON.stringify(production ? 'production' : 'development'),
        'process.env.KSET_VERSION': JSON.stringify(version),
        'process.env.KSET_BUILD_DATE': JSON.stringify(buildDate),
        preventAssignment: true
      }),
      production && terser({
        format: {
          preamble: banner
        },
        compress: {
          drop_console: production,
          drop_debugger: production
        }
      })
    ].filter(Boolean)
  }
];