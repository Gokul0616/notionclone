import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Shield, Key, Download, AlertTriangle, CheckCircle, RefreshCw, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import QRCode from "qrcode";

interface MFASetup {
  isEnabled: boolean;
  secret?: string;
  qrCode?: string;
  backupCodes?: string[];
  lastUsed?: string;
}

export default function MFASetup() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [verificationCode, setVerificationCode] = useState("");
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [showSetupDialog, setShowSetupDialog] = useState(false);

  const { data: mfaStatus, isLoading } = useQuery<MFASetup>({
    queryKey: ['/api/auth/mfa/status'],
  });

  const setupMFAMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/auth/mfa/setup');
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['/api/auth/mfa/status'], data);
      setShowSetupDialog(true);
    },
    onError: () => {
      toast({
        title: "Setup failed",
        description: "Failed to setup MFA. Please try again.",
        variant: "destructive",
      });
    },
  });

  const enableMFAMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest('POST', '/api/auth/mfa/enable', { code });
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['/api/auth/mfa/status'], data);
      setShowSetupDialog(false);
      setShowBackupCodes(true);
      toast({
        title: "MFA enabled",
        description: "Multi-factor authentication has been enabled successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Verification failed",
        description: "Invalid verification code. Please try again.",
        variant: "destructive",
      });
    },
  });

  const disableMFAMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/auth/mfa/disable');
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/mfa/status'] });
      toast({
        title: "MFA disabled",
        description: "Multi-factor authentication has been disabled.",
      });
    },
    onError: () => {
      toast({
        title: "Disable failed",
        description: "Failed to disable MFA. Please try again.",
        variant: "destructive",
      });
    },
  });

  const generateBackupCodesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/auth/mfa/backup-codes');
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['/api/auth/mfa/status'], data);
      setShowBackupCodes(true);
      toast({
        title: "Backup codes generated",
        description: "New backup codes have been generated.",
      });
    },
    onError: () => {
      toast({
        title: "Generation failed",
        description: "Failed to generate backup codes. Please try again.",
        variant: "destructive",
      });
    },
  });

  const copyBackupCodes = () => {
    if (mfaStatus?.backupCodes) {
      navigator.clipboard.writeText(mfaStatus.backupCodes.join('\n'));
      toast({
        title: "Copied",
        description: "Backup codes copied to clipboard.",
      });
    }
  };

  const downloadBackupCodes = () => {
    if (mfaStatus?.backupCodes) {
      const blob = new Blob([mfaStatus.backupCodes.join('\n')], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-codes-${new Date().toISOString().split('T')[0]}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  if (isLoading) {
    return <div className="p-8">Loading MFA settings...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <CardTitle>Multi-Factor Authentication</CardTitle>
            </div>
            <Badge variant={mfaStatus?.isEnabled ? "default" : "secondary"}>
              {mfaStatus?.isEnabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Add an extra layer of security to your account by enabling multi-factor authentication.
          </p>

          {!mfaStatus?.isEnabled ? (
            <div className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  MFA is currently disabled. Enable it to secure your account with an additional verification step.
                </AlertDescription>
              </Alert>
              
              <Button 
                onClick={() => setupMFAMutation.mutate()}
                disabled={setupMFAMutation.isPending}
              >
                <Shield className="h-4 w-4 mr-2" />
                {setupMFAMutation.isPending ? 'Setting up...' : 'Enable MFA'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  MFA is enabled. Your account is protected with two-factor authentication.
                  {mfaStatus.lastUsed && (
                    <span className="block mt-1 text-sm">
                      Last used: {new Date(mfaStatus.lastUsed).toLocaleString()}
                    </span>
                  )}
                </AlertDescription>
              </Alert>
              
              <div className="flex space-x-4">
                <Button 
                  variant="outline"
                  onClick={() => generateBackupCodesMutation.mutate()}
                  disabled={generateBackupCodesMutation.isPending}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Generate New Backup Codes
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => setShowBackupCodes(true)}
                >
                  <Key className="h-4 w-4 mr-2" />
                  View Backup Codes
                </Button>
                
                <Button 
                  variant="destructive"
                  onClick={() => disableMFAMutation.mutate()}
                  disabled={disableMFAMutation.isPending}
                >
                  Disable MFA
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Setup Dialog */}
      <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Setup Multi-Factor Authentication</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Scan this QR code with your authenticator app
              </p>
              {mfaStatus?.qrCode && (
                <img 
                  src={mfaStatus.qrCode} 
                  alt="QR Code" 
                  className="mx-auto border rounded-lg"
                  width={200}
                  height={200}
                />
              )}
            </div>
            
            <div>
              <Label htmlFor="verification-code">Enter verification code</Label>
              <Input
                id="verification-code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="123456"
                maxLength={6}
              />
            </div>
            
            <Button 
              onClick={() => enableMFAMutation.mutate(verificationCode)}
              disabled={enableMFAMutation.isPending || !verificationCode}
              className="w-full"
            >
              {enableMFAMutation.isPending ? 'Verifying...' : 'Enable MFA'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Backup Codes Dialog */}
      <Dialog open={showBackupCodes} onOpenChange={setShowBackupCodes}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Backup Codes</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Save these backup codes in a safe place. You can use them to access your account if you lose your authenticator device.
              </AlertDescription>
            </Alert>
            
            <div className="bg-muted p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                {mfaStatus?.backupCodes?.map((code, index) => (
                  <div key={index} className="p-2 bg-background rounded border">
                    {code}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                onClick={copyBackupCodes}
                className="flex-1"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
              <Button 
                variant="outline" 
                onClick={downloadBackupCodes}
                className="flex-1"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}