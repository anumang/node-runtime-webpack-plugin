# Node Runtime Webpack Plugin
 
Webpack development server is not sufficient to run standalone Node.js applications such as `Express.js` applications. 
To solve this issue, developers can use Webpack in watch mode `webpack --watch` with `node-runtime-webpack-plugin` which handles to restart start script for each build updates with help of watch feature of Webpack.


## Install
Install with npm or yarn package managers.
```
npm install node-runtime-webpack-plugin --save-dev
```

## Usage
* Add plugin to webpack config file: i.e. `webpack.config.js`
```js
const NodeRuntimePlugin = require("node-runtime-webpack-plugin");

module.exports = {
    entry: './index.ts',
    target: 'node',
    output: {
        path: path.resolve(__dirname, 'out'),
        filename: 'server.js',
        clean: true
    },
    ...,
    plugins: [
        ...,
        new NodeRuntimePlugin({
            scriptToRun: 'server'
        })
    ]
```
* Add start script for development with `package.json` file
```json
{
    "name": "express-node-app"
    ...,
    "scripts": {
        ...,
        "start": "webpack build --mode=development --watch"
    }
}
```
* Run start script and make changes to see bundle restarts
```
npm start
```

## Issues
To notify us for any issues, you can create new tickets under github issues section.

