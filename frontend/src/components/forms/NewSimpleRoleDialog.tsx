import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Users } from "lucide-react";

interface NewSimpleRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: (roleName: string) => void;
}

export default function NewSimpleRoleDialog({ open, onOpenChange, onComplete }: NewSimpleRoleDialogProps) {
  const [roleName, setRoleName] = useState("");

  const handleSubmit = () => {
    if (!roleName.trim()) return;
    onComplete?.(roleName);
    onOpenChange(false);
    setRoleName("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Add New Role
          </DialogTitle>
          <DialogDescription>
            Create a new resource role.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="roleName">Role Name *</Label>
            <Input
              id="roleName"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              placeholder="e.g. QA Engineer"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={!roleName.trim()}
          >
            Create Role
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
