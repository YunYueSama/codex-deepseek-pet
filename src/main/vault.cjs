'use strict';
const fs = require('node:fs');
const path = require('node:path');
/** 密钥使用系统加密，不返回渲染层或写入日志。 */
function createVault(directory, safeStorage) {
  const file = path.join(directory, 'credential.bin');
  return {
    get() { try { return safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(fs.readFileSync(file)) : ''; } catch { return ''; } },
    set(value) {
      if (!value) { if (fs.existsSync(file)) fs.unlinkSync(file); return; }
      if (!safeStorage.isEncryptionAvailable()) throw new Error('系统密钥保护不可用，未保存密钥。');
      fs.mkdirSync(directory, { recursive: true });
      fs.writeFileSync(file + '.tmp', safeStorage.encryptString(value)); fs.renameSync(file + '.tmp', file);
    },
  };
}
module.exports = { createVault };
