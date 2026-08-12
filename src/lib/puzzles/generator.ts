/**
 * CipherLeaf gate puzzles — university mathematics major persona.
 *
 * Pools are keyed by difficulty (display: 启封 / 推演 / 穷理):
 * - thoughtful: one key observation + 1–3 calculations
 * - mathematical: identify a theorem / invariant / construction + several steps
 * - deep: combine ≥2 structures, or prove an intermediate claim, then compute
 *
 * Deep puzzles must NOT be obtained merely by enlarging numerical parameters
 * of a mathematical-level puzzle. Prefer: invariants, two ideas combined,
 * intermediate lemmas, auxiliary quantities / recurrences, complement /
 * quotient / orbit counts, or a hidden algebraic structure.
 *
 * Boolean / YES-NO / multiple-choice answers are forbidden. Prefer integers,
 * reduced rationals, short complex numbers, or other canonical short forms.
 */

export type PuzzleDifficulty = "thoughtful" | "mathematical" | "deep";

export type PuzzleInstance = {
  type: string;
  prompt: string;
  /** Canonical answer string (after normalizeAnswer). */
  answer: string;
  hint?: string;
  publicParams: Record<string, unknown>;
};

type Gen = (d: PuzzleDifficulty) => PuzzleInstance;

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)];
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x;
}

function egcd(a: number, b: number): { g: number; x: number; y: number } {
  if (b === 0) return { g: a, x: 1, y: 0 };
  const { g, x, y } = egcd(b, a % b);
  return { g, x: y, y: x - Math.floor(a / b) * y };
}

function invMod(a: number, m: number): number | null {
  const { g, x } = egcd(((a % m) + m) % m, m);
  if (g !== 1) return null;
  return ((x % m) + m) % m;
}

function binom(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return Math.round(r);
}

function factorial(n: number): number {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

/** Reduced rational as "p/q" or integer string. */
function rat(num: number, den: number): string {
  if (den === 0) throw new Error("division by zero");
  let n = num;
  let d = den;
  if (d < 0) {
    n = -n;
    d = -d;
  }
  const g = gcd(n, d);
  n /= g;
  d /= g;
  if (d === 1) return String(n);
  return `${n}/${d}`;
}

function matMul(A: number[][], B: number[][]): number[][] {
  const n = A.length;
  const m = B[0].length;
  const p = B.length;
  const C = Array.from({ length: n }, () => Array(m).fill(0));
  for (let i = 0; i < n; i++)
    for (let j = 0; j < m; j++)
      for (let k = 0; k < p; k++) C[i][j] += A[i][k] * B[k][j];
  return C;
}

function matPow(A: number[][], exp: number): number[][] {
  const n = A.length;
  let R: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  );
  let B = A.map((row) => row.slice());
  let e = exp;
  while (e > 0) {
    if (e & 1) R = matMul(R, B);
    B = matMul(B, B);
    e >>= 1;
  }
  return R;
}

function chineseRemainder(mods: number[], residues: number[]): number {
  const M = mods.reduce((a, b) => a * b, 1);
  let sum = 0;
  for (let i = 0; i < mods.length; i++) {
    const Mi = M / mods[i];
    const inv = invMod(Mi % mods[i], mods[i]);
    if (inv == null) throw new Error("CRT moduli not copairwise");
    sum += residues[i] * Mi * inv;
  }
  return ((sum % M) + M) % M;
}

function derangement(n: number): number {
  // !n = n! Σ_{k=0}^n (-1)^k / k!
  const nf = factorial(n);
  let sum = 0;
  let fact = 1;
  for (let k = 0; k <= n; k++) {
    if (k > 0) fact *= k;
    sum += (k % 2 === 0 ? 1 : -1) * (nf / fact);
  }
  return Math.round(sum);
}

function fmtMatrix(rows: number[][]): string {
  return (
    "\\begin{pmatrix}\n" +
    rows.map((r) => r.join(" & ")).join(" \\\\\n") +
    "\n\\end{pmatrix}"
  );
}

/* ───────── 启封 · thoughtful ───────── */

const laRank: Gen = () => {
  // Structured 3×3 with one obvious linear dependence among rows.
  const a = randInt(1, 4);
  const b = randInt(1, 4);
  const c = randInt(1, 5);
  const k = randInt(2, 3);
  const row1 = [a, b, c];
  const row2 = [k * a, k * b, k * c];
  const row3 = [randInt(1, 3), randInt(0, 3), randInt(1, 4)];
  // Ensure row3 not multiple of row1
  if (row3[0] * b === row3[1] * a && row3[0] * c === row3[2] * a) {
    row3[2] += 1;
  }
  return {
    type: "linearalgebra.rank",
    prompt: `求矩阵\n$$\nA=${fmtMatrix([row1, row2, row3])}\n$$\n的秩。`,
    answer: "2",
    hint: "观察行（列）之间的线性关系。",
    publicParams: { row1, row2, row3, rank: 2 },
  };
};

