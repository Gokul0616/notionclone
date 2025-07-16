import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Shield, 
  Smartphone, 
  Download, 
  Copy, 
  Check, 
  AlertTriangle,
  Key
} from "lucide-react";
import { generateBackupCodes, formatBackupCode } from "@/lib/mfa-utils";
import { useToast } from "@/hooks/use-toast";

interface MFASetupProps {
  onComplete: (backupCodes: string[]) => void;
}

export default function MFASetup({ onComplete }: MFASetupProps) {
  const [step, setStep] = useState(1);
  const [verificationCode, setVerificationCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const { toast } = useToast();

  const handleGenerateBackupCodes = () => {
    const codes = generateBackupCodes(10);
    const codeStrings = codes.map(c => c.code);
    setBackupCodes(codeStrings);
    setStep(2);
  };

  const handleCopyBackupCodes = async () => {
    const codesText = backupCodes.map(code => formatBackupCode(code)).join('\n');
    try {
      await navigator.clipboard.writeText(codesText);
      setCopiedCodes(true);
      toast({
        title: "Backup codes copied",
        description: "Store these codes in a safe place",
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please manually copy the backup codes",
        variant: "destructive",
      });
    }
  };

  const handleDownloadBackupCodes = () => {
    const codesText = backupCodes.map(code => formatBackupCode(code)).join('\n');
    const blob = new Blob([`Backup Codes for Multi-Factor Authentication\n\n${codesText}\n\nKeep these codes safe. Each code can only be used once.`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleComplete = () => {
    onComplete(backupCodes);
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
          <Shield className="h-6 w-6 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold">Secure Your Account</h2>
        <p className="text-muted-foreground">
          Set up multi-factor authentication to protect your workspace
        </p>
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Key className="h-5 w-5" />
              <span>Generate Backup Codes</span>
            </CardTitle>
            <CardDescription>
              First, let's create backup codes you can use if you lose access to your device
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Backup codes are your safety net. Store them securely - each code can only be used once.
              </AlertDescription>
            </Alert>
            <Button onClick={handleGenerateBackupCodes} className="w-full">
              Generate Backup Codes
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Backup Codes</CardTitle>
            <CardDescription>
              Save these codes in a safe place. You'll need them if you lose your device.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                {backupCodes.map((code, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Badge variant="outline" className="font-mono">
                      {formatBackupCode(code)}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                onClick={handleCopyBackupCodes}
                className="flex-1"
              >
                {copiedCodes ? (
                  <Check className="h-4 w-4 mr-2" />
                ) : (
                  <Copy className="h-4 w-4 mr-2" />
                )}
                Copy Codes
              </Button>
              <Button 
                variant="outline" 
                onClick={handleDownloadBackupCodes}
                className="flex-1"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
            
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Each backup code can only be used once. Generate new codes if you run out.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  id="saved-codes" 
                  className="rounded border-gray-300"
                  onChange={(e) => {
                    if (e.target.checked) {
                      setStep(3);
                    }
                  }}
                />
                <Label htmlFor="saved-codes" className="text-sm">
                  I have saved my backup codes in a safe place
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Smartphone className="h-5 w-5" />
              <span>Setup Complete</span>
            </CardTitle>
            <CardDescription>
              Your account is now protected with multi-factor authentication
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium">Multi-Factor Authentication Enabled</h3>
                <p className="text-sm text-muted-foreground">
                  Your account is now more secure with backup code authentication
                </p>
              </div>
            </div>
            
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                You can manage your security settings and generate new backup codes from your account settings.
              </AlertDescription>
            </Alert>
            
            <Button onClick={handleComplete} className="w-full">
              Continue to Workspace
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}