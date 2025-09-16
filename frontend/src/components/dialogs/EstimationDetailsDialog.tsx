import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Calculator, Calendar } from "lucide-react";

interface EstimationDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  estimation: any;
  onUpdate: (updatedEstimation: any) => void;
}

export default function EstimationDetailsDialog({ open, onOpenChange, estimation, onUpdate }: EstimationDetailsDialogProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (estimation) {
      setFormData({
        projectTitle: estimation.projectTitle || "",
        clientName: estimation.clientName || "",
        description: estimation.description || "",
        estimator: estimation.estimator || "",
        status: estimation.status || "draft",
      });
    }
  }, [estimation]);

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    const updated = { ...estimation, ...formData };
    onUpdate(updated);
    setIsEditing(false);
    toast({ title: "Updated", description: "Changes applied locally." });
  };

  if (!estimation) return null;

  const envelope = estimation.envelope;
  const rows = envelope?.rows || [];

  const totalHours = rows.reduce((sum: number, r: any) => {
    const h = r.hours || {};
    const subtotal = Object.values(h).reduce((a: any, b: any) => a + (Number(b) || 0), 0);
    return sum + subtotal;
  }, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary" />
            Estimation Details - {estimation.id}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? "Edit top-level details" : "View full estimation details"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-8">
          {/* Top-level details */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Project Title</Label>
              {isEditing ? (
                <Input value={formData.projectTitle} onChange={(e) => handleInputChange("projectTitle", e.target.value)} />
              ) : (
                <p className="text-sm p-2 bg-background rounded border">{estimation.projectTitle}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Client Name</Label>
              {isEditing ? (
                <Input value={formData.clientName} onChange={(e) => handleInputChange("clientName", e.target.value)} />
              ) : (
                <p className="text-sm p-2 bg-background rounded border">{estimation.clientName}</p>
              )}
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Description</Label>
              {isEditing ? (
                <Textarea rows={3} value={formData.description} onChange={(e) => handleInputChange("description", e.target.value)} />
              ) : (
                <p className="text-sm p-2 bg-background rounded border whitespace-pre-wrap">{estimation.description || "-"}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Estimator</Label>
              {isEditing ? (
                <Input value={formData.estimator} onChange={(e) => handleInputChange("estimator", e.target.value)} />
              ) : (
                <p className="text-sm p-2 bg-background rounded border">{estimation.estimator}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Badge variant="outline">{(estimation.status || "draft").replace("_", " ")}</Badge>
            </div>
            <div className="space-y-2">
              <Label>Created</Label>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4" />
                {estimation.createdAt}
              </div>
            </div>
          </div>

          <Separator />

          {/* Envelope / rows details */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Features ({rows.length})</h3>
              <div className="text-sm text-muted-foreground">Approx base hours: {totalHours}</div>
            </div>
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
                  {rows.map((r: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>{r.platform}</TableCell>
                      <TableCell>{r.module}</TableCell>
                      <TableCell>{r.component}</TableCell>
                      <TableCell className="max-w-[320px] whitespace-pre-wrap">{r.feature}</TableCell>
                      <TableCell>
                        {r.make_or_reuse}
                        {r.make_or_reuse === "Reuse" && r.reuse_source ? (
                          <span className="text-xs text-muted-foreground block">{r.reuse_source}</span>
                        ) : null}
                      </TableCell>
                      <TableCell>{r.complexity}</TableCell>
                      <TableCell>{r.num_components}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <DialogFooter>
          {isEditing ? (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
              <Button onClick={handleSave} className="btn-primary">Save</Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
              <Button onClick={() => setIsEditing(true)} className="btn-primary">Edit</Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}