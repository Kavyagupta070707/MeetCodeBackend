export const PROBLEM_POOL = [
  {
    id: "two-sum",
    title: "Two Sum",
    difficulty: "easy",
  },
  {
    id: "reverse-string",
    title: "Reverse String",
    difficulty: "easy",
  },
  {
    id: "valid-palindrome",
    title: "Valid Palindrome",
    difficulty: "easy",
  },
  {
    id: "maximum-subarray",
    title: "Maximum Subarray",
    difficulty: "medium",
  },
  {
    id: "container-with-most-water",
    title: "Container With Most Water",
    difficulty: "medium",
  },
  {
    id: "trapping-rain-water",
    title: "Trapping Rain Water",
    difficulty: "hard",
  },
];

export function getRandomProblemByDifficulty(difficulty) {
  const matches = PROBLEM_POOL.filter((problem) => problem.difficulty === difficulty);

  if (matches.length === 0) return null;

  return matches[Math.floor(Math.random() * matches.length)];
}