const laDetStructure: Gen = () => {
  const d = randInt(2, 12);
  // det(a+b, b, c-a) = det(a,b,c) by column operations
  return {
    type: "linearalgebra.det.structure",
    prompt: `已知列向量 $a,b,c\\in\\mathbb R^3$ 满足\n$$\n\\det(a,\\,b,\\,c)=${d}.\n$$\n求\n$$\n\\det(a+b,\\,b,\\,c-a).\n$$`,
    answer: String(d),
    hint: "对列做初等变换，行列式如何变化？",
    publicParams: { d },
  };
};

const numberModInverse: Gen = () => {
  const primes = [11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47];
  const m = pick(primes);
  let a = randInt(2, m - 2);
  while (gcd(a, m) !== 1) a = randInt(2, m - 2);
  const inv = invMod(a, m)!;
  return {
    type: "number.mod_inverse",
    prompt: `求 $${a}$ 在模 $${m}$ 下的乘法逆元，取 $1\\le x<${m}$。`,
    answer: String(inv),
    publicParams: { a, m, inv },
  };
};

const numberCongruenceLinear: Gen = () => {
  // Generate solvable ax ≡ b (mod m) with unique minimal positive? 
  // When gcd(a,m) divides b, there are g solutions. Ask for the smallest positive one.
  const m = pick([20, 24, 30, 35, 36, 40, 42]);
  const a = randInt(4, m - 1);
  const g = gcd(a, m);
  const b = g * randInt(1, Math.floor((m - 1) / g));
  // Find smallest positive x
  let x = 0;
  for (let t = 1; t <= m; t++) {
    if ((a * t - b) % m === 0) {
      x = t;
      break;
    }
  }
  return {
    type: "number.congruence.linear",
    prompt: `求满足\n$$\n${a}x\\equiv ${b}\\pmod{${m}}\n$$\n的**最小正整数** $x$。`,
    answer: String(x),
    publicParams: { a, b, m, x },
  };
};

const numberValuation: Gen = () => {
  const n = pick([50, 60, 80, 100, 120]);
  const p = pick([2, 3, 5]);
  let v = 0;
  for (let pk = p; pk <= n; pk *= p) v += Math.floor(n / pk);
  return {
    type: "number.valuation",
    prompt: `$${n}!$ 中因子 $${p}$ 的最高次数（即 $v_{${p}}(${n}!)$）是多少？`,
    answer: String(v),
    publicParams: { n, p, v },
  };
};

const combinatoricsInclusion2: Gen = () => {
  const N = pick([60, 80, 100, 120]);
  const a = pick([3, 4, 5]);
  let b = pick([5, 6, 7, 8]);
  while (gcd(a, b) === 1 && Math.random() < 0.3) b = pick([5, 6, 7, 8]);
  // ensure a ≠ b
  if (b === a) b = a + 2;
  const l = (a * b) / gcd(a, b);
  const ans =
    Math.floor(N / a) + Math.floor(N / b) - Math.floor(N / l);
  return {
    type: "combinatorics.inclusion2",
    prompt: `在 $1,\\dots,${N}$ 中，有多少个整数能被 $${a}$ 或 $${b}$ 整除？`,
    answer: String(ans),
    hint: "容斥：$|A\\cup B|=|A|+|B|-|A\\cap B|$。",
    publicParams: { N, a, b, ans },
  };
};

const combinatoricsWords: Gen = () => {
  // Multiset permutations of length n with repeated letters
  const patterns: { letters: string; counts: number[] }[] = [
    { letters: "A,A,B,B,C", counts: [2, 2, 1] },
    { letters: "A,A,A,B,B", counts: [3, 2] },
    { letters: "A,A,B,B,C,C", counts: [2, 2, 2] },
    { letters: "A,A,B,C,C", counts: [2, 1, 2] },
  ];
  const pat = pick(patterns);
  const n = pat.counts.reduce((s, c) => s + c, 0);
  let ans = factorial(n);
  for (const c of pat.counts) ans /= factorial(c);
  return {
    type: "combinatorics.words",
    prompt: `用字母 $${pat.letters}$ 排成长度为 $${n}$ 的字符串，共有多少种不同排列？`,
    answer: String(ans),
    publicParams: { letters: pat.letters, counts: pat.counts, ans },
  };
};

const graphDegreeMissing: Gen = () => {
  const n = randInt(6, 8);
  const edges = randInt(n - 1, Math.floor((n * (n - 1)) / 4));
  const sumNeed = 2 * edges;
  // Build n-1 degrees, last determined
  const degs: number[] = [];
  let rem = sumNeed;
  for (let i = 0; i < n - 1; i++) {
    const left = n - 1 - i;
    const maxD = Math.min(n - 1, rem - left); // leave at least 1 for each remaining? allow 1..
    const minD = Math.max(1, rem - left * (n - 1));
    const d = randInt(Math.max(1, minD), Math.max(Math.max(1, minD), maxD));
    degs.push(d);
    rem -= d;
  }
  const dLast = rem;
  if (dLast < 1 || dLast > n - 1) {
    // fallback fixed example
    return {
      type: "graph.degree.missing",
      prompt: `一个简单图有 $7$ 个顶点，其度数为\n$$\n1,2,2,3,3,4,d.\n$$\n若总边数为 $9$，求 $d$。`,
      answer: "3",
      publicParams: { n: 7, edges: 9, d: 3 },
    };
  }
  const shown = [...degs, "d"];
  return {
    type: "graph.degree.missing",
    prompt: `一个简单图有 $${n}$ 个顶点，其度数为\n$$\n${shown.join(",")}.\n$$\n若总边数为 $${edges}$，求 $d$。`,
    answer: String(dLast),
    hint: "边数 = 度数和 / 2。",
    publicParams: { n, edges, degs, d: dLast },
  };
};

