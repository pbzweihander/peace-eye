module.exports = {
  trailingComma: "es5",
  tabWidth: 2,
  semi: true,
  singleQuote: false,
  importOrder: ["^[./]"],
  importOrderSeparation: true,
  plugins: [require("prettier-plugin-tailwindcss")],
}
