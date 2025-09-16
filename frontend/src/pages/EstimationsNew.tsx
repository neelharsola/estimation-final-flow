import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Search, 
  Filter, 
  MoreHorizontal, 
  Eye, 
  Edit, 
  Trash2,
  Calculator,
  Calendar
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import EstimationStepper from "@/components/forms/EstimationStepper";
import { api } from "@/lib/api";

// No static data - all data loaded from backend

const getStatusBadge = (status: string) => {
  switch (status) {
    case "approved":
      return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Approved</Badge>;
    case "pending_review":
      return <Badge className="bg-orange-500/20 text-orange-500 border-orange-500/30">Pending Review</Badge>;
    case "in_progress":
      return <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">In Progress</Badge>;
    case "draft":
      return <Badge className="bg-gray-500/20 text-gray-500 border-gray-500/30">Draft</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

export default function EstimationsNew() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [estimations, setEstimations] = useState<any[]>([]);
  const [isStepperOpen, setIsStepperOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load estimations from backend
  useEffect(() => {
    const loadEstimations = async () => {
      try {
        const data = await api.estimations.list();
        const mapped = data.map((e: any) => ({
          id: e.id,
          projectTitle: e.title || "Untitled Project",
          clientName: e.client || "Unknown Client",
          description: e.description || "",
          status: e.status === "under_review" ? "pending_review" : e.status,
          estimator: e.creator_id || "Unknown",
          createdAt: new Date(e.created_at).toISOString().split('T')[0],
          resources: [],
          deliveryTimeline: "TBD"
        }));
        setEstimations(mapped);
      } catch (error) {
        console.error("Failed to load estimations:", error);
        setEstimations([]);
      } finally {
        setLoading(false);
      }
    };

    loadEstimations();
  }, []);

  const handleEstimationComplete = (newEstimation: any) => {
    setEstimations(prev => [newEstimation, ...prev]);
  };

  // Removed page-level quick upload; use Stepper's upload instead

  const filteredEstimations = estimations.filter((estimation) => {
    const matchesSearch = estimation.projectTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         estimation.clientName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || estimation.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Estimations</h1>
          <p className="text-muted-foreground">
            Manage project estimations with JSON/Excel workflow
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsStepperOpen(true)} className="gap-2 btn-primary">
            <Plus className="w-4 h-4" />
            New Estimation
          </Button>
        </div>
      </div>

      {/* Page-level quick upload removed; use Stepper's upload */}

      {/* Estimation Stepper Dialog */}
      <EstimationStepper 
        open={isStepperOpen}
        onOpenChange={setIsStepperOpen}
        onComplete={handleEstimationComplete}
      />

      {/* Filters */}
      <Card className="card-elevated">
        <CardContent className="pt-6">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search estimations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="pending_review">Pending Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Estimations Table */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle>Project Estimations</CardTitle>
          <CardDescription>
            {filteredEstimations.length} of {estimations.length} estimations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2 text-muted-foreground">Loading estimations...</span>
            </div>
          ) : filteredEstimations.length === 0 ? (
            <div className="text-center py-8">
              <Calculator className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No estimations found</h3>
              <p className="text-muted-foreground mb-4">
                {estimations.length === 0 
                  ? "Create your first estimation to get started." 
                  : "No estimations match your search criteria."
                }
              </p>
              {estimations.length === 0 && (
                <Button onClick={() => setIsStepperOpen(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Create First Estimation
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Estimator</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEstimations.map((estimation) => (
                  <TableRow key={estimation.id} className="hover:bg-surface-hover">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Calculator className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{estimation.projectTitle}</p>
                          <p className="text-sm text-muted-foreground">{estimation.id}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{estimation.clientName}</TableCell>
                    <TableCell>{getStatusBadge(estimation.status)}</TableCell>
                    <TableCell>{estimation.estimator}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {estimation.createdAt}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}