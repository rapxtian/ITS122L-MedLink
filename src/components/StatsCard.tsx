import React from 'react';
import { BoxIcon } from 'lucide-react';
interface StatsCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: BoxIcon;
  color: 'blue' | 'green' | 'orange' | 'red' | 'purple';
  onClick?: () => void;
}
const colorMap = {
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    icon: 'text-blue-600 dark:text-blue-300',
    value: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-100 dark:border-blue-800'
  },
  green: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    icon: 'text-green-600 dark:text-green-300',
    value: 'text-green-700 dark:text-green-300',
    border: 'border-green-100 dark:border-green-800'
  },
  orange: {
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    icon: 'text-orange-600 dark:text-orange-300',
    value: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-100 dark:border-orange-800'
  },
  red: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    icon: 'text-red-600 dark:text-red-300',
    value: 'text-red-700 dark:text-red-300',
    border: 'border-red-100 dark:border-red-800'
  },
  purple: {
    bg: 'bg-purple-50 dark:bg-violet-900/20',
    icon: 'text-purple-600 dark:text-violet-300',
    value: 'text-purple-700 dark:text-violet-300',
    border: 'border-purple-100 dark:border-violet-800'
  }
};
export function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  onClick
}: StatsCardProps) {
  const c = colorMap[color];
  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onClick}>

      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{title}</p>
          <p className={`text-2xl font-bold mt-1 ${c.value}`}>{value}</p>
          {subtitle &&
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{subtitle}</p>
          }
        </div>
        <div
          className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center`}>

          <Icon size={20} className={c.icon} />
        </div>
      </div>
    </div>);

}