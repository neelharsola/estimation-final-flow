import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Calendar, ArrowLeft, CheckCircle, XCircle, Send, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function EstimationDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [estimation, setEstimation] = useState<any | null>(null);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [editing, setEditing] = useState<{ row: number; field: string } | null>(null);
  const [users, setUsers] = useState<any[]>([]);

  const loadEstimation = useCallback(async () => {
    if (!id) {
      setError("Missing estimation ID");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const full = await api.estimations.get(id);
      const mapped = {
        id: full.id || full._id,
        projectTitle: full.title || "Untitled Project",
        clientName: full.client || "Unknown Client",
        description: full.description || "",
        status: full.status === "under_review" ? "pending_review" : full.status,
        approval_status: full.approval_status,
        approved_by: full.approved_by,
        approved_at: full.approved_at,
        approval_comment: full.approval_comment,
        estimator: full.estimator_name || "Unknown",
        estimatorId: full.creator_id || "",
        createdAt: new Date(full.created_at).toISOString().split('T')[0],
        envelope: full.envelope_data || null,
        currentVersion: full.current_version,
        versions: full.versions || [],
      };
      setEstimation(mapped);
      const initialRows = mapped.envelope?.rows || [];
      if (initialRows.length > 0) {
        setRows(initialRows);
      } else {
        const feats = (mapped.currentVersion?.features || []) as any[];
        if (Array.isArray(feats) && feats.length > 0) {
          const derived = feats.map((f: any) => {
            const title: string = String(f.title || "");
            const parts = title.split(" - ");
            const module = parts[0] || "";
            const component = parts[1] || "";
            const feature = parts.slice(2).join(" - ") || "";
            return {
              platform: "Web",
              module,
              component,
              feature,
              make_or_reuse: "Make",
              complexity: f.complexity || "Average",
              num_components: 1,
            };
          });
          setRows(derived);
        } else {
          setRows([]);
        }
      }
      setForm({
        projectTitle: mapped.projectTitle,
        clientName: mapped.clientName,
        description: mapped.description,
        status: mapped.status,
        estimator: mapped.estimator,
        estimatorId: mapped.estimatorId,
      });
      if (users.length === 0) {
        try {
          const allUsers = await api.users.list();
          setUsers(allUsers || []);
        } catch {}
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load estimation");
    } finally {
      setLoading(false);
    }
  }, [id, users]);

  useEffect(() => {
    loadEstimation();
  }, [id, loadEstimation]);

  const onChange = (field: string, value: any) => setForm((p: any) => ({ ...p, [field]: value }));

  const onSave = async () => {
    if (!id) return;
    setSaving(true);
    let saved = false;
    try {
      const updates: any = {};
      if (form.projectTitle !== estimation.projectTitle) updates.title = form.projectTitle;
      if (form.clientName !== estimation.clientName) updates.client = form.clientName;
      if (form.description !== estimation.description) updates.description = form.description;
      if ((form.status || "in_progress") !== estimation.status) updates.status = form.status || "in_progress";
      
      const isAdmin = String(user?.role || "").toLowerCase() === "admin";
      if (isAdmin && (form.estimatorId || "") !== (estimation.estimatorId || "")) {
        updates.creator_id = form.estimatorId;
      }

      if (Object.keys(updates).length > 0) {
        await api.estimations.update(id, updates);
        saved = true;
      }

      const existingEnvelope = estimation.envelope || {};
      const prevRowsStr = JSON.stringify(existingEnvelope.rows || []);
      const newRowsStr = JSON.stringify(rows || []);
      const envelopeProjectChanged = (
        updates.title !== undefined ||
        updates.client !== undefined ||
        updates.description !== undefined ||
        updates.creator_id !== undefined
      );

      if (newRowsStr !== prevRowsStr || envelopeProjectChanged) {
        const updatedEnvelope = {
          schema_version: existingEnvelope.schema_version || "1.0",
          project: {
            ...(existingEnvelope.project || {}),
            name: form.projectTitle,
            client: form.clientName,
            description: form.description,
            estimator: { id: form.estimatorId, name: users.find(u => u.id === form.estimatorId)?.name || form.estimator },
          },
          rows: rows,
          ...(existingEnvelope.summary ? { summary: existingEnvelope.summary } : {}),
        };
        await api.estimations.updateEnvelope(id, updatedEnvelope);
        saved = true;
      }

      if (saved) {
        toast.success("Estimation saved successfully!");
        await loadEstimation();
      } else {
        toast.info("No changes to save.");
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to save estimation. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!id || id === "None") {
      toast.error("Invalid estimation id");
      return;
    }
    try {
      await api.estimations.delete(id);
      navigate(-1);
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete estimation");
    }
  };

  const onSubmitForApproval = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await api.estimations.submitForApproval(id);
      toast.success("Estimation submitted for approval!");
      await loadEstimation(); // Refresh to get updated status
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to submit for approval");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }
  if (error || !estimation) {
    return (
      <div className="p-6">
        <Button variant="outline" onClick={() => navigate(-1)} className="mb-4"><ArrowLeft className="w-4 h-4 mr-2"/>Back</Button>
        <div className="text-red-600">{error || "Not found"}</div>
      </div>
    );
  }

  const hoursOf = (r: any) => r?.hours || {};
  const isEditing = (row: number, field: string) => editing && editing.row === row && editing.field === field;
  const startEdit = (row: number, field: string) => setEditing({ row, field });
  const stopEdit = () => setEditing(null);

  const platformOptions = ["NA", "Desktop", "Web", "Mobile", "AI/ML Model"];
  const makeReuseOptions = ["Make", "Reuse"];
  const complexityOptions = ["Simple", "Average", "Complex"];
  const baseHours = (r: any) => {
    const h = hoursOf(r);
    return (
      (Number(h.ui_design) || 0) +
      (Number(h.ui_module) || 0) +
      (Number(h.backend_logic) || 0) +
      (Number(h.general) || 0) +
      (Number(h.service_api) || 0) +
      (Number(h.db_structure) || 0) +
      (Number(h.db_programming) || 0) +
      (Number(h.db_udf) || 0)
    );
  };
  const grandTotal = rows.reduce((sum: number, r: any) => sum + baseHours(r), 0);
  const totalWithContingency = rows.reduce((sum: number, r: any) => sum + (baseHours(r) * (1 + (Number(r.contingency_pct) || 0))), 0);
  const summary = estimation?.envelope?.summary || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Estimation Details</h1>
          <p className="text-muted-foreground">ID: {estimation.id}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4 mr-2"/>Back</Button>
          <Button onClick={onSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          <Button variant="destructive" onClick={onDelete}>Delete</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project</CardTitle>
          <CardDescription>Top-level information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm">Project Title</label>
              <Input value={form.projectTitle} onChange={(e) => onChange("projectTitle", e.target.value)} />
            </div>
            <div>
              <label className="text-sm">Client</label>
              <Input value={form.clientName} onChange={(e) => onChange("clientName", e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm">Description</label>
              <Textarea rows={3} value={form.description} onChange={(e) => onChange("description", e.target.value)} />
            </div>
            <div>
              <label className="text-sm">Status</label>
              <div>
                <Badge variant="outline">{form.status}</Badge>
              </div>
            </div>
            <div>
              <label className="text-sm">Estimator</label>
              {String(user?.role || "").toLowerCase() === "admin" ? (
                <Select value={form.estimatorId || ""} onValueChange={(val) => {
                  const selected = users.find(u => (u.id || u._id) === val);
                  setForm((p: any) => ({ ...p, estimatorId: val, estimator: selected?.name || p.estimator }));
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder={form.estimator || "Select estimator"} />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u: any) => (
                      <SelectItem key={u.id || u._id} value={(u.id || u._id)}>{u.name} ({u.role})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={form.estimator} readOnly />
              )}
            </div>
            <div>
              <label className="text-sm">Created</label>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4" />
                {estimation.createdAt}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Approval Status Card */}
      {(estimation.approval_status === 'pending' || estimation.status === 'pending_approval') && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Pending Approval
            </CardTitle>
            <CardDescription>
              Your estimation has been submitted for admin approval.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
      
      {estimation.approval_status === 'approved' && (
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Approved
            </CardTitle>
            <CardDescription>
              {estimation.approved_at && (
                <>Approved on {new Date(estimation.approved_at).toLocaleDateString()}</>
              )}
            </CardDescription>
          </CardHeader>
          {estimation.approval_comment && (
            <CardContent>
              <p className="text-sm"><strong>Admin Comment:</strong> {estimation.approval_comment}</p>
            </CardContent>
          )}
        </Card>
      )}
      
      {estimation.approval_status === 'rejected' && (
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              Rejected
            </CardTitle>
            <CardDescription>
              {estimation.approved_at && (
                <>Rejected on {new Date(estimation.approved_at).toLocaleDateString()}</>
              )}
            </CardDescription>
          </CardHeader>
          {estimation.approval_comment && (
            <CardContent>
              <p className="text-sm"><strong>Admin Comment:</strong> {estimation.approval_comment}</p>
            </CardContent>
          )}
        </Card>
      )}

      <div className="flex justify-between items-center">
        <div>
          {/* Submit for Approval button - only show for estimators on their own draft/ready estimations */}
          {(user?.role?.toLowerCase() === 'estimator' || user?.role?.toLowerCase() === 'ops') && 
           estimation.estimatorId === user?.id && 
           !estimation.approval_status && 
           (estimation.status === 'draft' || estimation.status === 'ready_for_pricing' || estimation.status === 'pending_review') && (
            <Button onClick={onSubmitForApproval} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Send className="w-4 h-4 mr-2" />
              {saving ? 'Submitting...' : 'Submit for Approval'}
            </Button>
          )}
        </div>
        <Button variant="outline" onClick={async () => {
          try {
            const envelope = estimation.envelope || { schema_version: "1.0", project: {}, rows: [] };
            const payload = {
              schema_version: envelope.schema_version || "1.0",
              project: {
                ...(envelope.project || {}),
                name: form.projectTitle,
                client: form.clientName,
                description: form.description || envelope.project?.description || "",
                estimator: { id: form.estimatorId || 0, name: form.estimator || "" },
              },
              rows: rows,
            };
            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
            const file = new File([blob], `${form.projectTitle || "estimation"}.json`, { type: "application/json" });
            const excelBlob = await api.tools.processEstimation(file);
            const url = URL.createObjectURL(excelBlob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${form.projectTitle || "estimation"}_FILLED.xlsx`;
            a.click();
            URL.revokeObjectURL(url);
          } catch (err) {
            console.error("Excel generation failed", err);
          }
        }}>Download Excel</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Features</CardTitle>
          <CardDescription>{rows.length} items • Editable inline</CardDescription>
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
                {rows.map((r: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell onClick={() => startEdit(i, "platform")}>
                      {isEditing(i, "platform") ? (
                        <Select value={r.platform || ""} onValueChange={(value) => { setRows(prev => prev.map((row, idx) => idx === i ? { ...row, platform: value } : row)); stopEdit(); }}>
                          <SelectTrigger><SelectValue placeholder="Select platform" /></SelectTrigger>
                          <SelectContent>
                            {platformOptions.map(opt => (<SelectItem key={opt} value={opt}>{opt}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="cursor-pointer">{r.platform || "-"}</span>
                      )}
                    </TableCell>
                    <TableCell onClick={() => startEdit(i, "module")}>
                      {isEditing(i, "module") ? (
                        <Input autoFocus value={r.module || ""} onBlur={stopEdit} onChange={(e) => setRows(prev => prev.map((row, idx) => idx === i ? { ...row, module: e.target.value } : row))} />
                      ) : (
                        <span className="cursor-pointer">{r.module || "-"}</span>
                      )}
                    </TableCell>
                    <TableCell onClick={() => startEdit(i, "component")}>
                      {isEditing(i, "component") ? (
                        <Input autoFocus value={r.component || ""} onBlur={stopEdit} onChange={(e) => setRows(prev => prev.map((row, idx) => idx === i ? { ...row, component: e.target.value } : row))} />
                      ) : (
                        <span className="cursor-pointer">{r.component || "-"}</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[360px] whitespace-pre-wrap" onClick={() => startEdit(i, "feature")}>
                      {isEditing(i, "feature") ? (
                        <Textarea autoFocus rows={2} value={r.feature || ""} onBlur={stopEdit} onChange={(e) => setRows(prev => prev.map((row, idx) => idx === i ? { ...row, feature: e.target.value } : row))} />
                      ) : (
                        <span className="cursor-pointer">{r.feature || "-"}</span>
                      )}
                    </TableCell>
                    <TableCell onClick={() => startEdit(i, "make_or_reuse")}>
                      {isEditing(i, "make_or_reuse") ? (
                        <Select value={r.make_or_reuse || "Make"} onValueChange={(value) => { setRows(prev => prev.map((row, idx) => idx === i ? { ...row, make_or_reuse: value } : row)); stopEdit(); }}>
                          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            {makeReuseOptions.map(opt => (<SelectItem key={opt} value={opt}>{opt}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="cursor-pointer">{r.make_or_reuse || "Make"}</span>
                      )}
                      {r.reuse_source && (
                        <span className="text-xs text-muted-foreground block">{r.reuse_source}</span>
                      )}
                    </TableCell>
                    <TableCell onClick={() => startEdit(i, "complexity")}>
                      {isEditing(i, "complexity") ? (
                        <Select value={r.complexity || "Average"} onValueChange={(value) => { setRows(prev => prev.map((row, idx) => idx === i ? { ...row, complexity: value } : row)); stopEdit(); }}>
                          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            {complexityOptions.map(opt => (<SelectItem key={opt} value={opt}>{opt}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="cursor-pointer">{r.complexity || "Average"}</span>
                      )}
                    </TableCell>
                    <TableCell onClick={() => startEdit(i, "num_components")}>
                      {isEditing(i, "num_components") ? (
                        <Input autoFocus type="number" className="w-24 text-right" value={r.num_components ?? 0} onFocus={(e) => (e.target as HTMLInputElement).select()} onBlur={stopEdit} onChange={(e) => setRows(prev => prev.map((row, idx) => idx === i ? { ...row, num_components: Number(e.target.value) } : row))} />
                      ) : (
                        <span className="cursor-pointer">{r.num_components ?? 0}</span>
                      )}
                    </TableCell>
                    
                    
                    
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Versions</CardTitle>
          <CardDescription>
            Current: v{estimation.currentVersion?.version_number ?? estimation.current_version?.version_number ?? "1"} • Total { (estimation.versions?.length ?? 0) + 1 }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  estimation.currentVersion || estimation.current_version,
                  ...(estimation.versions || [])
                ].filter(Boolean).map((v: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell>v{v.version_number}</TableCell>
                    <TableCell>{v.created_by}</TableCell>
                    <TableCell>{new Date(v.created_at).toISOString().split('T')[0]}</TableCell>
                    <TableCell className="max-w-[360px] whitespace-pre-wrap">{v.notes || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
