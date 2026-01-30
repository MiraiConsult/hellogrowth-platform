// Mock data for initial settings
export interface AccountSettings {
  companyName: string;
  placeId?: string;
  googleReviewLink?: string;
  whatsappNumber?: string;
  emailAddress?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export const mockSettings: AccountSettings = {
  companyName: 'Minha Empresa',
  placeId: '',
  googleReviewLink: '',
  whatsappNumber: '',
  emailAddress: '',
  logoUrl: '',
  primaryColor: '#3B82F6',
  secondaryColor: '#10B981',
};

// Mock leads data (empty by default, will be loaded from Supabase)
export const mockLeads: any[] = [];

// Mock campaigns data (empty by default)
export const mockCampaigns: any[] = [];
