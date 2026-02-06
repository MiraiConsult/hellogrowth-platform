// Navigation.tsx - Com Logo HelloGrowth
import React, { useState } from 'react';
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
  Package
} from 'lucide-react';
import { PlanType } from '@/types';

interface NavigationProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  activePlan: PlanType;
  onLogout?: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  userRole?: string;
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

const Navigation: React.FC<NavigationProps> = ({ 
  currentView, 
  setCurrentView, 
  activePlan, 
  onLogout, 
  isCollapsed, 
  onToggleCollapse,
  userRole = 'admin'
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
      id: 'helloclient',
      label: 'HelloClient',
      icon: Users,
      type: 'group',
      color: 'blue',
      children: [
        { id: 'kanban', label: 'Oportunidades', icon: Users, requiredPlan: 'client' },
        { id: 'forms', label: 'Formulários', icon: CheckSquare, requiredPlan: 'client' },
        { id: 'products', label: 'Produtos/Serviços', icon: Package, requiredPlan: 'client', isNew: true, badge: 'Novo' },
      ]
    },
    {
      id: 'hellorating',
      label: 'HelloRating',
      icon: Star,
      type: 'group',
      color: 'amber',
      children: [
        { id: 'nps', label: 'Pesquisas NPS', icon: Star, requiredPlan: 'rating' },
        { id: 'analytics', label: 'Análise Feedback', icon: BarChart3, requiredPlan: 'rating' },
      ]
    },
    {
      id: 'intelligence',
      label: 'Centro de Inteligência',
      icon: Brain,
      type: 'group',
      color: 'purple',
      children: [
        { id: 'intelligence-center', label: 'Estratégico', icon: Lightbulb, requiredPlan: 'all' },
        { id: 'digital-diagnostic', label: 'Minha Presença Digital', icon: Activity, requiredPlan: 'all' },
      ]
    },
    { id: 'ai-chat', label: 'HelloIA', icon: MessageSquare, requiredPlan: 'all' },
    { id: 'database-export', label: 'Banco de Dados', icon: Database, requiredPlan: 'all' },
    { id: 'business-profile', label: 'Perfil do Negócio', icon: Brain, requiredPlan: 'all', isNew: true, badge: 'Novo' },
    {
      id: 'settings-group',
      label: 'Configurações',
      icon: Settings,
      type: 'group',
      color: 'gray',
      children: [
        { id: 'settings', label: 'Configurações', icon: Settings, requiredPlan: 'all' },
        { id: 'team-management', label: 'Gerenciar Equipe', icon: Users, requiredPlan: 'all' },
      ]
    },
    { id: 'tutorial', label: 'Ajuda', icon: HelpCircle, requiredPlan: 'all' },
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
    if (userRole === 'admin') return true;
    
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
        {userRole === 'admin' && (
          !isCollapsed ? (
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-4 rounded-xl mb-3">
              <div className="flex items-center gap-2 mb-2">
                <Crown size={16} className="text-amber-500" />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Seu Plano</span>
              </div>
              <p className="font-bold text-slate-800 capitalize text-lg">
                {activePlan === 'growth_lifetime' ? 'Lifetime' : activePlan === 'growth' ? 'Growth' : activePlan}
              </p>
              <button 
                onClick={() => setCurrentView('pricing')}
                className="text-xs text-emerald-600 font-medium mt-2 hover:text-emerald-700 flex items-center gap-1 group"
              >
                <Sparkles size={12} className="group-hover:animate-pulse" />
                Gerenciar Assinatura
              </button>
            </div>
          ) : (
            <div className="flex justify-center mb-3">
              <button 
                onClick={() => setCurrentView('pricing')}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/30 hover:scale-105 transition-transform"
                title="Gerenciar Plano"
              >
                <Crown size={18} />
              </button>
            </div>
          )
        )}
        
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