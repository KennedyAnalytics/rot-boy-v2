// Some managed Windows shells cannot resolve userInfo(). tsx only needs a cache key.
const os = require('node:os');
const original = os.userInfo;
os.userInfo = (...args) => { try { return original(...args); } catch (e) { if (e.code !== 'ERR_SYSTEM_ERROR') throw e; return { username: process.env.USERNAME || 'codex', uid: -1, gid: -1, homedir: os.homedir(), shell: null }; } };
