const fs = require("fs");
const jwt = require("jsonwebtoken");

// ↓↓↓ 여기만 본인 값으로 수정 ↓↓↓
const TEAM_ID = "5GUP828WF8";
const KEY_ID = "8BCXCN3TZ7";
const CLIENT_ID = "com.wherehere.app"; // Supabase Client IDs와 동일해야 함
const P8_PATH = "./AuthKey_8BCXCN3TZ7.p8";
// ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑

const privateKey = fs.readFileSync(P8_PATH);
const now = Math.floor(Date.now() / 1000);
// Apple은 최대 약 6개월
const exp = now + 86400 * 150;

const token = jwt.sign(
  {
    iss: TEAM_ID,
    iat: now,
    exp,
    aud: "https://appleid.apple.com",
    sub: CLIENT_ID,
  },
  privateKey,
  {
    algorithm: "ES256",
    header: {
      alg: "ES256",
      kid: KEY_ID,
    },
  }
);

console.log("\n아래 한 줄 전체를 Supabase Secret Key에 붙여넣기:\n");
console.log(token);