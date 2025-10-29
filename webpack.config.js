const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const webpack = require('webpack');

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = !isProduction;

module.exports = (env, argv) => {
  const config = {
    mode: argv.mode || 'development',
    target: ['web', 'es2020'],
    entry: {
      'kset': './src/index.ts',
      'kset.min': './src/index.ts',
    },
    output: {
      path: path.resolve(__dirname, 'dist/browser'),
      filename: '[name].js',
      library: {
        name: 'KSET',
        type: 'umd',
        export: 'default'
      },
      globalObject: 'this',
      clean: true
    },
    resolve: {
      extensions: ['.ts', '.js'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@/types': path.resolve(__dirname, 'src/types'),
        '@/interfaces': path.resolve(__dirname, 'src/interfaces'),
        '@/providers': path.resolve(__dirname, 'src/providers'),
        '@/engines': path.resolve(__dirname, 'src/engines'),
        '@/utils': path.resolve(__dirname, 'src/utils'),
        '@/errors': path.resolve(__dirname, 'src/errors')
      }
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: [
            {
              loader: 'ts-loader',
              options: {
                configFile: 'tsconfig.browser.json',
                transpileOnly: isDevelopment,
                compilerOptions: {
                  sourceMap: isDevelopment,
                  declaration: isDevelopment,
                  declarationMap: isDevelopment
                }
              }
            }
          ],
          exclude: /node_modules/
        }
      ]
    },
    optimization: {
      minimize: isProduction,
      minimizer: [
        new TerserPlugin({
          include: /\.min\.js$/,
          terserOptions: {
            format: {
              comments: false
            },
            compress: {
              drop_console: isProduction,
              drop_debugger: isProduction,
              pure_funcs: ['console.log', 'console.info', 'console.debug']
            }
          }
        })
      ],
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10
          },
          providers: {
            test: /[\\/]src[\\/]providers[\\/]/,
            name: 'providers',
            chunks: 'all',
            priority: 20
          },
          engines: {
            test: /[\\/]src[\\/]engines[\\/]/,
            name: 'engines',
            chunks: 'all',
            priority: 20
          }
        }
      }
    },
    plugins: [
      new CleanWebpackPlugin(),
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
        'process.env.KSET_VERSION': JSON.stringify(require('./package.json').version),
        'process.env.KSET_BUILD_DATE': JSON.stringify(new Date().toISOString())
      }),
      ...(isDevelopment ? [new BundleAnalyzerPlugin({ analyzerMode: 'static' })] : [])
    ],
    externals: {
      // Node.js built-in modules for browser compatibility
      'crypto': '{}',
      'ws': '{}',
      'node-fetch': '{}'
    },
    stats: {
      colors: true,
      modules: false,
      children: false,
      chunks: false,
      chunkModules: false
    },
    devtool: isDevelopment ? 'source-map' : false
  };

  if (isDevelopment) {
    config.devServer = {
      static: {
        directory: path.join(__dirname, 'dist/browser')
      },
      compress: true,
      port: 9000,
      hot: true,
      open: false,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization'
      }
    };
  }

  return config;
};