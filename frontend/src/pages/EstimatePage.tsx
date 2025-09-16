import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import EstimateUpload from '@/components/EstimateUpload';
import EstimateEditor from '@/components/EstimateEditor';
import { toast } from 'sonner';

const EstimatePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('upload');
  const [estimateData, setEstimateData] = useState<any>(null);
  const [estimateId, setEstimateId] = useState<string | null>(null);

  // Handle successful upload
  const handleUploadSuccess = (id: string, data: any) => {
    setEstimateId(id);
    setEstimateData(data);
    setActiveTab('editor');
    if (id) {
      toast.success('Estimate loaded successfully. You can now edit it.');
    } else {
      toast.info('JSON loaded for editing. Save to create a new estimate.');
    }
  };

  // Save estimate to backend
  const handleSaveEstimate = async (data: any) => {
    try {
      const endpoint = estimateId 
        ? `/api/v1/estimates/${estimateId}`
        : '/api/v1/estimates';
      
      const method = estimateId ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to save estimate');
      }

      const result = await response.json();
      
      if (!estimateId) {
        setEstimateId(result.id);
        setEstimateData({ ...data, id: result.id });
      }

      toast.success('Estimate saved successfully!');
      return result;
    } catch (error: any) {
      toast.error(error.message || 'Failed to save estimate');
      throw error;
    }
  };

  // Export estimate to Excel
  const handleExportExcel = async (id: string) => {
    try {
      const response = await fetch(`/api/v1/estimates/${id}/excel`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to generate Excel file');
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      
      // Extract filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `estimate_${id}.xlsx`;
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Excel file downloaded successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to export Excel');
      throw error;
    }
  };

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Estimate Management</CardTitle>
          <CardDescription>
            Upload JSON files, edit estimates, and generate Excel outputs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload">Upload</TabsTrigger>
              <TabsTrigger value="editor">
                Editor {estimateData && '(Active)'}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="mt-6">
              <EstimateUpload
                onUploadSuccess={handleUploadSuccess}
                apiEndpoint="/api/v1/estimates"
              />
            </TabsContent>

            <TabsContent value="editor" className="mt-6">
              {estimateData ? (
                <EstimateEditor
                  estimateId={estimateId || undefined}
                  initialData={estimateData}
                  onSave={handleSaveEstimate}
                  onExport={handleExportExcel}
                />
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <p className="text-muted-foreground">
                      No estimate loaded. Please upload a JSON file first.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default EstimatePage;