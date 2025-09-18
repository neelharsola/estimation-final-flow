import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

interface ProjectItem {
  id: string;
  title: string;
  client: string;
  created_at: string;
  updated_at: string;
}

interface ProjectResourceRow {
  role: string;
  day_rate: number;
  hour_rate: number;
  currency: string;
  region: string;
}

export default function Pricing() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [resources, setResources] = useState<ProjectResourceRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Record<string, { hour_rate?: string; currency?: string }>>({});
  const [summary, setSummary] = useState<{ subtotal: number; discount_pct: number; contingency_pct: number; final_total: number; total_hours: number; currency: string } | null>(null);
  const { toast } = useToast();

  const handleNewRole = async (newRole: any) => {
    try {
      const { name, rates } = newRole;
      if (!name || !rates) {
        console.error("Invalid role data from dialog");
        toast({
          title: "Error",
          description: "Invalid role data from dialog.",
          variant: "destructive",
        });
        return;
      }

      const creationPromises = Object.entries(rates).map(([region, rate]) => {
        const payload = {
          role: name,
          region: region,
          day_rate: rate,
          currency: "USD", // The dialog specifies USD
          version: 1,
          effective_from: new Date().toISOString(),
        };
        return api.pricing.rates.create(payload);
      });

      await Promise.all(creationPromises);

      toast({
        title: "Role Created",
        description: `New role '${name}' with regional pricing has been added.`,
      });

    } catch (error) {
      console.error("Failed to create new role:", error);
      toast({
        title: "Error",
        description: "Failed to create the new role.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const { api } = await import("@/lib/api");
        const items = await api.pricing.projects.list();
        const mapped = (items || []).map((p: any) => ({
          id: p.id || p._id,
          title: p.title,
          client: p.client,
          created_at: p.created_at,
          updated_at: p.updated_at,
        }));
        setProjects(mapped);
      } catch {}
    })();
  }, []);
  const [isNewRoleOpen, setIsNewRoleOpen] = useState(false);

  const selectProject = async (id: string) => {
    setSelectedId(id);
    try {
      const { api } = await import("@/lib/api");
      const rows = await api.pricing.projects.resources(id);
      const mapped: ProjectResourceRow[] = (rows || []).map((r: any) => ({
        role: r.role,
        day_rate: Number(r.day_rate || 0),
        hour_rate: Number(r.day_rate || 0) / 8,
        currency: r.currency || "USD",
        region: r.region || "default",
      }));
      setResources(mapped);
      setEditing({});
      try {
        const s = await api.pricing.projects.getSummary(id);
        setSummary({
          subtotal: Number(s?.subtotal || 0),
          discount_pct: Number(s?.discount_pct || 0),
          contingency_pct: Number(s?.contingency_pct || 0),
          final_total: Number(s?.final_total || 0),
          total_hours: Number(s?.total_hours || 0),
          currency: s?.currency || "USD",
        });
      } catch {}
    } catch {}
  };

  const handleEdit = (role: string, field: "hour_rate" | "currency", value: string) => {
    setEditing(prev => ({ ...prev, [role]: { ...prev[role], [field]: value } }));
  };

  const saveChanges = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      const { api } = await import("@/lib/api");
      const payload = resources.map(r => {
        const hr = Number(editing[r.role]?.hour_rate ?? r.hour_rate);
        const dr = hr * 8;
        return {
          role: r.role,
          day_rate: dr,
          currency: editing[r.role]?.currency ?? r.currency,
          region: r.region,
        };
      });
      const updated = await api.pricing.projects.updateResources(selectedId, payload);
      const mapped: ProjectResourceRow[] = (updated || []).map((r: any) => ({
        role: r.role,
        day_rate: Number(r.day_rate || 0),
        hour_rate: Number(r.day_rate || 0) / 8,
        currency: r.currency,
        region: r.region,
      }));
      setResources(mapped);
      setEditing({});
    } catch {}
    setSaving(false);
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

      {/* Projects -> Resources editor */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="card-elevated md:col-span-1">
          <CardHeader>
            <CardTitle>Projects</CardTitle>
            <CardDescription>Select a project to configure resource pricing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-3">
              <Input placeholder="Search projects..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="space-y-2 max-h-[480px] overflow-auto">
              {projects
                .filter(p => p.title.toLowerCase().includes(search.toLowerCase()) || p.client.toLowerCase().includes(search.toLowerCase()))
                .map((p) => (
                  <button key={p.id} onClick={() => selectProject(p.id)} className={`w-full text-left p-3 rounded border ${selectedId === p.id ? "border-primary bg-primary/5" : "border-border hover:bg-surface-hover"}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{p.title}</div>
                        <div className="text-xs text-muted-foreground">{p.client}</div>
                      </div>
                      <Badge variant="outline">{new Date(p.updated_at).toISOString().split('T')[0]}</Badge>
                    </div>
                  </button>
              ))}
              {projects.length === 0 && (
                <div className="text-sm text-muted-foreground">No projects found.</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated md:col-span-2">
          <CardHeader>
          <CardTitle>Project Resources</CardTitle>
          <CardDescription>Edit hourly rates (USD). Day rate = hourly × 8.</CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedId ? (
              <div className="text-sm text-muted-foreground">Select a project to view resources.</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                  <TableHeader>
                      <TableRow>
                        <TableHead>Role</TableHead>
                      <TableHead>Hourly Rate (USD)</TableHead>
                      <TableHead>Day Rate (USD)</TableHead>
                        <TableHead>Currency</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {resources.map((r) => (
                        <TableRow key={r.role}>
                          <TableCell className="font-medium">{r.role}</TableCell>
                        <TableCell>
                          <Input type="number" className="w-32" defaultValue={r.hour_rate} onChange={(e) => handleEdit(r.role, "hour_rate", e.target.value)} />
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{(Number(editing[r.role]?.hour_rate ?? r.hour_rate) * 8).toFixed(2)}</TableCell>
                          <TableCell>
                            <Select defaultValue={r.currency} onValueChange={(v) => handleEdit(r.role, "currency", v)}>
                              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="USD">USD</SelectItem>
                                <SelectItem value="INR">INR</SelectItem>
                                <SelectItem value="AED">AED</SelectItem>
                                <SelectItem value="GBP">GBP</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      ))}
                      {resources.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-sm text-muted-foreground">No resources found for this project.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="outline" onClick={() => selectProject(selectedId!)} disabled={saving}>Reload</Button>
                  <Button onClick={saveChanges} disabled={saving}><Save className="w-4 h-4 mr-2" />{saving ? "Saving..." : "Save Changes"}</Button>
                </div>
                {summary && (
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader><CardTitle className="text-base">Project Pricing Summary</CardTitle><CardDescription>USD primary</CardDescription></CardHeader>
                      <CardContent>
                        <div className="text-sm space-y-1">
                          <div className="flex justify-between"><span>Subtotal</span><span>{summary.subtotal.toFixed(2)} {summary.currency}</span></div>
                          <div className="flex justify-between"><span>Discount</span><span>{summary.discount_pct}%</span></div>
                          <div className="flex justify-between"><span>Contingency</span><span>{summary.contingency_pct}%</span></div>
                          <div className="flex justify-between"><span>Total Hours</span><span>{summary.total_hours}</span></div>
                          <div className="flex justify-between font-semibold"><span>Final Total</span><span>{summary.final_total.toFixed(2)} {summary.currency}</span></div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Updates (placeholder) */}

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