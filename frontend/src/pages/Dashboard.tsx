import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { 
  Calculator, 
  Clock, 
  DollarSign, 
  TrendingUp, 
  ArrowUpRight,
  Building2,
  Calendar
} from "lucide-react";


const getStatusBadge = (status: string) => {
  switch (status) {
    case "approved":
      return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Approved</Badge>;
    case "pending_review":
      return <Badge className="bg-orange-500/20 text-orange-500 border-orange-500/30">Pending Review</Badge>;
    case "in_progress":
      return <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">In Progress</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

export default function Dashboard() {
  const [stats, setStats] = useState({
    active_estimations: 0,
    pending_reviews: 0,
    pricing_ready_estimations: 0
  });
  const [recentEstimations, setRecentEstimations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

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
                      </div>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(estimation.status)}
                      <div className="flex items-center gap-1 mt-1">
                        <Calendar className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {estimation.updated_at ? new Date(estimation.updated_at).toLocaleDateString() : 'No date'}
                        </span>
                      </div>
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