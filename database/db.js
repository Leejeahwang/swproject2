const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');

// 데이터베이스 파일 경로
const adapter = new FileSync(path.join(__dirname, 'db.json'));
const db = low(adapter);

// 기본 데이터 구조 초기화
db.defaults({
  users: [],
  products: [],
  rentals: [],
  reviews: [],
  chats: [],
  notifications: [],
  evidence: [],
  reports: []
}).write();

module.exports = db;

