import pluginSecurity from "eslint-plugin-security";
import pluginNoUnsanitized from "eslint-plugin-no-unsanitized";
import baseConfig from "./eslint.config.js";

export default [
  ...baseConfig,
  pluginSecurity.configs.recommended,
  pluginNoUnsanitized.configs.recommended,
  {
    // A generous set of rules for security; these can be narrowed down later.
    rules: {
      "security/detect-object-injection": "warn",
      "security/detect-non-literal-regexp": "warn",
      "no-unsanitized/method": "warn",
      "no-unsanitized/property": "warn",
    },
  },
];
