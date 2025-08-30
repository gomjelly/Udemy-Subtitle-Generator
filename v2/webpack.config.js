const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  
  return {
    entry: {
      background: './src/background.ts',
      content: './src/content.ts',
      popup: './src/popup.ts'
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
      ],
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js'],
    },
    output: {
      filename: '[name].js',
      path: path.resolve(__dirname, 'dist'),
      clean: true,
    },
    // eval 사용 안함 (Chrome 확장에서 CSP 오류 방지)
    devtool: isProduction ? false : 'cheap-module-source-map',
    plugins: [
      new CopyPlugin({
        patterns: [
          { from: 'manifest.json', to: '.' },
          { from: 'src/popup.html', to: '.' },
          { from: 'src/styles.css', to: '.' },
          { from: 'icons', to: 'icons' }
        ],
      }),
    ],
  };
};
