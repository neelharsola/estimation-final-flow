import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import NewRoleDialog from "@/components/forms/NewRoleDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Plus, 
  Edit, 
  Save,
  X,
  DollarSign,
  Globe,
  Users,
  History
} from "lucide-react";

interface PricingRate {
  role: string;
  region: string;
  dailyRate: number;
  currency: string;
  lastUpdated: string;
  updatedBy: string;
}

// Load pricing data from backend

const roles: string[] = [];
const regions: string[] = [];

export default function Pricing() {
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [data, setData] = useState<PricingRate[]>([]);
  const [rolesList, setRolesList] = useState<string[]>([]);
  const [regionsList, setRegionsList] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const { api } = await import("@/lib/api");
        const items = await api.pricing.rates.list();
        const mapped: PricingRate[] = items.map((r: any) => ({
          role: r.role,
          region: r.region,
          dailyRate: r.day_rate,
          currency: r.currency,
          lastUpdated: r.effective_from?.split('T')[0] || "",
          updatedBy: "—",
        }));
        setData(mapped);
        setRolesList([...new Set(mapped.map(i => i.role))]);
        setRegionsList([...new Set(mapped.map(i => i.region))]);
      } catch {}
    })();
  }, []);
  const [isNewRoleOpen, setIsNewRoleOpen] = useState(false);

  const handleNewRole = (newRole: any) => {
    // Add logic to handle new role creation
    console.log("New role created:", newRole);
  };

  const handleEdit = (role: string, region: string) => {
    const cellKey = `${role}-${region}`;
    const currentRate = data.find(item => item.role === role && item.region === region)?.dailyRate;
    setEditingCell(cellKey);
    setEditValue(currentRate?.toString() || "");
  };

  const handleSave = (role: string, region: string) => {
    const newRate = parseFloat(editValue);
    if (!isNaN(newRate)) {
      setData(prev => prev.map(item => 
        item.role === role && item.region === region 
          ? { ...item, dailyRate: newRate, lastUpdated: new Date().toISOString().split('T')[0], updatedBy: "Current User" }
          : item
      ));
    }
    setEditingCell(null);
    setEditValue("");
  };

  const handleCancel = () => {
    setEditingCell(null);
    setEditValue("");
  };

  const getRegionFlag = (region: string) => {
    const flags: { [key: string]: string } = {
      "UAE": "🇦🇪",
      "UK": "🇬🇧", 
      "USA": "🇺🇸",
      "India": "🇮🇳",
      "Europe": "🇪🇺"
    };
    return flags[region] || "🌍";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pricing Configuration</h1>
          <p className="text-muted-foreground">
            Manage daily rates by role and region for accurate project estimations
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <History className="w-4 h-4" />
            Version History
          </Button>
          <Button onClick={() => setIsNewRoleOpen(true)} className="gap-2 btn-primary">
            <Plus className="w-4 h-4" />
            Add New Role
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="card-elevated">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{rolesList.length}</p>
                <p className="text-sm text-muted-foreground">Active Roles</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-elevated">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <Globe className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{regionsList.length}</p>
                <p className="text-sm text-muted-foreground">Regions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-elevated">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">$350</p>
                <p className="text-sm text-muted-foreground">Avg Daily Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pricing Matrix */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle>Daily Rate Matrix</CardTitle>
          <CardDescription>
            Click on any rate to edit. All rates are in USD.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Role</TableHead>
                  {regions.map((region) => (
                    <TableHead key={region} className="text-center min-w-[120px]">
                      <div className="flex items-center justify-center gap-2">
                        <span>{getRegionFlag(region)}</span>
                        <span>{region}</span>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rolesList.map((role) => (
                  <TableRow key={role} className="hover:bg-surface-hover">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Users className="w-4 h-4 text-primary" />
                        </div>
                        {role}
                      </div>
                    </TableCell>
                    {regionsList.map((region) => {
                      const cellKey = `${role}-${region}`;
                      const rateData = data.find(item => item.role === role && item.region === region);
                      const isEditing = editingCell === cellKey;
                      
                      return (
                        <TableCell key={region} className="text-center">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="w-20 h-8 text-center"
                                autoFocus
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleSave(role, region)}
                                className="w-6 h-6 p-0"
                              >
                                <Save className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleCancel}
                                className="w-6 h-6 p-0"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : (
                            <div 
                              className="cursor-pointer hover:bg-surface-hover rounded px-2 py-1 group"
                              onClick={() => handleEdit(role, region)}
                            >
                              <div className="flex items-center justify-center gap-1">
                                <DollarSign className="w-3 h-3 text-green-500" />
                                <span className="font-medium">{rateData?.dailyRate}</span>
                                <Edit className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {rateData?.lastUpdated}
                              </div>
                            </div>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Recent Updates */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle>Recent Updates</CardTitle>
          <CardDescription>
            Latest pricing changes and modifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-surface-elevated border border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-500/10 rounded-lg flex items-center justify-center">
                  <Edit className="w-4 h-4 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm font-medium">Frontend Developer - UAE rate updated</p>
                  <p className="text-xs text-muted-foreground">Changed from $430 to $450</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm">Admin</p>
                <p className="text-xs text-muted-foreground">2024-01-15</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-surface-elevated border border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center">
                  <Plus className="w-4 h-4 text-green-500" />
                </div>
                <div>
                  <p className="text-sm font-medium">New role added: DevOps Engineer</p>
                  <p className="text-xs text-muted-foreground">Rates configured for all regions</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm">Sarah Johnson</p>
                <p className="text-xs text-muted-foreground">2024-01-14</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <NewRoleDialog 
        open={isNewRoleOpen} 
        onOpenChange={setIsNewRoleOpen}
        onComplete={handleNewRole}
      />
    </div>
  );
}