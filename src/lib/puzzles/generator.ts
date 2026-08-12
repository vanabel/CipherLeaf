export type PuzzleDifficulty = "thoughtful" | "mathematical" | "deep";

export type PuzzleInstance = {
  type: string;
  prompt: string;
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

function lcm(a: number, b: number): number {
  return Math.abs(a * b) / gcd(a, b);
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

/* ───────── Insight / invariants ───────── */

const coinFlipInsight: Gen = (difficulty) => {
  const n =
    difficulty === "thoughtful"
      ? randInt(12, 16)
      : difficulty === "mathematical"
        ? randInt(14, 22)
        : randInt(18, 28);
  const k =
    difficulty === "thoughtful"
      ? randInt(2, 4)
      : difficulty === "mathematical"
        ? randInt(3, 5)
        : randInt(4, 6);
  let target = randInt(1, n - 1);
  if (Math.random() < 0.55) {
    target =
      k % 2 === 0
        ? randInt(0, Math.floor((n - 1) / 2)) * 2 + 1
        : randInt(1, n - 1);
  }
  const answer: "YES" | "NO" =
    k % 2 === 0
      ? target % 2 === 0
        ? "YES"
        : "NO"
      : n >= k
        ? "YES"
        : "NO";

  return {
    type: "insight.coins",
    prompt: `有 ${n} 枚硬币，全部正面朝上。每一步必须恰好翻转 ${k} 枚。是否可能最终恰好有 ${target} 枚反面？\n\n请回答 是 或 否。`,
    answer,
    hint: "观察模 2 下的不变量。",
    publicParams: { n, k, target },
  };
};

/** Mutilated board: opposite corners removed. */
const chessboardInsight: Gen = (difficulty) => {
  const n = difficulty === "thoughtful" ? 6 : difficulty === "mathematical" ? 8 : 10;
  return {
    type: "insight.chessboard",
    prompt: `一块 ${n}×${n} 棋盘去掉两个对角上的格子后，能否用 $1\\times 2$ 的骨牌完全覆盖剩余格子？\n\n请回答 是 或 否。`,
    answer: "NO",
    hint: "对角格子同色；染色后黑白格数量不等。",
    publicParams: { n },
  };
};

/** Cup flipping / lights: sum mod m. */
const sumModInsight: Gen = () => {
  const m = pick([3, 4, 5]);
  const n = randInt(m + 2, m + 6);
  const start = Array.from({ length: n }, () => randInt(0, m - 1));
  const targetSum = randInt(0, m - 1);
  const startSum = start.reduce((a, b) => a + b, 0) % m;
  // Each move adds 1 to one element mod m → can reach any sum? Actually can change one by +1, so can reach any total sum.
  // Better: each move flips two cups by +1 each → Δsum ≡ 2 (mod m) if... 
  // Simpler classic: chips, move transfers 1. 
  // Use: each operation adds 1 to exactly two numbers mod m. Reachable iff targetSum ≡ startSum (mod gcd(2,m)).
  const g = gcd(2, m);
  const reachable = (targetSum - startSum) % g === 0;
  // normalize mod
  const diff = ((targetSum - startSum) % m + m) % m;
  const answer: "YES" | "NO" = diff % g === 0 ? "YES" : "NO";
  void reachable;
  return {
    type: "insight.summod",
    prompt: `有 ${n} 个计数器，当前读数为 $(${start.join(", ")})$。每一步任选两个计数器，各加 $1$（运算在模 ${m} 下）。能否使所有读数之和（模 ${m}）等于 $${targetSum}$？\n\n请回答 是 或 否。`,
    answer,
    hint: "追踪总和模 gcd(2,m)。",
    publicParams: { m, start, targetSum },
  };
};

/** Handshake parity. */
const handshakeInsight: Gen = () => {
  const n = randInt(5, 9);
  // Can everyone have odd degree? Sum of degrees even → odd count of odd degrees impossible if all odd and n odd.
  const allOdd = n % 2 === 1;
  const answer: "YES" | "NO" = allOdd ? "NO" : "YES";
  return {
    type: "insight.handshake",
    prompt: `一次聚会有 ${n} 人。是否可能每个人恰好与奇数个其他人握过手？\n\n请回答 是 或 否。`,
    answer,
    hint: "握手引理：奇度顶点个数为偶数。",
    publicParams: { n },
  };
};

/* ───────── Modular arithmetic ───────── */

const modularCrt: Gen = (difficulty) => {
  let mods: number[];
  if (difficulty === "thoughtful") mods = [5, 7];
  else if (difficulty === "mathematical") mods = [5, 7, 9];
  else mods = [7, 9, 11];
  while (gcd(mods[0], mods[1]) !== 1) mods[1] += 1;
  if (mods[2]) {
    while (gcd(mods[0], mods[2]) !== 1 || gcd(mods[1], mods[2]) !== 1) {
      mods[2] += 1;
    }
  }
  const residues = mods.map((m) => randInt(0, m - 1));
  const M = mods.reduce((a, b) => a * b, 1);
  let x = 1;
  for (; x <= M; x++) {
    if (mods.every((m, i) => x % m === residues[i])) break;
  }
  const lines = mods
    .map((m, i) => `$x \\equiv ${residues[i]} \\pmod{${m}}$`)
    .join("\n\n");
  return {
    type: "modular.crt",
    prompt: `求满足下列同余式的最小正整数 $x$：\n\n${lines}`,
    answer: String(x),
    publicParams: { mods, residues },
  };
};

const modularRemainder: Gen = (difficulty) => {
  const a = difficulty === "deep" ? randInt(50, 200) : randInt(20, 80);
  const b = difficulty === "deep" ? randInt(7, 19) : randInt(5, 13);
  const r = a % b;
  return {
    type: "modular.remainder",
    prompt: `求 $${a} \\bmod ${b}$，即 $${a}$ 除以 $${b}$ 的余数。`,
    answer: String(r),
    publicParams: { a, b, r },
  };
};

const modularPower: Gen = (difficulty) => {
  const base = randInt(2, 9);
  const exp =
    difficulty === "thoughtful"
      ? randInt(3, 5)
      : difficulty === "mathematical"
        ? randInt(5, 9)
        : randInt(8, 14);
  const mod =
    difficulty === "deep" ? pick([7, 11, 13, 17]) : pick([5, 7, 9, 11, 13]);
  let v = 1;
  for (let i = 0; i < exp; i++) v = (v * base) % mod;
  return {
    type: "modular.power",
    prompt: `计算 $${base}^{${exp}} \\bmod ${mod}$。`,
    answer: String(v),
    hint: "可逐步取模，避免直接算大数。",
    publicParams: { base, exp, mod, v },
  };
};

const lastDigit: Gen = (difficulty) => {
  const base = randInt(2, 9);
  const exp =
    difficulty === "thoughtful"
      ? randInt(4, 8)
      : difficulty === "mathematical"
        ? randInt(8, 18)
        : randInt(20, 40);
  let d = 1;
  for (let i = 0; i < exp; i++) d = (d * base) % 10;
  return {
    type: "modular.lastdigit",
    prompt: `$${base}^{${exp}}$ 的个位数是多少？`,
    answer: String(d),
    publicParams: { base, exp, d },
  };
};

/* ───────── Sequences ───────── */

const sequenceRecurrence: Gen = (difficulty) => {
  const a = randInt(2, 9);
  const b = randInt(1, 6);
  const len = difficulty === "deep" ? 8 : 6;
  const seq: number[] = [];
  let cur = a;
  for (let i = 0; i < len; i++) {
    seq.push(cur);
    cur = cur * b + (i % 2 === 0 ? 1 : -1);
  }
  const next = cur;
  return {
    type: "sequence.recurrence",
    prompt: `数列开头为：\n\n$${seq.join(", ")}\\,,\\;\\dots$\n\n从第二项起满足\n\n$$x_n = ${b}\\cdot x_{n-1} + (-1)^{n-1}$$\n\n下一项是多少？`,
    answer: String(next),
    publicParams: { seq, b, next },
  };
};

const sequenceArithmetic: Gen = () => {
  const a = randInt(1, 20);
  const d = randInt(2, 9);
  const n = randInt(6, 12);
  const seq = Array.from({ length: 5 }, (_, i) => a + i * d);
  const term = a + (n - 1) * d;
  return {
    type: "sequence.arithmetic",
    prompt: `等差数列前几项为 $${seq.join(", ")}, \\dots$。求第 $${n}$ 项。`,
    answer: String(term),
    publicParams: { a, d, n, term },
  };
};

const sequenceGeometric: Gen = () => {
  const a = randInt(1, 5);
  const r = randInt(2, 4);
  const n = randInt(4, 7);
  const seq = Array.from({ length: 4 }, (_, i) => a * r ** i);
  const term = a * r ** (n - 1);
  return {
    type: "sequence.geometric",
    prompt: `等比数列前几项为 $${seq.join(", ")}, \\dots$。求第 $${n}$ 项。`,
    answer: String(term),
    publicParams: { a, r, n, term },
  };
};

const sequenceFibonacciLike: Gen = () => {
  const a = randInt(1, 5);
  const b = randInt(1, 8);
  const seq = [a, b];
  for (let i = 0; i < 5; i++) seq.push(seq[seq.length - 1] + seq[seq.length - 2]);
  const next = seq[seq.length - 1] + seq[seq.length - 2];
  const shown = seq.slice(0, 6);
  return {
    type: "sequence.fiblike",
    prompt: `数列满足 $x_n = x_{n-1} + x_{n-2}$，开头为 $${shown.join(", ")}, \\dots$。下一项是多少？`,
    answer: String(next),
    publicParams: { shown, next },
  };
};

const sequenceDigitSum: Gen = () => {
  const n = randInt(100, 999);
  const s = String(n)
    .split("")
    .reduce((a, c) => a + Number(c), 0);
  return {
    type: "sequence.digitsum",
    prompt: `求正整数 $${n}$ 的各位数字之和。`,
    answer: String(s),
    publicParams: { n, s },
  };
};

/* ───────── Combinatorics ───────── */

const combinatoricsLattice: Gen = (difficulty) => {
  const w = difficulty === "thoughtful" ? 2 : difficulty === "mathematical" ? 3 : 4;
  const h = difficulty === "thoughtful" ? 2 : 3;
  const ways = binom(w + h, w);
  return {
    type: "combinatorics.lattice",
    prompt: `在一个 ${w}×${h} 的单位方格网格上，只允许向东或向北走一格。从西南角到东北角的最短路径有多少条？`,
    answer: String(ways),
    publicParams: { w, h },
  };
};

const combinatoricsChoose: Gen = (difficulty) => {
  const n = difficulty === "deep" ? randInt(8, 12) : randInt(5, 9);
  const k = randInt(2, Math.min(4, n - 1));
  return {
    type: "combinatorics.choose",
    prompt: `从 ${n} 个人中选出 ${k} 人组成委员会（不计顺序），有多少种选法？`,
    answer: String(binom(n, k)),
    publicParams: { n, k },
  };
};

const combinatoricsPermute: Gen = () => {
  const n = randInt(4, 7);
  const k = randInt(2, Math.min(4, n));
  let p = 1;
  for (let i = 0; i < k; i++) p *= n - i;
  return {
    type: "combinatorics.permute",
    prompt: `从 ${n} 本书中选出 ${k} 本排成一列放在书架上，有多少种排法？`,
    answer: String(p),
    publicParams: { n, k, p },
  };
};

const combinatoricsSubset: Gen = () => {
  const n = randInt(4, 8);
  return {
    type: "combinatorics.subset",
    prompt: `一个 ${n} 元集合有多少个子集（含空集与全集）？`,
    answer: String(2 ** n),
    publicParams: { n },
  };
};

const combinatoricsHandshake: Gen = () => {
  const n = randInt(5, 12);
  return {
    type: "combinatorics.handshake",
    prompt: `聚会上有 ${n} 人，每两人恰好握手一次。一共握了多少次手？`,
    answer: String(binom(n, 2)),
    publicParams: { n },
  };
};

const combinatoricsPascal: Gen = () => {
  const n = randInt(4, 8);
  const k = randInt(1, n - 1);
  return {
    type: "combinatorics.pascal",
    prompt: `二项式系数 $\\binom{${n}}{${k}}$ 等于多少？`,
    answer: String(binom(n, k)),
    publicParams: { n, k },
  };
};

/* ───────── Graph / structure ───────── */

const graphPathCount: Gen = (difficulty) => {
  // Small DAG: layers
  const layers = difficulty === "thoughtful" ? 3 : 4;
  // Complete bipartite-ish between consecutive layers of size 2
  // paths from start to end through layers of 2 nodes each: 2^(layers-1) if start/end single
  // Simpler: complete binary choices
  const choices = difficulty === "deep" ? 4 : 3;
  const ways = 2 ** choices;
  return {
    type: "graph.paths",
    prompt: `从 $A$ 到 $B$ 要经过 ${choices} 个关卡，每个关卡有 $2$ 条互不相关的通道可选。从 $A$ 到 $B$ 共有多少条不同路径？`,
    answer: String(ways),
    publicParams: { choices, ways },
  };
};

const graphDegreeSum: Gen = () => {
  const degrees = [randInt(1, 4), randInt(1, 4), randInt(1, 4), randInt(1, 4)];
  // Force even sum
  if (degrees.reduce((a, b) => a + b, 0) % 2 === 1) degrees[0] += 1;
  const edges = degrees.reduce((a, b) => a + b, 0) / 2;
  return {
    type: "graph.degrees",
    prompt: `一个图有 $4$ 个顶点，度数分别为 $${degrees.join(", ")}$。它有多少条边？`,
    answer: String(edges),
    hint: "边数 = 度数和 / 2。",
    publicParams: { degrees, edges },
  };
};

const tournamentGames: Gen = () => {
  const n = randInt(4, 9);
  return {
    type: "graph.tournament",
    prompt: `${n} 支球队进行单循环赛（每两队赛一场）。一共要进行多少场比赛？`,
    answer: String(binom(n, 2)),
    publicParams: { n },
  };
};

/* ───────── Logic / number constraints ───────── */

const logicLinear: Gen = (difficulty) => {
  const a = randInt(3, difficulty === "deep" ? 12 : 9);
  const b = randInt(3, difficulty === "deep" ? 12 : 9);
  const c = a + b;
  const decoy = a + b + randInt(1, 3);
  return {
    type: "logic.constraints",
    prompt: `正整数 $x, y, z$ 满足：\n\n1. $x + y = z$\n2. $x < y$\n3. $z = ${c}$\n4. $y - x = ${b - a}$\n\n$x$ 等于多少？\n\n（可忽略干扰值 $${decoy}$。）`,
    answer: String(a),
    publicParams: { a, b, c },
  };
};

const logicAges: Gen = () => {
  const child = randInt(5, 12);
  const parent = child + randInt(22, 35);
  const sum = child + parent;
  const diff = parent - child;
  return {
    type: "logic.ages",
    prompt: `父与子现在年龄之和为 ${sum}，父亲比儿子大 ${diff} 岁。儿子现在多少岁？`,
    answer: String(child),
    publicParams: { child, parent },
  };
};

const logicChickens: Gen = () => {
  // classic: x chickens y rabbits, x+y=heads, 2x+4y=legs
  const chickens = randInt(2, 12);
  const rabbits = randInt(2, 10);
  const heads = chickens + rabbits;
  const legs = 2 * chickens + 4 * rabbits;
  return {
    type: "logic.chickens",
    prompt: `笼子里有鸡和兔，共 ${heads} 个头、${legs} 只脚。鸡有多少只？`,
    answer: String(chickens),
    publicParams: { chickens, rabbits, heads, legs },
  };
};

const logicGcdLcm: Gen = (difficulty) => {
  const a = randInt(6, 24);
  const b = randInt(6, 24);
  if (difficulty === "thoughtful" || Math.random() < 0.5) {
    return {
      type: "number.gcd",
      prompt: `求 $\\gcd(${a}, ${b})$。`,
      answer: String(gcd(a, b)),
      publicParams: { a, b },
    };
  }
  return {
    type: "number.lcm",
    prompt: `求 $\\mathrm{lcm}(${a}, ${b})$。`,
    answer: String(lcm(a, b)),
    publicParams: { a, b },
  };
};

const logicDivisors: Gen = () => {
  const n = pick([12, 18, 20, 24, 28, 30, 36, 42, 48, 60]);
  let count = 0;
  for (let i = 1; i <= n; i++) if (n % i === 0) count++;
  return {
    type: "number.divisors",
    prompt: `正整数 $${n}$ 有多少个正因数？`,
    answer: String(count),
    publicParams: { n, count },
  };
};

const logicPigeonhole: Gen = () => {
  const holes = randInt(3, 7);
  const need = holes + 1;
  return {
    type: "logic.pigeonhole",
    prompt: `把若干只鸽子放入 ${holes} 个笼子。为保证至少有一个笼子里不少于 $2$ 只鸽子，最少需要放多少只鸽子？`,
    answer: String(need),
    publicParams: { holes, need },
  };
};

/* ───────── Geometry ───────── */

const geometryTriangle: Gen = (difficulty) => {
  const a = randInt(20, 50);
  const b = difficulty === "thoughtful" ? 90 - a : randInt(20, 70);
  const c = 180 - a - b;
  return {
    type: "geometry.triangle",
    prompt: `在 $\\triangle ABC$ 中，$\\angle A = ${a}^\\circ$，$\\angle B = ${b}^\\circ$。$\\angle C$ 的度数是多少？`,
    answer: String(c),
    publicParams: { a, b, c },
  };
};

const geometryIsosceles: Gen = () => {
  const base = randInt(20, 50);
  const vertex = 180 - 2 * base;
  // Given vertex, find base
  return {
    type: "geometry.isosceles",
    prompt: `等腰三角形顶角为 $${vertex}^\\circ$，求一个底角的度数。`,
    answer: String(base),
    publicParams: { base, vertex },
  };
};

const geometryRectangle: Gen = () => {
  const w = randInt(3, 12);
  const h = randInt(3, 12);
  return {
    type: "geometry.rect",
    prompt: `长方形的长为 $${w}$、宽为 $${h}$。它的周长是多少？`,
    answer: String(2 * (w + h)),
    publicParams: { w, h },
  };
};

const geometryArea: Gen = () => {
  const b = randInt(4, 14);
  const h = randInt(3, 12);
  return {
    type: "geometry.area",
    prompt: `三角形底边长 $${b}$，对应高为 $${h}$。面积是多少？`,
    answer: String((b * h) / 2),
    publicParams: { b, h },
  };
};

const geometryParallel: Gen = () => {
  const a = randInt(35, 75);
  // corresponding / alternate: if parallel, alternate interior equal
  return {
    type: "geometry.parallel",
    prompt: `两条平行线被一条截线所截，其中一个内错角为 $${a}^\\circ$。另一个内错角是多少度？`,
    answer: String(a),
    publicParams: { a },
  };
};

const geometryCircle: Gen = () => {
  const central = randInt(40, 120);
  const inscribed = central / 2;
  // only even centrals for integer answer
  const c = central % 2 === 0 ? central : central + 1;
  return {
    type: "geometry.circle",
    prompt: `同弧所对的圆心角为 $${c}^\\circ$。则该弧所对的圆周角是多少度？`,
    answer: String(c / 2),
    publicParams: { c, inscribed: c / 2 },
  };
};

const geometryPythagorean: Gen = (difficulty) => {
  const triples = [
    [3, 4, 5],
    [5, 12, 13],
    [6, 8, 10],
    [7, 24, 25],
    [8, 15, 17],
    [9, 12, 15],
  ];
  const pool =
    difficulty === "thoughtful" ? triples.slice(0, 3) : triples;
  const [a, b, c] = pick(pool);
  const ask = pick(["a", "b", "c"] as const);
  if (ask === "c") {
    return {
      type: "geometry.pythagoras",
      prompt: `直角三角形两条直角边为 $${a}$ 与 $${b}$。斜边长是多少？`,
      answer: String(c),
      publicParams: { a, b, c },
    };
  }
  if (ask === "a") {
    return {
      type: "geometry.pythagoras",
      prompt: `直角三角形一条直角边为 $${b}$，斜边为 $${c}$。另一条直角边长是多少？`,
      answer: String(a),
      publicParams: { a, b, c },
    };
  }
  return {
    type: "geometry.pythagoras",
    prompt: `直角三角形一条直角边为 $${a}$，斜边为 $${c}$。另一条直角边长是多少？`,
    answer: String(b),
    publicParams: { a, b, c },
  };
};

/* ───────── Algebra / misc attention ───────── */

const algebraLinear: Gen = () => {
  const x = randInt(2, 15);
  const a = randInt(2, 7);
  const b = randInt(1, 20);
  const rhs = a * x + b;
  return {
    type: "algebra.linear",
    prompt: `解方程 $${a}x + ${b} = ${rhs}$，求 $x$。`,
    answer: String(x),
    publicParams: { a, b, x },
  };
};

const algebraMean: Gen = () => {
  const nums = Array.from({ length: 4 }, () => randInt(2, 20));
  const sum = nums.reduce((a, b) => a + b, 0);
  // Ask for number to add to make mean m
  const m = randInt(5, 15);
  // (sum + x)/5 = m → x = 5m - sum
  const x = 5 * m - sum;
  return {
    type: "algebra.mean",
    prompt: `四个数 $${nums.join(", ")}$。再添一个数，使这五个数的平均值为 $${m}$。添的数是多少？`,
    answer: String(x),
    publicParams: { nums, m, x },
  };
};

const algebraFactorial: Gen = () => {
  const n = randInt(4, 7);
  return {
    type: "algebra.factorial",
    prompt: `计算 $${n}!$。`,
    answer: String(factorial(n)),
    publicParams: { n },
  };
};

const algebraPercent: Gen = () => {
  const base = randInt(40, 200);
  const p = pick([10, 15, 20, 25, 30, 40, 50]);
  return {
    type: "algebra.percent",
    prompt: `$${base}$ 的 $${p}\\%$ 是多少？`,
    answer: String((base * p) / 100),
    publicParams: { base, p },
  };
};

const matrixDet2: Gen = () => {
  const a = randInt(1, 6);
  const b = randInt(0, 6);
  const c = randInt(0, 6);
  const d = randInt(1, 6);
  const det = a * d - b * c;
  return {
    type: "algebra.det2",
    prompt: `计算行列式 $\\begin{vmatrix} ${a} & ${b} \\\\ ${c} & ${d} \\end{vmatrix}$。`,
    answer: String(det),
    publicParams: { a, b, c, d, det },
  };
};

/* ───────── Pools ───────── */

const ALL: Gen[] = [
  coinFlipInsight,
  chessboardInsight,
  sumModInsight,
  handshakeInsight,
  modularCrt,
  modularRemainder,
  modularPower,
  lastDigit,
  sequenceRecurrence,
  sequenceArithmetic,
  sequenceGeometric,
  sequenceFibonacciLike,
  sequenceDigitSum,
  combinatoricsLattice,
  combinatoricsChoose,
  combinatoricsPermute,
  combinatoricsSubset,
  combinatoricsHandshake,
  combinatoricsPascal,
  graphPathCount,
  graphDegreeSum,
  tournamentGames,
  logicLinear,
  logicAges,
  logicChickens,
  logicGcdLcm,
  logicDivisors,
  logicPigeonhole,
  geometryTriangle,
  geometryIsosceles,
  geometryRectangle,
  geometryArea,
  geometryParallel,
  geometryCircle,
  geometryPythagorean,
  algebraLinear,
  algebraMean,
  algebraFactorial,
  algebraPercent,
  matrixDet2,
];

const THOUGHTFUL: Gen[] = [
  geometryTriangle,
  geometryRectangle,
  geometryArea,
  geometryIsosceles,
  combinatoricsLattice,
  combinatoricsSubset,
  combinatoricsHandshake,
  modularRemainder,
  sequenceArithmetic,
  sequenceDigitSum,
  algebraLinear,
  algebraPercent,
  logicAges,
  logicPigeonhole,
  lastDigit,
];

const MATHEMATICAL: Gen[] = [
  modularCrt,
  modularPower,
  lastDigit,
  coinFlipInsight,
  chessboardInsight,
  handshakeInsight,
  sequenceRecurrence,
  sequenceFibonacciLike,
  sequenceGeometric,
  combinatoricsLattice,
  combinatoricsChoose,
  combinatoricsPascal,
  combinatoricsPermute,
  graphDegreeSum,
  tournamentGames,
  logicChickens,
  logicGcdLcm,
  logicDivisors,
  geometryPythagorean,
  geometryCircle,
  geometryParallel,
  algebraMean,
  algebraFactorial,
  matrixDet2,
  sumModInsight,
];

const DEEP: Gen[] = [
  modularCrt,
  modularPower,
  coinFlipInsight,
  chessboardInsight,
  sumModInsight,
  handshakeInsight,
  sequenceRecurrence,
  combinatoricsChoose,
  combinatoricsPermute,
  combinatoricsPascal,
  graphPathCount,
  logicLinear,
  logicGcdLcm,
  geometryPythagorean,
  geometryCircle,
  matrixDet2,
  lastDigit,
];

export function generatePuzzle(difficulty: PuzzleDifficulty): PuzzleInstance {
  const pool =
    difficulty === "thoughtful"
      ? THOUGHTFUL
      : difficulty === "mathematical"
        ? MATHEMATICAL
        : DEEP;
  // Strict pools only — never dip into ALL (refresh must keep difficulty).
  const gen = pick(pool);
  return gen(difficulty);
}

/** Exposed for tests / diagnostics. */
export function puzzleCatalogSize(): number {
  return ALL.length;
}

export function normalizeAnswer(input: string): string {
  const raw = input.trim().replace(/\s+/g, " ");
  const upper = raw.toUpperCase();
  if (
    upper === "YES" ||
    upper === "Y" ||
    raw === "是" ||
    raw === "对" ||
    raw === "可以"
  ) {
    return "YES";
  }
  if (
    upper === "NO" ||
    upper === "N" ||
    raw === "否" ||
    raw === "不" ||
    raw === "不可以"
  ) {
    return "NO";
  }
  // Allow "12.0" style for half-integer areas written as 12.0 — normalize ints
  if (/^-?\d+(\.0+)?$/.test(raw)) {
    return String(Number(raw));
  }
  return upper;
}
