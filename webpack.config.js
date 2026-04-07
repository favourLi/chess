const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.[contenthash].js',
    clean: true,
    publicPath: '/',
    assetModuleFilename: 'assets/[name].[hash][ext]',
  },
  mode: 'development',
  devtool: 'source-map',
  devServer: {
    port: 3001,
    hot: true,
    static: {
      directory: path.join(__dirname, 'public'),
    },
    proxy: {
      '/api': { target: 'http://localhost:3030', changeOrigin: true },
      '/socket.io': {
        target: 'http://localhost:3030',
        ws: true,
        changeOrigin: true
      }
    }
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif|glb|gltf)$/i,
        type: 'asset/resource',
      },
      {
        test: /\.exr$/i,
        type: 'asset/resource',
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
          },
        },
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
      // favicon: './public/favicon.ico',
    }),
  ],
  resolve: {
    extensions: ['.js'],
    fallback: {
      "fs": false,
      "path": false
    }
  },
  optimization: {
    splitChunks: {
      chunks: 'all',
    },
  },
};
