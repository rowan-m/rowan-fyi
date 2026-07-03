/** @type {import('prettier').Config} */
export default {
  printWidth: 120,
  plugins: ["prettier-plugin-astro", "prettier-plugin-packagejson"],
  overrides: [
    {
      files: "*.astro",
      options: {
        parser: "astro",
      },
    },
  ],
};
