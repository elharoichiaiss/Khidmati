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
  const { user, login, register, isLoggingIn, isRegistering, language } = useAuth();
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

  const onLogin = async (data: any) => {
    // Anti-Duplication: clear previous errors before new attempt
    loginForm.clearErrors("root");
    try {
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
            <CardTitle className="text-2xl font-display font-bold">Welcome to Khidmati</CardTitle>
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

                    <Button type="submit" className="w-full" disabled={isLoggingIn}>
                      {isLoggingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : (language === 'ar' ? "تسجيل الدخول" : "Sign In")}
                    </Button>
                  </form>

                  <div className="mt-6">
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300"></div>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-card text-gray-500">
                          {language === 'ar' ? 'أو المتابعة باستخدام' : 'Or continue with'}
                        </span>
                      </div>
                    </div>

                    <div className="mt-6">
                      <a
                        href="/api/auth/google"
                        className="flex items-center justify-center w-full px-4 py-2 space-x-2 text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                      >
                        <svg className="w-5 h-5 ml-2 mr-2" viewBox="0 0 24 24">
                          <path
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            fill="#4285F4"
                          />
                          <path
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            fill="#34A853"
                          />
                          <path
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            fill="#FBBC05"
                          />
                          <path
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            fill="#EA4335"
                          />
                        </svg>
                        <span className="font-medium">Google</span>
                      </a>
                    </div>
                  </div>
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
