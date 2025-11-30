const fs = require('fs');
const path = require('path');

// Data directory
const DATA_DIR = path.join(__dirname, '../data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Persistent Map that saves to disk
class PersistentMap {
  constructor(filename) {
    this.filename = path.join(DATA_DIR, filename);
    this.data = new Map();
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.filename)) {
        const json = fs.readFileSync(this.filename, 'utf8');
        const obj = JSON.parse(json);
        this.data = new Map(Object.entries(obj));
        console.log(`📂 Loaded ${this.data.size} items from ${this.filename}`);
      }
    } catch (error) {
      console.error(`Failed to load ${this.filename}:`, error);
    }
  }

  save() {
    try {
      const obj = Object.fromEntries(this.data);
      fs.writeFileSync(this.filename, JSON.stringify(obj, null, 2));
    } catch (error) {
      console.error(`Failed to save ${this.filename}:`, error);
    }
  }

  set(key, value) {
    this.data.set(key, value);
    this.save();
    return this;
  }

  get(key) {
    return this.data.get(key);
  }

  has(key) {
    return this.data.has(key);
  }

  delete(key) {
    const result = this.data.delete(key);
    this.save();
    return result;
  }

  clear() {
    this.data.clear();
    this.save();
  }

  values() {
    return this.data.values();
  }

  keys() {
    return this.data.keys();
  }

  entries() {
    return this.data.entries();
  }

  get size() {
    return this.data.size;
  }
}

// Create persistent database
const db = {
  users: new PersistentMap('users.json'),
  sessions: new PersistentMap('sessions.json'),
  accountIds: new PersistentMap('accountIds.json'),
  connections: new PersistentMap('connections.json'),
  boards: new PersistentMap('boards.json'),
  threads: new PersistentMap('threads.json'),
  posts: new PersistentMap('posts.json'),
  channels: new PersistentMap('channels.json'),
  messages: new PersistentMap('messages.json'),
  widgets: new PersistentMap('widgets.json'),
  playerRooms: new PersistentMap('playerRooms.json'),
  agents: new PersistentMap('agents.json')
};

console.log('💾 Persistent database initialized');

module.exports = db;
