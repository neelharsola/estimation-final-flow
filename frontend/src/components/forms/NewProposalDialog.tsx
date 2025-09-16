import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface NewProposalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: (proposal: any) => void;
}

// Mock approved estimations that can be converted to proposals
const approvedEstimations = [
  { id: "EST-001", projectTitle: "E-commerce Platform Redesign", clientName: "Acme Corp", value: "$45,000" },
  { id: "EST-002", projectTitle: "Mobile App Development", clientName: "Tech Solutions Inc", value: "$28,500" },
  { id: "EST-006", projectTitle: "CRM Integration", clientName: "Global Enterprise", value: "$67,800" }
];

export default function NewProposalDialog({ open, onOpenChange, onComplete }: NewProposalDialogProps) {
  const [selectedEstimation, setSelectedEstimation] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [validityDays, setValidityDays] = useState("30");
  const [discount, setDiscount] = useState("");
  const [notes, setNotes] = useState("");
  const { toast } = useToast();

  const handleSubmit = () => {
    const estimation = approvedEstimations.find(e => e.id === selectedEstimation);
    if (!estimation) return;

    const proposal = {
      id: `PROP-${Date.now().toString().slice(-3)}`,
      client: estimation.clientName,
      project: customTitle || estimation.projectTitle,
      status: "draft",
      createdAt: new Date().toISOString().split('T')[0],
      sentAt: null,
      value: estimation.value,
      estimationId: estimation.id,
      validUntil: new Date(Date.now() + parseInt(validityDays) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      clientEmail,
      discount: discount ? parseFloat(discount) : 0,
      notes
    };

    onComplete?.(proposal);
    onOpenChange(false);
    
    // Reset form
    setSelectedEstimation("");
    setCustomTitle("");
    setClientEmail("");
    setValidityDays("30");
    setDiscount("");
    setNotes("");

    toast({
      title: "Proposal Created",
      description: `Proposal for ${proposal.project} has been created successfully.`,
    });
  };

  const selectedEst = approvedEstimations.find(e => e.id === selectedEstimation);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Create New Proposal
          </DialogTitle>
          <DialogDescription>
            Generate a client proposal from an approved estimation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Source Estimation *</Label>
            <Select value={selectedEstimation} onValueChange={setSelectedEstimation}>
              <SelectTrigger>
                <SelectValue placeholder="Select an approved estimation" />
              </SelectTrigger>
              <SelectContent>
                {approvedEstimations.map((est) => (
                  <SelectItem key={est.id} value={est.id}>
                    {est.id} - {est.projectTitle} ({est.value})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedEst && (
            <div className="p-4 bg-surface-elevated rounded-lg border">
              <h4 className="font-medium mb-2">Estimation Details</h4>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Client:</span>
                  <span>{selectedEst.clientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Project:</span>
                  <span>{selectedEst.projectTitle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Value:</span>
                  <span className="font-medium text-green-600">{selectedEst.value}</span>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Custom Project Title</Label>
            <Input
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="Leave empty to use estimation title"
            />
          </div>

          <div className="space-y-2">
            <Label>Client Email *</Label>
            <Input
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="client@company.com"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Valid for (days)</Label>
              <Select value={validityDays} onValueChange={setValidityDays}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="45">45 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Discount (%)</Label>
              <Input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder="0"
                min="0"
                max="50"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Additional Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special terms or conditions..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={!selectedEstimation || !clientEmail}
            className="btn-primary"
          >
            Create Proposal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}