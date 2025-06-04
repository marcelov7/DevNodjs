import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Home, 
  FileText, 
  Users, 
  Building2,
  MapPin, 
  Wrench, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  ChevronDown,
  Activity,
  Zap,
  Cpu
} from 'lucide-react';
import NotificationPanel from './NotificationPanel';
import LogoutConfirmation from './LogoutConfirmation';
import ThemeToggle from './ThemeToggle';
import AccessibilityToggle from './AccessibilityToggle';

export const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);
  const { usuario, logout, hasPageAccess, logoutLoading } = useAuth();
  const location = useLocation();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home, resource: 'dashboard' },
    { name: 'Relatórios', href: '/relatorios', icon: FileText, resource: 'relatorios' },
    { name: 'Usuários', href: '/usuarios', icon: Users, resource: 'usuarios' },
    { name: 'Setores', href: '/setores', icon: Building2, resource: 'setores' },
    { name: 'Locais', href: '/locais', icon: MapPin, resource: 'locais' },
    { name: 'Equipamentos', href: '/equipamentos', icon: Wrench, resource: 'equipamentos' },
    { name: 'Motores', href: '/motores', icon: Cpu, resource: 'motores' },
    { name: 'Analisadores', href: '/analisadores', icon: Activity, resource: 'analisadores' },
    { name: 'Inspeções Gerador', href: '/gerador-inspecoes', icon: Zap, resource: 'gerador-inspecoes' },
    { name: 'Configurações', href: '/configuracoes', icon: Settings, resource: 'configuracoes' },
  ];

  const filteredNavigation = navigation.filter(item => 
    hasPageAccess(item.resource)
  );

  const handleLogoutClick = () => {
    setShowLogoutConfirmation(true);
  };

  const handleLogoutConfirm = async () => {
    await logout();
    setShowLogoutConfirmation(false);
  };

  const handleLogoutCancel = () => {
    setShowLogoutConfirmation(false);
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-200">
      {/* Sidebar para desktop */}
      <div className="hidden md:flex md:w-64 md:flex-col">
        <div className="flex flex-col flex-grow pt-5 bg-white dark:bg-gray-800 overflow-y-auto border-r border-gray-200 dark:border-gray-700 transition-colors duration-200">
          <div className="flex items-center flex-shrink-0 px-4">
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Sistema de Relatórios</h1>
          </div>
          <div className="mt-5 flex-grow flex flex-col">
            <nav className="flex-1 px-2 pb-4 space-y-1">
              {filteredNavigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`${
                      isActive
                        ? 'bg-primary-100 dark:bg-primary-900 border-primary-500 text-primary-700 dark:text-primary-300'
                        : 'border-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100'
                    } group flex items-center px-3 py-2 text-sm font-medium border-l-4 transition-colors duration-200`}
                  >
                    <item.icon
                      className={`${
                        isActive ? 'text-primary-500 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-400'
                      } mr-3 h-5 w-5`}
                    />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
          {/* User info desktop */}
          <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div>
                <div className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-primary-500">
                  <span className="text-sm font-medium leading-none text-white">
                    {usuario?.nome?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {usuario?.nome}
                </p>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  {usuario?.setor}
                </p>
              </div>
              <button
                onClick={handleLogoutClick}
                className="ml-auto flex-shrink-0 p-1 text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400 transition-colors duration-200"
                title="Sair"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 flex z-40 md:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white dark:bg-gray-800">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                onClick={() => setSidebarOpen(false)}
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              >
                <X className="h-6 w-6 text-white" />
              </button>
            </div>
            <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
              <div className="flex-shrink-0 flex items-center px-4">
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Sistema de Relatórios</h1>
              </div>
              <nav className="mt-5 px-2 space-y-1">
                {filteredNavigation.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`${
                        isActive
                          ? 'bg-primary-100 dark:bg-primary-900 border-primary-500 text-primary-700 dark:text-primary-300'
                          : 'border-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100'
                      } group flex items-center px-3 py-2 text-sm font-medium border-l-4`}
                    >
                      <item.icon className="mr-3 h-5 w-5" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>
            {/* User info mobile */}
            <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div>
                  <div className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-primary-500">
                    <span className="text-sm font-medium leading-none text-white">
                      {usuario?.nome?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {usuario?.nome}
                  </p>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    {usuario?.setor}
                  </p>
                </div>
                <button
                  onClick={handleLogoutClick}
                  className="ml-auto flex-shrink-0 p-1 text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400 transition-colors duration-200"
                  title="Sair"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        {/* Header Mobile */}
        <div className="md:hidden flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 transition-colors duration-200">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1 rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <Menu className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {filteredNavigation.find(item => item.href === location.pathname)?.name}
          </h1>
          <div className="flex items-center space-x-1">
            <AccessibilityToggle size="sm" />
            <ThemeToggle size="sm" />
            <NotificationPanel />
          </div>
        </div>

        {/* Header Desktop */}
        <div className="hidden md:flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 transition-colors duration-200">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {filteredNavigation.find(item => item.href === location.pathname)?.name}
          </h1>
          <div className="flex items-center space-x-3">
            <AccessibilityToggle />
            <ThemeToggle />
            <NotificationPanel />
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center space-x-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
              >
                <div className="h-8 w-8 bg-primary-600 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-white">
                    {usuario?.nome?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
                <span className="text-sm font-medium">
                  {usuario?.nome}
                </span>
                <ChevronDown className="h-4 w-4" />
              </button>

              {/* User dropdown menu */}
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                  <div className="py-1">
                    <div className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-700">
                      <div className="font-medium">{usuario?.nome}</div>
                      <div className="text-gray-500 dark:text-gray-400">{usuario?.email}</div>
                    </div>
                    <button
                      onClick={handleLogoutClick}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center transition-colors duration-200"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sair
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <main className="flex-1 relative z-0 overflow-y-auto focus:outline-none bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <Outlet />
            </div>
          </div>
        </main>
      </div>

      {showLogoutConfirmation && (
        <LogoutConfirmation
          isOpen={showLogoutConfirmation}
          isLoading={logoutLoading}
          onConfirm={handleLogoutConfirm}
          onCancel={handleLogoutCancel}
          userName={usuario?.nome}
        />
      )}
    </div>
  );
}; 