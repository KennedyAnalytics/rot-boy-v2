// Run the real Remotion CLI when ancestor-directory listing is restricted.
// Resolve only this project's known config explicitly; retain all compiler checks.
require('./windows-run.cjs');
const fs = require('node:fs');
const path = require('node:path');
const esbuildPath = require.resolve('esbuild');
const esbuild = require(esbuildPath);
const configFile = path.resolve('remotion.config.ts');
require.cache[esbuildPath].exports = {
  ...esbuild,
  build: (options) => {
    if (options.entryPoints?.length !== 1 || path.resolve(options.entryPoints[0]) !== configFile) return esbuild.build(options);
    return esbuild.build({ ...options, plugins: [...(options.plugins || []), {
      name: 'workspace-config-resolution',
      setup(build) {
        build.onResolve({ filter: /remotion\.config\.ts$/ }, args => {
          if (path.resolve(args.path) !== configFile) return;
          return {path:configFile,namespace:'workspace-config'};
        });
        build.onLoad({filter:/.*/,namespace:'workspace-config'}, () => ({contents:fs.readFileSync(configFile,'utf8'),loader:'ts',resolveDir:path.dirname(configFile)}));
        build.onResolve({filter:/^(node:|@remotion\/cli\/config$)/},args=>({path:args.path,external:true}));
      },
    }] });
  },
};
require('../node_modules/@remotion/cli/remotion-cli.js');
