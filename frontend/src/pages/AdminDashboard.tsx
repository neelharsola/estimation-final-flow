import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Search,
  Calendar,
  User,
  Building2,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Eye,
  DollarSign
} from "lucide-react";

const getStatusBadge = (status: string, approvalStatus?: string) => {
  // Handle approval-specific statuses
  if (status === "approved" || approvalStatus === "approved") {
    return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Approved</Badge>;
  }
  if (status === "rejected" || approvalStatus === "rejected") {
    return <Badge className="bg-red-500/20 text-red-500 border-red-500/30">Rejected</Badge>;
  }
  if (status === "pending_approval" || approvalStatus === "pending") {
    return <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30">Pending Approval</Badge>;
  }
  
  // Handle other statuses
  switch (status) {
    case "pending_review":
      return <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">Pending Review</Badge>;
    case "under_review":
      return <Badge className="bg-orange-500/20 text-orange-500 border-orange-500/30">Under Review</Badge>;
    case "ready_for_pricing":
      return <Badge className="bg-purple-500/20 text-purple-500 border-purple-500/30">Ready for Pricing</Badge>;
    case "draft":
      return <Badge className="bg-gray-500/20 text-gray-500 border-gray-500/30">Draft</Badge>;
    default:
      return <Badge variant="secondary">{status.replace('_', ' ')}</Badge>;
  }
};

const getStatusIcon = (status: string, approvalStatus?: string) => {
  if (status === "approved" || approvalStatus === "approved") {
    return <CheckCircle className="w-5 h-5 text-green-500" />;
  }
  if (status === "rejected" || approvalStatus === "rejected") {
    return <XCircle className="w-5 h-5 text-red-500" />;
  }
  if (status === "pending_approval" || approvalStatus === "pending") {
    return <AlertTriangle className="w-5 h-5 text-amber-500" />;
  }
  if (status === "pending_review") {
    return <Clock className="w-5 h-5 text-blue-500" />;
  }
  return <Building2 className="w-5 h-5 text-gray-500" />;
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [estimations, setEstimations] = useState<any[]>([]);
  const [filteredEstimations, setFilteredEstimations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [stats, setStats] = useState({
    total: 0,
    pending_review: 0,
    pending_approval: 0,
    approved: 0,
    rejected: 0
  });

  const isAdmin = user?.role?.toLowerCase() === 'admin';

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
      return;
    }
    loadEstimations();
  }, [isAdmin, navigate]);

  const loadEstimations = async () => {
    setLoading(true);
    try {
      const data = await api.estimations.list();
      setEstimations(data);
      setFilteredEstimations(data);
      
      // Calculate stats
      const stats = {
        total: data.length,
        pending_review: data.filter((e: any) => e.status === 'pending_review').length,
        pending_approval: data.filter((e: any) => e.status === 'pending_approval' || e.approval_status === 'pending').length,
        approved: data.filter((e: any) => e.status === 'approved' || e.approval_status === 'approved').length,
        rejected: data.filter((e: any) => e.status === 'rejected' || e.approval_status === 'rejected').length
      };
      setStats(stats);
    } catch (error) {
      console.error('Failed to load estimations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const filtered = estimations.filter((estimation) => 
      estimation.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      estimation.client?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      estimation.estimator_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredEstimations(filtered);
  }, [searchQuery, estimations]);

  const handleApprovalAction = async (estimationId: string, action: 'approve' | 'reject') => {
    try {
      if (action === 'approve') {
        await api.estimations.approve(estimationId, 'Quick approved from admin dashboard');
      } else {
        await api.estimations.reject(estimationId, 'Quick rejected from admin dashboard');
      }
      await loadEstimations(); // Refresh the list
    } catch (error) {
      console.error(`Failed to ${action} estimation:`, error);
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage and review all project estimations
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="card-elevated">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Estimations</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card className="card-elevated">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{stats.pending_review}</div>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">{stats.pending_approval}</div>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats.approved}</div>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{stats.rejected}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <Search className="w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by project name, client, or estimator..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Estimations Grid */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="card-elevated animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded"></div>
                  <div className="h-3 bg-muted rounded w-4/5"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredEstimations.map((estimation) => (
            <Card key={estimation.id} className="card-elevated hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(estimation.status, estimation.approval_status)}
                    <div>
                      <CardTitle className="text-base">{estimation.title}</CardTitle>
                      <CardDescription>{estimation.client}</CardDescription>
                    </div>
                  </div>
                  {getStatusBadge(estimation.status, estimation.approval_status)}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Estimator:</span>
                  </div>
                  <span className="font-medium">{estimation.estimator_name || 'Unknown'}</span>
                  
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Created:</span>
                  </div>
                  <span>{estimation.created_at ? new Date(estimation.created_at).toLocaleDateString() : 'Unknown'}</span>
                </div>

                {estimation.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {estimation.description}
                  </p>
                )}

                <div className="flex items-center gap-2">
                  <Button 
                    onClick={() => navigate(`/pricing?estimation=${estimation.id}`)}
                    className="flex-1"
                    size="sm"
                  >
                    <DollarSign className="w-4 h-4 mr-2" />
                    View Pricing
                  </Button>
                  
                  {(estimation.status === 'pending_approval' || estimation.approval_status === 'pending') && 
                   estimation.creator_id !== user?.id && (
                    <div className="flex gap-1">
                      <Button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApprovalAction(estimation.id, 'approve');
                        }}
                        size="sm"
                        variant="outline"
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                      <Button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApprovalAction(estimation.id, 'reject');
                        }}
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <XCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && filteredEstimations.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No estimations found</p>
          {searchQuery && (
            <p className="text-sm text-muted-foreground">Try adjusting your search terms</p>
          )}
        </div>
      )}
    </div>
  );
}