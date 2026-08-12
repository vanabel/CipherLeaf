/**
 * Memorable math passphrases: Name-Year landmarks.
 * Years mark a notable paper, theorem, or historical moment — not birth years.
 */
const MATH_PHRASES = [
  "Gauss-1827", // Disquisitiones generales circa superficies curvas
  "Riemann-1854", // Habilitationsvortrag / manifold geometry
  "Galois-1832", // night-before-duel letter
  "Cauchy-1821", // Cours d'analyse
  "Abel-1824", // impossibility of quintic
  "Fourier-1822", // Théorie analytique de la chaleur
  "Euler-1748", // Introductio in analysin infinitorum
  "Newton-1687", // Principia
  "Leibniz-1684", // Nova methodus (calculus)
  "Lagrange-1788", // Mécanique analytique
  "Laplace-1799", // Traité de mécanique céleste
  "Hilbert-1900", // 23 problems
  "Poincare-1904", // conjecture posed
  "Cantor-1874", // uncountability of continuum
  "Dedekind-1872", // Stetigkeit und irrationale Zahlen
  "Noether-1921", // Idealtheorie in Ringbereichen
  "Grothendieck-1960", // Éléments de géométrie algébrique era
  "Weil-1949", // Weil conjectures
  "Serre-1955", // FAC / GAGA period
  "Atiyah-1963", // Atiyah–Singer index theorem
  "Milnor-1956", // exotic 7-spheres
  "Thurston-1982", // geometrization conjecture
  "Perelman-2002", // Ricci flow / Poincaré
  "Wiles-1995", // Fermat's Last Theorem
  "Deligne-1974", // Weil conjectures proved
  "Kodaira-1954", // classification / vanishing
  "Chern-1946", // characteristic classes paper trail
  "Cartan-1945", // exterior differential systems era
  "Hopf-1931", // Hopf fibration
  "Bott-1959", // periodicity
  "Smale-1961", // h-cobordism / Poincaré in high dim
  "Donaldson-1983", // 4-manifolds
  "Freedman-1982", // 4D Poincaré
  "Nash-1951", // C1 isometric embedding
  "Moser-1965", // Nash–Moser / volume forms
  "Arnold-1963", // KAM / small denominators lectures
  "Kolmogorov-1954", // KAM theorem
  "Siegel-1942", // analytic number theory / several complex vars
  "Zariski-1944", // algebraic geometry foundations
  "Mumford-1965", // Geometric Invariant Theory
  "Hironaka-1964", // resolution of singularities
  "Artin-1927", // class field / L-functions
  "Tate-1950", // thesis / rigid analytic ideas later
  "Langlands-1967", // letter to Weil
  "Shimura-1958", // complex multiplication / modular forms
  "Taniyama-1955", // modularity conjecture seeds
  "Faltings-1983", // Mordell conjecture
  "Bombieri-1974", // higher-dimensional geometry / numbers
  "Szemeredi-1975", // arithmetic progressions
  "Erdos-1946", // probabilistic method landmark years vary; 1947 also
  "Hardy-1914", // Ramanujan collaboration begins
  "Ramanujan-1913", // letter to Hardy
  "Banach-1922", // foundations of functional analysis
  "Hausdorff-1914", // Grundzüge der Mengenlehre
  "Lebesgue-1902", // Intégrale, longueur, aire
  "Frechet-1906", // metric spaces thesis
  "Brouwer-1911", // fixed-point / dimension
  "Weyl-1918", // Raum, Zeit, Materie / gauge seeds
  "Klein-1872", // Erlangen program
  "Lie-1873", // continuous transformation groups
  "Jordan-1870", // traité des substitutions
  "Sylvester-1852", // invariant theory papers
  "Cayley-1854", // matrices / trees / invariants
  "Boole-1854", // Laws of Thought
  "DeMorgan-1847", // Formal Logic
  "Pascal-1654", // correspondence with Fermat on probability
  "Fermat-1637", // margin note era (approx.)
  "Descartes-1637", // La Géométrie
  "Euclid-300BC", // Elements (symbolic year token)
  "Archimedes-250BC",
  "Pythagoras-500BC",
  "Hypatia-400", // late antique Alexandria (approx.)
  "AlKhwarizmi-820", // algebra
  "OmarKhayyam-1070", // cubic geometry
  "Fibonacci-1202", // Liber Abaci
  "Cardano-1545", // Ars Magna
  "Viete-1591", // symbolic algebra
  "Bernoulli-1713", // Ars Conjectandi
  "Stokes-1854", // Stokes' theorem letter/context
  "Green-1828", // Essay on Mathematical Analysis
  "Maxwell-1865", // electromagnetic field equations
  "Gibbs-1873", // graphical thermodynamics / vectors later
  "Clifford-1878", // geometric algebra
  "Grassmann-1844", // Ausdehnungslehre
  "Hamilton-1843", // quaternions
  "Godel-1931", // incompleteness
  "Turing-1936", // On Computable Numbers
  "Church-1936", // lambda calculus / Entscheidungsproblem
  "vonNeumann-1932", // mathematical foundations of QM
  "Shannon-1948", // A Mathematical Theory of Communication
  "Kolmogorov-1965", // complexity (algorithmic)
  "Mandelbrot-1982", // The Fractal Geometry of Nature
  "Lorenz-1963", // deterministic nonperiodic flow
  "Feigenbaum-1978", // period doubling
  "Thom-1972", // Stabilité structurelle et morphogenèse
  "Smale-1967", // horseshoe / dynamical systems
  "Yau-1978", // Calabi conjecture
  "Schoen-1979", // positive mass (with Yau)
  "Uhlenbeck-1982", // gauge theory bubbling
  "Taubes-1982", // gauge theory / 4-manifolds
  "Donaldson-1990", // Floer / instantons era marker
  "Witten-1989", // TQFT / Jones polynomial
  "Jones-1984", // knot polynomial
  "Vafa-1990", // mirror symmetry wave
  "Kontsevich-1994", // deformation quantization / mirrors
  "Drinfeld-1986", // quantum groups
  "Jimbo-1985", // Yang–Baxter / quantum groups
  "Kashiwara-1970", // D-modules
  "Sato-1958", // hyperfunctions
  "Poincare-1895", // Analysis Situs
] as const;

const PHRASES: string[] = Array.from(new Set(MATH_PHRASES));

export function randomMathPassphrase(exclude?: string): string {
  if (PHRASES.length === 0) return "Gauss-1827";
  let pick = PHRASES[Math.floor(Math.random() * PHRASES.length)];
  if (exclude && PHRASES.length > 1) {
    let guard = 0;
    while (pick === exclude && guard++ < 8) {
      pick = PHRASES[Math.floor(Math.random() * PHRASES.length)];
    }
  }
  return pick;
}

export function mathPassphraseCount(): number {
  return PHRASES.length;
}
