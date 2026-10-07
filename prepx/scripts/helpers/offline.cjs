// Fail closed if any ordinary unit test accidentally attempts real network I/O.
const blocked = () => { throw new Error('External network access is disabled in unit tests.'); };
globalThis.fetch = blocked;
require('node:http').request = blocked;
require('node:http').get = blocked;
require('node:https').request = blocked;
require('node:https').get = blocked;
require('node:net').Socket.prototype.connect = blocked;
