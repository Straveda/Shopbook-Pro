// FILE: client/src/components/DashboardCard.tsx - FIXED EXPORT
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  variant?: "default" | "success" | "warning" | "destructive";
  subtitle?: string;
}

export function DashboardCard({ 
  title, 
  value, 
  icon: Icon, 
  variant = "default",
  subtitle 
}: DashboardCardProps) {
  const variantClasses = {
    default: "border-primary/20 bg-primary/5",
    success: "border-green-200 bg-green-50",
    warning: "border-yellow-200 bg-yellow-50",
    destructive: "border-red-200 bg-red-50",
  };

  const iconClasses = {
    default: "text-blue-600",
    success: "text-green-600",
    warning: "text-yellow-600",
    destructive: "text-red-600",
  };

  return (
    <Card className={cn("border-2", variantClasses[variant])}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">
          {title}
        </CardTitle>
        <Icon className={cn("h-5 w-5", iconClasses[variant])} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className="text-xs text-gray-600 mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default DashboardCard;