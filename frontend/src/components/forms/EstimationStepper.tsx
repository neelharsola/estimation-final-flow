import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast as sonnerToast } from "sonner";
import {
  Dialog as UIDialog,
  DialogContent as UIDialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Trash2, 
  Upload, 
  Download, 
  ChevronLeft, 
  ChevronRight,
  FileText,
  Calculator,
  Users,
  Settings,
  CheckCircle,
  X
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import NewSimpleRoleDialog from "./NewSimpleRoleDialog";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

interface ProjectInfo {
  name: string;
  client: string;
  description?: string;
}

interface EstimationRow {
  row_id?: string;
  platform: string;
  module: string;
  component: string;
  feature: string;
  make_or_reuse: "Make" | "Reuse";
  reuse_source?: string;
  complexity: "Simple" | "Average" | "Complex";
  num_components: number;
  assumptions?: string[];
  risks?: string[];
  dependencies?: string[];
}

interface EstimationData {
  schema_version: string;
  project: ProjectInfo;
  rows: EstimationRow[];
}

const initialRow: EstimationRow = {
  platform: "Web",
  module: "",
  component: "",
  feature: "",
  make_or_reuse: "Make",
  reuse_source: "",
  complexity: "Average",
  num_components: 1,
  assumptions: [],
  risks: [],
  dependencies: [],
};

const steps = [
  { id: 1, title: "Import JSON", icon: FileText },
  { id: 2, title: "Review & Export", icon: Calculator },
  { id: 3, title: "Upload Excel", icon: FileText },
  { id: 4, title: "Resources", icon: Users },
  { id: 5, title: "Pricing", icon: Calculator },
  { id: 6, title: "Final Pricing", icon: Settings },
];

interface EstimationStepperProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: (estimation: any) => void;
}

