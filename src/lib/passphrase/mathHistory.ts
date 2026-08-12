/** Short math-history teasers for the reader Gate page. */

export type MathHistoryNote = {
  id: string;
  text: string;
};

const NOTES: MathHistoryNote[] = [
  {
    id: "gauss-1827",
    text: "1827 年，高斯在《曲面的一般研究》里写下曲率：不必离开曲面，也能谈论它的弯曲。CipherLeaf 的口令常写成 Gauss-1827，纪念这种“内在地看见结构”的时刻。",
  },
  {
    id: "riemann-1854",
    text: "1854 年，黎曼的就职演讲几乎重写了“空间”一词。后来的口令 Riemann-1854，提醒读者：进入一篇手稿之前，先换一副几何的眼睛。",
  },
  {
    id: "galois-1832",
    text: "1832 年，伽罗瓦在决斗前夜把群论的种子写进信件。数学史里，最紧要的思想有时只留给愿意停下来读完一页的人。",
  },
  {
    id: "euclid",
    text: "欧几里得的《原本》以公设开门：先接受几句短短的约定，再进入漫长的证明。门禁题也是一种约定——用片刻注意力，换取继续阅读的资格。",
  },
  {
    id: "hilbert-1900",
    text: "1900 年，希尔伯特列出二十三个问题，把二十世纪的数学变成一场公开的远征。有些门，不是锁，而是路标。",
  },
  {
    id: "noether-1921",
    text: "1921 年前后，诺特把“对称”写成守恒律的语言。口令里的 Noether，不是装饰，而是提醒：结构一变，表象也会随之改写。",
  },
  {
    id: "fermat-margin",
    text: "费马曾在页边写下“证明太长，此处写不下”。三百年后人们仍为那句话着迷——有时，真正的内容就在愿意停留的人手里。",
  },
  {
    id: "euler-bridges",
    text: "欧拉面对柯尼斯堡七桥，问的不是“怎么走”，而是“什么样的走法根本不存在”。好的谜题，常常先改写问题本身。",
  },
  {
    id: "cantor-1874",
    text: "1874 年，康托尔证明实数不可数：无穷也可以分层次。读一篇加密手稿前先解一题，不过是在有限的时间里，认真对待一次无限的好奇。",
  },
  {
    id: "turing-1936",
    text: "1936 年，图灵用抽象机器划出可计算的边界。CipherLeaf 的挑战不是考速度，而是问：你是否愿意完成一次有限而清醒的步骤。",
  },
  {
    id: "wiles-1995",
    text: "1995 年，怀尔斯补全费马大定理的证明。漫长的道路往往从一个看起来“太简单”的问题开始——像一道只要几分钟的门禁题。",
  },
  {
    id: "perelman-2002",
    text: "佩雷尔曼把庞加莱猜想写成论文，放上预印本网站，几乎不收掌声。有些知识，本来就希望只被认真的读者打开。",
  },
  {
    id: "hypatia",
    text: "古典晚期的亚历山大，希帕提娅在讲堂里注释《圆锥曲线》。数学的传递，从来依赖愿意坐下来听完一堂课的人。",
  },
  {
    id: "al-khwarizmi",
    text: "花拉子米的《代数学》让“还原与对消”成为方法。口令与谜题也是一种还原：去掉噪声，留下你真正要进入的文本。",
  },
  {
    id: "ramanujan-1913",
    text: "1913 年，拉马努金写信给哈代，信里几乎全是公式。有人靠一封信打开剑桥的门；这里，靠一道题打开阅读的门。",
  },
  {
    id: "erdos",
    text: "爱尔特希常说证明来自“那本大书”。门禁题不在大书里，却分享同一精神：先想清楚，再往下翻页。",
  },
  {
    id: "grothendieck",
    text: "格罗滕迪克喜欢先把问题放进足够宽广的框架。解一道小谜题，有时也是在练习：把匆忙换成结构。",
  },
  {
    id: "archimedes",
    text: "阿基米德在沙盘上画圆，据说连罗马士兵的喝令都听不见。阅读需要一点这样的专注——哪怕只有两分钟。",
  },
];

/** Stable pick from token string so refresh doesn't jitter too wildly. */
export function mathHistoryForToken(token: string): MathHistoryNote {
  let h = 0;
  for (let i = 0; i < token.length; i++) {
    h = (h * 33 + token.charCodeAt(i)) >>> 0;
  }
  return NOTES[h % NOTES.length];
}

export function randomMathHistory(): MathHistoryNote {
  return NOTES[Math.floor(Math.random() * NOTES.length)];
}
