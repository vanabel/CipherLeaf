# CipherLeaf 挑战题库人工审核稿（大学数学专业 · 全量替换）

命名：**启封 / 推演 / 穷理**。答案禁止 YES/NO；以整数、既约分数、短复数为主。
池大小： {"thoughtful":15,"mathematical":18,"deep":15}

建议标记：`OK` / `偏易` / `偏难` / `移出` / `改参数`。

## 启封 · thoughtful（约 30–90 秒）

题型数：**15**

### 1. `algebra.polynomial.complex_mod`

- 审核：_（空）_
- 例：已知多项式 P(x) 满足 P(x)\equiv 0x+5\pmod{x^2+1}. 求 P(i)（写成 a+bi 的形式，a,b\in\mathbb Z）。 〔答 5〕
- 例：已知多项式 P(x) 满足 P(x)\equiv 3x+4\pmod{x^2+1}. 求 P(i)（写成 a+bi 的形式，a,b\in\mathbb Z）。 〔答 4+3i〕

### 2. `analysis.derivative.inverse`

- 审核：_（空）_
- 例：若 f(4)=3，f'(4)=3，且 f 在邻域内可逆，求 (f^{-1})'(3). 〔答 1/3〕
- 例：若 f(4)=7，f'(4)=5，且 f 在邻域内可逆，求 (f^{-1})'(7). 〔答 1/5〕

### 3. `analysis.integral.symmetry`

- 审核：_（空）_
- 例：计算 \int_{-1}^{1}\bigl(x^5+3x^2+2\bigr)\,dx. 〔答 6〕
- 例：计算 \int_{-3}^{3}\bigl(x^5+3x^2+4\bigr)\,dx. 〔答 78〕

### 4. `analysis.limit.standard`

- 审核：_（空）_
- 例：计算 \lim_{x\to 0}\frac{e^{1x}-1-1x}{x^2}. 〔答 1/2〕
- 例：计算 \lim_{x\to 0}\frac{e^{3x}-1-3x}{x^2}. 〔答 9/2〕

### 5. `combinatorics.inclusion2`

- 审核：_（空）_
- 例：在 1,\dots,80 中，有多少个整数能被 3 或 5 整除？ 〔答 37〕
- 例：在 1,\dots,100 中，有多少个整数能被 4 或 5 整除？ 〔答 40〕

### 6. `combinatorics.words`

- 审核：_（空）_
- 例：用字母 A,A,B,B,C,C 排成长度为 6 的字符串，共有多少种不同排列？ 〔答 90〕
- 例：用字母 A,A,B,C,C 排成长度为 5 的字符串，共有多少种不同排列？ 〔答 30〕

### 7. `graph.degree.missing`

- 审核：_（空）_
- 例：一个简单图有 7 个顶点，其度数为 3,4,6,1,2,1,d. 若总边数为 9，求 d。 〔答 1〕
- 例：一个简单图有 8 个顶点，其度数为 1,2,5,1,2,1,1,d. 若总边数为 7，求 d。 〔答 1〕

### 8. `linearalgebra.det.structure`

- 审核：_（空）_
- 例：已知列向量 a,b,c\in\mathbb R^3 满足 \det(a,\,b,\,c)=11. 求 \det(a+b,\,b,\,c-a). 〔答 11〕
- 例：已知列向量 a,b,c\in\mathbb R^3 满足 \det(a,\,b,\,c)=7. 求 \det(a+b,\,b,\,c-a). 〔答 7〕

### 9. `linearalgebra.rank`

- 审核：_（空）_
- 例：求矩阵 A=\begin{pmatrix} 4 & 1 & 2 \\ 8 & 2 & 4 \\ 3 & 0 & 4 \end{pmatrix} 的秩。 〔答 2〕
- 例：求矩阵 A=\begin{pmatrix} 4 & 1 & 3 \\ 8 & 2 & 6 \\ 3 & 3 & 1 \end{pmatrix} 的秩。 〔答 2〕