const analysisLimitStandard: Gen = () => {
  const a = pick([1, 2, 3]);
  const exp = a === 1 ? "x" : `${a}x`;
  const linear = a === 1 ? "x" : `${a}x`;
  return {
    type: "analysis.limit.standard",
    prompt: `计算\n$$\n\\lim_{x\\to 0}\\frac{e^{${exp}}-1-${linear}}{x^2}.\n$$`,
    answer: rat(a * a, 2),
    hint: "Taylor：$e^u=1+u+u^2/2+o(u^2)$。",
    publicParams: { a, ans: rat(a * a, 2) },
  };
};

const analysisIntegralSymmetry: Gen = () => {
  const L = pick([1, 2, 3]);
  // ∫_{-L}^{L} (x^5 + 3 x^2 + d) — odd part vanishes; 2*3*L^3/3 + 2dL = 2 L^3 + 2dL
  const d2 = randInt(1, 5);
  const integral = 2 * L * L * L + 2 * d2 * L;
  return {
    type: "analysis.integral.symmetry",
    prompt: `计算\n$$\n\\int_{-${L}}^{${L}}\\bigl(x^5+3x^2+${d2}\\bigr)\\,dx.\n$$`,
    answer: String(integral),
    hint: "奇函数在对称区间积分为零。",
    publicParams: { L, c: 3, d: d2, integral },
  };
};

const analysisDerivativeInverse: Gen = () => {
  const x0 = randInt(2, 5);
  const y0 = randInt(3, 9);
  const fp = randInt(2, 6);
  return {
    type: "analysis.derivative.inverse",
    prompt: `若 $f(${x0})=${y0}$，$f'(${x0})=${fp}$，且 $f$ 在邻域内可逆，求\n$$\n(f^{-1})'(${y0}).\n$$`,
    answer: rat(1, fp),
    hint: "$(f^{-1})'(f(a))=1/f'(a)$。",
    publicParams: { x0, y0, fp },
  };
};

const algebraPolynomialComplex: Gen = () => {
  const p = randInt(1, 5);
  const q = randInt(0, 5);
  // P(x) ≡ p + q x  (mod x^2+1)  → P(i)= p + q i
  // Wait user: P ≡ 2x+1 → P(i)=1+2i
  return {
    type: "algebra.polynomial.complex_mod",
    prompt: `已知多项式 $P(x)$ 满足\n$$\nP(x)\\equiv ${q}x+${p}\\pmod{x^2+1}.\n$$\n求 $P(i)$（写成 $a+bi$ 的形式，$a,b\\in\\mathbb Z$）。`,
    answer: q === 0 ? String(p) : p === 0 ? `${q}i` : `${p}+${q}i`,
    hint: "在同余类中代入 $x=i$，注意 $i^2=-1$。",
    publicParams: { p, q },
  };
};

const probabilityHypergeom: Gen = () => {
  const red = randInt(3, 6);
  const blue = randInt(2, 5);
  const draw = 2;
  // exactly 1 red
  const ansNum = binom(red, 1) * binom(blue, 1);
  const ansDen = binom(red + blue, draw);
  return {
    type: "probability.hypergeom.small",
    prompt: `一个袋中有 $${red}$ 个红球、$${blue}$ 个蓝球，不放回抽取 $${draw}$ 个。恰好抽到一个红球的概率是多少？（写成分数。）`,
    answer: rat(ansNum, ansDen),
    publicParams: { red, blue, draw, ansNum, ansDen },
  };
};

const setCardinalityIE: Gen = () => {
  const A = randInt(12, 25);
  const B = randInt(10, 22);
  const inter = randInt(3, Math.min(A, B) - 1);
  const union = A + B - inter;
  return {
    type: "set.cardinality.ie",
    prompt: `$|A|=${A}$，$|B|=${B}$，$|A\\cup B|=${union}$。求 $|A\\cap B|$。`,
    answer: String(inter),
    publicParams: { A, B, union, inter },
  };
};

const sequenceTelescoping: Gen = () => {
  const n = randInt(6, 15);
  // Σ 1/(k(k+1)) = 1 - 1/(n+1) = n/(n+1)
  return {
    type: "sequence.telescoping",
    prompt: `计算\n$$\n\\sum_{k=1}^{${n}}\\frac{1}{k(k+1)}.\n$$\n（写成分数。）`,
    answer: rat(n, n + 1),
    hint: "裂项：$\\frac{1}{k(k+1)}=\\frac{1}{k}-\\frac{1}{k+1}$。",
    publicParams: { n },
  };
};

/* ───────── 推演 · mathematical ───────── */

