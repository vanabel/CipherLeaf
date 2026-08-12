import { generatePuzzle } from "../src/lib/puzzles/generator";

const difficulties = ["thoughtful", "mathematical", "deep"] as const;

for (const d of difficulties) {
  const p = generatePuzzle(d);
  console.log(`[${d}] ${p.type}`);
  console.log(p.prompt.slice(0, 120).replace(/\n/g, " "));
  console.log(`answer=${p.answer}`);
  console.log("---");
}
