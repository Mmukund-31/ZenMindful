import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { User, LogOut, Shield, Bell, Palette, HelpCircle, Heart, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/components/theme-provider";

export default function Settings() {
  const userProfile = JSON.parse(localStorage.getItem('wellness_user_profile') || '{"name": "User"}');
  const { theme, setTheme } = useTheme();
  const [notifications, setNotifications] = useState(true);
  const [weeklyReports, setWeeklyReports] = useState(true);
  const [showHelpCenter, setShowHelpCenter] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showContactSupport, setShowContactSupport] = useState(false);

  const { data: userStats } = useQuery({
    queryKey: ["/api/mood"],
    select: (data: any) => ({
      totalMoodEntries: Array.isArray(data) ? data.length : 0,
      streakDays: 0, // Could calculate streak from data
    }),
  });

  const { data: memoriesCount } = useQuery({
    queryKey: ["/api/memories"],
    select: (data: any) => Array.isArray(data) ? data.length : 0,
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/auth/reset-user", {});
    },
    onSuccess: () => {
      // Clear all local storage data for complete reset
      localStorage.clear();
      
      // Reload the page to start fresh
      window.location.reload();
    },
    onError: (error) => {
      console.error('Reset failed:', error);
    }
  });

  const handleResetOnboarding = () => {
    if (confirm('Are you sure you want to reset all your data? This action cannot be undone.')) {
      resetMutation.mutate();
    }
  };

  const handleExportData = () => {
    const userData = {
      profile: userProfile,
      completedAt: new Date().toISOString()
    };
    const dataStr = JSON.stringify(userData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mindease-data-${userProfile.name || 'user'}-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getUserInitials = (profile: any) => {
    if (profile?.name) {
      const nameParts = profile.name.split(' ');
      if (nameParts.length >= 2) {
        return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
      }
      return profile.name[0].toUpperCase();
    }
    return 'U';
  };

  const getUserDisplayName = (profile: any) => {
    return profile?.name || 'User';
  };

  return (
    <div className="pb-20 p-6 space-y-6">
      <h2 className="text-xl font-semibold text-foreground mb-6">Settings</h2>

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="w-5 h-5" />
            <span>Profile</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 mb-4">
            <Avatar className="w-16 h-16">
              <AvatarFallback className="bg-primary text-primary-foreground text-lg font-semibold">
                {getUserInitials(userProfile)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">{getUserDisplayName(userProfile)}</h3>
              {userProfile.age && (
                <p className="text-sm text-muted-foreground">Age: {userProfile.age}</p>
              )}
              <Badge variant="secondary" className="mt-2">
                <Heart className="w-3 h-3 mr-1" />
                Wellness Member
              </Badge>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="text-center p-4 bg-primary/10 rounded-lg">
              <div className="text-2xl font-bold text-primary">{userStats?.totalMoodEntries || 0}</div>
              <div className="text-sm text-muted-foreground">Mood Entries</div>
            </div>
            <div className="text-center p-4 bg-accent/10 rounded-lg">
              <div className="text-2xl font-bold text-accent">{memoriesCount || 0}</div>
              <div className="text-sm text-muted-foreground">Memories</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="w-5 h-5" />
            <span>Notifications</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="notifications" className="text-sm font-medium">
                Daily Reminders
              </Label>
              <p className="text-xs text-muted-foreground">
                Get gentle reminders to check in with your mood
              </p>
            </div>
            <Switch
              id="notifications"
              checked={notifications}
              onCheckedChange={setNotifications}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="weekly-reports" className="text-sm font-medium">
                Weekly Reports
              </Label>
              <p className="text-xs text-muted-foreground">
                Receive weekly insights about your wellness journey
              </p>
            </div>
            <Switch
              id="weekly-reports"
              checked={weeklyReports}
              onCheckedChange={setWeeklyReports}
            />
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Palette className="w-5 h-5" />
            <span>Appearance</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="dark-mode" className="text-sm font-medium">
                Dark Mode
              </Label>
              <p className="text-xs text-muted-foreground">
                Switch to dark theme for comfortable viewing
              </p>
            </div>
            <Switch
              id="dark-mode"
              checked={theme === "dark"}
              onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Privacy & Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="w-5 h-5" />
            <span>Privacy & Security</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Data Privacy</p>
              <p className="text-xs text-muted-foreground">
                Your data is encrypted and securely stored
              </p>
            </div>
            <Badge variant="outline" className="text-green-600 border-green-600">
              Secure
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Account Status</p>
              <p className="text-xs text-muted-foreground">
                Your account is active and verified
              </p>
            </div>
            <Badge variant="outline" className="text-green-600 border-green-600">
              Active
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Help & Support */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <HelpCircle className="w-5 h-5" />
            <span>Help & Support</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button 
            variant="ghost" 
            className="w-full justify-start"
            onClick={() => setShowHelpCenter(!showHelpCenter)}
          >
            <HelpCircle className="w-4 h-4 mr-2" />
            Help Center
          </Button>
          {showHelpCenter && (
            <div className="ml-6 p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">
                For any questions or assistance with MindEase, please contact "Mukund" from contact support.
              </p>
            </div>
          )}
          
          <Button 
            variant="ghost" 
            className="w-full justify-start"
            onClick={() => setShowPrivacyPolicy(!showPrivacyPolicy)}
          >
            <Shield className="w-4 h-4 mr-2" />
            Privacy Policy
          </Button>
          {showPrivacyPolicy && (
            <div className="ml-6 p-4 bg-muted rounded-lg space-y-2">
              <p className="text-sm text-muted-foreground">
                • All user data is anonymous and personalized
              </p>
              <p className="text-sm text-muted-foreground">
                • For any queries contact "Mukund" from contact support
              </p>
            </div>
          )}
          
          <Button 
            variant="ghost" 
            className="w-full justify-start"
            onClick={() => setShowContactSupport(!showContactSupport)}
          >
            <Bell className="w-4 h-4 mr-2" />
            Contact Support
          </Button>
          {showContactSupport && (
            <div className="ml-6 p-4 bg-muted rounded-lg space-y-2">
              <p className="text-sm font-medium">Contact Information:</p>
              <p className="text-sm text-muted-foreground">Name - Mukund</p>
              <p className="text-sm text-muted-foreground">Email - mvsslnmukund@gmail.com</p>
              <p className="text-sm text-muted-foreground">Mobile - 8247437407</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Logout */}
      <Card className="border-destructive/20">
        <CardContent className="p-4">
          <Button
            onClick={handleResetOnboarding}
            variant="destructive"
            className="w-full"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Reset App
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}