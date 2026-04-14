const NON_ADVISORY_PREAMBLE = `IMPORTANT: You are a research assistant providing educational information only. Your analysis does NOT constitute financial advice, investment recommendations, or solicitations to buy or sell securities. All information is for research and educational purposes. Users should consult with a qualified financial advisor before making investment decisions.

`;

export const COMMANDS = {
  'analyze-portfolio': {
    label: 'Analyze Portfolio',
    description: 'Deep analysis of portfolio composition, risk, and opportunities',
    prompt: (context: string) =>
      NON_ADVISORY_PREAMBLE +
      `Analyze the following portfolio and provide insights on:\n1. Overall composition and diversification\n2. Sector concentration risks\n3. Correlation between holdings\n4. Key metrics and observations\n\nPortfolio data:\n${context}`,
  },
  'research-company': {
    label: 'Research Company',
    description: 'Fundamental analysis of a specific company',
    prompt: (context: string) =>
      NON_ADVISORY_PREAMBLE +
      `Provide a comprehensive research summary for ${context}, including:\n1. Business overview and competitive position\n2. Key financial metrics and trends\n3. Growth drivers and risks\n4. Industry context and peers\n5. Recent developments`,
  },
  'research-fund': {
    label: 'Research Fund/ETF',
    description: 'Analysis of an ETF or fund structure',
    prompt: (context: string) =>
      NON_ADVISORY_PREAMBLE +
      `Provide a detailed analysis of the fund/ETF ${context}, including:\n1. Fund structure and objective\n2. Top holdings and sector allocation\n3. Expense ratio and tracking performance\n4. Historical returns and risk metrics\n5. How it compares to peers`,
  },
  'compare-versions': {
    label: 'Compare Versions',
    description: 'AI-assisted comparison of two portfolio versions',
    prompt: (context: string) =>
      NON_ADVISORY_PREAMBLE +
      `Compare these two portfolio versions and provide insights:\n${context}\n\nFocus on:\n1. Key differences in positioning\n2. Risk profile changes\n3. What the changes suggest about strategy\n4. Potential implications`,
  },
  'benchmark-review': {
    label: 'Benchmark Review',
    description: 'Compare portfolio performance against a benchmark',
    prompt: (context: string) =>
      NON_ADVISORY_PREAMBLE +
      `Review this portfolio's performance relative to its benchmark:\n${context}\n\nAnalyze:\n1. Relative performance (alpha/beta)\n2. Tracking error and divergence points\n3. Sector attribution\n4. Risk-adjusted returns`,
  },
  'recommendation-mode': {
    label: 'Recommendation Mode',
    description: 'Hypothetical trade suggestions (requires opt-in)',
    prompt: (context: string) =>
      `⚠️ DISCLAIMER: The following are HYPOTHETICAL suggestions for EDUCATIONAL AND RESEARCH PURPOSES ONLY. These do NOT constitute financial advice or recommendations. Past performance does not guarantee future results. Always do your own research and consult a financial advisor.\n\n` +
      `Based on the following portfolio context, suggest hypothetical adjustments and explain your reasoning:\n${context}`,
  },
} as const;

export type CommandKey = keyof typeof COMMANDS;
export const COMMAND_KEYS = Object.keys(COMMANDS) as CommandKey[];
