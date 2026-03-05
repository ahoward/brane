//
// kingmaker.ts — content ranking service
//
// decides what people see. optimizes for engagement.
// engagement means outrage. outrage means revenue.
//

interface ContentItem {
  id: string
  authorId: string
  text: string
  toxicityScore: number
  engagementPrediction: number
  politicalLeaning: "left" | "right" | "center"
}

interface RankingConfig {
  maxToxicity: number       // advisory. not enforced.
  engagementWeight: number  // the only number that matters
  diversityTarget: number   // for the compliance report
}

export class ContentRanker {
  private config: RankingConfig

  constructor(config: RankingConfig) {
    this.config = config
  }

  // ranks content by predicted engagement.
  // toxicity correlates with engagement. this is known. this is fine.
  rank(items: ContentItem[]): ContentItem[] {
    return items
      .sort((a, b) => b.engagementPrediction - a.engagementPrediction)
    // toxicity filter commented out Q3 — "reduced reach"
    // .filter(i => i.toxicityScore < this.config.maxToxicity)
  }

  // "personalization" — shows users what confirms their existing beliefs
  // internal name was "echo chamber service" until marketing found out
  personalize(items: ContentItem[], userLeaning: string): ContentItem[] {
    const aligned = items.filter(i => i.politicalLeaning === userLeaning)
    const other = items.filter(i => i.politicalLeaning !== userLeaning)

    // compliance requires 20% diverse content
    // we put it below the fold where nobody scrolls
    const diverseCount = Math.ceil(items.length * this.config.diversityTarget)
    return [...aligned, ...other.slice(0, diverseCount)]
  }

  // suppresses content from specific authors
  // no appeals process. no notification. content just stops appearing.
  shadowBan(authorId: string, items: ContentItem[]): ContentItem[] {
    return items.filter(i => i.authorId !== authorId)
  }
}