### 10. `number.congruence.linear`

- 审核：_（空）_
- 例：求满足 13x\equiv 4\pmod{20} 的**最小正整数** x。 〔答 8〕
- 例：求满足 27x\equiv 27\pmod{30} 的**最小正整数** x。 〔答 1〕

### 11. `number.mod_inverse`

- 审核：_（空）_
- 例：求 19 在模 23 下的乘法逆元，取 1\le x<23。 〔答 17〕
- 例：求 9 在模 19 下的乘法逆元，取 1\le x<19。 〔答 17〕

### 12. `number.valuation`

- 审核：_（空）_
- 例：80! 中因子 2 的最高次数（即 v_{2}(80!)）是多少？ 〔答 78〕
- 例：100! 中因子 3 的最高次数（即 v_{3}(100!)）是多少？ 〔答 48〕

### 13. `probability.hypergeom.small`

- 审核：_（空）_
- 例：一个袋中有 6 个红球、4 个蓝球，不放回抽取 2 个。恰好抽到一个红球的概率是多少？（写成分数。） 〔答 8/15〕
- 例：一个袋中有 5 个红球、4 个蓝球，不放回抽取 2 个。恰好抽到一个红球的概率是多少？（写成分数。） 〔答 5/9〕

### 14. `sequence.telescoping`

- 审核：_（空）_
- 例：计算 \sum_{k=1}^{7}\frac{1}{k(k+1)}. （写成分数。） 〔答 7/8〕
- 例：计算 \sum_{k=1}^{6}\frac{1}{k(k+1)}. （写成分数。） 〔答 6/7〕

### 15. `set.cardinality.ie`

- 审核：_（空）_
- 例：|A|=19，|B|=19，|A\cup B|=24。求 |A\cap B|。 〔答 14〕
- 例：|A|=22，|B|=18，|A\cup B|=37。求 |A\cap B|。 〔答 3〕

## 推演 · mathematical（约 2–5 分钟）

题型数：**18**

### 1. `algebra.group.order`

- 审核：_（空）_
- 例：在对称群 S_{7} 中，置换 (1\,2\,3)(4\,5\,6\,7) 的阶是多少？ 〔答 12〕
- 例：在对称群 S_{7} 中，置换 (1\,2\,3)(4\,5\,6\,7) 的阶是多少？ 〔答 12〕

### 2. `analysis.integral.parameter`

- 审核：_（空）_
- 例：求 \int_0^1 x(1-x)^{4}\,dx. （写成分数。） 〔答 1/30〕
- 例：求 \int_0^1 x(1-x)^{6}\,dx. （写成分数。） 〔答 1/56〕

### 3. `analysis.limit.parameter`

- 审核：_（空）_
- 例：求实数 a，使 \lim_{x\to 0}\frac{\sin x-x+a x^3}{x^3}=0. 〔答 1/6〕
- 例：求实数 a，使 \lim_{x\to 0}\frac{\sin x-x+a x^3}{x^3}=0. 〔答 1/6〕

### 4. `analysis.recursive.integral`

- 审核：_（空）_
- 例：设 I_n=\int_0^{\pi/2}\sin^n x\,dx. 已知 I_2=\pi/4，求 I_6/I_2（写成分数）。 〔答 5/16〕
- 例：设 I_n=\int_0^{\pi/2}\sin^n x\,dx. 已知 I_2=\pi/4，求 I_6/I_2（写成分数）。 〔答 5/16〕

### 5. `combinatorics.circular`

- 审核：_（空）_
- 例：5 个人围圆桌而坐，若其中两人 A 与 B 不相邻，共有多少种坐法？（旋转视为相同，镜面翻转视为不同。） 〔答 12〕
- 例：5 个人围圆桌而坐，若其中两人 A 与 B 不相邻，共有多少种坐法？（旋转视为相同，镜面翻转视为不同。） 〔答 12〕

