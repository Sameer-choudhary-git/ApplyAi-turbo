import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Briefcase, CalendarDays, ListTodo, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const mobileItems = [
  { path: '/', icon: LayoutDashboard, label: 'Home' },
  { path: '/applications', icon: Briefcase, label: 'Apps' },
  { path: '/networking', icon: Users, label: 'Network' },
  { path: '/schedule', icon: CalendarDays, label: 'Schedule' },
  { path: '/tasks', icon: ListTodo, label: 'Tasks' },
];

export default function MobileNav() {
  const location = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-sidebar/95 backdrop-blur-xl border-t border-sidebar-border">
      <div className="flex items-center justify-around px-2 py-2">
        {mobileItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 min-w-0',
                isActive ? 'text-primary' : 'text-sidebar-foreground/50'
              )}
            >
              {isActive && (
                <div className="absolute -top-0.5 w-8 h-0.5 rounded-full gradient-primary" />
              )}
              <item.icon className={cn('w-5 h-5 transition-transform duration-200', isActive && 'scale-110')} />
              <span className="text-[10px] font-medium whitespace-nowrap">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}