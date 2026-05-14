export class SeededRandom {
  private _s: number;

  constructor(seed: number) {
    this._s = (seed >>> 0) || 1;
  }

  private _next(): number {
    let z = (this._s = (this._s + 0x6D2B79F5) >>> 0);
    z = Math.imul(z ^ (z >>> 14), (z & 0xFFFF0000) | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 0x3D8193B);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  }

  gauss(mu: number, sigma: number): number {
    const u1 = Math.max(1e-10, this._next());
    const u2 = this._next();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mu + z0 * sigma;
  }
}

export function seedFor(symbol: string, dayOffset = 0): number {
  let hexStr = '';
  for (let i = 0; i < symbol.length; i++) {
    hexStr += symbol.charCodeAt(i).toString(16).padStart(2, '0');
  }
  const base  = BigInt('0x' + hexStr) % 999983n;
  const daily = BigInt(Math.floor(Date.now() / 86400000)) + BigInt(dayOffset);
  return Number((base * 6364136223846793005n + daily) % 4294967296n);
}
