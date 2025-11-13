/** Minimal metro config to allow monorepo imports (shared/)
 */
const path = require('path');

module.exports = {
  resolver: {
    extraNodeModules: new Proxy({}, {
      get: (_, name) => path.resolve(__dirname, 'node_modules', name)
    })
  },
  watchFolders: [path.resolve(__dirname, '..')]
};