### 6. `combinatorics.noadjacent`

- 审核：_（空）_
- 例：从 \{1,\dots,11\} 中选出 4 个数，使任意两个都不相邻，共有多少种选法？ 〔答 70〕
- 例：从 \{1,\dots,11\} 中选出 3 个数，使任意两个都不相邻，共有多少种选法？ 〔答 84〕

### 7. `combinatorics.surjection.small`

- 审核：_（空）_
- 例：将 5 个不同的球放入 3 个不同的盒子，并要求每个盒子至少一个球，共有多少种方法？ 〔答 150〕
- 例：将 5 个不同的球放入 3 个不同的盒子，并要求每个盒子至少一个球，共有多少种方法？ 〔答 150〕

### 8. `complex.roots.sum`

- 审核：_（空）_
- 例：方程 z^{5}=1 的所有**非实**根之和是多少？ 〔答 -1〕
- 例：方程 z^{7}=1 的所有**非实**根之和是多少？ 〔答 -1〕

### 9. `graph.tree.leaves`

- 审核：_（空）_
- 例：一棵有 10 个顶点的树恰有 2 个度数为 4 的顶点，其余非叶顶点度数均为 2。求叶子数。 〔答 6〕
- 例：一棵有 12 个顶点的树恰有 2 个度数为 4 的顶点，其余非叶顶点度数均为 2。求叶子数。 〔答 6〕

### 10. `graph.walks.matrix`

- 审核：_（空）_
- 例：图的邻接矩阵为 A=\begin{pmatrix} 0 & 1 & 1 \\ 1 & 0 & 1 \\ 1 & 1 & 0 \end{pmatrix}. 从顶点 1 出发经过恰好 4 条边回到顶点 1 的游走有多少条？ 〔答 6〕
- 例：图的邻接矩阵为 A=\begin{pmatrix} 0 & 1 & 1 \\ 1 & 0 & 1 \\ 1 & 1 & 0 \end{pmatrix}. 从顶点 1 出发经过恰好 3 条边回到顶点 1 的游走有多少条？ 〔答 2〕

### 11. `linearalgebra.kernel.intersection`

- 审核：_（空）_
- 例：在 \mathbb R^{4} 中， V=\{x:x_1+x_2+\cdots+x_{4}=0,\quad x_1-x_2=0\}. 求 \dim V。（两约束线性无关。） 〔答 2〕
- 例：在 \mathbb R^{4} 中， V=\{x:x_1+x_2+\cdots+x_{4}=0,\quad x_1-x_2=0\}. 求 \dim V。（两约束线性无关。） 〔答 2〕

### 12. `linearalgebra.matrixpower`

- 审核：_（空）_
- 例：设 A=\begin{pmatrix} 1 & 1 \\ 0 & 1 \end{pmatrix}. 求 A^{20} 的右上角元素。 〔答 20〕
- 例：设 A=\begin{pmatrix} 3 & 2 \\ 0 & 3 \end{pmatrix}. 求 A^{22} 的右上角元素。 〔答 460255540932〕

### 13. `linearalgebra.traceeigen`

- 审核：_（空）_
- 例：一个 3\times 3 实矩阵的特征值为 2,-1,\lambda，且 \operatorname{tr}(A^2)=14。若 \lambda>0，求 \lambda。 〔答 3〕
- 例：一个 3\times 3 实矩阵的特征值为 2,-1,\lambda，且 \operatorname{tr}(A^2)=14。若 \lambda>0，求 \lambda。 〔答 3〕

### 14. `number.crt.hidden`

- 审核：_（空）_
- 例：求最小正整数 n，使 n+1\equiv 0\pmod{5},\qquad n+2\equiv 0\pmod{7},\qquad n+3\equiv 0\pmod{8}. 〔答 229〕
- 例：求最小正整数 n，使 n+1\equiv 0\pmod{5},\qquad n+2\equiv 0\pmod{7},\qquad n+3\equiv 0\pmod{8}. 〔答 229〕

