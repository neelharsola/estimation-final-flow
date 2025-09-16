import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast as sonnerToast } from "sonner";
import {
  Dialog,
  DialogContent,
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

interface ProjectInfo {
  name: string;
  client: string;
  description?: string;
}

interface EstimationRow {
  platform: string;
  module: string;
  component: string;
  feature: string;
  make_or_reuse: "Make" | "Reuse";
  reuse_source?: string;
  complexity: "Simple" | "Average" | "Complex";
  hours: {
    ui_design: number;
    ui_module: number;
    backend_logic: number;
    general: number;
    service_api: number;
    db_structure: number;
    db_programming: number;
    db_udf: number;
  };
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
  hours: {
    ui_design: 0,
    ui_module: 0,
    backend_logic: 0,
    general: 0,
    service_api: 0,
    db_structure: 0,
    db_programming: 0,
    db_udf: 0,
  },
  num_components: 1,
  assumptions: [],
  risks: [],
  dependencies: [],
};

const steps = [
  { id: 1, title: "Project Info", icon: FileText },
  { id: 2, title: "Features", icon: Calculator },
  { id: 3, title: "Resources", icon: Users },
  { id: 4, title: "Review", icon: CheckCircle },
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

  const handleJSONUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonData = JSON.parse(e.target?.result as string);
        
        // Validate JSON structure
        if (!jsonData.project || !jsonData.rows) {
          throw new Error("Invalid JSON structure");
        }

        setEstimationData({
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
            hours: {
              ui_design: row.hours?.ui_design || 0,
              ui_module: row.hours?.ui_module || 0,
              backend_logic: row.hours?.backend_logic || 0,
              general: row.hours?.general || 0,
              service_api: row.hours?.service_api || 0,
              db_structure: row.hours?.db_structure || 0,
              db_programming: row.hours?.db_programming || 0,
              db_udf: row.hours?.db_udf || 0,
            },
            num_components: row.num_components || 1,
            assumptions: row.assumptions || [],
            risks: row.risks || [],
            dependencies: row.dependencies || [],
          })),
        });

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
    setEstimationData(prev => ({
      ...prev,
      rows: prev.rows.map((row, i) => 
        i === index 
          ? { ...row, [field]: value }
          : row
      ),
    }));
  };

  const updateRowHours = (index: number, hourType: string, value: number) => {
    setEstimationData(prev => ({
      ...prev,
      rows: prev.rows.map((row, i) => 
        i === index 
          ? { 
              ...row, 
              hours: { ...row.hours, [hourType]: value }
            }
          : row
      ),
    }));
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

    // Duplicate project name check
    try {
      const existing = await api.estimations.list();
      const titles = (existing || []).map((e: any) => (e.title || e.name || "").toLowerCase());
      if (titles.includes(estimationData.project.name.trim().toLowerCase())) {
        sonnerToast.error("Project name already exists. Please choose a different name.");
        return;
      }
    } catch {}

    setIsProcessing(true);
    try {
      // Create JSON file from current data with updated structure
      const jsonData = {
        schema_version: "1.0",
        project: {
          name: estimationData.project.name,
          client: estimationData.project.client,
          description: estimationData.project.description || "",
          estimator: {
            name: user?.name || "Unknown",
            id: 1
          }
        },
        rows: estimationData.rows.length > 0 ? estimationData.rows : []
      };
      
      const jsonBlob = new Blob([JSON.stringify(jsonData, null, 2)], {
        type: "application/json",
      });
      const jsonFile = new File([jsonBlob], `${estimationData.project.name}.json`, {
        type: "application/json",
      });

      // Send to backend for processing
      const excelBlob = await api.tools.processEstimation(jsonFile);
      
      // Download the processed Excel file
      const url = URL.createObjectURL(excelBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${estimationData.project.name}_FILLED.xlsx`;
      a.click();
      URL.revokeObjectURL(url);

      sonnerToast.success("Excel generated and estimation saved.");
      
      // Notify parent component and close
      if (onComplete) {
        const estimation = {
          id: `EST-${Date.now()}`,
          projectTitle: estimationData.project.name,
          clientName: estimationData.project.client,
          status: "in_progress",
          estimator: user?.name || "Unknown",
          createdAt: new Date().toISOString().split('T')[0],
          description: estimationData.project.description || `Estimation with ${estimationData.rows.length} features`
        };
        onComplete(estimation);
      }
      
      onOpenChange(false);
    } catch (error: any) {
      console.error("Processing error:", error);
      const message = error?.message || "Failed to process estimation. Please try again.";
      sonnerToast.error(message);
      if (onComplete) {
        const failed = {
          id: `EST-${Date.now()}`,
          projectTitle: estimationData.project.name,
          clientName: estimationData.project.client,
          status: "failed",
          estimator: user?.name || "Unknown",
          createdAt: new Date().toISOString().split('T')[0],
          description: estimationData.project.description || `Estimation with ${estimationData.rows.length} features`
        };
        onComplete(failed);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const calculateTotalHours = (row: EstimationRow): number => {
    return Object.values(row.hours).reduce((sum, hours) => sum + hours, 0);
  };

  const calculateGrandTotal = (): number => {
    return estimationData.rows.reduce((total, row) => total + calculateTotalHours(row), 0);
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
            
            
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Feature Breakdown</h3>
              <Button onClick={addRow} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Feature
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
                      <Label>Feature Description</Label>
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
                      
                      <div className="space-y-2">
                        <Label>Components Count</Label>
                        <Input
                          type="number"
                          min="0"
                          value={row.num_components}
                          onChange={(e) => updateRow(index, "num_components", Number(e.target.value))}
                        />
                      </div>
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
            <h3 className="text-lg font-semibold">Resource Allocation</h3>
            
            <div className="space-y-4">
              {estimationData.rows.map((row, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-medium">{row.feature || `Feature #${index + 1}`}</h4>
                      <p className="text-sm text-muted-foreground">{row.module} - {row.component}</p>
                    </div>
                    <Badge variant="outline">
                      {calculateTotalHours(row)} hours
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>UI Design</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.5"
                        value={row.hours.ui_design}
                        onChange={(e) => updateRowHours(index, "ui_design", Number(e.target.value))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>UI Module</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.5"
                        value={row.hours.ui_module}
                        onChange={(e) => updateRowHours(index, "ui_module", Number(e.target.value))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Backend Logic</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.5"
                        value={row.hours.backend_logic}
                        onChange={(e) => updateRowHours(index, "backend_logic", Number(e.target.value))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>General</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.5"
                        value={row.hours.general}
                        onChange={(e) => updateRowHours(index, "general", Number(e.target.value))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Service/API</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.5"
                        value={row.hours.service_api}
                        onChange={(e) => updateRowHours(index, "service_api", Number(e.target.value))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>DB Structure</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.5"
                        value={row.hours.db_structure}
                        onChange={(e) => updateRowHours(index, "db_structure", Number(e.target.value))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>DB Programming</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.5"
                        value={row.hours.db_programming}
                        onChange={(e) => updateRowHours(index, "db_programming", Number(e.target.value))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>DB UDF</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.5"
                        value={row.hours.db_udf}
                        onChange={(e) => updateRowHours(index, "db_udf", Number(e.target.value))}
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            
            <Card className="p-4 bg-muted/50">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">Total Estimation</h4>
                  <p className="text-sm text-muted-foreground">
                    {estimationData.rows.length} features • {calculateGrandTotal()} base hours
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">
                    {Math.round(calculateGrandTotal() * 1.1)} hours
                  </div>
                  <p className="text-sm text-muted-foreground">
                    With 10% contingency
                  </p>
                </div>
              </div>
            </Card>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Review & Save</h3>
            
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
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Base Hours:</span>
                    <span>{calculateGrandTotal()}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Total with Contingency:</span>
                    <span>{Math.round(calculateGrandTotal() * 1.1)}</span>
                  </div>
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
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Contingency:</span>
                    <span>10%</span>
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
                      <TableHead>Components</TableHead>
                      <TableHead className="text-right">Hours</TableHead>
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
                        <TableCell>{row.num_components}</TableCell>
                        <TableCell className="text-right">{calculateTotalHours(row)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
            
            <Card className="p-6">
              <div className="text-center space-y-4">
                <h4 className="text-xl font-semibold">Save Estimation</h4>
                <p className="text-muted-foreground">
                  Review all details above. Click save to generate and download the Excel and persist the estimation.
                </p>
                <Button
                  onClick={handleProcessAndDownload}
                  disabled={isProcessing || !estimationData.project.name.trim() || !estimationData.project.client.trim()}
                  className="gap-2 px-8 py-3"
                  size="lg"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Save Estimation
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary" />
            Create New Estimation
          </DialogTitle>
          <DialogDescription>
            Upload a JSON file or follow the steps to create a comprehensive project estimation
          </DialogDescription>
        </DialogHeader>

        {/* Stepper Navigation */}
        <div className="flex items-center justify-center mb-6">
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

        {/* Step Content */}
        <div className="min-h-[400px]">
          {renderStepContent()}
        </div>

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
                onClick={() => setCurrentStep(prev => Math.min(steps.length, prev + 1))}
                className="gap-2"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : null}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
