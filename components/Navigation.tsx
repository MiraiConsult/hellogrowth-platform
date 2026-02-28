// Navigation.tsx - Com Logo HelloGrowth
import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Star, 
  MessageSquare, 
  BarChart3, 
  Settings, 
  LogOut, 
  CheckSquare, 
  PieChart, 
  HelpCircle, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown, 
  Database, 
  Lightbulb, 
  Activity, 
  Sparkles,
  Crown,
  Brain,
  Package,
  Gift,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Heart,
  Target
} from 'lucide-react';
import { PlanType, Company, UserCompany } from '@/types';
import CompanySwitcher from '@/components/CompanySwitcher';
import { User } from '@/types';

interface NavigationProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  activePlan: PlanType;
  onLogout?: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  userRole?: string;
  currentUser?: User;
  activeCompany?: Company | null;
  userCompanies?: UserCompany[];
  onSwitchCompany?: (companyId: string) => void;
  leads?: any[];
  npsData?: any[];
}

type MenuItem = {
  id: string;
  label: string;
  icon: any;
  requiredPlan: string;
  isNew?: boolean;
  badge?: string;
};

type MenuGroup = {
  id: string;
  label: string;
  icon: any;
  type: 'group';
  color: string;
  children: MenuItem[];
};

type NavigationItem = MenuItem | MenuGroup;


// ============================================
// INSIGHT TICKER - Ticker animado no sidebar
// ============================================
interface InsightTickerProps {
  leads: any[];
  npsData: any[];
  isCollapsed: boolean;
  onNavigate: (view: string) => void;
}

const TICKER_ITEMS = [
  { 
    type: 'opportunity', 
    label: 'Oportunidades', 
    icon: TrendingUp, 
    color: 'emerald',
    bgClass: 'from-emerald-50 to-green-50',
    textClass: 'text-emerald-700',
    iconClass: 'text-emerald-500',
    borderClass: 'border-emerald-200',
    badgeClass: 'bg-emerald-100 text-emerald-700',
    view: 'kanban'
  },
  { 
    type: 'risk', 
    label: 'Riscos', 
    icon: AlertTriangle, 
    color: 'red',
    bgClass: 'from-red-50 to-rose-50',
    textClass: 'text-red-700',
    iconClass: 'text-red-500',
    borderClass: 'border-red-200',
    badgeClass: 'bg-red-100 text-red-700',
    view: 'intelligence-center'
  },
  { 
    type: 'sales', 
    label: 'Vendas', 
    icon: DollarSign, 
    color: 'blue',
    bgClass: 'from-blue-50 to-indigo-50',
    textClass: 'text-blue-700',
    iconClass: 'text-blue-500',
    borderClass: 'border-blue-200',
    badgeClass: 'bg-blue-100 text-blue-700',
    view: 'kanban'
  },
  { 
    type: 'recovery', 
    label: 'Recuperação', 
    icon: Heart, 
    color: 'purple',
    bgClass: 'from-purple-50 to-violet-50',
    textClass: 'text-purple-700',
    iconClass: 'text-purple-500',
    borderClass: 'border-purple-200',
    badgeClass: 'bg-purple-100 text-purple-700',
    view: 'analytics'
  }
];