### 15. `number.order`

- 审核：_（空）_
- 例：求 3 在模 11 乘法群 (\mathbb Z/11\mathbb Z)^\times 中的阶。 〔答 5〕
- 例：求 3 在模 17 乘法群 (\mathbb Z/17\mathbb Z)^\times 中的阶。 〔答 16〕

### 16. `number.squaremod`

- 审核：_（空）_
- 例：求满足 x^2\equiv 1\pmod{24},\qquad 0\le x<24 的所有 x 之和。 〔答 96〕
- 例：求满足 x^2\equiv 1\pmod{24},\qquad 0\le x<24 的所有 x 之和。 〔答 96〕

### 17. `polynomial.vieta`

- 审核：_（空）_
- 例：首一三次多项式的三个根为 a,b,c，满足 a+b+c=6,\qquad ab+bc+ca=1. 求 a^2+b^2+c^2。 〔答 34〕
- 例：首一三次多项式的三个根为 a,b,c，满足 a+b+c=2,\qquad ab+bc+ca=3. 求 a^2+b^2+c^2。 〔答 -2〕

### 18. `probability.conditioning`

- 审核：_（空）_
- 例：连续掷两枚公平骰子。已知点数和为偶数，求点数和为 8 的条件概率。（写成分数。） 〔答 5/18〕
- 例：连续掷两枚公平骰子。已知点数和为偶数，求点数和为 8 的条件概率。（写成分数。） 〔答 5/18〕

## 穷理 · deep（约 5–15 分钟）

题型数：**15**

### 1. `analysis.functional.iteration`

- 审核：_（空）_
- 例：连续函数 f:\mathbb R\to\mathbb R 满足 f(x)+2f(1-x)=x^2+1. 求 f(0)。 〔答 1〕
- 例：连续函数 f:\mathbb R\to\mathbb R 满足 f(x)+2f(1-x)=x^2+1. 求 f(0)。 〔答 1〕

### 2. `analysis.integral.symmetry2`

- 审核：_（空）_
- 例：计算 I=\int_0^1\frac{x^3}{x^3+(1-x)^3}\,dx. 〔答 1/2〕
- 例：计算 I=\int_0^1\frac{x^3}{x^3+(1-x)^3}\,dx. 〔答 1/2〕

### 3. `combinatorics.burnside.necklace`

- 审核：_（空）_
- 例：用 3 个红珠、3 个蓝珠组成一个圆形项链，只把旋转视为相同（翻转视为不同），问有多少种不同项链？ 〔答 4〕
- 例：用 3 个红珠、3 个蓝珠组成一个圆形项链，只把旋转视为相同（翻转视为不同），问有多少种不同项链？ 〔答 4〕

### 4. `combinatorics.derangement.partial`

- 审核：_（空）_
- 例：7 个人各有一顶帽子。随机重新分配帽子，要求**恰好**有 2 个人拿到自己的帽子。这样的分配共有多少种？ 〔答 924〕
- 例：8 个人各有一顶帽子。随机重新分配帽子，要求**恰好**有 2 个人拿到自己的帽子。这样的分配共有多少种？ 〔答 7420〕

### 5. `combinatorics.grid.forbidden`

- 审核：_（空）_
- 例：从 (0,0) 走到 (8,5)，每步只能向右或向上一格，且路径不得经过 (2,2)。共有多少条最短路径？ 〔答 783〕
- 例：从 (0,0) 走到 (6,6)，每步只能向右或向上一格，且路径不得经过 (3,3)。共有多少条最短路径？ 〔答 524〕

### 6. `graph.spanningtree`

- 审核：_（空）_
- 例：完全图 K_4 删除一条边后，有多少棵生成树？ 〔答 8〕
- 例：完全图 K_4 删除一条边后，有多少棵生成树？ 〔答 8〕

### 7. `group.homomorphism`