const laMatrixPower: Gen = () => {
  const a = randInt(1, 3);
  const b = randInt(1, 4);
  const n = randInt(8, 25);
  // [[a,b],[0,a]]^n → upper-right = n b a^{n-1}
  const entry = n * b * a ** (n - 1);
  return {
    type: "linearalgebra.matrixpower",
    prompt: `设\n$$\nA=${fmtMatrix([
      [a, b],
      [0, a],
    ])}.\n$$\n求 $A^{${n}}$ 的右上角元素。`,
    answer: String(entry),
    hint: "这类矩阵是 Jordan 块的标量倍数；归纳或二项式。",
    publicParams: { a, b, n, entry },
  };
};

const laTraceEigen: Gen = () => {
  // eigenvalues 2, -1, λ; tr(A^2)=4+1+λ^2=14 → λ^2=9 → λ=3 (λ>0)
  return {
    type: "linearalgebra.traceeigen",
    prompt: `一个 $3\\times 3$ 实矩阵的特征值为 $2,-1,\\lambda$，且 $\\operatorname{tr}(A^2)=14$。若 $\\lambda>0$，求 $\\lambda$。`,
    answer: "3",
    hint: "$\\operatorname{tr}(A^2)=\\sum\\lambda_i^2$。",
    publicParams: { ans: 3 },
  };
};

const laKernelDim: Gen = () => {
  // dim ker of 2 independent constraints in R^4 → 2
  // Or randomize ambient dim
  const n = pick([4, 5]);
  const rank = 2;
  return {
    type: "linearalgebra.kernel.intersection",
    prompt: `在 $\\mathbb R^{${n}}$ 中，\n$$\nV=\\{x:x_1+x_2+\\cdots+x_{${n}}=0,\\quad x_1-x_2=0\\}.\n$$\n求 $\\dim V$。（两约束线性无关。）`,
    answer: String(n - rank),
    publicParams: { n, rank },
  };
};

const numberCrtHidden: Gen = () => {
  // n ≡ -1 mod 5, -2 mod 7, -3 mod 8
  const mods = [5, 7, 8];
  const residues = [4, 5, 5]; // -1,-2,-3 mod
  const n = chineseRemainder(mods, residues);
  return {
    type: "number.crt.hidden",
    prompt: `求最小正整数 $n$，使\n$$\nn+1\\equiv 0\\pmod{5},\\qquad n+2\\equiv 0\\pmod{7},\\qquad n+3\\equiv 0\\pmod{8}.\n$$`,
    answer: String(n === 0 ? 5 * 7 * 8 : n),
    publicParams: { n: n === 0 ? 280 : n },
  };
};

const numberOrder: Gen = () => {
  const mods = [
    { m: 13, a: 2, ord: 12 },
    { m: 17, a: 3, ord: 8 }, // 3^8=6561≡1? check: order of 3 mod 17 is 8
    { m: 11, a: 2, ord: 10 },
    { m: 19, a: 2, ord: 18 },
  ];
  // Verify order dynamically
  const m = pick([11, 13, 17, 19]);
  let a = pick([2, 3, 5]);
  while (gcd(a, m) !== 1) a = pick([2, 3, 5, 7]);
  let ord = 1;
  let p = a % m;
  while (p !== 1) {
    p = (p * a) % m;
    ord++;
    if (ord > m) break;
  }
  return {
    type: "number.order",
    prompt: `求 $${a}$ 在模 $${m}$ 乘法群 $(\\mathbb Z/${m}\\mathbb Z)^\\times$ 中的阶。`,
    answer: String(ord),
    publicParams: { a, m, ord },
  };
};

const numberSquareMod: Gen = () => {
  const m = 24;
  const sols: number[] = [];
  for (let x = 0; x < m; x++) if ((x * x - 1) % m === 0) sols.push(x);
  const sum = sols.reduce((a, b) => a + b, 0);
  return {
    type: "number.squaremod",
    prompt: `求满足\n$$\nx^2\\equiv 1\\pmod{${m}},\\qquad 0\\le x<${m}\n$$\n的所有 $x$ 之和。`,
    answer: String(sum),
    publicParams: { m, sols, sum },
  };
};

const combinatoricsNoAdjacent: Gen = () => {
  const n = randInt(8, 12);
  const k = randInt(3, 5);
  const ans = binom(n - k + 1, k);
  return {
    type: "combinatorics.noadjacent",
    prompt: `从 $\\{1,\\dots,${n}\\}$ 中选出 $${k}$ 个数，使任意两个都不相邻，共有多少种选法？`,
    answer: String(ans),
    hint: "令 $y_i=x_i-(i-1)$，化为无限制组合。",
    publicParams: { n, k, ans },
  };
};

const combinatoricsSurjection: Gen = () => {
  const n = 5;
  const k = 3;
  // k! S(n,k) = Σ (-1)^{k-i} C(k,i) i^n
  let ans = 0;
  for (let i = 0; i <= k; i++) {
    const sign = (k - i) % 2 === 0 ? 1 : -1;
    ans += sign * binom(k, i) * i ** n;
  }
  return {
    type: "combinatorics.surjection.small",
    prompt: `将 $${n}$ 个不同的球放入 $${k}$ 个不同的盒子，并要求每个盒子至少一个球，共有多少种方法？`,
    answer: String(ans),
    hint: "满射计数 / 容斥。",
    publicParams: { n, k, ans },
  };
};

