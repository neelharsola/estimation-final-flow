import React, { useState, useEffect } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Save, Download, Upload, Calculator, FileSpreadsheet } from 'lucide-react';

interface EstimateRow {
  platform: string;
  module: string;
  component: string;
  feature: string;
  make_or_reuse: 'Make' | 'Reuse';
  reuse_source?: string;
  complexity: 'Simple' | 'Average' | 'Complex';
  previous_project_actual?: {
    project_name?: string;
    actual_working_days?: number;
  };
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
  source_refs: Array<{
    doc_id: string;
    section: string;
    page: number;
  }>;
  assumptions: string[];
  risks: string[];
  dependencies: string[];
  assumed: boolean;
  total_hours: number;
  contingency_pct: number;
  total_hours_with_contingency: number;
  single_resource_duration_days: number;
  single_resource_duration_months: number;
}

interface EstimateData {
  id?: string;
  schema_version: string;
  project: {
    name: string;
    estimator: {
      id: number;
      name: string;
    };
    hours_per_day: number;
    working_days_per_month: number;
    contingency_pct: number;
  };
  rows: EstimateRow[];
  summary: {
    row_count: number;
    total_hours: number;
    total_hours_with_contingency: number;
    single_resource_duration_days: number;
    single_resource_duration_months: number;
    notes: string[];
  };
}

interface EstimateEditorProps {
  estimateId?: string;
  initialData?: EstimateData;
  onSave?: (data: EstimateData) => Promise<void>;
  onExport?: (estimateId: string) => Promise<void>;
}

