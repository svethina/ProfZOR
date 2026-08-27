/** @type {import('vitest').UserConfig} */
module.exports = {
  test: {
    environment: "node",
    include: ["tests/**/*.test.js"],
    coverage: {
      provider: "v8",
      include: ["interview-logic.js"],
      reporter: ["text", "text-summary", "html"],
    },
  },
};
