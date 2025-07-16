import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  FileText, 
  Briefcase, 
  Calendar, 
  Users, 
  Target,
  BookOpen,
  BarChart3,
  Rocket,
  Search,
  Filter,
  Star
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface TemplateGalleryProps {
  workspaceId: number;
  onSelectTemplate: (templateId: number) => void;
}

const templateCategories = [
  { value: "all", label: "All Templates" },
  { value: "documentation", label: "Documentation" },
  { value: "project-management", label: "Project Management" },
  { value: "meeting-notes", label: "Meeting Notes" },
  { value: "planning", label: "Planning" },
  { value: "knowledge-base", label: "Knowledge Base" },
  { value: "business", label: "Business" }
];

const defaultTemplates = [
  {
    id: "1",
    name: "Project Kickoff",
    description: "Template for starting new projects with goals, timeline, and team roles",
    category: "project-management",
    icon: Rocket,
    isPremium: false,
    usageCount: 1250
  },
  {
    id: "2", 
    name: "Meeting Notes",
    description: "Structured template for capturing meeting discussions and action items",
    category: "meeting-notes",
    icon: Calendar,
    isPremium: false,
    usageCount: 2100
  },
  {
    id: "3",
    name: "API Documentation",
    description: "Comprehensive template for documenting APIs with examples",
    category: "documentation", 
    icon: BookOpen,
    isPremium: false,
    usageCount: 850
  },
  {
    id: "4",
    name: "OKRs & Goals",
    description: "Template for setting and tracking objectives and key results",
    category: "planning",
    icon: Target,
    isPremium: true,
    usageCount: 650
  },
  {
    id: "5",
    name: "Team Retrospective",
    description: "Structured retrospective template for team improvement",
    category: "project-management",
    icon: Users,
    isPremium: false,
    usageCount: 950
  },
  {
    id: "6",
    name: "Business Plan",
    description: "Comprehensive business plan template with financial projections",
    category: "business",
    icon: Briefcase,
    isPremium: true,
    usageCount: 320
  },
  {
    id: "7",
    name: "Analytics Report",
    description: "Template for creating data-driven reports and insights",
    category: "business",
    icon: BarChart3,
    isPremium: true,
    usageCount: 420
  }
];

export default function TemplateGallery({ workspaceId, onSelectTemplate }: TemplateGalleryProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: customTemplates } = useQuery({
    queryKey: [`/api/templates?workspaceId=${workspaceId}`],
    enabled: !!workspaceId,
  });

  const createFromTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      // In a real implementation, this would create a page from the template
      const response = await apiRequest('POST', '/api/pages', {
        title: `New page from template`,
        workspaceId,
        content: { blocks: [] }
      });
      return await response.json();
    },
    onSuccess: (page) => {
      toast({
        title: "Page created",
        description: "New page created from template",
      });
      onSelectTemplate(page.id);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create page from template",
        variant: "destructive",
      });
    },
  });

  const filteredTemplates = defaultTemplates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleUseTemplate = (templateId: string) => {
    createFromTemplateMutation.mutate(templateId);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {templateCategories.map((category) => (
              <SelectItem key={category.value} value={category.value}>
                {category.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <Card key={template.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <template.icon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    {template.isPremium && (
                      <Badge variant="secondary" className="mt-1">
                        <Star className="h-3 w-3 mr-1" />
                        Premium
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <CardDescription className="mt-2">
                {template.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Used {template.usageCount.toLocaleString()} times
                </div>
                <Button 
                  size="sm"
                  onClick={() => handleUseTemplate(template.id)}
                  disabled={createFromTemplateMutation.isPending}
                >
                  Use Template
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {customTemplates && customTemplates.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Custom Templates</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {customTemplates.map((template: any) => (
              <Card key={template.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <FileText className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <Badge variant="outline" className="mt-1">
                        Custom
                      </Badge>
                    </div>
                  </div>
                  <CardDescription className="mt-2">
                    {template.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleUseTemplate(template.id)}
                    disabled={createFromTemplateMutation.isPending}
                    className="w-full"
                  >
                    Use Template
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">No templates found</h3>
          <p className="text-muted-foreground">
            Try adjusting your search or filter criteria
          </p>
        </div>
      )}
    </div>
  );
}