export const EstimateEditor: React.FC<EstimateEditorProps> = ({
  estimateId,
  initialData,
  onSave,
  onExport
}) => {
  const [estimate, setEstimate] = useState<EstimateData>(initialData || {
    schema_version: '1.0',
    project: {
      name: '',
      estimator: { id: 1, name: '' },
      hours_per_day: 8,
      working_days_per_month: 18,
      contingency_pct: 0.1
    },
    rows: [],
    summary: {
      row_count: 0,
      total_hours: 0,
      total_hours_with_contingency: 0,
      single_resource_duration_days: 0,
      single_resource_duration_months: 0,
      notes: []
    }
  });

  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Calculate row totals
  const calculateRowTotal = (row: EstimateRow): number => {
    const hours = row.hours;
    return Object.values(hours).reduce((sum, val) => sum + (val || 0), 0);
  };

  // Calculate row with contingency
  const calculateWithContingency = (total: number, contingencyPct: number): number => {
    return total * (1 + contingencyPct);
  };

  // Calculate duration
  const calculateDuration = (totalHours: number, hoursPerDay: number, workingDaysPerMonth: number) => {
    const days = Math.ceil(totalHours / hoursPerDay);
    const months = days / workingDaysPerMonth;
    return { days, months };
  };

  // Update row calculations
  const updateRowCalculations = (rowIndex: number) => {
    const updatedRows = [...estimate.rows];
    const row = updatedRows[rowIndex];
    
    row.total_hours = calculateRowTotal(row);
    row.total_hours_with_contingency = calculateWithContingency(row.total_hours, row.contingency_pct);
    
    const duration = calculateDuration(
      row.total_hours_with_contingency,
      estimate.project.hours_per_day,
      estimate.project.working_days_per_month
    );
    
    row.single_resource_duration_days = duration.days;
    row.single_resource_duration_months = duration.months;

    setEstimate(prev => ({
      ...prev,
      rows: updatedRows
    }));

    updateSummary(updatedRows);
  };

  // Update summary
  const updateSummary = (rows: EstimateRow[]) => {
    const totalHours = rows.reduce((sum, row) => sum + row.total_hours, 0);
    const totalWithContingency = rows.reduce((sum, row) => sum + row.total_hours_with_contingency, 0);
    
    const duration = calculateDuration(
      totalWithContingency,
      estimate.project.hours_per_day,
      estimate.project.working_days_per_month
    );

    setEstimate(prev => ({
      ...prev,
      summary: {
        ...prev.summary,
        row_count: rows.length,
        total_hours: totalHours,
        total_hours_with_contingency: totalWithContingency,
        single_resource_duration_days: duration.days,
        single_resource_duration_months: duration.months
      }
    }));
  };

  // Handle hours input change
  const handleHoursChange = (rowIndex: number, field: keyof EstimateRow['hours'], value: string) => {
    const numValue = parseFloat(value) || 0;
    const updatedRows = [...estimate.rows];
    updatedRows[rowIndex].hours[field] = numValue;
    
    setEstimate(prev => ({
      ...prev,
      rows: updatedRows
    }));

    updateRowCalculations(rowIndex);
  };

  // Handle field change
  const handleFieldChange = (rowIndex: number, field: keyof EstimateRow, value: any) => {
    const updatedRows = [...estimate.rows];
    (updatedRows[rowIndex] as any)[field] = value;
    
    setEstimate(prev => ({
      ...prev,
      rows: updatedRows
    }));

    if (field === 'contingency_pct') {
      updateRowCalculations(rowIndex);
    }
  };

  // Add new row
  const addNewRow = () => {
    const newRow: EstimateRow = {
      platform: 'Web',
      module: '',
      component: '',
      feature: '',
      make_or_reuse: 'Make',
      complexity: 'Average',
      hours: {
        ui_design: 0,
        ui_module: 0,
        backend_logic: 0,
        general: 0,
        service_api: 0,
        db_structure: 0,
        db_programming: 0,
        db_udf: 0
      },
      num_components: 0,
      source_refs: [],
      assumptions: [],
      risks: [],
      dependencies: [],
      assumed: true,
      total_hours: 0,
      contingency_pct: 0.1,
      total_hours_with_contingency: 0,
      single_resource_duration_days: 0,
      single_resource_duration_months: 0
    };

    setEstimate(prev => ({
      ...prev,
      rows: [...prev.rows, newRow]
    }));
  };

  // Delete row
  const deleteRow = (index: number) => {
    const updatedRows = estimate.rows.filter((_, i) => i !== index);
    setEstimate(prev => ({
      ...prev,
      rows: updatedRows
    }));
    updateSummary(updatedRows);
  };

  // Save estimate
  const handleSave = async () => {
    if (!onSave) return;
    
    setIsSaving(true);
    try {
      await onSave(estimate);
      toast.success('Estimate saved successfully');
    } catch (error) {
      toast.error('Failed to save estimate');
      console.error('Save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Export to Excel
  const handleExport = async () => {
    if (!onExport || !estimate.id) return;
    
    try {
      await onExport(estimate.id);
      toast.success('Excel file generated successfully');
    } catch (error) {
      toast.error('Failed to generate Excel file');
      console.error('Export error:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Project Information */}
      <Card>
        <CardHeader>
          <CardTitle>Project Information</CardTitle>
          <CardDescription>Basic project details and configuration</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Project Name</label>
            <Input
              value={estimate.project.name}
              onChange={(e) => setEstimate(prev => ({
                ...prev,
                project: { ...prev.project, name: e.target.value }
              }))}
              placeholder="Enter project name"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Estimator Name</label>
            <Input
              value={estimate.project.estimator.name}
              onChange={(e) => setEstimate(prev => ({
                ...prev,
                project: {
                  ...prev.project,
                  estimator: { ...prev.project.estimator, name: e.target.value }
                }
              }))}
              placeholder="Enter estimator name"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Hours per Day</label>
            <Input
              type="number"
              value={estimate.project.hours_per_day}
              onChange={(e) => setEstimate(prev => ({
                ...prev,
                project: { ...prev.project, hours_per_day: parseInt(e.target.value) || 8 }
              }))}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Working Days per Month</label>
            <Input
              type="number"
              value={estimate.project.working_days_per_month}
              onChange={(e) => setEstimate(prev => ({
                ...prev,
                project: { ...prev.project, working_days_per_month: parseInt(e.target.value) || 18 }
              }))}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Contingency %</label>
            <Input
              type="number"
              step="0.01"
              value={estimate.project.contingency_pct}
              onChange={(e) => setEstimate(prev => ({
                ...prev,
                project: { ...prev.project, contingency_pct: parseFloat(e.target.value) || 0.1 }
              }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Estimation Rows */}
      <Card>
        <CardHeader>
          <CardTitle>Estimation Details</CardTitle>
          <CardDescription>Add and edit estimation rows</CardDescription>
          <div className="flex gap-2 mt-4">
            <Button onClick={addNewRow} size="sm">
              <Upload className="mr-2 h-4 w-4" />
              Add Row
            </Button>
            <Button onClick={handleSave} disabled={isSaving} size="sm" variant="outline">
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Estimate'}
            </Button>
            {estimate.id && (
              <Button onClick={handleExport} size="sm" variant="outline">
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export to Excel
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Platform</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Component</TableHead>
                  <TableHead>Feature</TableHead>
                  <TableHead>Make/Reuse</TableHead>
                  <TableHead>Complexity</TableHead>
                  <TableHead>UI Design</TableHead>
                  <TableHead>UI Module</TableHead>
                  <TableHead>Backend Logic</TableHead>
                  <TableHead>General</TableHead>
                  <TableHead>Service/API</TableHead>
                  <TableHead>DB Structure</TableHead>
                  <TableHead>DB Programming</TableHead>
                  <TableHead>DB UDF</TableHead>
                  <TableHead># Components</TableHead>
                  <TableHead>Total Hours</TableHead>
                  <TableHead>With Contingency</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {estimate.rows.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Select
                        value={row.platform}
                        onValueChange={(value) => handleFieldChange(index, 'platform', value)}
                      >
                        <SelectTrigger className="w-24">
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
                    </TableCell>
                    <TableCell>
                      <Input
                        value={row.module}
                        onChange={(e) => handleFieldChange(index, 'module', e.target.value)}
                        className="w-32"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={row.component}
                        onChange={(e) => handleFieldChange(index, 'component', e.target.value)}
                        className="w-32"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={row.feature}
                        onChange={(e) => handleFieldChange(index, 'feature', e.target.value)}
                        className="w-40"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={row.make_or_reuse}
                        onValueChange={(value) => handleFieldChange(index, 'make_or_reuse', value)}
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Make">Make</SelectItem>
                          <SelectItem value="Reuse">Reuse</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={row.complexity}
                        onValueChange={(value) => handleFieldChange(index, 'complexity', value)}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Simple">Simple</SelectItem>
                          <SelectItem value="Average">Average</SelectItem>
                          <SelectItem value="Complex">Complex</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={row.hours.ui_design}
                        onChange={(e) => handleHoursChange(index, 'ui_design', e.target.value)}
                        className="w-16"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={row.hours.ui_module}
                        onChange={(e) => handleHoursChange(index, 'ui_module', e.target.value)}
                        className="w-16"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={row.hours.backend_logic}
                        onChange={(e) => handleHoursChange(index, 'backend_logic', e.target.value)}
                        className="w-16"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={row.hours.general}
                        onChange={(e) => handleHoursChange(index, 'general', e.target.value)}
                        className="w-16"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={row.hours.service_api}
                        onChange={(e) => handleHoursChange(index, 'service_api', e.target.value)}
                        className="w-16"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={row.hours.db_structure}
                        onChange={(e) => handleHoursChange(index, 'db_structure', e.target.value)}
                        className="w-16"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={row.hours.db_programming}
                        onChange={(e) => handleHoursChange(index, 'db_programming', e.target.value)}
                        className="w-16"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={row.hours.db_udf}
                        onChange={(e) => handleHoursChange(index, 'db_udf', e.target.value)}
                        className="w-16"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={row.num_components}
                        onChange={(e) => handleFieldChange(index, 'num_components', parseInt(e.target.value) || 0)}
                        className="w-16"
                      />
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{row.total_hours.toFixed(1)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="default">{row.total_hours_with_contingency.toFixed(1)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        onClick={() => deleteRow(index)}
                        size="sm"
                        variant="destructive"
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
          <CardDescription>Project totals and duration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm text-muted-foreground">Total Rows</label>
              <p className="text-2xl font-semibold">{estimate.summary.row_count}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Total Hours</label>
              <p className="text-2xl font-semibold">{estimate.summary.total_hours.toFixed(1)}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">With Contingency</label>
              <p className="text-2xl font-semibold">{estimate.summary.total_hours_with_contingency.toFixed(1)}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Duration (Months)</label>
              <p className="text-2xl font-semibold">{estimate.summary.single_resource_duration_months.toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EstimateEditor;