import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Database, Users, BarChart3, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function DatabaseAdmin() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();
  
  const { data: dbData, isLoading, refetch } = useQuery<any>({
    queryKey: ["/api/admin/database"],
    staleTime: 30000,
    refetchInterval: 30000,
  });

  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/database"] });
      await refetch();
      toast({
        title: "Data Refreshed",
        description: "Onboarding data has been updated",
      });
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: "Could not refresh database data",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading onboarding data...</p>
        </div>
      </div>
    );
  }

  const { 
    users = [], 
    totalUsers = 0, 
    completedOnboarding = 0, 
    incompleteOnboarding = 0, 
    completionRate = 0
  } = dbData || {};

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Database className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold">Onboarding Analytics</h1>
              <p className="text-gray-600">User onboarding completion tracking</p>
            </div>
          </div>
          <Button 
            onClick={refreshData} 
            variant="outline"
            disabled={isRefreshing || isLoading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? "Refreshing..." : "Refresh Data"}
          </Button>
        </div>

        {/* Onboarding Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                All registered users
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Onboarding</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{completedOnboarding}</div>
              <p className="text-xs text-muted-foreground">
                Full profile setup
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Incomplete Onboarding</CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{incompleteOnboarding}</div>
              <p className="text-xs text-muted-foreground">
                Partial setup
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
              <BarChart3 className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{completionRate}%</div>
              <p className="text-xs text-muted-foreground">
                Success rate
              </p>
            </CardContent>
          </Card>
        </div>

        {/* User Onboarding Table */}
        <Card>
          <CardHeader>
            <CardTitle>User Onboarding Details</CardTitle>
            <p className="text-sm text-muted-foreground">
              Track onboarding completion and user profile data
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>Wellness Goals</TableHead>
                    <TableHead>Motivation</TableHead>
                    <TableHead>Preferred Time</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user: any, index: number) => (
                      <TableRow key={user.id || index}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {user.firstName} {user.lastName}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {user.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={user.isComplete ? "default" : "secondary"}
                            className={user.isComplete ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}
                          >
                            {user.isComplete ? "Complete" : "Incomplete"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={user.onboardingData.age === 'Not provided' ? 'text-muted-foreground' : ''}>
                            {user.onboardingData.age}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className={`max-w-xs truncate ${user.onboardingData.wellnessGoals === 'Not provided' ? 'text-muted-foreground' : ''}`}>
                            {user.onboardingData.wellnessGoals}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className={`max-w-xs truncate ${user.onboardingData.motivation === 'Not provided' ? 'text-muted-foreground' : ''}`}>
                            {user.onboardingData.motivation}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={user.onboardingData.preferredTime === 'Not provided' ? 'text-muted-foreground' : ''}>
                            {user.onboardingData.preferredTime}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>Clean admin interface displaying onboarding data only</p>
          <p>Data refreshes automatically every 30 seconds</p>
        </div>
      </div>
    </div>
  );
}