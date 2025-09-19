import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  History,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle
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
  days: number;
  count: number;
}

export default function Pricing() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedEstimation, setSelectedEstimation] = useState<any>(null);
  const [resources, setResources] = useState<ProjectResourceRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Record<string, { hour_rate?: string; currency?: string; days?: string; count?: string; }>>({});
  const [summary, setSummary] = useState<{ subtotal: number; discount_pct: number; contingency_pct: number; final_total: number; total_hours: number; currency: string } | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [approvalComment, setApprovalComment] = useState("");
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<"approve" | "reject" | null>(null);
  const { toast } = useToast();
  
  const isAdmin = user?.role?.toLowerCase() === 'admin';

  const userMap = new Map(users.map(u => [u.id, u.name]));

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

      // Refresh audit logs
      const logs = await api.audit.list();
      setAuditLogs(logs || []);

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

        const logs = await api.audit.list();
        setAuditLogs(logs || []);

        const userList = await api.users.list();
        setUsers(userList || []);

        // Check if estimation ID is provided in URL
        const estimationId = searchParams.get('estimation');
        if (estimationId && mapped.find(p => p.id === estimationId)) {
          await selectProject(estimationId);
        }

      } catch {}
    })();
  }, [searchParams]);
  const [isNewRoleOpen, setIsNewRoleOpen] = useState(false);

  const selectProject = async (id: string) => {
    setSelectedId(id);
    try {
      const { api } = await import("@/lib/api");
      const estimation = await api.estimations.get(id);
      setSelectedEstimation(estimation);
      
      // Load pricing resources from the dedicated pricing_resources API
      let resourcesData = [];
      try {
        resourcesData = await api.estimations.getPricingResources(id);
      } catch (error) {
        console.log("No pricing resources found, trying envelope data...");
        // Fallback: try to sync from envelope_data if pricing resources don't exist
        if (estimation.envelope_data && estimation.envelope_data.resources) {
          resourcesData = estimation.envelope_data.resources;
        } else if (estimation.current_version && estimation.current_version.resources) {
          resourcesData = estimation.current_version.resources;
        }
      }
      
      const mapped: ProjectResourceRow[] = (resourcesData || []).map((r: any) => ({
        role: r.role,
        day_rate: Number(r.day_rate || 0),
        hour_rate: Number(r.hourly_rate || r.hour_rate || r.day_rate || r.dayRate || 0) / (r.hourly_rate ? 1 : 8),
        currency: r.currency || "USD",
        region: r.region || "default",
        days: Number(r.days || 0),
        count: Number(r.count || 0),
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

  const handleEdit = (role: string, field: "hour_rate" | "currency" | "days" | "count", value: string) => {
    setEditing(prev => ({ ...prev, [role]: { ...prev[role], [field]: value } }));
  };
  
  const handleApprovalAction = async (action: 'approve' | 'reject') => {
    if (!selectedId) return;
    
    try {
      if (action === 'approve') {
        await api.estimations.approve(selectedId, approvalComment);
        toast({
          title: "Success",
          description: "Estimation approved successfully.",
        });
      } else {
        await api.estimations.reject(selectedId, approvalComment);
        toast({
          title: "Success", 
          description: "Estimation rejected.",
        });
      }
      
      // Refresh the estimation data
      await selectProject(selectedId);
      setApprovalComment("");
      setShowApprovalDialog(false);
      setPendingAction(null);
      
    } catch (error: any) {
      console.error(`Failed to ${action} estimation:`, error);
      toast({
        title: "Error",
        description: error?.message || `Failed to ${action} estimation.`,
        variant: "destructive",
      });
    }
  };

  const saveChanges = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      const { api } = await import("@/lib/api");
      const resourcePayload = resources.map(r => {
        const hr = Number(editing[r.role]?.hour_rate ?? r.hour_rate);
        const dr = hr * 8;
        const days = Number(editing[r.role]?.days ?? r.days);
        const count = Number(editing[r.role]?.count ?? r.count);
        return {
          role: r.role,
          hourly_rate: hr,
          day_rate: dr,
          currency: editing[r.role]?.currency ?? r.currency,
          region: editing[r.role]?.region ?? r.region,
          days: days,
          count: count,
          total_cost: dr * days * count,
        };
      });
      const updated = await api.estimations.updatePricingResources(selectedId, resourcePayload);
      
      if (summary) {
        await api.pricing.projects.updateSummary(selectedId, summary);
      }

      const mapped: ProjectResourceRow[] = (updated || []).map((r: any) => ({
        role: r.role,
        day_rate: Number(r.day_rate || 0),
        hour_rate: Number(r.hourly_rate || r.hour_rate || r.day_rate || 0) / (r.hourly_rate ? 1 : 8),
        currency: r.currency,
        region: r.region,
        days: Number(r.days || 0),
        count: Number(r.count || 0),
      }));
      setResources(mapped);
      setEditing({});

      // Refresh audit logs
      const logs = await api.audit.list();
      setAuditLogs(logs || []);
      
      toast({
        title: "Success",
        description: "Project pricing saved successfully.",
      });

    } catch (error) {
      console.error("Failed to save changes:", error);
      toast({
        title: "Error",
        description: "Failed to save changes.",
        variant: "destructive",
      });
    }
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

  const renderAuditLog = (log: any) => {
    const { action, metadata, timestamp, user_id } = log;
    const date = new Date(timestamp).toISOString().split('T')[0];

    switch (action) {
        case "CREATE_RATE":
            return (
                <div key={log.id} className="flex items-center justify-between p-3 rounded-lg bg-surface-elevated border border-border/50">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center">
                            <Plus className="w-4 h-4 text-green-500" />
                        </div>
                        <div>
                            <p className="text-sm font-medium">New rate for {metadata.role}</p>
                            <p className="text-xs text-muted-foreground">Set to {metadata.day_rate} {metadata.currency}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-sm">{userMap.get(user_id) || user_id}</p>
                        <p className="text-xs text-muted-foreground">{date}</p>
                    </div>
                </div>
            );
        case "UPDATE_RATE":
            return (
                <div key={log.id} className="flex items-center justify-between p-3 rounded-lg bg-surface-elevated border border-border/50">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-orange-500/10 rounded-lg flex items-center justify-center">
                            <Edit className="w-4 h-4 text-orange-500" />
                        </div>
                        <div>
                            <p className="text-sm font-medium">Rate updated for {metadata.old.role}</p>
                            <p className="text-xs text-muted-foreground">From {metadata.old.day_rate} to {metadata.new.day_rate}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-sm">{userMap.get(user_id) || user_id}</p>
                        <p className="text-xs text-muted-foreground">{date}</p>
                    </div>
                </div>
            );
        case "UPDATE_PROJECT_RESOURCES":
             return (
                <div key={log.id} className="flex items-center justify-between p-3 rounded-lg bg-surface-elevated border border-border/50">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
                            <Users className="w-4 h-4 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-sm font-medium">Project resources updated</p>
                            <p className="text-xs text-muted-foreground">Project ID: {log.resource_id}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-sm">{userMap.get(user_id) || user_id}</p>
                        <p className="text-xs text-muted-foreground">{date}</p>
                    </div>
                </div>
            );
        default:
            return null;
    }
}

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
      <div className="grid gap-6 md:grid-cols-4">
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

        <div className="md:col-span-3 space-y-6">
          {!selectedId ? (
            <Card className="card-elevated flex items-center justify-center h-full">
              <div className="text-center text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4" />
                <p>Select a project to view its pricing details.</p>
              </div>
            </Card>
          ) : (
            <>
              {/* Approval Status Card - only for admin and pending approval estimations */}
              {selectedEstimation && isAdmin && (selectedEstimation.status === 'pending_approval' || selectedEstimation.approval_status === 'pending') && selectedEstimation.creator_id !== user?.id && (
                <Card className="card-elevated border-amber-200 bg-amber-50/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                      Approval Required
                    </CardTitle>
                    <CardDescription>
                      This estimation by {selectedEstimation.estimator_name || 'Unknown'} is pending your approval.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div><strong>Project:</strong> {selectedEstimation.title}</div>
                        <div><strong>Client:</strong> {selectedEstimation.client}</div>
                        <div><strong>Created:</strong> {selectedEstimation.created_at ? new Date(selectedEstimation.created_at).toLocaleDateString() : 'Unknown'}</div>
                        <div><strong>Status:</strong> <Badge className="bg-amber-100 text-amber-800">Pending Approval</Badge></div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="approval-comment">Approval Comment (Optional)</Label>
                        <Textarea
                          id="approval-comment"
                          placeholder="Add a comment about your decision..."
                          value={approvalComment}
                          onChange={(e) => setApprovalComment(e.target.value)}
                          rows={3}
                        />
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => handleApprovalAction('approve')}
                          className="bg-green-600 hover:bg-green-700 text-white"
                          disabled={saving}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Approve Estimation
                        </Button>
                        <Button 
                          onClick={() => handleApprovalAction('reject')}
                          variant="outline"
                          className="border-red-600 text-red-600 hover:bg-red-50"
                          disabled={saving}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Reject Estimation
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Display approval status for already processed estimations */}
              {selectedEstimation && (selectedEstimation.approval_status === 'approved' || selectedEstimation.approval_status === 'rejected') && (
                <Card className={`card-elevated ${selectedEstimation.approval_status === 'approved' ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'}`}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {selectedEstimation.approval_status === 'approved' ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                      {selectedEstimation.approval_status === 'approved' ? 'Approved' : 'Rejected'}
                    </CardTitle>
                    <CardDescription>
                      {selectedEstimation.approved_at && (
                        <>Processed on {new Date(selectedEstimation.approved_at).toLocaleDateString()}</>
                      )}
                    </CardDescription>
                  </CardHeader>
                  {selectedEstimation.approval_comment && (
                    <CardContent>
                      <p className="text-sm"><strong>Comment:</strong> {selectedEstimation.approval_comment}</p>
                    </CardContent>
                  )}
                </Card>
              )}
              
              {/* Project Features/Rows Display */}
              {selectedEstimation && selectedEstimation.envelope_data && selectedEstimation.envelope_data.rows && (
                <Card className="card-elevated">
                  <CardHeader>
                    <CardTitle>Project Features</CardTitle>
                    <CardDescription>Features and components included in this estimation</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>#</TableHead>
                            <TableHead>Platform</TableHead>
                            <TableHead>Module</TableHead>
                            <TableHead>Component</TableHead>
                            <TableHead>Feature</TableHead>
                            <TableHead>Make/Reuse</TableHead>
                            <TableHead>Complexity</TableHead>
                            <TableHead>Components</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedEstimation.envelope_data.rows.map((row: any, index: number) => (
                            <TableRow key={index}>
                              <TableCell>{index + 1}</TableCell>
                              <TableCell>{row.platform}</TableCell>
                              <TableCell>{row.module}</TableCell>
                              <TableCell>{row.component}</TableCell>
                              <TableCell className="max-w-[360px] whitespace-pre-wrap">{row.feature}</TableCell>
                              <TableCell>
                                {row.make_or_reuse}
                                {row.make_or_reuse === "Reuse" && row.reuse_source && (
                                  <span className="text-xs text-muted-foreground block">{row.reuse_source}</span>
                                )}
                              </TableCell>
                              <TableCell>{row.complexity}</TableCell>
                              <TableCell>{row.num_components || 1}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              <Card className="card-elevated">
                <CardHeader>
                  <CardTitle>Project Resources</CardTitle>
                  <CardDescription>Edit hourly rates. Day rate is calculated as hourly rate × 8.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Role</TableHead>
                          <TableHead>Days</TableHead>
                          <TableHead>Count</TableHead>
                          <TableHead>Hourly Rate</TableHead>
                          <TableHead>Day Rate</TableHead>
                          <TableHead>Currency</TableHead>
                          <TableHead>Total Cost</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {resources.map((r) => {
                          const dayRate = Number(editing[r.role]?.hour_rate ?? r.hour_rate) * 8;
                          const days = Number(editing[r.role]?.days ?? r.days);
                          const count = Number(editing[r.role]?.count ?? r.count);
                          const totalCost = dayRate * days * count;

                          return (
                          <TableRow key={r.role}>
                            <TableCell className="font-medium">{r.role}</TableCell>
                            <TableCell>
                              <Input type="number" className="w-24" value={days} onChange={(e) => handleEdit(r.role, "days", e.target.value)} />
                            </TableCell>
                            <TableCell>
                              <Input type="number" className="w-24" value={count} onChange={(e) => handleEdit(r.role, "count", e.target.value)} />
                            </TableCell>
                            <TableCell>
                              <Input type="number" className="w-32" value={editing[r.role]?.hour_rate ?? r.hour_rate} onChange={(e) => handleEdit(r.role, "hour_rate", e.target.value)} />
                            </TableCell>
                            <TableCell className="whitespace-nowrap">${dayRate.toFixed(2)}</TableCell>
                            <TableCell>
                              <Select value={editing[r.role]?.currency ?? r.currency} onValueChange={(v) => handleEdit(r.role, "currency", v)}>
                                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="USD">USD</SelectItem>
                                  <SelectItem value="INR">INR</SelectItem>
                                  <SelectItem value="AED">AED</SelectItem>
                                  <SelectItem value="GBP">GBP</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="font-semibold">${totalCost.toFixed(2)}</TableCell>
                          </TableRow>
                        )})}
                        {resources.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center text-muted-foreground py-4">No resources found for this project.</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {summary && (
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle className="text-base">Pricing Adjustments</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="discount">Discount (%)</Label>
                        <Input id="discount" type="number" value={summary.discount_pct} onChange={(e) => setSummary({ ...summary, discount_pct: Number(e.target.value) })} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contingency">Contingency (%)</Label>
                        <Input id="contingency" type="number" value={summary.contingency_pct} onChange={(e) => setSummary({ ...summary, contingency_pct: Number(e.target.value) })} />
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="lg:col-span-3">
                    <CardHeader>
                      <CardTitle className="text-base">Final Pricing Summary</CardTitle>
                      <CardDescription>All values in {summary.currency}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm space-y-2">
                        <div className="flex justify-between"><span>Subtotal</span><span>{summary.subtotal.toFixed(2)}</span></div>
                        <div className="flex justify-between text-orange-500"><span>Discount ({summary.discount_pct}%)</span><span>-{(summary.subtotal * summary.discount_pct / 100).toFixed(2)}</span></div>
                        <div className="flex justify-between text-blue-500"><span>Contingency ({summary.contingency_pct}%)</span><span>+{(summary.subtotal * (1 - summary.discount_pct / 100) * summary.contingency_pct / 100).toFixed(2)}</span></div>
                        <div className="border-t my-2"></div>
                        <div className="flex justify-between font-semibold text-lg"><span>Final Total</span><span>{(summary.subtotal * (1 - summary.discount_pct / 100) * (1 + summary.contingency_pct / 100)).toFixed(2)}</span></div>
                        <div className="flex justify-between text-xs text-muted-foreground pt-2"><span>Total Hours</span><span>{summary.total_hours}</span></div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => selectProject(selectedId!)} disabled={saving}>Reload</Button>
                <Button onClick={saveChanges} disabled={saving}><Save className="w-4 h-4 mr-2" />{saving ? "Saving..." : "Save Changes"}</Button>
              </div>
            </>
          )}
        </div>
      </div>

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
            {auditLogs.map(renderAuditLog)}
            {auditLogs.length === 0 && <div className="text-sm text-muted-foreground">No recent updates.</div>}
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