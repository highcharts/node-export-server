// jsdom 30 requires the ESM-only @exodus/bytes, and Jest cannot require() an ES
// module before Node 24.9 (it needs synchronous vm module APIs). Load jsdom
// through Node's native require instead, which handles it on Node 22.12+.
//
// NOTE: Jest replaces require('node:module') with its own implementation, whose
//       createRequire loads through Jest again. getBuiltinModule returns the
//       real one.
const { createRequire } = process.getBuiltinModule('node:module');

module.exports = { ...createRequire(__filename)('jsdom') };
