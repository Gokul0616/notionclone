import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, Mail, Lock, User, Shield } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

export default function CredentialAuth() {
  const { user, loginMutation, registerMutation } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Redirect if already logged in
  if (user) {
    setLocation("/");
    return null;
  }

  const onLogin = async (data: LoginForm) => {
    try {
      await loginMutation.mutateAsync({
        username: data.email,
        password: data.password,
      });
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      });
      setLocation("/");
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  const onRegister = async (data: RegisterForm) => {
    try {
      await registerMutation.mutateAsync({
        name: data.name,
        username: data.email,
        email: data.email,
        password: data.password,
      });
      toast({
        title: "Account created!",
        description: "Your account has been created successfully.",
      });
      setLocation("/");
    } catch (error) {
      console.error("Register error:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-full max-w-4xl">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left side - Authentication Form */}
              <div className="flex items-center justify-center">
                <Card className="w-full max-w-md">
                  <CardHeader className="text-center">
                    <div className="flex items-center justify-center mb-4">
                      <div className="p-2 bg-blue-600 rounded-lg">
                        <Shield className="h-8 w-8 text-white" />
                      </div>
                    </div>
                    <CardTitle className="text-2xl font-bold">Welcome to Notion Clone</CardTitle>
                    <p className="text-muted-foreground">
                      Sign in to your account or create a new one
                    </p>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="login" className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="login">Sign In</TabsTrigger>
                        <TabsTrigger value="register">Sign Up</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="login" className="space-y-4">
                        <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="login-email">Email</Label>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="login-email"
                                type="email"
                                placeholder="Enter your email"
                                className="pl-10"
                                {...loginForm.register("email")}
                              />
                            </div>
                            {loginForm.formState.errors.email && (
                              <p className="text-sm text-red-600">
                                {loginForm.formState.errors.email.message}
                              </p>
                            )}
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="login-password">Password</Label>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="login-password"
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter your password"
                                className="pl-10 pr-10"
                                {...loginForm.register("password")}
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2"
                              >
                                {showPassword ? (
                                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <Eye className="h-4 w-4 text-muted-foreground" />
                                )}
                              </button>
                            </div>
                            {loginForm.formState.errors.password && (
                              <p className="text-sm text-red-600">
                                {loginForm.formState.errors.password.message}
                              </p>
                            )}
                          </div>
                          
                          <Button
                            type="submit"
                            className="w-full"
                            disabled={loginMutation.isPending}
                          >
                            {loginMutation.isPending ? "Signing in..." : "Sign In"}
                          </Button>
                        </form>
                      </TabsContent>
                      
                      <TabsContent value="register" className="space-y-4">
                        <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="register-name">Full Name</Label>
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="register-name"
                                type="text"
                                placeholder="Enter your full name"
                                className="pl-10"
                                {...registerForm.register("name")}
                              />
                            </div>
                            {registerForm.formState.errors.name && (
                              <p className="text-sm text-red-600">
                                {registerForm.formState.errors.name.message}
                              </p>
                            )}
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="register-email">Email</Label>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="register-email"
                                type="email"
                                placeholder="Enter your email"
                                className="pl-10"
                                {...registerForm.register("email")}
                              />
                            </div>
                            {registerForm.formState.errors.email && (
                              <p className="text-sm text-red-600">
                                {registerForm.formState.errors.email.message}
                              </p>
                            )}
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="register-password">Password</Label>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="register-password"
                                type={showPassword ? "text" : "password"}
                                placeholder="Create a password"
                                className="pl-10 pr-10"
                                {...registerForm.register("password")}
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2"
                              >
                                {showPassword ? (
                                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <Eye className="h-4 w-4 text-muted-foreground" />
                                )}
                              </button>
                            </div>
                            {registerForm.formState.errors.password && (
                              <p className="text-sm text-red-600">
                                {registerForm.formState.errors.password.message}
                              </p>
                            )}
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="register-confirm-password">Confirm Password</Label>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="register-confirm-password"
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="Confirm your password"
                                className="pl-10 pr-10"
                                {...registerForm.register("confirmPassword")}
                              />
                              <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2"
                              >
                                {showConfirmPassword ? (
                                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <Eye className="h-4 w-4 text-muted-foreground" />
                                )}
                              </button>
                            </div>
                            {registerForm.formState.errors.confirmPassword && (
                              <p className="text-sm text-red-600">
                                {registerForm.formState.errors.confirmPassword.message}
                              </p>
                            )}
                          </div>
                          
                          <Button
                            type="submit"
                            className="w-full"
                            disabled={registerMutation.isPending}
                          >
                            {registerMutation.isPending ? "Creating Account..." : "Create Account"}
                          </Button>
                        </form>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </div>

              {/* Right side - Hero Section */}
              <div className="hidden lg:flex items-center justify-center">
                <div className="text-center space-y-6">
                  <div className="space-y-4">
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                      Collaborate in Real-Time
                    </h1>
                    <p className="text-xl text-gray-600 dark:text-gray-300">
                      Experience seamless team collaboration with live cursor tracking, 
                      real-time editing, and enterprise-grade security features.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                          <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h3 className="font-semibold">Enterprise Security</h3>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Multi-factor authentication, backup codes, and advanced security controls
                      </p>
                    </div>
                    
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                          <User className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <h3 className="font-semibold">Team Collaboration</h3>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Real-time cursor tracking, live presence, and collaborative editing
                      </p>
                    </div>
                    
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                          <Mail className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <h3 className="font-semibold">Business Analytics</h3>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Advanced reporting, productivity metrics, and team performance insights
                      </p>
                    </div>
                    
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                          <Lock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                        </div>
                        <h3 className="font-semibold">Secure Sharing</h3>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Password-protected links, expiration dates, and permission controls
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}