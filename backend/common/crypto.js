const crypto = require('crypto');

function generateAccessKey() {
  return crypto.randomBytes(16).toString('hex');
}

function hashAccessKey(accessKey) {
  return crypto.createHash('sha256').update(accessKey).digest('hex');
}

function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

module.exports = {
  generateAccessKey,
  hashAccessKey,
  generateSessionToken
};
