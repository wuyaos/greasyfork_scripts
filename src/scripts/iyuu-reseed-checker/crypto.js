

const Crypto = {
        bytes(input) { return typeof input === 'string' ? new TextEncoder().encode(input) : input; },
        hex(bytes) { return [...bytes].map(b => b.toString(16).padStart(2, '0')).join(''); },
        sha1Fallback(input) {
            const bytes = this.bytes(input); const len = bytes.length; const size = Math.ceil((len + 9) / 64) * 64; const data = new Uint8Array(size); const w = new Uint32Array(80);
            data.set(bytes); data[len] = 0x80;
            const bitHi = Math.floor(len / 0x20000000); const bitLo = (len << 3) >>> 0;
            data[size - 8] = bitHi >>> 24; data[size - 7] = bitHi >>> 16; data[size - 6] = bitHi >>> 8; data[size - 5] = bitHi;
            data[size - 4] = bitLo >>> 24; data[size - 3] = bitLo >>> 16; data[size - 2] = bitLo >>> 8; data[size - 1] = bitLo;
            let h0 = 0x67452301, h1 = 0xefcdab89, h2 = 0x98badcfe, h3 = 0x10325476, h4 = 0xc3d2e1f0;
            const rotl = (v, n) => (v << n) | (v >>> (32 - n));
            for (let i = 0; i < size; i += 64) {
                for (let j = 0; j < 16; j++) w[j] = (data[i + j * 4] << 24) | (data[i + j * 4 + 1] << 16) | (data[i + j * 4 + 2] << 8) | data[i + j * 4 + 3];
                for (let j = 16; j < 80; j++) w[j] = rotl(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 1) >>> 0;
                let a = h0, b = h1, c = h2, d = h3, e = h4;
                for (let j = 0; j < 80; j++) {
                    const f = j < 20 ? ((b & c) | (~b & d)) : (j < 40 ? (b ^ c ^ d) : (j < 60 ? ((b & c) | (b & d) | (c & d)) : (b ^ c ^ d)));
                    const k = j < 20 ? 0x5a827999 : (j < 40 ? 0x6ed9eba1 : (j < 60 ? 0x8f1bbcdc : 0xca62c1d6));
                    const t = (rotl(a, 5) + f + e + k + w[j]) >>> 0; e = d; d = c; c = rotl(b, 30) >>> 0; b = a; a = t;
                }
                h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0; h4 = (h4 + e) >>> 0;
            }
            return this.hex([h0, h1, h2, h3, h4].flatMap(v => [v >>> 24, (v >>> 16) & 255, (v >>> 8) & 255, v & 255]));
        },
        async sha1Hex(input) { const bytes = this.bytes(input); if (typeof globalThis.crypto?.subtle?.digest === 'function') { const buf = await globalThis.crypto.subtle.digest('SHA-1', bytes); return this.hex(new Uint8Array(buf)); } return this.sha1Fallback(bytes); }
    };



export { Crypto };