const InsightTicker: React.FC<InsightTickerProps> = ({ leads, npsData, isCollapsed, onNavigate }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Calcular contadores
  const counts = useMemo(() => {
    const promoters = npsData.filter((n: any) => n.status === 'Promotor').length;
    const highValueLeads = leads.filter((l: any) => l.status === 'Negociação' && Number(l.value || 0) >= 1000).length;
    
    const detractors = npsData.filter((n: any) => n.status === 'Detrator').length;
    const staleLeads = leads.filter((l: any) => {
      const daysSince = Math.floor((Date.now() - new Date(l.date).getTime()) / (1000 * 60 * 60 * 24));
      return daysSince > 7 && l.status !== 'Vendido' && l.status !== 'Perdido';
    }).length;
    
    const salesLeads = leads.filter((l: any) => 
      l.status === 'Novo' || l.status === 'Em Contato' || l.status === 'Negociação' || l.status === 'Vendido'
    ).length;
    
    const neutrals = npsData.filter((n: any) => n.status === 'Neutro').length;

    return {
      opportunity: promoters + highValueLeads,
      risk: detractors + staleLeads,
      sales: salesLeads,
      recovery: neutrals
    };
  }, [leads, npsData]);

  // Auto-rotate ticker a cada 3 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setActiveIndex((prev) => (prev + 1) % TICKER_ITEMS.length);
        setIsAnimating(false);
      }, 300);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const currentItem = TICKER_ITEMS[activeIndex];
  const currentCount = counts[currentItem.type as keyof typeof counts];
  const Icon = currentItem.icon;

  // Versão colapsada - ícone que rotaciona
  if (isCollapsed) {
    return (
      <div className="flex justify-center mb-3">
        <button
          onClick={() => onNavigate(currentItem.view)}
          className={`w-10 h-10 rounded-xl bg-gradient-to-br ${currentItem.bgClass} border ${currentItem.borderClass} flex items-center justify-center hover:scale-105 transition-all duration-300 relative`}
          title={`${currentItem.label}: ${currentCount}`}
        >
          <Icon size={18} className={`${currentItem.iconClass} transition-all duration-300 ${isAnimating ? 'opacity-0 scale-75' : 'opacity-100 scale-100'}`} />
          {currentCount > 0 && (
            <span className={`absolute -top-1 -right-1 w-4 h-4 ${currentItem.badgeClass} rounded-full text-[10px] font-bold flex items-center justify-center`}>
              {currentCount > 9 ? '9+' : currentCount}
            </span>
          )}
        </button>
      </div>
    );
  }

  // Versão expandida - card com animação
  return (
    <div className="mb-3">
      <button
        onClick={() => onNavigate(currentItem.view)}
        className={`w-full bg-gradient-to-br ${currentItem.bgClass} border ${currentItem.borderClass} p-3 rounded-xl hover:shadow-md transition-all duration-300 cursor-pointer group text-left`}
      >
        <div className={`transition-all duration-300 ${isAnimating ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Icon size={16} className={currentItem.iconClass} />
              <span className={`text-xs font-semibold uppercase tracking-wider ${currentItem.textClass}`}>
                {currentItem.label}
              </span>
            </div>
            <span className={`text-lg font-bold ${currentItem.textClass}`}>
              {currentCount}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 group-hover:text-slate-600 transition-colors">
            Clique para ver detalhes
          </p>
        </div>
        {/* Indicadores de posição */}
        <div className="flex justify-center gap-1 mt-2">
          {TICKER_ITEMS.map((item, idx) => {
            const dotColors: Record<string, string> = {
              emerald: 'bg-emerald-400',
              red: 'bg-red-400',
              blue: 'bg-blue-400',
              purple: 'bg-purple-400'
            };
            return (
              <div 
                key={idx} 
                className={`h-1 rounded-full transition-all duration-300 ${
                  idx === activeIndex ? `w-4 ${dotColors[item.color]}` : 'w-1.5 bg-slate-200'
                }`} 
              />
            );
          })}
        </div>
      </button>
    </div>
  );
};

const Navigation: React.FC<NavigationProps> = ({ 
  currentView, 
  setCurrentView, 
  activePlan, 
  onLogout, 
  isCollapsed, 
  onToggleCollapse,
  userRole = 'admin',
  currentUser,
  activeCompany,
  userCompanies = [],
  onSwitchCompany,
  leads = [],
  npsData = []
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    'helloclient': true,
    'hellorating': true,
    'intelligence': true
  });

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const navStructure: NavigationItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, requiredPlan: 'all' },
    {
      id: 'pre-sale',
      label: 'Pré-venda',
      icon: Users,
      type: 'group',
      color: 'blue',
      children: [
        { id: 'kanban', label: 'Oportunidades', icon: Users, requiredPlan: 'client' },
        { id: 'forms', label: 'Formulários', icon: CheckSquare, requiredPlan: 'client' },
        { id: 'products', label: 'Produtos/Serviços', icon: Package, requiredPlan: 'client' },
      ]
    },
    {
      id: 'post-sale',
      label: 'Pós-venda',
      icon: Star,
      type: 'group',
      color: 'amber',
      children: [
        { id: 'nps', label: 'Pesquisas NPS', icon: Star, requiredPlan: 'rating' },
        { id: 'analytics', label: 'Análise Feedback', icon: BarChart3, requiredPlan: 'rating' },
        { id: 'games', label: 'Roleta da Sorte', icon: Gift, requiredPlan: 'rating' },
        { id: 'game-participations', label: 'Participantes', icon: Users, requiredPlan: 'rating' },
      ]
    },
    {
      id: 'intelligence',
      label: 'Inteligência',
      icon: Brain,
      type: 'group',
      color: 'purple',
      children: [
        { id: 'intelligence-center', label: 'Estratégico', icon: Lightbulb, requiredPlan: 'all' },
        { id: 'digital-diagnostic', label: 'Minha Presença Digital', icon: Activity, requiredPlan: 'all' },
        { id: 'games', label: 'Game', icon: Gift, requiredPlan: 'all', isNew: true, badge: 'Novo' },
        { id: 'business-profile', label: 'Perfil do Negócio', icon: Brain, requiredPlan: 'all' },
      ]
    },
    { id: 'ai-chat', label: 'HelloIA', icon: MessageSquare, requiredPlan: 'all' },
    { id: 'database-export', label: 'Banco de Dados', icon: Database, requiredPlan: 'all' },
    { id: 'business-profile', label: 'Perfil do Negócio', icon: Brain, requiredPlan: 'all' },
    {
      id: 'settings-group',
      label: 'Configurações',
      icon: Settings,
      type: 'group',
      color: 'gray',
      children: [
        { id: 'settings', label: 'Configurações', icon: Settings, requiredPlan: 'all' },
        { id: 'team-management', label: 'Gerenciar Equipe', icon: Users, requiredPlan: 'all' },
        { id: 'database-export', label: 'Banco de Dados', icon: Database, requiredPlan: 'all' },
        { id: 'tutorial', label: 'Ajuda', icon: HelpCircle, requiredPlan: 'all' },
      ]
    },
  ];

  const hasPlanPermission = (requiredPlan: string) => {
    if (activePlan === 'growth' || activePlan === 'growth_lifetime') return true;
    if (activePlan === 'trial') return true;
    if (activePlan === 'client' && (requiredPlan === 'client' || requiredPlan === 'all')) return true;
    if (activePlan === 'rating' && (requiredPlan === 'rating' || requiredPlan === 'all')) return true;
    return false;
  };

  // Controle de permissões baseado no role do usuário
  const hasRolePermission = (itemId: string) => {
    // Admin vê tudo
    if (userRole === 'admin' || userRole === 'owner') return true;
    
    // Itens que todos podem ver
    const allAccess = ['dashboard', 'analytics', 'intelligence-center', 'tutorial'];
    if (allAccess.includes(itemId)) return true;
    
    // Manager: tudo exceto gerenciar equipe
    if (userRole === 'manager') {
      return itemId !== 'team-management';
    }
    
    // Member: pode ver leads, enviar mensagens, ver relatórios
    if (userRole === 'member') {
      const memberAccess = ['kanban', 'nps', 'database-export', 'ai-chat', 'settings', 'digital-diagnostic'];
      return memberAccess.includes(itemId);
    }
    
    // Viewer: apenas visualização de relatórios e dashboards
    if (userRole === 'viewer') {
      const viewerAccess = ['analytics', 'intelligence-center', 'digital-diagnostic', 'settings'];
      return viewerAccess.includes(itemId);
    }
    
    return false;
  };

  const renderItem = (item: MenuItem, isChild = false) => {
    if (!hasPlanPermission(item.requiredPlan)) return null;
    if (!hasRolePermission(item.id)) return null;

    const isActive = currentView === item.id;

    return (
      <button
        key={item.id}
        onClick={() => setCurrentView(item.id)}
        title={isCollapsed ? item.label : ''}
        className={`
          w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative mb-1
          ${isActive
            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25'
            : 'text-slate-600 hover:bg-slate-100'
          } 
          ${isCollapsed ? 'justify-center' : ''}
          ${!isCollapsed && isChild ? 'ml-4 pl-4 border-l-2 border-slate-200' : ''}
        `}
      >
        <item.icon 
          size={isChild && !isCollapsed ? 18 : 20} 
          className={`flex-shrink-0 transition-transform group-hover:scale-110 ${
            isActive ? 'text-white' : 'text-slate-400 group-hover:text-emerald-500'
          }`} 
        />
        {!isCollapsed && (
          <span className="flex-1 text-left text-sm font-medium truncate">
            {item.label}
          </span>
        )}
        {!isCollapsed && item.badge && (
          <span className={`
            text-[10px] px-2 py-0.5 rounded-full font-bold
            ${isActive 
              ? 'bg-white/20 text-white' 
              : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
            }
          `}>
            {item.badge}
          </span>
        )}
        
        {/* Tooltip */}
        {isCollapsed && (
          <div className="absolute left-full ml-3 px-3 py-2 bg-slate-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-all duration-200 shadow-xl">
            {item.label}
            {item.badge && <span className="ml-2 text-emerald-400">({item.badge})</span>}
          </div>
        )}
      </button>
    );
  };

  const getGroupColor = (color: string, isExpanded: boolean) => {
    const colors: Record<string, { bg: string; text: string; icon: string }> = {
      blue: { 
        bg: isExpanded ? 'bg-blue-50' : 'bg-transparent hover:bg-blue-50', 
        text: 'text-blue-600', 
        icon: 'text-blue-500' 
      },
      amber: { 
        bg: isExpanded ? 'bg-amber-50' : 'bg-transparent hover:bg-amber-50', 
        text: 'text-amber-600', 
        icon: 'text-amber-500' 
      },
      purple: { 
        bg: isExpanded ? 'bg-purple-50' : 'bg-transparent hover:bg-purple-50', 
        text: 'text-purple-600', 
        icon: 'text-purple-500' 
      },
      gray: { 
        bg: isExpanded ? 'bg-slate-50' : 'bg-transparent hover:bg-slate-50', 
        text: 'text-slate-600', 
        icon: 'text-slate-500' 
      },
    };
    return colors[color] || colors.blue;
  };

  return (
    <div 
      className={`
        bg-white h-screen flex flex-col fixed left-0 top-0 z-20 
        border-r border-slate-200/80
        transition-all duration-300 ease-in-out
        ${isCollapsed ? 'w-20' : 'w-64'}
      `}
    >
      {/* Header com Logo */}
      <div className={`p-5 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} relative`}>
        <div className="flex items-center gap-3">
          {!isCollapsed ? (
            // Logo completa quando expandido
            <span className="font-bold text-2xl tracking-tight">
              <span className="text-emerald-600">Hello</span>
              <span className="text-emerald-500">Growth</span>
            </span>
          ) : (
            // Apenas o "H" quando colapsado
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-emerald-500/30 flex-shrink-0">
              H
            </div>
          )}
        </div>
        
        <button 
          onClick={onToggleCollapse}
          className="absolute -right-3 top-7 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-emerald-500 hover:border-emerald-300 shadow-sm transition-all duration-200 z-30"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Company Switcher */}
      {!isCollapsed && currentUser && activeCompany && (
        <div className="px-3 py-2">
          <CompanySwitcher
            currentUser={currentUser}
            companies={userCompanies}
            activeCompany={activeCompany}
            onSwitchCompany={onSwitchCompany || (() => {})}
          />
        </div>
      )}
      {isCollapsed && activeCompany && (
        <div className="flex justify-center py-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white font-bold text-sm" title={activeCompany.name}>
            {activeCompany.name?.charAt(0)?.toUpperCase() || 'E'}
          </div>
        </div>
      )}

      {/* Divider */}
      <div className="px-5">
        <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
        {navStructure.map((item) => {
          if ('type' in item && item.type === 'group') {
            const hasAnyChildPermission = item.children.some(child => hasPlanPermission(child.requiredPlan) && hasRolePermission(child.id));
            if (!hasAnyChildPermission) return null;

            const isExpanded = expandedGroups[item.id];
            const colorClasses = getGroupColor(item.color, isExpanded);

            if (isCollapsed) {
              return (
                <div key={item.id} className="py-2">
                  <div className="h-px bg-slate-100 w-8 mx-auto mb-2"></div>
                  {item.children.map(child => renderItem(child, false))}
                </div>
              );
            }

            return (
              <div key={item.id} className="mb-2">
                <button
                  onClick={() => toggleGroup(item.id)}
                  className={`
                    w-full flex items-center justify-between px-3 py-2.5 rounded-xl 
                    transition-all duration-200 group
                    ${colorClasses.bg}
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isExpanded ? colorClasses.bg : 'bg-slate-100 group-hover:bg-white'}`}>
                      <item.icon size={18} className={colorClasses.icon} />
                    </div>
                    <span className={`font-semibold text-sm ${colorClasses.text}`}>
                      {item.label}
                    </span>
                  </div>
                  <ChevronDown 
                    size={16} 
                    className={`transition-transform duration-200 ${colorClasses.text} ${isExpanded ? 'rotate-180' : ''}`} 
                  />
                </button>
                
                <div className={`
                  overflow-hidden transition-all duration-300 ease-in-out
                  ${isExpanded ? 'max-h-96 opacity-100 mt-1' : 'max-h-0 opacity-0'}
                `}>
                  {item.children.map(child => renderItem(child, true))}
                </div>
              </div>
            );
          }

          return renderItem(item as MenuItem);
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-100">
        {/* Ticker de Insights Animado */}
        <InsightTicker 
          leads={leads} 
          npsData={npsData} 
          isCollapsed={isCollapsed} 
          onNavigate={(view: string) => setCurrentView(view)} 
        />
        
        <button 
          onClick={onLogout}
          className={`
            w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
            text-slate-400 hover:text-red-500 hover:bg-red-50
            transition-all duration-200
            ${isCollapsed ? 'justify-center' : ''}
          `}
          title={isCollapsed ? "Sair" : ""}
        >
          <LogOut size={20} className="flex-shrink-0" />
          {!isCollapsed && <span className="font-medium text-sm">Sair</span>}
        </button>
      </div>
    </div>
  );
};

export default Navigation;