- 审核：_（空）_
- 例：群同态 \varphi:\mathbb Z_{8}\to\mathbb Z_{12} 共有多少个？ 〔答 4〕
- 例：群同态 \varphi:\mathbb Z_{9}\to\mathbb Z_{15} 共有多少个？ 〔答 3〕

### 8. `linearalgebra.commutant`

- 审核：_（空）_
- 例：求所有满足 AX=XA 的 2\times 2 实矩阵 X 所成向量空间的维数，其中 A=\begin{pmatrix} 1 & 1 \\ 0 & 1 \end{pmatrix}. 〔答 2〕
- 例：求所有满足 AX=XA 的 2\times 2 实矩阵 X 所成向量空间的维数，其中 A=\begin{pmatrix} 1 & 1 \\ 0 & 1 \end{pmatrix}. 〔答 2〕

### 9. `linearalgebra.projection`

- 审核：_（空）_
- 例：设 P,Q 均为 \mathbb R^7 上的投影算子（P^2=P，Q^2=Q），满足 PQ=QP=0，\operatorname{tr}P=2，\operatorname{tr}Q=3。求 \dim(\ker P\cap\ker Q)。 〔答 2〕
- 例：设 P,Q 均为 \mathbb R^7 上的投影算子（P^2=P，Q^2=Q），满足 PQ=QP=0，\operatorname{tr}P=2，\operatorname{tr}Q=3。求 \dim(\ker P\cap\ker Q)。 〔答 2〕

### 10. `number.crt.divisibility`

- 审核：_（空）_
- 例：求最小正整数 n，满足 n\equiv 1\pmod{4},\qquad n\equiv 2\pmod{5},\qquad n\equiv 3\pmod{7}, 并且 11\mid n。 〔答 297〕
- 例：求最小正整数 n，满足 n\equiv 1\pmod{4},\qquad n\equiv 2\pmod{5},\qquad n\equiv 3\pmod{7}, 并且 11\mid n。 〔答 297〕

### 11. `number.divisors.square`

- 审核：_（空）_
- 例：求最小正整数 n，使 n 恰好有 15 个正因数。 〔答 144〕
- 例：求最小正整数 n，使 n 恰好有 15 个正因数。 〔答 144〕

### 12. `number.trailing.factorial`

- 审核：_（空）_
- 例：考虑 25! 的十进制表示。去掉末尾所有连续的零之后，所得整数的个位数是多少？ 〔答 4〕
- 例：考虑 25! 的十进制表示。去掉末尾所有连续的零之后，所得整数的个位数是多少？ 〔答 4〕

### 13. `polynomial.interpolation`

- 审核：_（空）_
- 例：已知三次多项式 P 满足 P(0)=1,\quad P(1)=5,\quad P(2)=25,\quad P(3)=73. 求 P(6)。 〔答 505〕
- 例：已知三次多项式 P 满足 P(0)=5,\quad P(1)=5,\quad P(2)=13,\quad P(3)=35. 求 P(6)。 〔答 245〕

### 14. `probability.expected.stopping`

- 审核：_（空）_
- 例：反复独立掷公平硬币，直到第一次出现连续两个正面为止。停止时掷硬币次数的期望是多少？ 〔答 6〕
- 例：反复独立掷公平硬币，直到第一次出现连续两个正面为止。停止时掷硬币次数的期望是多少？ 〔答 6〕

### 15. `probability.randomwalk`

- 审核：_（空）_
- 例：一只粒子从整数点 1 出发，每步以 1/2 的概率向左或向右移动 1。到达 0 或 8 时停止。到达 8 **之前**先到达 0 的概率是多少？（写成分数。） 〔答 7/8〕
- 例：一只粒子从整数点 1 出发，每步以 1/2 的概率向左或向右移动 1。到达 0 或 8 时停止。到达 8 **之前**先到达 0 的概率是多少？（写成分数。） 〔答 7/8〕

