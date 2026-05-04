export { buildDetractorPrompt } from './detractor-prompt';
export { buildPromoterPrompt } from './promoter-prompt';
export { buildPassivePrompt } from './passive-prompt';
export { buildPreSalePrompt } from './presale-prompt';

export type FlowType = 'detractor' | 'promoter' | 'passive' | 'pre_sale';

export interface PromptContext {
  companyName: string;
  companySegment: string;
  contactName: string;
  flowType: FlowType;
  turnNumber: number;
  conversationHistory?: string;
  // NPS flows
  npsScore?: number;
  npsComment?: string;
  // Promoter specific
  referralReward?: string;
  googleReviewLink?: string;
  // Pre-sale specific
  interestedServices?: string[];
  formResponses?: Record<string, string>;
  availableServices?: string[];
  // Contexto enriquecido (novo)
  businessDescription?: string;
  businessDifferentials?: string;
  targetAudience?: string;
  mainPainPoints?: string;
  productsServices?: Array<{ name: string; value: number; description: string }>;
  leadAiAnalysis?: {
    salesScript?: string;
    clientInsights?: string[];
    suggestedProduct?: string;
    nextSteps?: string[];
    classification?: string;
  };
  currentDateTime?: string;
  currentDayOfWeek?: string;
  // Persona detalhada
  aiPersonaName?: string;
  aiPersonaRole?: string;
  aiPersonaTone?: string;
  aiPersonaPersonality?: string;
  aiPersonaCustomInstructions?: string;
  // Playbook
  playbookObjective?: string;
  // Campanhas de engajamento (promotor)
  engagementReviewCampaign?: { id: string; reward_description: string; google_review_url: string } | null;
  engagementReferralCampaign?: { id: string; reward_description: string } | null;
  alreadyRequestedReview?: boolean;
  alreadyRequestedReferral?: boolean;
}

export function buildPrompt(ctx: PromptContext): string {
  switch (ctx.flowType) {
    case 'detractor':
      return require('./detractor-prompt').buildDetractorPrompt({
        companyName: ctx.companyName,
        companySegment: ctx.companySegment,
        contactName: ctx.contactName,
        npsScore: ctx.npsScore!,
        npsComment: ctx.npsComment,
        conversationHistory: ctx.conversationHistory,
        turnNumber: ctx.turnNumber,
      });

    case 'promoter':
      return require('./promoter-prompt').buildPromoterPrompt({
        companyName: ctx.companyName,
        companySegment: ctx.companySegment,
        contactName: ctx.contactName,
        npsScore: ctx.npsScore!,
        npsComment: ctx.npsComment,
        referralReward: ctx.referralReward,
        googleReviewLink: ctx.googleReviewLink || ctx.engagementReviewCampaign?.google_review_url,
        engagementReviewReward: ctx.engagementReviewCampaign?.reward_description,
        engagementReferralReward: ctx.engagementReferralCampaign?.reward_description,
        alreadyRequestedReview: ctx.alreadyRequestedReview,
        alreadyRequestedReferral: ctx.alreadyRequestedReferral,
        conversationHistory: ctx.conversationHistory,
        turnNumber: ctx.turnNumber,
        // Persona
        aiPersonaName: ctx.aiPersonaName,
        aiPersonaRole: ctx.aiPersonaRole,
        aiPersonaTone: ctx.aiPersonaTone,
        aiPersonaPersonality: ctx.aiPersonaPersonality,
        aiPersonaCustomInstructions: ctx.aiPersonaCustomInstructions,
        // Playbook
        playbookObjective: ctx.playbookObjective,
      });

    case 'passive':
      return require('./passive-prompt').buildPassivePrompt({
        companyName: ctx.companyName,
        companySegment: ctx.companySegment,
        contactName: ctx.contactName,
        npsScore: ctx.npsScore!,
        npsComment: ctx.npsComment,
        conversationHistory: ctx.conversationHistory,
        turnNumber: ctx.turnNumber,
      });

    case 'pre_sale':
      return require('./presale-prompt').buildPreSalePrompt({
        companyName: ctx.companyName,
        companySegment: ctx.companySegment,
        contactName: ctx.contactName,
        interestedServices: ctx.interestedServices || [],
        formResponses: ctx.formResponses || {},
        availableServices: ctx.availableServices,
        conversationHistory: ctx.conversationHistory,
        turnNumber: ctx.turnNumber,
        // Novos campos de contexto enriquecido
        businessDescription: ctx.businessDescription,
        businessDifferentials: ctx.businessDifferentials,
        targetAudience: ctx.targetAudience,
        mainPainPoints: ctx.mainPainPoints,
        productsServices: ctx.productsServices,
        leadAiAnalysis: ctx.leadAiAnalysis,
        currentDateTime: ctx.currentDateTime,
        currentDayOfWeek: ctx.currentDayOfWeek,
        // Persona
        aiPersonaName: ctx.aiPersonaName,
        aiPersonaRole: ctx.aiPersonaRole,
        aiPersonaTone: ctx.aiPersonaTone,
        aiPersonaPersonality: ctx.aiPersonaPersonality,
        aiPersonaCustomInstructions: ctx.aiPersonaCustomInstructions,
        // Playbook
        playbookObjective: ctx.playbookObjective,
      });

    default:
      throw new Error(`Tipo de fluxo desconhecido: ${ctx.flowType}`);
  }
}
