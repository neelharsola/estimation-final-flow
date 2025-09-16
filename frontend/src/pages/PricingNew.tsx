import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
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
  DollarSign,
  Calculator,
  Users,
  Clock,
  CheckCircle,
  Globe,
  Plus,
  Minus
} from "lucide-react";

// Load estimations ready for pricing from backend

// Pricing rates will be fetched from backend if needed

const regions = ["US", "UK", "UAE", "India"];

export default function PricingNew() {
  const [selectedEstimation, setSelectedEstimation] = useState<string | null>(null);
  const [pendingPricingEstimations, setPendingPricingEstimations] = useState<any[]>([]);
  const [pricingRates, setPricingRates] = useState<Record<string, Record<string, number>>>({});
  const [selectedRegion, setSelectedRegion] = useState("US");
  const [customCharges, setCustomCharges] = useState(0);
  const [discount, setDiscount] = useState(0);
  const { toast } = useToast();

  const calculateResourceCost = (role: string, region: string, days: number) => {
    const rate = pricingRates[role]?.[region] || 0;
    return rate * days;
  };

  const calculateTotalCost = (estimation: any) => {
    if (!estimation) return 0;
    
    let total = 0;
    estimation.resources.forEach((resource: any) => {
      total += calculateResourceCost(resource.role, selectedRegion, resource.days);
    });
    
    // Apply custom charges and discounts
    total += customCharges;
    total -= (total * discount / 100);
    
    return total;
  };

  const getSelectedEstimation = () => pendingPricingEstimations.find(est => est.id === selectedEstimation);

  useEffect(() => {
    (async () => {
      try {
        const { api } = await import("@/lib/api");
        const ests = await api.estimations.list();
        const ready = ests.filter((e: any) => e.status === "ready_for_pricing");
        setPendingPricingEstimations(ready.map((e: any) => ({
          id: e.id,
          projectTitle: e.title,
          clientName: e.client,
          resources: e.current_version?.resources || [],
          reviewedAt: new Date(e.updated_at).toISOString().split('T')[0],
        })));
        // Optionally fetch rates and build a simple rates map keyed by role/region
        const rates = await api.pricing.rates.list();
        const map: Record<string, Record<string, number>> = {};
        rates.forEach((r: any) => {
          if (!map[r.role]) map[r.role] = {};
          map[r.role][r.region] = r.day_rate;
        });
        setPricingRates(map);
      } catch {}
    })();
  }, []);

  const handleApprovePricing = () => {
    if (!selectedEstimation) return;
    
    toast({
      title: "Pricing Approved",
      description: "Estimation is now ready for proposal generation"
    });
    
    // Reset form
    setSelectedEstimation(null);
    setCustomCharges(0);
    setDiscount(0);
  };

  const estimation = getSelectedEstimation();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pricing</h1>
          <p className="text-muted-foreground">
            Review estimations and calculate final pricing
          </p>
        </div>
      </div>

      {/* Workflow Steps */}
      <Card className="card-elevated">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm">1</div>
              <span className="font-medium">Estimation</span>
            </div>
            <div className="flex-1 h-px bg-border mx-4"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm">2</div>
              <span className="font-medium">Review</span>
            </div>
            <div className="flex-1 h-px bg-border mx-4"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm">3</div>
              <span className="font-medium">Pricing</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Reviewed Estimations Pending Pricing */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Pending Pricing
            </CardTitle>
            <CardDescription>
              Reviewed estimations waiting for pricing calculation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingPricingEstimations.map((estimation) => (
              <div 
                key={estimation.id} 
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  selectedEstimation === estimation.id 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setSelectedEstimation(estimation.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{estimation.projectTitle}</h4>
                  <Badge variant="outline">{estimation.id}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{estimation.clientName}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {estimation.resources.length} resources
                  </span>
                  <span>Reviewed: {estimation.reviewedAt}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Pricing Calculator */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              Pricing Calculator
            </CardTitle>
            <CardDescription>
              Calculate total pricing with regional rates
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!estimation ? (
              <div className="text-center py-8 text-muted-foreground">
                Select an estimation to calculate pricing
              </div>
            ) : (
              <>
                {/* Region Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Region</label>
                  <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                    <SelectTrigger>
                      <Globe className="w-4 h-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {regions.map((region) => (
                        <SelectItem key={region} value={region}>{region}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Resource Breakdown */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Resource Breakdown</label>
                  <div className="space-y-2">
                    {estimation.resources.map((resource, idx) => {
                      const cost = calculateResourceCost(resource.role, selectedRegion, resource.days);
                      return (
                        <div key={idx} className="flex items-center justify-between p-3 bg-surface-elevated rounded-lg">
                          <div>
                            <p className="text-sm font-medium">{resource.role}</p>
                            <p className="text-xs text-muted-foreground">
                              {resource.days} days ({resource.allocation})
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">${cost.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">
                              ${pricingRates[resource.role]?.[selectedRegion] || 0}/day
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Charges */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Custom Charges</label>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-500" />
                    <Input
                      type="number"
                      value={customCharges}
                      onChange={(e) => setCustomCharges(Number(e.target.value))}
                      placeholder="0"
                      onFocus={(e) => e.target.select()}
                    />
                  </div>
                </div>

                {/* Discount */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Discount (%)</label>
                  <div className="flex items-center gap-2">
                    <Minus className="w-4 h-4 text-red-500" />
                    <Input
                      type="number"
                      value={discount}
                      onChange={(e) => setDiscount(Number(e.target.value))}
                      placeholder="0"
                      max="100"
                      onFocus={(e) => e.target.select()}
                    />
                  </div>
                </div>

                {/* Total */}
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-lg font-semibold">Total Project Cost</span>
                    <span className="text-2xl font-bold text-primary">
                      ${calculateTotalCost(estimation).toLocaleString()}
                    </span>
                  </div>
                  <Button 
                    onClick={handleApprovePricing} 
                    className="w-full gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve Pricing
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pricing Rates Reference */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle>Regional Pricing Rates (USD/Day)</CardTitle>
          <CardDescription>
            Current daily rates by role and region
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  {regions.map((region) => (
                    <TableHead key={region} className="text-center">{region}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(pricingRates).map(([role, rates]) => (
                  <TableRow key={role}>
                    <TableCell className="font-medium">{role}</TableCell>
                    {regions.map((region) => (
                      <TableCell key={region} className="text-center">
                        ${rates[region].toLocaleString()}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}