export default function EstimationStepper({ open, onOpenChange, onComplete }: EstimationStepperProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [estimationData, setEstimationData] = useState<EstimationData>({
    schema_version: "1.0",
    project: {
      name: "",
      client: "",
      description: ""
    },
    rows: [{ ...initialRow }],
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [estimationId, setEstimationId] = useState<string | null>(null);
  const [finalized, setFinalized] = useState<boolean>(false);
  const [resources, setResources] = useState<Array<{ role: string; count: number; days: number }>>([]);
  const [pricingRows, setPricingRows] = useState<Array<{ role: string; days: number; count: number; hourlyRate: number; dayRate: number; totalCost: number }>>([]);
  const [discountPct, setDiscountPct] = useState<number>(0);
  const [contingencyPct, setContingencyPct] = useState<number>(0);
  const [allResources, setAllResources] = useState<any[]>([]);
  const [fx, setFx] = useState<{ base: string; rates: Record<string, number> }>({ base: "USD", rates: { AED: 3.6725, INR: 87.78, GBP: 0.73, USD: 1 } });
    const canManageResources = ["admin", "estimator", "ops"].includes(String(user?.role || "").toLowerCase());
  const [isNewResourceDialogOpen, setIsNewResourceDialogOpen] = useState(false);
  
  // Debug logging
  console.log("Current user:", user, "canManageResources:", canManageResources);
  const [newRoleName, setNewRoleName] = useState("");

  const handleCreateNewRole = async (roleName: string) => {
    const trimmedRoleName = roleName.trim();
    if (!trimmedRoleName) {
      sonnerToast.error("Role name cannot be empty.");
      return;
    }
    if (allResources.some(r => r.role.toLowerCase() === trimmedRoleName.toLowerCase())) {
      sonnerToast.error(`Role '${trimmedRoleName}' already exists.`);
      return;
    }
    try {
      const created = await api.resources.create({ name: trimmedRoleName, role: trimmedRoleName, rates: {} });
      setAllResources(prev => [created, ...prev]);
      sonnerToast.success(`Role '${trimmedRoleName}' created successfully.`);
      setIsNewResourceDialogOpen(false);
      setNewRoleName("");
    } catch (e: any) {
      sonnerToast.error(e?.message || "Failed to create new role.");
    }
  };

  // persist helper
  const persistEnvelope = useCallback(async (data: EstimationData, resources?: any[]): Promise<string> => {
    try {
      const envelope = {
        schema_version: data.schema_version,
        project: {
          name: data.project.name,
          client: data.project.client,
          description: data.project.description || "",
          estimator: { name: user?.name || "Unknown", id: user?.id || "1" },
        },
        rows: data.rows.map(r => ({
          row_id: r.row_id,
          platform: r.platform,
          module: r.module,
          component: r.component,
          feature: r.feature,
          make_or_reuse: r.make_or_reuse,
          reuse_source: r.reuse_source || "",
          complexity: r.complexity,
          num_components: r.num_components,
        })),
        resources: resources || [],
      };
      if (!estimationId) {
        const res = await api.estimations.importEnvelope(envelope);
        const id = res.estimation_id || res.id;
        setEstimationId(id);
        return id;
      } else {
        await api.estimations.updateEnvelope(estimationId, envelope);
        return estimationId;
      }
    } catch (e) {
      // silent toast to avoid spamming
      return Promise.reject(e);
    }
  }, [estimationId, user]);

  const handleJSONUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const jsonData = JSON.parse(e.target?.result as string);
        
        // Validate JSON structure
        if (!jsonData.project || !jsonData.rows) {
          throw new Error("Invalid JSON structure");
        }

        const nextData: EstimationData = {
          schema_version: jsonData.schema_version || "1.0",
          project: {
            name: jsonData.project.name || "",
            client: jsonData.project.client || "Auto-imported",
            description: jsonData.project.description || ""
          },
          rows: jsonData.rows.map((row: any) => ({
            platform: row.platform || "Web",
            module: row.module || "",
            component: row.component || "",
            feature: row.feature || "",
            make_or_reuse: row.make_or_reuse || "Make",
            reuse_source: row.reuse_source || "",
            complexity: row.complexity || "Average",
            num_components: row.num_components || 1,
            assumptions: row.assumptions || [],
            risks: row.risks || [],
            dependencies: row.dependencies || [],
          })),
        };
        setEstimationData(nextData);
        // create estimation immediately and await id
        // Persisting on upload is disabled by user request.

        sonnerToast.success("JSON uploaded successfully! Form has been populated.");
        
        // Reset file input
        event.target.value = "";
      } catch (error) {
        console.error("JSON parsing error:", error);
        sonnerToast.error("Invalid JSON format. Please check your file.");
      }
    };
    reader.readAsText(file);
  }, []);

  const addRow = () => {
    setEstimationData(prev => ({
      ...prev,
      rows: [...prev.rows, { ...initialRow }],
    }));
  };

  const removeRow = (index: number) => {
    if (estimationData.rows.length <= 1) {
      sonnerToast.error("Cannot remove the last row");
      return;
    }
    setEstimationData(prev => ({
      ...prev,
      rows: prev.rows.filter((_, i) => i !== index),
    }));
  };

  const updateRow = (index: number, field: string, value: any) => {
    setEstimationData(prev => {
      const next = {
      ...prev,
        rows: prev.rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
      };
      // Persisting on row update is disabled by user request.
      return next;
    });
  };

  const handleProcessAndDownload = async () => {
    if (!estimationData.project.name.trim()) {
      sonnerToast.error("Please enter a project name");
      return;
    }
    
    if (!estimationData.project.client.trim()) {
      sonnerToast.error("Please enter a client name");
      return;
    }

    // Skip duplicate name check to allow regeneration even if a project exists

    setIsProcessing(true);
    try {
      const envelope = {
        schema_version: estimationData.schema_version,
        project: {
          name: estimationData.project.name,
          client: estimationData.project.client,
          description: estimationData.project.description || "",
          estimator: { name: user?.name || "Unknown", id: user?.id || "1" },
        },
        rows: estimationData.rows,
        summary: {
          row_count: 0,
          total_hours: 0,
          total_hours_with_contingency: 0,
          single_resource_duration_days: 0,
          single_resource_duration_months: 0,
          notes: [],
        }
      };
      const jsonString = JSON.stringify(envelope, null, 2);
      const jsonFile = new File([jsonString], "estimation.json", { type: "application/json" });
      const excelBlob = await api.tools.processEstimation(jsonFile);

      // Download the processed Excel file
      const url = URL.createObjectURL(excelBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${estimationData.project.name}_FILLED.xlsx`;
      a.click();
      URL.revokeObjectURL(url);

      sonnerToast.success("Excel generated successfully.");
    } catch (error: any) {
      console.error("Processing error:", error);
      const message = error?.message || "Failed to process estimation. Please try again.";
      sonnerToast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const finalize = async () => {
    if (finalized) return;
    
    // Check for duplicate project names before finalizing
    if (!estimationData.project.name.trim()) {
      sonnerToast.error("Project name is required");
      return;
    }
    
    try {
      // Check for existing estimations with the same name
      const allEstimations = await api.estimations.list();
      const duplicateExists = allEstimations.some(e => 
        e.title.toLowerCase() === estimationData.project.name.trim().toLowerCase() && 
        e.id !== estimationId // Allow updating current estimation
      );
      
      if (duplicateExists) {
        sonnerToast.error(
          "An estimation with this project name already exists. Please choose a different name.",
          { duration: 5000 }
        );
        // Navigate back to first step to allow changing the name
        setCurrentStep(1);
        return;
      }
      
      // Pass resources to persistEnvelope to create/update atomically
      const id = await persistEnvelope(estimationData, resources);
      if (!id) {
        throw new Error("Failed to create estimation");
      }
      
      // Save pricing resources if available
      if (pricingRows.length > 0) {
        try {
          await api.estimations.updatePricingResources(id, pricingRows);
        } catch (error) {
          console.error("Failed to save pricing resources:", error);
        }
      } else if (resources.length > 0) {
        // Convert basic resources to pricing format with default values
        const defaultPricingResources = resources.map(r => ({
          role: r.role,
          days: r.days,
          count: r.count,
          hourly_rate: 0,
          day_rate: 0,
          currency: "USD",
          region: "default",
          total_cost: 0
        }));
        try {
          await api.estimations.updatePricingResources(id, defaultPricingResources);
        } catch (error) {
          console.error("Failed to save default pricing resources:", error);
        }
      }
      
      // Finalize the estimation
      await api.estimations.finalize(id);
      
      setFinalized(true);
      sonnerToast.success("Estimation finalized and saved successfully!");
      if (onComplete) {
        onComplete({ id, projectTitle: estimationData.project.name, clientName: estimationData.project.client });
      }
      onOpenChange(false);
    } catch (e: any) {
      if (e?.message?.includes("already exists")) {
        sonnerToast.error(e.message, { duration: 5000 });
        // Navigate back to first step to allow changing the name
        setCurrentStep(1);
      } else {
        sonnerToast.error(e?.message || "Failed to finalize estimation");
      }
    }
  };

  const onUploadExcel = async (file: File) => {
    try {
      let id = estimationId;
      if (!id) {
        id = await persistEnvelope(estimationData, resources);
        setEstimationId(id);
      }
      const result = await api.estimations.uploadExcel(id as string, file);
      const { matched, updated, unmatched, rows, resources: parsedResources } = result || { matched: 0, updated: 0, unmatched: 0, rows: [], resources: [] };
      if (Array.isArray(rows) && rows.length > 0) {
        setEstimationData(prev => {
          const nextRows = [...prev.rows];
          const byId = new Map<string, number>();
          nextRows.forEach((r, idx) => { if (r.row_id) byId.set(r.row_id, idx); });
          rows.forEach((r: any) => {
            const idx = r.row_id && byId.has(r.row_id) ? (byId.get(r.row_id) as number) : -1;
            if (idx >= 0) {
              nextRows[idx] = {
                ...nextRows[idx],
                platform: r.platform ?? nextRows[idx].platform,
                module: r.module ?? nextRows[idx].module,
                component: r.component ?? nextRows[idx].component,
                feature: r.feature ?? nextRows[idx].feature,
                make_or_reuse: r.make_or_reuse ?? nextRows[idx].make_or_reuse,
                complexity: r.complexity ?? nextRows[idx].complexity,
              };
            }
          });
          const updatedData = { ...prev, rows: nextRows };
          // Persisting on excel upload is disabled by user request.
          return updatedData;
        });
      }
      if (Array.isArray(parsedResources) && parsedResources.length > 0) {
        const nextRes = parsedResources.map((r: any) => ({ role: r.role, count: r.count, days: r.days }));
        setResources(nextRes);
        setPricingRows(nextRes.map((r: any) => ({ role: r.role, days: Number(r.days) || 0, count: Number(r.count) || 0, hourlyRate: 0, dayRate: 0, totalCost: 0 })));
      }
      sonnerToast.success(`Excel uploaded. Matched: ${matched}, Updated: ${updated}, Unmatched: ${unmatched}`);
    } catch (e: any) {
      sonnerToast.error(e?.message || "Failed to parse Excel");
    }
  };

  useEffect(() => {
    (async () => {
      try { const list = await api.resources.list(); setAllResources(list || []); } catch {}
      try { const data = await api.pricing.fx("USD", "AED,INR,GBP,USD"); if (data?.rates) setFx({ base: data.base, rates: data.rates }); } catch {}
    })();
  }, []);

  const addResourceToRow = (index: number, resourceId: string) => {
    const found = allResources.find((r) => (r.id || r._id) === resourceId);
    if (!found) return;
    setResources((prev) => {
      const next = [...prev];
      next[index] = next[index] || { role: found.role, count: 1, days: 10 };
      next[index].role = found.role;
      return next;
    });
  };

  const quickCreateResource = async () => {
    if (!canManageResources) return;
    try {
      const name = window.prompt("Resource name") || "";
      const role = window.prompt("Role") || "";
      const usdStr = window.prompt("USD day rate (optional)") || "";
      if (!name || !role) return;
      const payload: any = { name, role, rates: {} };
      if (usdStr) payload.rates.USD = Number(usdStr) || 0;
      const created = await api.resources.create(payload);
      setAllResources((prev) => [created, ...prev]);
      sonnerToast.success("Resource added");
    } catch (e: any) {
      sonnerToast.error(e?.message || "Failed to add resource");
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            {/* Prominent JSON Upload Section */}
            <Card className="p-6 border-2 border-dashed border-primary/20 bg-primary/5">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                  <Upload className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Quick Start: Upload Estimation JSON</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Upload your estimate.json file to automatically populate all project details and features
                  </p>
                </div>
                <div className="space-y-2">
                  <Input
                    id="json-upload"
                    type="file"
                    accept=".json"
                    onChange={handleJSONUpload}
                    className="cursor-pointer max-w-sm mx-auto file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                  />
                  <p className="text-xs text-muted-foreground">
                    Or fill out the form manually below
                  </p>
                </div>
              </div>
            </Card>
            
            {/* Manual Form Section */}
            <Card className="p-4">
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Manual Entry</CardTitle>
                <CardDescription>Fill out project details manually if not using JSON upload</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="project-name">Project Name *</Label>
                <Input
                  id="project-name"
                  value={estimationData.project.name}
                  onChange={(e) => setEstimationData(prev => ({
                    ...prev,
                    project: { ...prev.project, name: e.target.value }
                  }))}
                  placeholder="Enter project name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="client-name">Client Name *</Label>
                <Input
                  id="client-name"
                  value={estimationData.project.client}
                  onChange={(e) => setEstimationData(prev => ({
                    ...prev,
                    project: { ...prev.project, client: e.target.value }
                  }))}
                  placeholder="Enter client name"
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description">Project Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={estimationData.project.description || ""}
                  onChange={(e) => setEstimationData(prev => ({
                    ...prev,
                    project: { ...prev.project, description: e.target.value }
                  }))}
                  placeholder="Brief description of the project"
                  rows={3}
                />
              </div>
              
              {user && (
                <div className="space-y-2">
                  <Label>Estimator</Label>
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </div>
              )}
            </div>
              </CardContent>
            </Card>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            {/* Review parsed rows, inline edit of six fields */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Review Rows</h3>
              <Button onClick={addRow} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Row
              </Button>
            </div>
            
            <div className="space-y-4">
              {estimationData.rows.map((row, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium">Feature #{index + 1}</h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeRow(index)}
                      disabled={estimationData.rows.length <= 1}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="space-y-2">
                      <Label>Platform</Label>
                      <Select
                        value={row.platform}
                        onValueChange={(value) => updateRow(index, "platform", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Web">Web</SelectItem>
                          <SelectItem value="Mobile">Mobile</SelectItem>
                          <SelectItem value="Desktop">Desktop</SelectItem>
                          <SelectItem value="API">API</SelectItem>
                          <SelectItem value="AI/ML">AI/ML</SelectItem>
                          <SelectItem value="DevOps">DevOps</SelectItem>
                          <SelectItem value="Data">Data</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Module</Label>
                      <Input
                        value={row.module}
                        onChange={(e) => updateRow(index, "module", e.target.value)}
                        placeholder="e.g., Authentication"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Component</Label>
                      <Input
                        value={row.component}
                        onChange={(e) => updateRow(index, "component", e.target.value)}
                        placeholder="e.g., Login Form"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Features</Label>
                      <Textarea
                        value={row.feature}
                        onChange={(e) => updateRow(index, "feature", e.target.value)}
                        placeholder="Describe the feature in detail"
                        rows={2}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Make or Reuse</Label>
                        <Select
                          value={row.make_or_reuse}
                          onValueChange={(value) => updateRow(index, "make_or_reuse", value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Make">Make</SelectItem>
                            <SelectItem value="Reuse">Reuse</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Complexity</Label>
                        <Select
                          value={row.complexity}
                          onValueChange={(value) => updateRow(index, "complexity", value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Simple">Simple</SelectItem>
                            <SelectItem value="Average">Average</SelectItem>
                            <SelectItem value="Complex">Complex</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* No hours/time fields in this step */}
                    </div>
                    
                    {row.make_or_reuse === "Reuse" && (
                      <div className="space-y-2">
                        <Label>Reuse Source</Label>
                        <Input
                          value={row.reuse_source || ""}
                          onChange={(e) => updateRow(index, "reuse_source", e.target.value)}
                          placeholder="e.g., React Hook Form"
                        />
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
              <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Export & Upload Excel</h3>
              <div className="flex gap-2">
                <Button onClick={handleProcessAndDownload} className="gap-2" disabled={isProcessing}>
                  <Download className="w-4 h-4" /> Download Excel
                </Button>
                <div>
                  <Input type="file" accept=".xlsx" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadExcel(f); e.currentTarget.value = ""; }} />
                </div>
                  </div>
                </div>
            <Card className="p-4">
              <h4 className="font-medium mb-4">Upload Summary</h4>
              <p className="text-sm text-muted-foreground">After uploading, proceed to select resources.</p>
            </Card>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Resources</h3>
            <Card className="p-4">
              <h4 className="font-medium mb-4">General Resources</h4>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Resources</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>No. of Resources</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resources.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <p className="text-sm text-muted-foreground">Upload Excel or add resources.</p>
                        </TableCell>
                      </TableRow>
                    ) : resources.map((r, idx) => {
                      const usedRoles = resources.map(res => res.role);
                      const availableResources = allResources.filter(ar => !usedRoles.includes(ar.role) || ar.role === r.role);

                      return (
                      <TableRow key={idx}>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell>
                          <Select value={r.role} onValueChange={(val) => {
                            if (val === '__add_new__') {
                              setIsNewResourceDialogOpen(true);
                              return;
                            }
                            setResources(prev => prev.map((row, i) => i === idx ? { ...row, role: val } : row))
                          }}>
                            <SelectTrigger><SelectValue placeholder="Select resource" /></SelectTrigger>
                            <SelectContent>
                              {availableResources.map((ar: any) => (
                                <SelectItem key={ar.id || ar._id} value={ar.role}>{ar.role}</SelectItem>
                              ))}
                              {canManageResources && (
                                <SelectItem value="__add_new__" className="text-primary focus:text-primary">
                                  + Add new resource...
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input type="number" min="0" value={r.days} onChange={(e) => setResources(prev => prev.map((row, i) => i === idx ? { ...row, days: Number(e.target.value) } : row))} className="w-24" />
                        </TableCell>
                        <TableCell>
                          <Input type="number" min="0" value={r.count} onChange={(e) => setResources(prev => prev.map((row, i) => i === idx ? { ...row, count: Number(e.target.value) } : row))} className="w-24" />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => setResources(prev => prev.filter((_, i) => i !== idx))}>Remove</Button>
                        </TableCell>
                      </TableRow>
                    )})}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-end mt-4">
                <Button variant="outline" size="sm" onClick={() => {
                  const usedRoles = resources.map(r => r.role);
                  const availableRole = allResources.find(ar => !usedRoles.includes(ar.role));
                  const newRole = availableRole?.role || allResources[0]?.role || "AI/ML Developer";
                  setResources(prev => [...prev, { role: newRole, count: 1, days: 5 }]);
                }}>Add Row</Button>
              </div>
            </Card>

            
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-4">
                <h4 className="font-medium mb-4">Project Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Project:</span>
                    <span className="font-medium">{estimationData.project.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Estimator:</span>
                    <span>{user?.name || "Unknown"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Client:</span>
                    <span>{estimationData.project.client}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Features:</span>
                    <span>{estimationData.rows.length}</span>
                  </div>
                  {resources.length > 0 && (
                  <div className="flex justify-between">
                      <span className="text-muted-foreground">Resources Parsed:</span>
                      <span>{resources.length}</span>
                  </div>
                  )}
                </div>
              </Card>
              
              <Card className="p-4">
                <h4 className="font-medium mb-4">Configuration</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Hours/Day:</span>
                    <span>8</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Working Days/Month:</span>
                    <span>20</span>
                  </div>
                </div>
              </Card>
            </div>

            <Card className="p-4">
              <h4 className="font-medium mb-4">All Features</h4>
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
                      
                      
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {estimationData.rows.map((row, index) => (
                      <TableRow key={index}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{row.platform}</TableCell>
                        <TableCell>{row.module}</TableCell>
                        <TableCell>{row.component}</TableCell>
                        <TableCell className="max-w-[320px] whitespace-pre-wrap">{row.feature}</TableCell>
                        <TableCell>
                          {row.make_or_reuse}
                          {row.make_or_reuse === "Reuse" && row.reuse_source ? (
                            <span className="text-xs text-muted-foreground block">{row.reuse_source}</span>
                          ) : null}
                        </TableCell>
                        <TableCell>{row.complexity}</TableCell>
                        
                        
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
            
            <Card className="p-6">
              <div className="text-center space-y-4">
                <h4 className="text-xl font-semibold">Download final Excel</h4>
                <Button onClick={handleProcessAndDownload} disabled={isProcessing} className="gap-2 px-8 py-3" size="lg">
                  <Download className="w-4 h-4" /> Download Excel
                </Button>
              </div>
            </Card>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Pricing</h3>
              <Button 
                variant="outline" 
                onClick={() => {
                  // Add new pricing row with available role
                  const usedRoles = pricingRows.map(r => r.role);
                  const availableRoles = allResources.filter(ar => !usedRoles.includes(ar.role));
                  if (availableRoles.length > 0) {
                    const newRow = {
                      role: availableRoles[0].role,
                      days: 10,
                      count: 1,
                      hourlyRate: 0,
                      dayRate: 0,
                      totalCost: 0
                    };
                    setPricingRows(prev => [...prev, newRow]);
                  } else {
                    sonnerToast.error("All available roles are already used.");
                  }
                }}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Resource
              </Button>
            </div>
            
            <Card className="p-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Role</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Count</TableHead>
                      <TableHead>Hourly Rate (USD)</TableHead>
                      <TableHead>Day Rate (USD)</TableHead>
                      <TableHead>Total Cost (USD)</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pricingRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                          No pricing rows added. Click "Add Resource" to start.
                        </TableCell>
                      </TableRow>
                    ) : (
                      pricingRows.map((row, idx) => {
                        const usedRoles = pricingRows.map((r, i) => i !== idx ? r.role : null).filter(Boolean);
                        const availableRoles = allResources.filter(ar => !usedRoles.includes(ar.role));
                        // Get all roles that can be shown for this dropdown (current role + available roles)
                        const allSelectableRoles = allResources.filter(ar => 
                          ar.role === row.role || !usedRoles.includes(ar.role)
                        );
                        
                        return (
                          <TableRow key={idx}>
                            <TableCell className="min-w-[200px]">
                              <Select 
                                value={row.role} 
                                onValueChange={(newRole) => {
                                  if (newRole === '__add_new__') { 
                                    setIsNewResourceDialogOpen(true); 
                                    return; 
                                  }
                                  setPricingRows(prev => prev.map((r, i) => 
                                    i === idx ? { ...r, role: newRole } : r
                                  ));
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                  {/* All selectable roles (no duplicates) */}
                                  {allSelectableRoles.map(ar => (
                                    <SelectItem key={ar.id || ar._id} value={ar.role}>
                                      {ar.role}
                                    </SelectItem>
                                  ))}
                                  {canManageResources && <SelectItem value="__add_new__" className="text-primary focus:text-primary">+ Add new resource...</SelectItem>}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input 
                                type="number" 
                                min="0" 
                                step="0.5"
                                value={row.days}
                                onChange={(e) => {
                                  const days = Number(e.target.value) || 0;
                                  setPricingRows(prev => prev.map((r, i) => 
                                    i === idx ? { 
                                      ...r, 
                                      days, 
                                      totalCost: r.dayRate * days * r.count 
                                    } : r
                                  ));
                                }}
                                className="w-20" 
                              />
                            </TableCell>
                            <TableCell>
                              <Input 
                                type="number" 
                                min="0" 
                                value={row.count}
                                onChange={(e) => {
                                  const count = Number(e.target.value) || 0;
                                  setPricingRows(prev => prev.map((r, i) => 
                                    i === idx ? { 
                                      ...r, 
                                      count, 
                                      totalCost: r.dayRate * r.days * count 
                                    } : r
                                  ));
                                }}
                                className="w-20" 
                              />
                            </TableCell>
                            <TableCell>
                              <Input 
                                type="number" 
                                min="0" 
                                step="0.01"
                                value={row.hourlyRate}
                                onChange={(e) => {
                                  const hourlyRate = Number(e.target.value) || 0;
                                  const dayRate = hourlyRate * 8; // 8 hours per day
                                  setPricingRows(prev => prev.map((r, i) => 
                                    i === idx ? { 
                                      ...r, 
                                      hourlyRate, 
                                      dayRate, 
                                      totalCost: dayRate * r.days * r.count 
                                    } : r
                                  ));
                                }}
                                className="w-28" 
                                placeholder="0.00"
                              />
                            </TableCell>
                            <TableCell className="font-medium">
                              ${row.dayRate.toFixed(2)}
                            </TableCell>
                            <TableCell className="font-medium text-green-600">
                              ${row.totalCost.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setPricingRows(prev => prev.filter((_, i) => i !== idx))}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
              
              {/* Add summary section */}
              {pricingRows.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <Card className="p-3">
                    <h5 className="font-medium mb-2">Currency Rates</h5>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between"><span>AED</span><span>1 USD = {fx.rates.AED ?? 3.6725}</span></div>
                      <div className="flex justify-between"><span>INR</span><span>1 USD = {fx.rates.INR ?? 87.78}</span></div>
                      <div className="flex justify-between"><span>GBP</span><span>1 USD = {fx.rates.GBP ?? 0.73}</span></div>
                    </div>
                  </Card>
                  <Card className="p-3">
                    <h5 className="font-medium mb-2">Project Totals</h5>
                    <div className="text-sm space-y-1">
                      {(() => {
                        const subtotal = pricingRows.reduce((acc, r) => acc + r.totalCost, 0);
                        const totalHours = pricingRows.reduce((acc, r) => acc + (r.days * 8 * r.count), 0);
                        const totalDays = pricingRows.reduce((acc, r) => acc + (r.days * r.count), 0);
                        return (
                          <>
                            <div className="flex justify-between"><span>Total Hours</span><span>{totalHours}</span></div>
                            <div className="flex justify-between"><span>Total Days</span><span>{totalDays}</span></div>
                            <div className="flex justify-between font-semibold text-green-600"><span>Subtotal (USD)</span><span>${subtotal.toFixed(2)}</span></div>
                          </>
                        );
                      })()}
                    </div>
                  </Card>
                  <Card className="p-3">
                    <h5 className="font-medium mb-2">Other Currencies</h5>
                    <div className="text-sm space-y-1">
                      {(() => {
                        const subtotal = pricingRows.reduce((acc, r) => acc + r.totalCost, 0);
                        return (
                          <>
                            <div className="flex justify-between"><span>AED</span><span>{(subtotal * (fx.rates.AED || 3.6725)).toFixed(2)}</span></div>
                            <div className="flex justify-between"><span>INR</span><span>{(subtotal * (fx.rates.INR || 87.78)).toFixed(2)}</span></div>
                            <div className="flex justify-between"><span>GBP</span><span>{(subtotal * (fx.rates.GBP || 0.73)).toFixed(2)}</span></div>
                          </>
                        );
                      })()}
                    </div>
                  </Card>
                </div>
              )}
            </Card>
          </div>
        );

      case 6:
        {
          const rows = pricingRows.length ? pricingRows : resources.map(r => ({ role: r.role, days: r.days, count: r.count, hourlyRate: 0, dayRate: 0, totalCost: 0 }));
          const subtotal = rows.reduce((acc, r) => acc + (r.totalCost || 0), 0);
          const discountAmt = subtotal * (discountPct / 100);
          const afterDiscount = subtotal - discountAmt;
          const contingencyAmt = afterDiscount * (contingencyPct / 100);
          const finalTotal = afterDiscount + contingencyAmt;
          const totalHours = rows.reduce((acc, r) => acc + (r.days * 8 * r.count), 0);
          return (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Final Pricing</h3>
              <Card className="p-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Role</TableHead>
                        <TableHead>Days</TableHead>
                        <TableHead>Count</TableHead>
                        <TableHead>Hourly Rate</TableHead>
                        <TableHead>Day Rate</TableHead>
                        <TableHead>Total Cost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((r, i) => (
                        <TableRow key={i}>
                          <TableCell>{r.role}</TableCell>
                          <TableCell>{r.days}</TableCell>
                          <TableCell>{r.count}</TableCell>
                          <TableCell>{(r.hourlyRate || 0).toFixed(2)}</TableCell>
                          <TableCell>{(r.dayRate || 0).toFixed(2)}</TableCell>
                          <TableCell>{(r.totalCost || 0).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4">
                  <h4 className="font-medium mb-2">Adjustments</h4>
                  <div className="space-y-3">
                    <div>
                      <Label>Discount (%)</Label>
                      <Input type="number" min="0" value={discountPct} onChange={(e) => setDiscountPct(Number(e.target.value) || 0)} />
                    </div>
                    <div>
                      <Label>Contingency (%)</Label>
                      <Input type="number" min="0" value={contingencyPct} onChange={(e) => setContingencyPct(Number(e.target.value) || 0)} />
                    </div>
                  </div>
                </Card>
                <Card className="p-4">
                  <h4 className="font-medium mb-2">Summary</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Total Hours</span><span>{totalHours}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{subtotal.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span>-{discountAmt.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Contingency</span><span>+{contingencyAmt.toFixed(2)}</span></div>
                    <div className="flex justify-between font-semibold"><span>Final Total</span><span>{finalTotal.toFixed(2)}</span></div>
                  </div>
                </Card>
                <Card className="p-4">
                  <h4 className="font-medium mb-2">In Other Currencies</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span>AED</span><span>{(finalTotal * (fx.rates.AED || 3.6725)).toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>INR</span><span>{(finalTotal * (fx.rates.INR || 87.78)).toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>GBP</span><span>{(finalTotal * (fx.rates.GBP || 0.73)).toFixed(2)}</span></div>
                  </div>
                </Card>
              </div>

              
            </div>
          );
        }

      default:
        return null;
    }
  };

  return (
    <UIDialog open={open} onOpenChange={async (v) => {
      if (!v) {
        // Dialog closing; delete temp draft if not finalized
        try {
          if (estimationId && !finalized) {
            await api.estimations.delete(estimationId);
            setEstimationId(null);
          }
        } catch {}
      }
      onOpenChange(v);
    }}>
      <UIDialogContent className="max-w-[1320px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary" />
            Create New Estimation
            {estimationId ? (
              <span className="ml-2">
                <Badge variant={finalized ? "default" : "secondary"}>{finalized ? "Finalized" : "Draft (not saved)"}</Badge>
              </span>
            ) : null}
          </DialogTitle>
          <DialogDescription>
            Upload a JSON file or follow the steps to create a comprehensive project estimation
          </DialogDescription>
        </DialogHeader>

        {/* Stepper Navigation + Top Controls */}
        <div className="mb-6">
          <div className="flex items-center justify-center">
          <div className="flex items-center">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                    currentStep >= step.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-muted-foreground"
                  }`}
                >
                  <step.icon className="w-5 h-5" />
                </div>
                <div className="ml-3">
                  <p className={`text-sm font-medium ${
                    currentStep >= step.id ? "text-foreground" : "text-muted-foreground"
                  }`}>
                    {step.title}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-16 h-0.5 mx-6 ${
                    currentStep > step.id ? "bg-primary" : "bg-muted"
                  }`} />
                )}
              </div>
            ))}
          </div>
          </div>
          <div className="flex justify-between mt-4">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
              disabled={currentStep === 1}
              className="gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            {currentStep < steps.length && (
              <Button
                onClick={async () => {
                  if (currentStep === 1) {
                    if (!estimationData.project.name.trim()) {
                      sonnerToast.error("Project Name is required.");
                      return;
                    }
                    if (!estimationData.project.client.trim()) {
                      sonnerToast.error("Client name is required.");
                      return;
                    }
                    try {
                      const allEstimations = await api.estimations.list();
                      const duplicateExists = allEstimations.some(e => 
                        e.title.toLowerCase() === estimationData.project.name.trim().toLowerCase() && 
                        e.id !== estimationId // Allow updating current estimation
                      );
                      if (duplicateExists) {
                        sonnerToast.error(
                          "An estimation with this project name already exists. Please choose a different name.",
                          { duration: 5000 }
                        );
                        return;
                      }
                    } catch (error) {
                      console.error("Failed to check for existing estimations", error);
                      // Don't proceed if we can't validate uniqueness
                      sonnerToast.error("Unable to validate project name uniqueness. Please try again.");
                      return;
                    }
                  }

                  const nextStep = Math.min(steps.length, currentStep + 1);
                  // Auto-initialize pricing rows from resources when entering step 5
                  if (nextStep === 5 && pricingRows.length === 0 && resources.length > 0) {
                    setPricingRows(resources.map(r => ({
                      role: r.role,
                      days: r.days,
                      count: r.count,
                      hourlyRate: 0,
                      dayRate: 0,
                      totalCost: 0
                    })));
                  }
                  setCurrentStep(nextStep);
                }}
                className="gap-2"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Step Content */}
        <div className="min-h-[400px]">
          {renderStepContent()}
        </div>

                <NewSimpleRoleDialog
          open={isNewResourceDialogOpen}
          onOpenChange={setIsNewResourceDialogOpen}
          onComplete={handleCreateNewRole}
        />

        <DialogFooter>
          <div className="flex justify-between w-full">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
              disabled={currentStep === 1}
              className="gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            
            {currentStep < steps.length ? (
              <Button
                onClick={() => {
                  const nextStep = Math.min(steps.length, currentStep + 1);
                  // Auto-initialize pricing rows from resources when entering step 5
                  if (nextStep === 5 && pricingRows.length === 0 && resources.length > 0) {
                    setPricingRows(resources.map(r => ({
                      role: r.role,
                      days: r.days,
                      count: r.count,
                      hourlyRate: 0,
                      dayRate: 0,
                      totalCost: 0
                    })));
                  }
                  setCurrentStep(nextStep);
                }}
                className="gap-2"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button onClick={finalize} className="gap-2" disabled={finalized}>
                <CheckCircle className="w-4 h-4" />
                {finalized ? "Finalized" : "Finalize Estimation"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </UIDialogContent>
    </UIDialog>
  );
}
