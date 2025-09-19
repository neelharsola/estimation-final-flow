import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Calculator, 
  Clock, 
  DollarSign, 
  TrendingUp, 
  ArrowUpRight,
  Building2,
  Calendar,
  CheckCircle,
  XCircle,
  Eye
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

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    active_estimations: 0,
    pending_reviews: 0,
    pricing_ready_estimations: 0
  });
  const [recentEstimations, setRecentEstimations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  
  const isAdmin = user?.role?.toLowerCase() === 'admin';
  
  // Redirect admins to AdminDashboard
  useEffect(() => {
    if (isAdmin) {
      navigate('/admin-dashboard');
    }
  }, [isAdmin, navigate]);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        // Load summary stats
        const summaryData = await api.dashboard.summary();
        setStats({
          active_estimations: summaryData.active_estimations || 0,
          pending_reviews: summaryData.pending_reviews || 0,
          pricing_ready_estimations: summaryData.pricing_ready_estimations || 0
        });

        // Load recent estimations
        const estimations = await api.estimations.list();
        const recentItems = estimations.slice(0, 5).map((estimation: any) => ({
          id: estimation.id || estimation._id,
          client: estimation.client || 'Unknown Client',
          project: estimation.title || 'Untitled Project',
          status: estimation.status || 'draft',
          approval_status: estimation.approval_status,
          creator_id: estimation.creator_id,
          estimator_name: estimation.estimator_name,
          created_at: estimation.created_at,
          updated_at: estimation.updated_at
        }));
        setRecentEstimations(recentItems);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
        // Keep default values (all 0) if API fails
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [location]);

  const statsData = [
    { title: "Active Estimations", value: stats.active_estimations, icon: Calculator, color: "text-blue-500" },
    { title: "Pending Reviews", value: stats.pending_reviews, icon: Clock, color: "text-orange-500" },
    { title: "Pricing Ready", value: stats.pricing_ready_estimations, icon: DollarSign, color: "text-green-500" },
    { title: "Total Projects", value: stats.active_estimations, icon: TrendingUp, color: "text-purple-500" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your estimations, proposals, and team performance
          </p>
        </div>
        <Button variant="outline" onClick={() => window.location.href = '/estimations'} className="gap-2">
          <ArrowUpRight className="w-4 h-4" />
          View All Estimations
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsData.map((stat) => (
          <Card key={stat.title} className="card-elevated card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '...' : stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {loading ? 'Loading...' : (stat.value === 0 ? 'No data available' : 'From database')}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Estimations */}
      <Card className="card-elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Estimations</CardTitle>
              <CardDescription>
                Latest project estimations from your database
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => window.location.href = '/estimations'}>
              View All
              <ArrowUpRight className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-muted rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : recentEstimations.length > 0 ? (
            <div className="space-y-3">
              {recentEstimations.map((estimation) => (
                <div key={estimation.id} className="p-4 rounded-lg bg-surface-elevated border border-border/50 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{estimation.project}</p>
                        <p className="text-xs text-muted-foreground">{estimation.client}</p>
                        {estimation.estimator_name && (
                          <p className="text-xs text-muted-foreground">by {estimation.estimator_name}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <div>
                        {getStatusBadge(estimation.status, estimation.approval_status)}
                        <div className="flex items-center gap-1 mt-1">
                          <Calendar className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {estimation.updated_at ? new Date(estimation.updated_at).toLocaleDateString() : 'No date'}
                          </span>
                        </div>
                      </div>
                      
                      {/* Admin actions for pending approval estimations */}
                      {isAdmin && (estimation.status === 'pending_approval' || estimation.approval_status === 'pending') && estimation.creator_id !== user?.id && (
                        <div className="flex items-center gap-1">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => navigate(`/pricing?estimation=${estimation.id}`)}
                            className="h-8 w-8 p-0"
                            title="Review & Price"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={async () => {
                              try {
                                await api.estimations.approve(estimation.id, 'Approved from dashboard');
                                // Refresh the list
                                window.location.reload();
                              } catch (error) {
                                console.error('Failed to approve:', error);
                              }
                            }}
                            className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                            title="Approve"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={async () => {
                              try {
                                await api.estimations.reject(estimation.id, 'Rejected from dashboard');
                                // Refresh the list
                                window.location.reload();
                              } catch (error) {
                                console.error('Failed to reject:', error);
                              }
                            }}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Reject"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calculator className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No estimations found</p>
              <p className="text-sm text-muted-foreground">Create your first estimation to get started</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}