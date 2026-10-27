declare module "vader-sentiment" {
  export type PolarityScores = { neg: number; neu: number; pos: number; compound: number };
  const vader: {
    SentimentIntensityAnalyzer: { polarity_scores(text: string): PolarityScores };
  };
  export default vader;
}
