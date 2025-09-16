import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Calculator, DollarSign, Calendar, User } from "lucide-react";

interface EstimationDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  estimation: any;
  onUpdate: (updatedEstimation: any) => void;
}

export default function EstimationDetailsDialog({
  open,
  onOpenChange,
  estimation,
  onUpdate
}: EstimationDetailsDialogProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    project: estimation?.project || "",
    client: estimation?.client || "",
    value: estimation?.value || "",
    estimator: estimation?.estimator || "",
    features: estimation?.features || 0
  });

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    const updatedEstimation = {
      ...estimation,
      ...formData
    };
    onUpdate(updatedEstimation);
    setIsEditing(false);
    toast({
      title: "Estimation updated",
      description: "The estimation has been updated successfully."
    });
  };

  const handleCancel = () => {
    setFormData({
      project: estimation?.project || "",
      client: estimation?.client || "",
      value: estimation?.value || "",
      estimator: estimation?.estimator || "",
      features: estimation?.features || 0
    });
    setIsEditing(false);
  };

  if (!estimation) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary" />
            Estimation Details - {estimation.id}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? "Edit estimation details" : "View and manage estimation details"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Basic Information</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="project">Project Title</Label>
                {isEditing ? (
                  <Input
                    id="project"
                    value={formData.project}
                    onChange={(e) => handleInputChange('project', e.target.value)}
                  />
                ) : (
                  <p className="text-sm p-2 bg-background rounded border">{estimation.project}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="client">Client Name</Label>
                {isEditing ? (
                  <Input
                    id="client"
                    value={formData.client}
                    onChange={(e) => handleInputChange('client', e.target.value)}
                  />
                ) : (
                  <p className="text-sm p-2 bg-background rounded border">{estimation.client}</p>
                )}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="estimator">Estimator</Label>
                {isEditing ? (
                  <Input
                    id="estimator"
                    value={formData.estimator}
                    onChange={(e) => handleInputChange('estimator', e.target.value)}
                  />
                ) : (
                  <p className="text-sm p-2 bg-background rounded border">{estimation.estimator}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="value">Estimated Value</Label>
                {isEditing ? (
                  <Input
                    id="value"
                    value={formData.value}
                    onChange={(e) => handleInputChange('value', e.target.value)}
                  />
                ) : (
                  <div className="flex items-center gap-2 text-sm p-2 bg-background rounded border">
                    <DollarSign className="w-4 h-4 text-green-500" />
                    {estimation.value}
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Status and Metadata */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Status & Details</h3>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Status</Label>
                <Badge className={
                  estimation.status === 'approved' ? 'bg-green-500/20 text-green-500 border-green-500/30' :
                  estimation.status === 'pending_review' ? 'bg-orange-500/20 text-orange-500 border-orange-500/30' :
                  estimation.status === 'in_progress' ? 'bg-blue-500/20 text-blue-500 border-blue-500/30' :
                  estimation.status === 'draft' ? 'bg-gray-500/20 text-gray-500 border-gray-500/30' :
                  'bg-red-500/20 text-red-500 border-red-500/30'
                }>
                  {estimation.status.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
              <div className="space-y-2">
                <Label>Features Count</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    value={formData.features}
                    onChange={(e) => handleInputChange('features', parseInt(e.target.value) || 0)}
                    onFocus={(e) => e.target.select()}
                  />
                ) : (
                  <Badge variant="outline">{estimation.features} features</Badge>
                )}
              </div>
              <div className="space-y-2">
                <Label>Created Date</Label>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4" />
                  {estimation.createdAt}
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          {isEditing ? (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleSave} className="btn-primary">
                Save Changes
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button onClick={() => setIsEditing(true)} className="btn-primary">
                Edit Estimation
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}