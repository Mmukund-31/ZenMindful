import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, Mail, Phone, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { ThemeToggle } from "@/components/theme-toggle";
import { signInWithGoogle } from "@/lib/firebase";
import { apiRequest } from "@/lib/queryClient";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);



  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      await signInWithGoogle();
      
      toast({
        title: "Welcome!",
        description: "Successfully signed in with Google. Your wellness journey begins now.",
      });
      
      setLocation("/");
    } catch (error: any) {
      console.error("Google sign-in error:", error);
      toast({
        title: "Sign-in Failed",
        description: error.message || "Failed to sign in with Google. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOTP = async () => {
    if (!phoneNumber) {
      toast({
        title: "Phone Number Required",
        description: "Please enter your phone number.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch("/api/auth/phone-send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phoneNumber }),
      });

      if (response.ok) {
        setShowOtpInput(true);
        toast({
          title: "OTP Sent",
          description: "Verification code sent to your phone. Please check your messages.",
        });
      } else {
        throw new Error("Failed to send OTP");
      }
    } catch (error: any) {
      console.error("Phone OTP error:", error);
      toast({
        title: "Failed to Send OTP",
        description: "Failed to send verification code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp) {
      toast({
        title: "OTP Required",
        description: "Please enter the verification code.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch("/api/auth/phone-verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phoneNumber, otp }),
      });

      if (response.ok) {
        toast({
          title: "Welcome!",
          description: "Phone verification successful. Your wellness journey begins now.",
        });
        setLocation("/");
      } else {
        throw new Error("Invalid verification code");
      }
    } catch (error: any) {
      console.error("OTP verification error:", error);
      toast({
        title: "Verification Failed",
        description: "Invalid verification code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickStart = () => {
    toast({
      title: "Quick Start",
      description: "Use Google sign-in or phone authentication for the best experience.",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900 dark:to-indigo-900 flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="relative">
              <Heart className="h-12 w-12 text-pink-500 fill-current" />
              <Sparkles className="h-6 w-6 text-yellow-400 fill-current absolute -top-1 -right-1 animate-pulse" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">MindfulAI</h1>
          <p className="text-gray-600 dark:text-gray-300">Your personalized wellness companion</p>
        </div>

        <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur border-0 shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">Welcome</CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-300">
              Sign in to continue your wellness journey
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="google" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="google" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Google
                </TabsTrigger>
                <TabsTrigger value="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Phone
                </TabsTrigger>
              </TabsList>

              <TabsContent value="google" className="space-y-4">
                <Button 
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  {isLoading ? "Signing in..." : "Continue with Google"}
                </Button>
              </TabsContent>

              <TabsContent value="phone" className="space-y-4">
                {!showOtpInput ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="bg-white dark:bg-gray-700"
                      />
                    </div>
                    <Button 
                      onClick={handleSendOTP}
                      disabled={isLoading}
                      className="w-full bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white font-medium py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                      {isLoading ? "Sending..." : "Send Verification Code"}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="otp">Verification Code</Label>
                      <Input
                        id="otp"
                        type="text"
                        placeholder="123456"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        className="bg-white dark:bg-gray-700 text-center text-2xl tracking-widest"
                        maxLength={6}
                      />
                    </div>
                    <div className="space-y-2">
                      <Button 
                        onClick={handleVerifyOTP}
                        disabled={isLoading}
                        className="w-full bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white font-medium py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
                      >
                        {isLoading ? "Verifying..." : "Verify Code"}
                      </Button>
                      <Button 
                        onClick={() => setShowOtpInput(false)}
                        variant="outline"
                        className="w-full"
                      >
                        Use Different Number
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <div className="mt-6">
              <Separator className="my-4" />
              <Button 
                onClick={handleQuickStart}
                variant="outline" 
                className="w-full border-dashed border-2 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 dark:hover:from-purple-900/20 dark:hover:to-pink-900/20 transition-all duration-200"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Quick Start Demo
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          Secure authentication powered by Google Firebase
        </div>
      </div>


    </div>
  );
}