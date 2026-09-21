import { PROTECT_PATTERNS, TOKEN_PREFIX, TOKEN_SUFFIX } from './config.js';



function protect(text) {
    const tokens = [];
    let out = text;
    for (const pattern of PROTECT_PATTERNS) {
      out = out.replace(pattern.re, (match) => {
        const token = `${TOKEN_PREFIX}${tokens.length}${TOKEN_SUFFIX}`;
        tokens.push(match);
        return token;
      });
    }
    return { protected: tokens, text: out };
  }

function restore(text, tokens) {
    let out = String(text || "");
    tokens.forEach((token, index) => {
      out = out.split(`${TOKEN_PREFIX}${index}${TOKEN_SUFFIX}`).join(token);
    });
    // 兜底：未被还原的占位符（API 改写等）清理掉，避免漏出内部 token
    return out.replace(
      new RegExp(`${TOKEN_PREFIX}\\d+${TOKEN_SUFFIX}`, "g"),
      "",
    );
  }



export { protect, restore };