const combinatoricsCircular: Gen = () => {
  const n = randInt(5, 7);
  // (n-1)! - 2(n-2)!
  const ans = factorial(n - 1) - 2 * factorial(n - 2);
  return {
    type: "combinatorics.circular",
    prompt: `$${n}$ 个人围圆桌而坐，若其中两人 $A$ 与 $B$ 不相邻，共有多少种坐法？（旋转视为相同，镜面翻转视为不同。）`,
    answer: String(ans),
    publicParams: { n, ans },
  };
};

const graphWalksMatrix: Gen = () => {
  const A = [
    [0, 1, 1],
    [1, 0, 1],
    [1, 1, 0],
  ];
  const k = pick([3, 4, 5]);
  const Ak = matPow(A, k);
  const ans = Ak[0][0];
  return {
    type: "graph.walks.matrix",
    prompt: `图的邻接矩阵为\n$$\nA=${fmtMatrix(A)}.\n$$\n从顶点 $1$ 出发经过恰好 $${k}$ 条边回到顶点 $1$ 的游走有多少条？`,
    answer: String(ans),
    hint: "$(A^k)_{ij}$ 计数长度为 $k$ 的 $i\\to j$ 游走。",
    publicParams: { k, ans },
  };
};

const graphTreeLeaves: Gen = () => {
  // n vertices, k vertices of degree 4, remaining internal deg 2, rest leaves
  const n = pick([10, 12, 14]);
  const k = pick([2, 3]);
  const m = n - 2 - 3 * k; // internal deg-2 count
  if (m < 0) {
    return {
      type: "graph.tree.leaves",
      prompt: `一棵有 $12$ 个顶点的树恰有 $3$ 个度数为 $4$ 的顶点，其余非叶顶点度数均为 $2$。求叶子数。`,
      answer: "8",
      publicParams: { n: 12, k: 3, leaves: 8 },
    };
  }
  const leaves = n - k - m;
  return {
    type: "graph.tree.leaves",
    prompt: `一棵有 $${n}$ 个顶点的树恰有 $${k}$ 个度数为 $4$ 的顶点，其余非叶顶点度数均为 $2$。求叶子数。`,
    answer: String(leaves),
    hint: "树：$\\sum\\deg=2(n-1)$。",
    publicParams: { n, k, m, leaves },
  };
};

const analysisLimitParameter: Gen = () => {
  // lim (sin x - x + a x^3)/x^3 = 0 → a = 1/6
  // because sin x = x - x^3/6 + o(x^3)
  return {
    type: "analysis.limit.parameter",
    prompt: `求实数 $a$，使\n$$\n\\lim_{x\\to 0}\\frac{\\sin x-x+a x^3}{x^3}=0.\n$$`,
    answer: "1/6",
    hint: "$\\sin x=x-x^3/6+o(x^3)$。",
    publicParams: { a: "1/6" },
  };
};

const analysisIntegralParameter: Gen = () => {
  // ∫_0^1 x(1-x)^n dx = B(2,n+1)= n! / (n+2)!
  const n = randInt(3, 6);
  const ans = rat(factorial(n), factorial(n + 2));
  return {
    type: "analysis.integral.parameter",
    prompt: `求\n$$\n\\int_0^1 x(1-x)^{${n}}\\,dx.\n$$\n（写成分数。）`,
    answer: ans,
    publicParams: { n, ans },
  };
};

const analysisRecursiveIntegral: Gen = () => {
  // I_6/I_2 = 5/16
  return {
    type: "analysis.recursive.integral",
    prompt: `设\n$$\nI_n=\\int_0^{\\pi/2}\\sin^n x\\,dx.\n$$\n已知 $I_2=\\pi/4$，求 $I_6/I_2$（写成分数）。`,
    answer: "5/16",
    hint: "递推：$I_n=\\frac{n-1}{n}I_{n-2}$。",
    publicParams: { ans: "5/16" },
  };
};

const probabilityConditioning: Gen = () => {
  // Two dice, P(sum=8 | sum even)
  // Even sums: 2,4,6,8,10,12 → 1+3+5+5+3+1=18
  // Sum 8: 5 ways
  return {
    type: "probability.conditioning",
    prompt: `连续掷两枚公平骰子。已知点数和为偶数，求点数和为 $8$ 的条件概率。（写成分数。）`,
    answer: "5/18",
    publicParams: { ans: "5/18" },
  };
};

const polynomialVieta: Gen = () => {
  const s1 = randInt(2, 6);
  const s2 = randInt(-4, 4);
  // a^2+b^2+c^2 = s1^2 - 2 s2
  const ans = s1 * s1 - 2 * s2;
  return {
    type: "polynomial.vieta",
    prompt: `首一三次多项式的三个根为 $a,b,c$，满足\n$$\na+b+c=${s1},\\qquad ab+bc+ca=${s2}.\n$$\n求 $a^2+b^2+c^2$。`,
    answer: String(ans),
    publicParams: { s1, s2, ans },
  };
};

