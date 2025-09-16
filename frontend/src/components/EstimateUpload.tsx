import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Upload, FileJson, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface EstimateUploadProps {
  onUploadSuccess?: (estimateId: string, data: any) => void;
  apiEndpoint?: string;
}

export const EstimateUpload: React.FC<EstimateUploadProps> = ({
  onUploadSuccess,
  apiEndpoint = '/api/v1/estimates'
}) => {
  const [jsonFile, setJsonFile] = useState<File | null>(null);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // JSON file dropzone
  const onDropJson = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file && file.name.endsWith('.json')) {
      setJsonFile(file);
      setError(null);
    } else {
      setError('Please upload a valid JSON file');
    }
  }, []);

  const {
    getRootProps: getJsonRootProps,
    getInputProps: getJsonInputProps,
    isDragActive: isJsonDragActive
  } = useDropzone({
    onDrop: onDropJson,
    accept: {
      'application/json': ['.json']
    },
    maxFiles: 1
  });

  // Template file dropzone
  const onDropTemplate = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xlsm'))) {
      setTemplateFile(file);
      setError(null);
    } else {
      setError('Please upload a valid Excel file (.xlsx or .xlsm)');
    }
  }, []);

  const {
    getRootProps: getTemplateRootProps,
    getInputProps: getTemplateInputProps,
    isDragActive: isTemplateDragActive
  } = useDropzone({
    onDrop: onDropTemplate,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel.sheet.macroEnabled.12': ['.xlsm']
    },
    maxFiles: 1
  });

  // Parse JSON file
  const parseJsonFile = async (file: File): Promise<any> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const data = JSON.parse(content);
          resolve(data);
        } catch (error) {
          reject(new Error('Invalid JSON format'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  // Handle upload
  const handleUpload = async () => {
    if (!jsonFile) {
      setError('Please select a JSON file');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      // Parse JSON to validate and preview
      const jsonData = await parseJsonFile(jsonFile);
      setUploadProgress(30);

      // Prepare form data
      const formData = new FormData();
      formData.append('json_file', jsonFile);
      if (templateFile) {
        formData.append('template_file', templateFile);
      }

      // Upload to backend
      const endpoint = templateFile 
        ? `${apiEndpoint}/process-with-template`
        : `${apiEndpoint}/upload`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      setUploadProgress(70);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Upload failed');
      }

      const result = await response.json();
      setUploadProgress(100);

      // Success
      toast.success('Estimate uploaded successfully!');
      
      if (onUploadSuccess) {
        onUploadSuccess(result.id, jsonData);
      }

      // Reset state
      setTimeout(() => {
        setJsonFile(null);
        setTemplateFile(null);
        setUploadProgress(0);
        setIsUploading(false);
      }, 1000);

    } catch (error: any) {
      setError(error.message || 'Failed to upload estimate');
      toast.error(error.message || 'Upload failed');
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Handle direct JSON upload for editing
  const handleJsonPreview = async () => {
    if (!jsonFile) {
      setError('Please select a JSON file');
      return;
    }

    try {
      const jsonData = await parseJsonFile(jsonFile);
      if (onUploadSuccess) {
        // Pass null as ID for new estimates
        onUploadSuccess('', jsonData);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to parse JSON');
      toast.error('Invalid JSON file');
    }
  };

  return (
    <div className="space-y-6">
      {/* JSON Upload */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Estimate JSON</CardTitle>
          <CardDescription>
            Upload your estimate.json file to process and generate Excel output
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            {...getJsonRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isJsonDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-gray-400'}
              ${jsonFile ? 'bg-green-50 border-green-300' : ''}`}
          >
            <input {...getJsonInputProps()} />
            <FileJson className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            {jsonFile ? (
              <div>
                <CheckCircle className="mx-auto h-8 w-8 text-green-500 mb-2" />
                <p className="text-sm font-medium text-green-700">{jsonFile.name}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Size: {(jsonFile.size / 1024).toFixed(2)} KB
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-600">
                  {isJsonDragActive
                    ? 'Drop the JSON file here...'
                    : 'Drag & drop your estimate.json file here, or click to select'}
                </p>
                <p className="text-xs text-gray-500 mt-2">Only .json files are accepted</p>
              </div>
            )}
          </div>

          {jsonFile && (
            <div className="mt-4 flex gap-2">
              <Button
                onClick={handleJsonPreview}
                variant="outline"
                size="sm"
              >
                Preview & Edit
              </Button>
              <Button
                onClick={() => setJsonFile(null)}
                variant="ghost"
                size="sm"
              >
                Remove
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Template Upload (Optional) */}
      <Card>
        <CardHeader>
          <CardTitle>Excel Template (Optional)</CardTitle>
          <CardDescription>
            Upload a custom Excel template file (.xlsx or .xlsm) or use the default template
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            {...getTemplateRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isTemplateDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-gray-400'}
              ${templateFile ? 'bg-green-50 border-green-300' : ''}`}
          >
            <input {...getTemplateInputProps()} />
            <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            {templateFile ? (
              <div>
                <CheckCircle className="mx-auto h-8 w-8 text-green-500 mb-2" />
                <p className="text-sm font-medium text-green-700">{templateFile.name}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Size: {(templateFile.size / 1024).toFixed(2)} KB
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-600">
                  {isTemplateDragActive
                    ? 'Drop the Excel template here...'
                    : 'Drag & drop your Excel template here, or click to select'}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Only .xlsx and .xlsm files are accepted
                </p>
              </div>
            )}
          </div>

          {templateFile && (
            <div className="mt-4">
              <Button
                onClick={() => setTemplateFile(null)}
                variant="ghost"
                size="sm"
              >
                Remove Template
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-2">
        <Button
          onClick={handleUpload}
          disabled={!jsonFile || isUploading}
          size="lg"
        >
          <Upload className="mr-2 h-4 w-4" />
          {isUploading ? 'Processing...' : 'Upload & Generate Excel'}
        </Button>
      </div>
    </div>
  );
};

export default EstimateUpload;