import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface NewRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: (role: any) => void;
}

const regions = [
  { name: "UAE", flag: "🇦🇪" },
  { name: "UK", flag: "🇬🇧" },
  { name: "USA", flag: "🇺🇸" },
  { name: "India", flag: "🇮🇳" },
  { name: "Europe", flag: "🇪🇺" }
];

export default function NewRoleDialog({ open, onOpenChange, onComplete }: NewRoleDialogProps) {
  const [roleName, setRoleName] = useState("");
  const [description, setDescription] = useState("");
  const [rates, setRates] = useState<{ [key: string]: number }>({
    UAE: 0,
    UK: 0,
    USA: 0,
    India: 0,
    Europe: 0
  });
  const { toast } = useToast();

  const updateRate = (region: string, value: string) => {
    setRates(prev => ({
      ...prev,
      [region]: parseFloat(value) || 0
    }));
  };

  const handleSubmit = () => {
    if (!roleName.trim()) return;

    const role = {
      name: roleName,
      description,
      rates,
      createdAt: new Date().toISOString().split('T')[0],
      createdBy: "Current User"
    };

    onComplete?.(role);
    onOpenChange(false);
    
    // Reset form
    setRoleName("");
    setDescription("");
    setRates({
      UAE: 0,
      UK: 0,
      USA: 0,
      India: 0,
      Europe: 0
    });

    toast({
      title: "Role Created",
      description: `${roleName} role has been created with regional pricing.`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Add New Role
          </DialogTitle>
          <DialogDescription>
            Create a new role with regional pricing
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="roleName">Role Name *</Label>
            <Input
              id="roleName"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              placeholder="e.g. Full Stack Developer"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the role responsibilities..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Regional Daily Rates (USD)</Label>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Region</TableHead>
                    <TableHead>Daily Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {regions.map((region) => (
                    <TableRow key={region.name}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{region.flag}</span>
                          <span>{region.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-green-500" />
                          <Input
                            type="number"
                            value={rates[region.name]}
                            onChange={(e) => updateRate(region.name, e.target.value)}
                            placeholder="0"
                            className="w-24"
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={!roleName.trim()}
            className="btn-primary"
          >
            Create Role
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}