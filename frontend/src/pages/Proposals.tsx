import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import NewProposalDialog from "@/components/forms/NewProposalDialog";
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
  Download,
  FileText,
  Calendar,
  DollarSign,
  Send
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const initialProposals = [
  {
    id: "PROP-001",
    client: "Acme Corp",
    project: "E-commerce Platform Redesign", 
    status: "sent",
    createdAt: "2024-01-16",
    sentAt: "2024-01-17",
    value: "$45,000",
    estimationId: "EST-001",
    validUntil: "2024-02-16"
  },
  {
    id: "PROP-002",
    client: "Tech Solutions Inc",
    project: "Mobile App Development",
    status: "accepted",
    createdAt: "2024-01-13",
    sentAt: "2024-01-14", 
    value: "$28,500",
    estimationId: "EST-002",
    validUntil: "2024-02-13"
  },
  {
    id: "PROP-003",
    client: "Global Enterprise",
    project: "CRM Integration",
    status: "draft",
    createdAt: "2024-01-15",
    sentAt: null,
    value: "$67,800",
    estimationId: "EST-004",
    validUntil: "2024-02-15"
  },
  {
    id: "PROP-004",
    client: "StartupXYZ",
    project: "MVP Development",
    status: "under_review",
    createdAt: "2024-01-11",
    sentAt: "2024-01-12",
    value: "$15,200", 
    estimationId: "EST-003",
    validUntil: "2024-02-11"
  },
  {
    id: "PROP-005",
    client: "Local Business",
    project: "Website Revamp",
    status: "rejected",
    createdAt: "2024-01-06",
    sentAt: "2024-01-07",
    value: "$8,900",
    estimationId: "EST-005",
    validUntil: "2024-02-06"
  }
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case "accepted":
      return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Accepted</Badge>;
    case "sent":
      return <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">Sent</Badge>;
    case "under_review":
      return <Badge className="bg-orange-500/20 text-orange-500 border-orange-500/30">Under Review</Badge>;
    case "draft":
      return <Badge className="bg-gray-500/20 text-gray-500 border-gray-500/30">Draft</Badge>;
    case "rejected":
      return <Badge className="bg-red-500/20 text-red-500 border-red-500/30">Rejected</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

export default function Proposals() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [proposals, setProposals] = useState(initialProposals);
  const [isNewProposalOpen, setIsNewProposalOpen] = useState(false);

  const handleNewProposal = (newProposal: any) => {
    setProposals(prev => [newProposal, ...prev]);
  };

  const filteredProposals = proposals.filter((proposal) => {
    const matchesSearch = proposal.project.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         proposal.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         proposal.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || proposal.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Proposals</h1>
          <p className="text-muted-foreground">
            Manage client proposals and track their status
          </p>
        </div>
        <Button onClick={() => setIsNewProposalOpen(true)} className="gap-2 btn-primary">
          <Plus className="w-4 h-4" />
          New Proposal
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="card-elevated">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <Send className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">5</p>
                <p className="text-sm text-muted-foreground">Active Proposals</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-elevated">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">$165K</p>
                <p className="text-sm text-muted-foreground">Total Value</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-elevated">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">68%</p>
                <p className="text-sm text-muted-foreground">Acceptance Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-elevated">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">12</p>
                <p className="text-sm text-muted-foreground">Avg Response Days</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="card-elevated">
        <CardContent className="pt-6">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search proposals..."
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
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Proposals Table */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle>Client Proposals</CardTitle>
          <CardDescription>
            {filteredProposals.length} of {proposals.length} proposals
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Valid Until</TableHead>
                <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProposals.map((proposal) => (
                <TableRow key={proposal.id} className="hover:bg-surface-hover">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                        <FileText className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{proposal.project}</p>
                        <p className="text-sm text-muted-foreground">{proposal.id}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{proposal.client}</TableCell>
                  <TableCell>{getStatusBadge(proposal.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3 text-green-500" />
                      {proposal.value}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {proposal.createdAt}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                      {proposal.validUntil}
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
                        <DropdownMenuItem onClick={() => console.log('View proposal:', proposal.id)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => console.log('Edit proposal:', proposal.id)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => console.log('Export PDF:', proposal.id)}>
                          <Download className="mr-2 h-4 w-4" />
                          Export PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => console.log('Export DOCX:', proposal.id)}>
                          <Download className="mr-2 h-4 w-4" />
                          Export DOCX
                        </DropdownMenuItem>
                        {proposal.status === "draft" && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => {
                              const updatedProposals = proposals.map(p => 
                                p.id === proposal.id ? { ...p, status: "sent", sentAt: new Date().toISOString().split('T')[0] } : p
                              );
                              setProposals(updatedProposals);
                            }}>
                              <Send className="mr-2 h-4 w-4" />
                              Send to Client
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <NewProposalDialog 
        open={isNewProposalOpen} 
        onOpenChange={setIsNewProposalOpen}
        onComplete={handleNewProposal}
      />
    </div>
  );
}