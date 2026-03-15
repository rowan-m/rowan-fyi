import sonarjs from "eslint-plugin-sonarjs";
import baseConfig from "./eslint.config.js";

export default [
  ...baseConfig,
  sonarjs.configs.recommended,
  {
    // A generous set of rules for sonarjs; these can be narrowed down later.
    rules: {
      "sonarjs/cognitive-complexity": ["warn", 25],
      "sonarjs/no-duplicate-string": ["warn", { threshold: 5 }],
      "sonarjs/no-collapsible-if": "warn",
      "sonarjs/no-identical-functions": "warn",
    },
  },
];
