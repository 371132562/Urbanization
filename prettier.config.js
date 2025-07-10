export default {
  printWidth: 100, // 每行代码的最大长度，超过则自动换行
  useTabs: false, // 是否使用tab缩进，false表示使用空格
  singleQuote: true, // 是否使用单引号
  semi: false, // 是否使用分号
  trailingComma: 'none', // 逗号风格，all表示在对象、数组等结构的末尾都加逗号
  bracketSpacing: true, // 对象字面量的大括号间是否加空格
  bracketSameLine: false,
  arrowParens: 'avoid', // 箭头函数的参数是否总是用括号包裹
  quoteProps: 'as-needed', // 对象属性名是否加引号，as-needed表示只有在必要时才加
  singleAttributePerLine: true,
  htmlWhitespaceSensitivity: 'strict', // 处理HTML中的空白字符的方式，css表示类似CSS的处理
  endOfLine: 'lf', // 文件结尾的行尾符，lf表示Unix风格的换行符
  jsxBracketSameLine: false,
  vueIndentScriptAndStyle: true,
  plugins: ['prettier-plugin-tailwindcss'],
  tailwindStylesheet: './frontend/src/index.css'
}
