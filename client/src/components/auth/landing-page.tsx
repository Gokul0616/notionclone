import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Users, 
  Zap, 
  Shield, 
  Crown, 
  Star,
  CheckCircle,
  ArrowRight,
  Globe,
  Smartphone
} from "lucide-react";

export default function LandingPage() {
  const handleLogin = () => {
    window.location.href = "/auth";
  };

  const features = [
    {
      icon: FileText,
      title: "Rich Text Editing",
      description: "Create beautiful documents with our advanced block-based editor"
    },
    {
      icon: Users,
      title: "Real-time Collaboration", 
      description: "Work together with live cursor tracking and instant updates"
    },
    {
      icon: Zap,
      title: "Templates & Automation",
      description: "Get started quickly with pre-built templates and workflows"
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Multi-factor authentication and advanced access controls"
    },
    {
      icon: Crown,
      title: "Business Analytics",
      description: "Comprehensive insights and team performance metrics"
    },
    {
      icon: Globe,
      title: "Sharing & Publishing",
      description: "Share your work with fine-grained permission controls"
    }
  ];

  const businessFeatures = [
    "Unlimited workspace members",
    "Advanced analytics dashboard", 
    "Single Sign-On (SSO)",
    "Priority support",
    "Custom integrations",
    "Advanced security controls"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center space-y-8">
          <div className="space-y-4">
            <Badge variant="secondary" className="px-4 py-2">
              <Star className="h-4 w-4 mr-2" />
              Production Ready Platform
            </Badge>
            <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Your Connected Workspace
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              The all-in-one workspace where teams come together to plan, create, and grow. 
              Experience the power of real-time collaboration with enterprise-grade security.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={handleLogin} className="px-8 py-6 text-lg">
              Get Started Free
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
            <Button size="lg" variant="outline" className="px-8 py-6 text-lg">
              Watch Demo
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="border-none shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
                <CardDescription className="text-base">
                  {feature.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        {/* Business Plan Section */}
        <div className="mt-24">
          <div className="text-center mb-12">
            <Badge variant="default" className="px-4 py-2 mb-4">
              <Crown className="h-4 w-4 mr-2" />
              Business Plan
            </Badge>
            <h2 className="text-4xl font-bold mb-4">
              Built for Growing Teams
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Advanced features and analytics to help your team collaborate more effectively 
              and make data-driven decisions.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h3 className="text-2xl font-semibold">Everything you need to scale</h3>
              <div className="space-y-4">
                {businessFeatures.map((feature, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span className="text-lg">{feature}</span>
                  </div>
                ))}
              </div>
              <Button size="lg" onClick={handleLogin} className="mt-6">
                Start Business Trial
              </Button>
            </div>
            
            <Card className="p-6 bg-gradient-to-br from-blue-600 to-purple-600 text-white border-none">
              <CardContent className="space-y-6">
                <div className="text-center">
                  <div className="text-4xl font-bold mb-2">99.9%</div>
                  <div className="text-blue-100">Uptime Guarantee</div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold">500+</div>
                    <div className="text-blue-100 text-sm">Integrations</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">24/7</div>
                    <div className="text-blue-100 text-sm">Support</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-24 text-center">
          <Card className="max-w-4xl mx-auto p-12 bg-gradient-to-r from-blue-50 to-purple-50 border-none">
            <CardContent className="space-y-6">
              <h2 className="text-3xl font-bold">
                Ready to transform how your team works?
              </h2>
              <p className="text-lg text-muted-foreground">
                Join thousands of teams already using our platform to collaborate, 
                create, and achieve their goals together.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" onClick={handleLogin} className="px-8 py-6">
                  Sign up for free
                </Button>
                <Button size="lg" variant="outline" className="px-8 py-6">
                  Contact sales
                </Button>
              </div>
              <div className="flex items-center justify-center space-x-8 text-sm text-muted-foreground">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Free forever plan</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Setup in minutes</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}