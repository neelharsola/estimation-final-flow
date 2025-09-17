import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export default function ResourcesPage() {
  const { user } = useAuth();
  const isAdmin = String(user?.role || "").toLowerCase() === "admin";
  const [items, setItems] = useState<any[]>([]);
  const [query, setQuery] = useState("");

  const load = async () => {
    const list = await api.resources.list();
    setItems(list || []);
  };

  useEffect(() => { load(); }, []);

  const filtered = items.filter((r) => (r.name || "").toLowerCase().includes(query.toLowerCase()) || (r.role || "").toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Resources</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <Input placeholder="Search by name or role" value={query} onChange={(e) => setQuery(e.target.value)} />
            {isAdmin && (
              <Button onClick={async () => {
                const name = prompt("Resource name") || "";
                const role = prompt("Role") || "";
                if (!name || !role) return;
                await api.resources.create({ name, role, rates: { USD: 0 } });
                await load();
              }}>Add Resource</Button>
            )}
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Rates</TableHead>
                  {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id || r._id}>
                    <TableCell>{r.name}</TableCell>
                    <TableCell>{r.role}</TableCell>
                    <TableCell>
                      {Object.entries(r.rates || {}).map(([k, v]) => (
                        <div key={k}>{k}: {v ?? '-'}</div>
                      ))}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <Button variant="outline" className="mr-2" onClick={async () => {
                          const usd = Number(prompt("USD day rate", String(r.rates?.USD ?? 0)) || 0);
                          await api.resources.update(r.id || r._id, { rates: { ...(r.rates||{}), USD: usd } });
                          await load();
                        }}>Edit</Button>
                        <Button variant="destructive" onClick={async () => { await api.resources.delete(r.id || r._id); await load(); }}>Delete</Button>
                      </TableCell>
                    )}
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


