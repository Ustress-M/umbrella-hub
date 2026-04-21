#!/usr/bin/env node
/**
 * 관리자 비밀번호 해시 생성 스크립트
 * 사용법: node scripts/setup-admin-hash.js <비밀번호>
 * 예시:   node scripts/setup-admin-hash.js sannnam2007!
 */

const bcrypt = require("bcryptjs");

const password = process.argv[2];

if (!password) {
  console.error("사용법: node scripts/setup-admin-hash.js <비밀번호>");
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 12);
console.log("\n✅ 비밀번호 해시 생성 완료");
console.log("──────────────────────────────────────────────");
console.log(".env.production 또는 Secrets에 아래 값을 복사하세요:\n");
console.log(`ADMIN_PASSWORD_HASH="${hash}"`);
console.log("──────────────────────────────────────────────\n");