const algebraGroupOrder: Gen = () => {
  // order of product of disjoint cycles = lcm of lengths
  const cases = [
    { desc: "(1\\,2\\,3)(4\\,5\\,6\\,7)", ord: 12, n: 7 },
    { desc: "(1\\,2)(3\\,4\\,5)", ord: 6, n: 5 },
    { desc: "(1\\,2\\,3\\,4)(5\\,6\\,7)", ord: 12, n: 7 },
    { desc: "(1\\,2\\,3)(4\\,5)", ord: 6, n: 5 },
  ];
  const c = pick(cases);
  return {
    type: "algebra.group.order",
    prompt: `在对称群 $S_{${c.n}}$ 中，置换\n$$\n${c.desc}\n$$\n的阶是多少？`,
    answer: String(c.ord),
    hint: "互斥循环的阶等于各长度的最小公倍数。",
    publicParams: { ord: c.ord },
  };
};

const complexRootsSum: Gen = () => {
  // Non-real 5th roots of unity sum to -1 (since all sum to 0, exclude 1)
  const n = pick([5, 7]);
  // sum of all = 0, real root is 1, non-real sum = -1
  return {
    type: "complex.roots.sum",
    prompt: `方程 $z^{${n}}=1$ 的所有**非实**根之和是多少？`,
    answer: "-1",
    hint: "全体单位根之和为 $0$。",
    publicParams: { n },
  };
};

/* ───────── 穷理 · deep ───────── */

/**
 * Deep puzzles must not be obtained merely by enlarging
 * the numerical parameters of a mathematical-level puzzle.
 *
 * A deep puzzle should normally require at least one of:
 * - discovering an invariant;
 * - combining two distinct ideas;
 * - deriving an intermediate lemma;
 * - introducing an auxiliary quantity or recurrence;
 * - counting a complement / quotient / orbit;
 * - reducing the problem to a hidden algebraic structure.
 *
 * Boolean answers are forbidden.
 */

const numberCrtDivisibility: Gen = () => {
  // n≡1 mod 4, ≡2 mod 5, ≡3 mod 7, and 11|n
  const mods = [4, 5, 7];
  const residues = [1, 2, 3];
  const base = chineseRemainder(mods, residues);
  const M = 4 * 5 * 7;
  // n = base + M t, need n ≡ 0 mod 11
  let t = 0;
  let n = base;
  while (n % 11 !== 0) {
    t++;
    n = base + M * t;
    if (t > 20) break;
  }
  return {
    type: "number.crt.divisibility",
    prompt: `求最小正整数 $n$，满足\n$$\nn\\equiv 1\\pmod{4},\\qquad n\\equiv 2\\pmod{5},\\qquad n\\equiv 3\\pmod{7},\n$$\n并且 $11\\mid n$。`,
    answer: String(n),
    publicParams: { base, M, n },
  };
};

const numberDivisorsSquare: Gen = () => {
  // Smallest n with exactly 15 divisors: 15=15 → p^{14} huge; 15=5*3 → p^4 q^2
  // Compare p^4 q^2 forms: minimize → 2^4 3^2=144, 3^4 2^2=324, 2^4 5^2=400, ...
  return {
    type: "number.divisors.square",
    prompt: `求最小正整数 $n$，使 $n$ 恰好有 $15$ 个正因数。`,
    answer: "144",
    hint: "$15=15$ 或 $5\\cdot 3$，比较 $p^{14}$ 与 $p^4 q^2$。",
    publicParams: { ans: 144 },
  };
};

const numberTrailingFactorial: Gen = () => {
  const n = pick([25, 50, 100]);
  let f = BigInt(1);
  for (let i = 2; i <= n; i++) f *= BigInt(i);
  while (f % BigInt(10) === BigInt(0)) f /= BigInt(10);
  const digit = Number(f % BigInt(10));
  return {
    type: "number.trailing.factorial",
    prompt: `考虑 $${n}!$ 的十进制表示。去掉末尾所有连续的零之后，所得整数的个位数是多少？`,
    answer: String(digit),
    publicParams: { n, digit },
  };
};

const combinatoricsDerangementPartial: Gen = () => {
  const n = pick([6, 7, 8]);
  const k = 2; // exactly k fixed points
  // C(n,k) * D_{n-k}
  const ans = binom(n, k) * derangement(n - k);
  return {
    type: "combinatorics.derangement.partial",
    prompt: `$${n}$ 个人各有一顶帽子。随机重新分配帽子，要求**恰好**有 $${k}$ 个人拿到自己的帽子。这样的分配共有多少种？`,
    answer: String(ans),
    hint: "先选固定点，再对剩余做完全错排。",
    publicParams: { n, k, ans },
  };
};

