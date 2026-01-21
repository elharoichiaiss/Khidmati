import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertUserSchema, insertProviderProfileSchema } from "@shared/routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { useState } from "react";

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
  const { login, register, isLoggingIn, isRegistering } = useAuth();
  const [location, setLocation] = useLocation();

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
                    {loginForm.formState.errors.root && (
                      <div className="text-sm text-destructive font-medium">
                        {loginForm.formState.errors.root.message}
                      </div>
                    )}
                    <Button type="submit" className="w-full" disabled={isLoggingIn}>
                      {isLoggingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign In"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="register">
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                    <FormField
                      control={registerForm.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input placeholder="johndoe123" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="john@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
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
                    <FormField
                      control={registerForm.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>I want to...</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a role" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="client">Find Services</SelectItem>
                              <SelectItem value="provider">Offer Services</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {selectedRole === "provider" && (
                      <div className="space-y-4 p-4 border rounded-lg bg-secondary/20 animate-in">
                        <FormField
                          control={registerForm.control}
                          name="serviceCategory"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Service Category</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select category" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="Plumbing">Plumbing</SelectItem>
                                  <SelectItem value="Electrician">Electrician</SelectItem>
                                  <SelectItem value="Cleaning">Cleaning</SelectItem>
                                  <SelectItem value="Beauty">Beauty</SelectItem>
                                  <SelectItem value="Moving">Moving</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={registerForm.control}
                          name="city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>City</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select city" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="Casablanca">Casablanca</SelectItem>
                                  <SelectItem value="Rabat">Rabat</SelectItem>
                                  <SelectItem value="Marrakech">Marrakech</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    {registerForm.formState.errors.root && (
                      <div className="text-sm text-destructive font-medium">
                        {registerForm.formState.errors.root.message}
                      </div>
                    )}
                    <Button type="submit" className="w-full" disabled={isRegistering}>
                      {isRegistering ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Account"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="justify-center text-sm text-muted-foreground">
            By continuing, you agree to our Terms of Service.
          </CardFooter>
        </Card>
      </div>
    </Layout>
  );
}
