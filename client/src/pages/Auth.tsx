import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertUserSchema, insertProviderProfileSchema } from "@shared/routes";
import { MOROCCAN_CITIES } from "@shared/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { RegisterWizard } from "@/components/auth/RegisterWizard";

// Combined schema for registration
const registerSchema = insertUserSchema.extend({
  // Extra fields for provider if role is provider
  serviceCategory: z.string().optional(),
  city: z.string().optional(),
  bio: z.string().optional(),
}).refine(data => {
  if (data.role === "provider") {
    return !!data.serviceCategory && !!data.city;
  }
  return true;
}, {
  message: "Category and city are required for providers",
  path: ["serviceCategory"],
});

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState("login");
  const { user, login, register, isLoggingIn, isRegistering } = useAuth();
  const [location, setLocation] = useLocation();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      if (user.role === "provider") {
        setLocation("/provider/dashboard");
      } else if (user.role === "admin") {
        setLocation("/k-admin-portal-secure");
      } else {
        setLocation("/");
      }
    }
  }, [user, setLocation]);

  // Handle URL params to switch tab
  if (location.includes("register") && activeTab !== "register") {
    setActiveTab("register");
  }

  const loginForm = useForm({
    defaultValues: { username: "", password: "" },
  });

  const registerForm = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      fullName: "",
      email: "",
      role: "client" as "client" | "provider",
      serviceCategory: "",
      city: "",
      bio: "",
    },
  });

  // Secret Admin Login Logic
  const [clickCount, setClickCount] = useState(0);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminCode, setAdminCode] = useState("");

  const handleSecretClick = () => {
    setClickCount(prev => {
      const newCount = prev + 1;
      if (newCount === 5) {
        setShowAdminLogin(true);
        // Reset after success
        return 0;
      }
      return newCount;
    });

    // Reset if too slow (3 seconds)
    setTimeout(() => setClickCount(0), 3000);
  };
  // End Secret Logic

  const onLogin = async (data: any) => {
    // Anti-Duplication: clear previous errors before new attempt
    loginForm.clearErrors("root");
    try {
      if (showAdminLogin) {
        if (adminCode === "admin123") {
          // Store admin access in sessionStorage and redirect
          sessionStorage.setItem("adminAccess", "true");
          setLocation("/k-admin-portal-secure");
          return;
        } else {
          loginForm.setError("root", { message: "Invalid admin code" });
          return;
        }
      }
      await login(data);
    } catch (e: any) {
      loginForm.setError("root", { message: e.message });
    }
  };

  const onRegister = async (data: any) => {
    try {
      const { serviceCategory, city, bio, ...userData } = data;

      const payload: any = { ...userData };

      if (userData.role === "provider") {
        payload.providerProfile = {
          serviceCategory,
          citiesServed: [city], // Store as array
          bio,
          yearsOfExperience: 0,
        };
      }

      await register(payload);
      setActiveTab("login"); // Switch to login after success
    } catch (e: any) {
      registerForm.setError("root", { message: e.message });
    }
  };

  const selectedRole = registerForm.watch("role");

  return (
    <Layout>
      <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 bg-secondary/30">
        <Card className="w-full max-w-md shadow-2xl border-white/20">
          <CardHeader className="text-center">
            <div onClick={handleSecretClick} className="cursor-pointer select-none active:scale-95 transition-transform inline-block">
              <CardTitle className="text-2xl font-display font-bold">Welcome to Khidmati</CardTitle>
            </div>
            <CardDescription>Sign in or create an account to get started.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-8">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                    {!showAdminLogin && (
                      <>
                        <FormField
                          control={loginForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Username</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter your username" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={loginForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Password</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="••••••••" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}

                    {showAdminLogin && (
                      <FormField
                        control={loginForm.control}
                        name="adminCode" // Fake field name, we handle manually
                        render={() => (
                          <FormItem className="animate-in fade-in slide-in-from-top-2">
                            <FormLabel className="text-red-500 font-bold">Admin Access Code</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="Enter secret code"
                                value={adminCode}
                                onChange={(e) => setAdminCode(e.target.value)}
                                className="border-red-200 focus-visible:ring-red-500"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    )}

                    <Button type="submit" className={`w-full ${showAdminLogin ? "bg-red-600 hover:bg-red-700" : ""}`} disabled={isLoggingIn}>
                      {isLoggingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : (showAdminLogin ? "Admin Sign In" : "Sign In")}
                    </Button>

                    {showAdminLogin && (
                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full mt-2"
                        onClick={() => {
                          setShowAdminLogin(false);
                          setAdminCode(""); // Clear code on exit
                        }}
                      >
                        Cancel (Back to User Login)
                      </Button>
                    )}
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="register">
                <RegisterWizard onSuccess={() => setActiveTab("login")} />
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="justify-center text-sm text-muted-foreground">
            By continuing, you agree to our Terms of Service.
          </CardFooter>
        </Card>
      </div>
    </Layout >
  );
}
