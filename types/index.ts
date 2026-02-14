export type PlanType = 'trial' | 'client' | 'rating' | 'growth' | 'growth_lifetime';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string; // In a real app, this would be hashed/handled by backend
  plan: PlanType;
  createdAt: string; // To calculate trial expiration
  companyName: string;
  tenantId?: string; // ID do tenant (empresa) ao qual o usuário pertence
  isOwner?: boolean; // Indica se o usuário é o dono do tenant
  role?: 'admin' | 'manager' | 'member' | 'viewer' | 'super_admin'; // Role do usuário
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string; // Added phone field
  status: 'Novo' | 'Em Contato' | 'Negociação' | 'Vendido' | 'Perdido';
  value: number;
  date: string;
  formSource: string;
  answers?: Record<string, any>; // Stores the form answers
  formId?: string; // Linked to Form ID
  notes?: string; // New field for internal CRM notes
}

export interface NPSResponse {
  id: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  score: number; // 0-10
  comment: string;
  date: string;
  campaign: string;
  campaignId?: string; // Added for linking
  status: 'Promotor' | 'Neutro' | 'Detrator';
  answers?: any[];
  notes?: string;
}

export interface InitialField {
  field: 'name' | 'email' | 'phone';
  label: string;
  placeholder: string;
  required: boolean;
  enabled: boolean;
}

export interface CampaignQuestion {
  id: string;
  text: string;
  type: 'nps' | 'text' | 'single' | 'multiple' | 'single_choice' | 'multiple_choice' | 'rating';
  options?: any[]; // Supports both string[] and {id: string, text: string}[]
  insight?: string;
  conditional?: 'promoter' | 'passive' | 'detractor';
}

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  status: 'Ativa' | 'Pausada' | 'Rascunho';
  npsScore: number;
  responses: number;
  type: string;
  enableRedirection?: boolean; // Toggle for this campaign
  googleLink?: string; // Legacy/Fallback
  questions?: CampaignQuestion[];
  initialFields?: InitialField[]; // Configurable initial fields
  // New fields for NPS 2.0
  google_redirect?: boolean;
  google_place_id?: string;
  offer_prize?: boolean;
  before_google_message?: string;
  after_game_message?: string;
  initial_fields?: InitialField[];
  objective?: string;
  tone?: string;
  evaluation_points?: string[];
}

export interface FormOption {
  id: string;
  label: string;
  value: number; // Opportunity value
  linkedProduct?: string; // Product/Service name
  script?: string; // Sales script/orientation
  followUpLabel?: string;
}

export interface FormQuestion {
  id: string;
  text: string;
  type: 'text' | 'single' | 'multiple';
  options?: FormOption[];
}

export interface Form {
  id: string;
  name: string;
  description?: string;
  questions: FormQuestion[];
  responses: number;
  active: boolean;
  createdAt: string;
  initialFields?: InitialField[]; // Configurable initial fields
}

export interface ChartData {
  name: string;
  value: number;
  fill?: string;
}

export interface CorrelationData {
  name: string;
  dealValue: number; // Pre-venda
  npsScore: number; // Pós-venda
  retention: number;
}

export interface AccountSettings {
  companyName: string;
  adminEmail: string;
  phone: string;
  website: string;
  placeId?: string;
  autoRedirect?: boolean;
  customDomain?: string;
}

// =====================================================
// NEW TYPES FOR HELLO GROWTH 2.0
// =====================================================

// Digital Diagnostic Types
export interface DigitalDiagnostic {
  id: string;
  user_id: string;
  score_reputation: number;
  score_information: number;
  score_engagement: number;
  overall_score: number;
  details: DiagnosticDetails;
  recommendations: string[];
  created_at: string;
}

export interface DiagnosticDetails {
  reviewCount?: number;
  averageRating?: number;
  responseRate?: number;
  profileComplete?: boolean;
  photosCount?: number;
  postsCount?: number;
  npsScore?: number;
  promoterPercentage?: number;
  detractorPercentage?: number;
}

// Customer Journey Types
export interface CustomerAction {
  id: string;
  user_id: string;
  customer_email: string;
  action_type: 'contact' | 'offer' | 'resolution' | 'note' | 'followup';
  description: string;
  created_at: string;
}

export interface CustomerJourneyData {
  email: string;
  name: string;
  phone?: string;
  responses: NPSResponse[];
  actions: CustomerAction[];
  currentStatus: 'Promotor' | 'Neutro' | 'Detrator';
  evolution: 'improved' | 'stable' | 'declined' | 'new';
  lastContact?: string;
  needsAttention: boolean;
}

// Intelligence Center Types
export type InsightType = 'opportunity' | 'risk' | 'sales' | 'recovery';

export interface ActionInsight {
  id: string;
  type: InsightType;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  metric?: string;
  actionLabel: string;
  actionTarget: string;
  createdAt: string;
}

export interface ConsultantQuestion {
  id: string;
  category: 'sales' | 'satisfaction' | 'strategy' | 'operations';
  question: string;
  icon: string;
}