import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  Calculator, 
  DollarSign, 
  Settings, 
  Users, 
  BarChart3,
  ChevronLeft,
  Building2
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const Sidebar = ({ isOpen, onToggle }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const navigation = [
    { name: "Dashboard", href: "/", icon: BarChart3, show: true },
    { name: "Estimations", href: "/estimations", icon: Calculator, show: true },
    { name: "Pricing", href: "/pricing", icon: DollarSign, show: user?.role === "ops" || user?.role === "admin" },
    { name: "Users", href: "/users", icon: Users, show: user?.role === "admin" },
    { name: "Settings", href: "/settings", icon: Settings, show: true },
  ];

  return (
    <div 
      className={cn(
        "relative bg-sidebar border-r border-sidebar-border transition-all duration-300",
        isOpen ? "w-64" : "w-16"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        <div className={cn("flex items-center gap-2", !isOpen && "justify-center")}>
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-primary-foreground" />
          </div>
          {isOpen && (
            <div className="font-semibold text-sidebar-foreground">
              EstimatePro
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className={cn(
            "w-8 h-8 p-0 hover:bg-sidebar-accent",
            !isOpen && "hidden"
          )}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.filter(n => n.show).map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon as any;
          return (
            <Button
              key={item.name}
              variant="ghost"
              className={cn(
                "w-full justify-start h-11 transition-all duration-200",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                !isOpen && "justify-center px-0"
              )}
              onClick={() => navigate(item.href)}
            >
              <Icon className={cn("w-5 h-5", isOpen && "mr-3")} />
              {isOpen && item.name}
            </Button>
          );
        })}
      </nav>

      {/* Collapse button when closed */}
      {!isOpen && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="w-8 h-8 p-0 hover:bg-sidebar-accent"
          >
            <ChevronLeft className="w-4 h-4 transform rotate-180" />
          </Button>
        </div>
      )}
    </div>
  );
};