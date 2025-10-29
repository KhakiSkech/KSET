const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const webpack = require('webpack');

const isProduction = process.env.NODE_ENV === 'production';
const isAnalysis = process.env.ANALYZE === 'true';

module.exports = {
  mode: 'production',
  devtool: 'source-map',
  entry: {
    'kset': './src/index.ts',
    'kset.min': './src/index.ts',
    'kset.browser': './src/index.ts',
    'kset.node': './src/index.ts'
  },
  output: {
    path: path.resolve(__dirname, 'dist', 'browser'),
    filename: '[name].js',
    chunkFilename: '[name].[contenthash].chunk.js',
    library: {
      name: 'KSET',
      type: 'umd',
      export: 'default'
    },
    globalObject: 'this',
    clean: true,
    pathinfo: false
  },
  resolve: {
    extensions: ['.ts', '.js', '.json'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@core': path.resolve(__dirname, 'src/core'),
      '@providers': path.resolve(__dirname, 'src/providers'),
      '@engines': path.resolve(__dirname, 'src/engines'),
      '@utils': path.resolve(__dirname, 'src/utils')
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
              configFile: 'tsconfig.prod.json',
              compilerOptions: {
                module: 'ESNext',
                target: 'ES2020',
                sourceMap: true
              }
            }
          }
        ],
        exclude: /node_modules/
      }
    ]
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        extractComments: false,
        terserOptions: {
          compress: {
            drop_console: true,
            drop_debugger: true,
            pure_funcs: ['console.log', 'console.info', 'console.debug'],
            passes: 2
          },
          mangle: {
            safari10: true
          },
          format: {
            comments: false
          }
        },
        parallel: true
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
        common: {
          name: 'common',
          minChunks: 2,
          chunks: 'all',
          priority: 5,
          reuseExistingChunk: true
        },
        providers: {
          test: /[\\/]src[\\/]providers[\\/]/,
          name: 'providers',
          chunks: 'all',
          priority: 8
        },
        engines: {
          test: /[\\/]src[\\/]engines[\\/]/,
          name: 'engines',
          chunks: 'all',
          priority: 8
        }
      }
    },
    runtimeChunk: {
      name: 'runtime'
    },
    moduleIds: 'deterministic',
    chunkIds: 'deterministic'
  },
  plugins: [
    new CleanWebpackPlugin(),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('production'),
      'process.env.VERSION': JSON.stringify(process.env.npm_package_version || '1.0.0'),
      'process.env.BUILD_TIME': JSON.stringify(new Date().toISOString()),
      'process.env.KSET_ENVIRONMENT': JSON.stringify('production')
    }),
    ...(isAnalysis ? [new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      openAnalyzer: false,
      reportFilename: 'bundle-analysis.html'
    })] : [])
  ],
  performance: {
    maxEntrypointSize: 512000, // 512KB
    maxAssetSize: 256000,      // 256KB
    hints: 'warning'
  },
  stats: {
    colors: true,
    modules: false,
    children: false,
    chunks: false,
    chunkModules: false,
    entrypoints: false,
    assets: true,
    warnings: true,
    errors: true,
    errorDetails: true
  },
  node: {
    __dirname: false,
    __filename: false,
    global: false,
    process: false,
    Buffer: false,
    setImmediate: false
  }
};