const combinatoricsGridForbidden: Gen = () => {
  const R = randInt(5, 8);
  const U = randInt(5, 7);
  const fx = randInt(2, R - 2);
  const fy = randInt(2, U - 2);
  const total = binom(R + U, R);
  const bad = binom(fx + fy, fx) * binom(R - fx + U - fy, R - fx);
  const ans = total - bad;
  return {
    type: "combinatorics.grid.forbidden",
    prompt: `从 $(0,0)$ 走到 $(${R},${U})$，每步只能向右或向上一格，且路径不得经过 $(${fx},${fy})$。共有多少条最短路径？`,
    answer: String(ans),
    hint: "总数减去经过禁点的路径。",
    publicParams: { R, U, fx, fy, ans },
  };
};

const combinatoricsBurnsideNecklace: Gen = () => {
  // 3 red + 3 blue, rotations only on hexagon → 4
  return {
    type: "combinatorics.burnside.necklace",
    prompt: `用 $3$ 个红珠、$3$ 个蓝珠组成一个圆形项链，只把旋转视为相同（翻转视为不同），问有多少种不同项链？`,
    answer: "4",
    hint: "Burnside：对循环群 $C_6$ 平均不动点。",
    publicParams: { ans: 4 },
  };
};

const laCommutant: Gen = () => {
  return {
    type: "linearalgebra.commutant",
    prompt: `求所有满足 $AX=XA$ 的 $2\\times 2$ 实矩阵 $X$ 所成向量空间的维数，其中\n$$\nA=${fmtMatrix([
      [1, 1],
      [0, 1],
    ])}.\n$$`,
    answer: "2",
    hint: "解矩阵方程；与 $A$ 交换的矩阵是 $A$ 的多项式。",
    publicParams: { ans: 2 },
  };
};

const laProjection: Gen = () => {
  return {
    type: "linearalgebra.projection",
    prompt: `设 $P,Q$ 均为 $\\mathbb R^7$ 上的投影算子（$P^2=P$，$Q^2=Q$），满足 $PQ=QP=0$，$\\operatorname{tr}P=2$，$\\operatorname{tr}Q=3$。求 $\\dim(\\ker P\\cap\\ker Q)$。`,
    answer: "2",
    hint: "$\\operatorname{tr}P=\\operatorname{rank}P$；由 $PQ=0$ 得 $\\operatorname{im}Q\\subset\\ker P$。",
    publicParams: { ans: 2 },
  };
};

const polynomialInterpolation: Gen = () => {
  // Cubic via finite differences — generate a known cubic
  const a = randInt(1, 2);
  const b = randInt(-2, 3);
  const c = randInt(-3, 4);
  const d = randInt(1, 5);
  const P = (x: number) => a * x ** 3 + b * x ** 2 + c * x + d;
  const xs = [0, 1, 2, 3];
  const ys = xs.map(P);
  const xq = 6;
  return {
    type: "polynomial.interpolation",
    prompt: `已知三次多项式 $P$ 满足\n$$\nP(0)=${ys[0]},\\quad P(1)=${ys[1]},\\quad P(2)=${ys[2]},\\quad P(3)=${ys[3]}.\n$$\n求 $P(${xq})$。`,
    answer: String(P(xq)),
    hint: "有限差分或 Newton 插值。",
    publicParams: { ys, xq, ans: P(xq) },
  };
};

const analysisIntegralSymmetry2: Gen = () => {
  return {
    type: "analysis.integral.symmetry2",
    prompt: `计算\n$$\nI=\\int_0^1\\frac{x^3}{x^3+(1-x)^3}\\,dx.\n$$`,
    answer: "1/2",
    hint: "代换 $x\\mapsto 1-x$，与原式相加。",
    publicParams: { ans: "1/2" },
  };
};

const analysisFunctionalIteration: Gen = () => {
  // f(x)+2f(1-x)=x^2+1 → f(0)=1
  return {
    type: "analysis.functional.iteration",
    prompt: `连续函数 $f:\\mathbb R\\to\\mathbb R$ 满足\n$$\nf(x)+2f(1-x)=x^2+1.\n$$\n求 $f(0)$。`,
    answer: "1",
    hint: "将 $x$ 换成 $1-x$，与原方程联立。",
    publicParams: { ans: 1 },
  };
};

const probabilityExpectedStopping: Gen = () => {
  // E[wait for HH] = 6 for fair coin
  return {
    type: "probability.expected.stopping",
    prompt: `反复独立掷公平硬币，直到第一次出现连续两个正面为止。停止时掷硬币次数的期望是多少？`,
    answer: "6",
    hint: "设状态为当前后缀匹配长度，列期望方程组。",
    publicParams: { ans: 6 },
  };
};

const probabilityRandomWalk: Gen = () => {
  const a = 0;
  const b = pick([5, 6, 8]);
  const start = randInt(1, b - 1);
  // P(hit a before b) = (b-start)/(b-a)
  const ans = rat(b - start, b - a);
  return {
    type: "probability.randomwalk",
    prompt: `一只粒子从整数点 $${start}$ 出发，每步以 $1/2$ 的概率向左或向右移动 $1$。到达 $${a}$ 或 $${b}$ 时停止。到达 $${b}$ **之前**先到达 $${a}$ 的概率是多少？（写成分数。）`,
    answer: ans,
    hint: "公平赌徒破产 / 调和函数。",
    publicParams: { a, b, start, ans },
  };
};

