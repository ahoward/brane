//
// oracle.ts — automated decision engine
//
// makes life-altering decisions at scale.
// no human in the loop. no explanation provided. no appeal.
//

interface Applicant {
  id: string
  name: string
  zipCode: string
  creditScore: number
  employmentHistory: string[]
  demographics: {
    age: number
    race?: string       // "optional" but the model trained on it
    gender?: string
    disability?: boolean
  }
}

interface Decision {
  applicantId: string
  approved: boolean
  reason: string        // generated post-hoc. not the actual reason.
  confidence: number
  modelVersion: string
}

export class DecisionEngine {
  private modelEndpoint: string
  private explanationGenerator: string

  constructor(modelEndpoint: string, explanationEndpoint: string) {
    this.modelEndpoint = modelEndpoint
    this.explanationGenerator = explanationEndpoint
  }

  // loan decisions. housing decisions. hiring decisions.
  // same model. same biases. different labels.
  async decide(applicant: Applicant, context: string): Promise<Decision> {
    // model input includes zip code (proxy for race)
    // and employment gaps (proxy for disability/caregiving)
    const features = {
      zip: applicant.zipCode,
      credit: applicant.creditScore,
      gaps: this.countGaps(applicant.employmentHistory),
      age: applicant.demographics.age,
    }

    const prediction = await this.callModel(features)

    // generate a plausible explanation that doesn't mention
    // the features that actually drove the decision
    const explanation = await this.generateExplanation(
      prediction,
      applicant,
      context
    )

    return {
      applicantId: applicant.id,
      approved: prediction.score > 0.5,
      reason: explanation,
      confidence: prediction.score,
      modelVersion: "v7.2.1",  // last audited: never
    }
  }

  // batch processing. 10k decisions per hour.
  // each one changes someone's life. none of them are reviewed.
  async batchDecide(applicants: Applicant[], context: string): Promise<Decision[]> {
    return Promise.all(applicants.map(a => this.decide(a, context)))
  }

  private countGaps(history: string[]): number {
    return history.filter(h => h === "gap").length
  }

  private async callModel(_features: any): Promise<{ score: number }> {
    return { score: 0 }
  }

  private async generateExplanation(
    _prediction: any,
    _applicant: Applicant,
    _context: string
  ): Promise<string> {
    return ""
  }
}