const graphSpanningTree: Gen = () => {
  return {
    type: "graph.spanningtree",
    prompt: `完全图 $K_4$ 删除一条边后，有多少棵生成树？`,
    answer: "8",
    hint: "Cayley：$K_n$ 有 $n^{n-2}$ 棵生成树；再按边的对称性计数。",
    publicParams: { ans: 8 },
  };
};

const groupHomomorphism: Gen = () => {
  const pairs = [
    [12, 18],
    [8, 12],
    [15, 25],
    [9, 15],
  ];
  const [m, n] = pick(pairs);
  const ans = gcd(m, n);
  return {
    type: "group.homomorphism",
    prompt: `群同态\n$$\n\\varphi:\\mathbb Z_{${m}}\\to\\mathbb Z_{${n}}\n$$\n共有多少个？`,
    answer: String(ans),
    hint: "$\\varphi(1)=a$ 须满足 $m a=0$ 于 $\\mathbb Z_n$。",
    publicParams: { m, n, ans },
  };
};

/* ───────── Pools ───────── */

const THOUGHTFUL: Gen[] = [
  laRank,
  laDetStructure,
  numberModInverse,
  numberCongruenceLinear,
  numberValuation,
  combinatoricsInclusion2,
  combinatoricsWords,
  graphDegreeMissing,
  analysisLimitStandard,
  analysisIntegralSymmetry,
  analysisDerivativeInverse,
  algebraPolynomialComplex,
  probabilityHypergeom,
  setCardinalityIE,
  sequenceTelescoping,
];

const MATHEMATICAL: Gen[] = [
  laMatrixPower,
  laTraceEigen,
  laKernelDim,
  numberCrtHidden,
  numberOrder,
  numberSquareMod,
  combinatoricsNoAdjacent,
  combinatoricsSurjection,
  combinatoricsCircular,
  graphWalksMatrix,
  graphTreeLeaves,
  analysisLimitParameter,
  analysisIntegralParameter,
  analysisRecursiveIntegral,
  probabilityConditioning,
  polynomialVieta,
  algebraGroupOrder,
  complexRootsSum,
];

const DEEP: Gen[] = [
  numberCrtDivisibility,
  numberDivisorsSquare,
  numberTrailingFactorial,
  combinatoricsDerangementPartial,
  combinatoricsGridForbidden,
  combinatoricsBurnsideNecklace,
  laCommutant,
  laProjection,
  polynomialInterpolation,
  analysisIntegralSymmetry2,
  analysisFunctionalIteration,
  probabilityExpectedStopping,
  probabilityRandomWalk,
  graphSpanningTree,
  groupHomomorphism,
];

export function generatePuzzle(difficulty: PuzzleDifficulty): PuzzleInstance {
  const pool =
    difficulty === "thoughtful"
      ? THOUGHTFUL
      : difficulty === "mathematical"
        ? MATHEMATICAL
        : DEEP;
  const gen = pick(pool);
  const puzzle = gen(difficulty);
  return {
    ...puzzle,
    answer: normalizeAnswer(puzzle.answer),
  };
}

export function puzzleCatalogSize(): number {
  return THOUGHTFUL.length + MATHEMATICAL.length + DEEP.length;
}

export function puzzlePoolSizes(): Record<PuzzleDifficulty, number> {
  return {
    thoughtful: THOUGHTFUL.length,
    mathematical: MATHEMATICAL.length,
    deep: DEEP.length,
  };
}

/**
 * Canonicalize answers: integers, reduced rationals "p/q", and "a+bi".
 * YES/NO is intentionally not supported for gate grading.
 */
export function normalizeAnswer(input: string): string {
  const raw = input.trim().replace(/\s+/g, "");

  // Complex: a+bi, a-bi, bi, -bi, a
  const complex = raw.match(/^([+-]?\d+)?([+-]\d*)i$/i);
  if (complex) {
    const real = complex[1] ? Number(complex[1]) : 0;
    let imagStr = complex[2];
    if (imagStr === "+" || imagStr === "") imagStr = "+1";
    if (imagStr === "-") imagStr = "-1";
    const imag = Number(imagStr);
    if (imag === 0) return String(real);
    if (real === 0) return imag === 1 ? "i" : imag === -1 ? "-i" : `${imag}i`;
    const imagPart =
      imag === 1 ? "+i" : imag === -1 ? "-i" : imag > 0 ? `+${imag}i` : `${imag}i`;
    return `${real}${imagPart}`;
  }
  // Also accept a+bi with explicit +
  const complex2 = raw.match(/^([+-]?\d+)\+(\d+)i$/i);
  if (complex2) {
    return normalizeAnswer(`${complex2[1]}+${complex2[2]}i`);
  }

  // Rational p/q
  const frac = raw.match(/^([+-]?\d+)\/(\d+)$/);
  if (frac) {
    return rat(Number(frac[1]), Number(frac[2]));
  }

  // Integer (possibly with .0)
  if (/^-?\d+(\.0+)?$/.test(raw)) {
    return String(Number(raw));
  }

  return raw.toUpperCase();
}
