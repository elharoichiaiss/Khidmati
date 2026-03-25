import { Layout } from "@/components/Layout";
import { useProvider } from "@/hooks/use-providers";
import { useReviews, useCreateReview } from "@/hooks/use-reviews";
import { useStartConversation } from "@/hooks/use-messages";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, useRoute } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Star, MapPin, CheckCircle2, MessageSquare, Briefcase, Calendar, Loader2, Heart, LayoutDashboard, Edit2 } from "lucide-react";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

export default function ProviderDetail() {
  const [match, params] = useRoute("/providers/:id");
  const id = parseInt(params?.id || "0");
  const [location, setLocation] = useLocation();

  const { user } = useAuth();
  const { data: provider, isLoading } = useProvider(id);
  const { data: reviews } = useReviews(id);
  const startConversation = useStartConversation();
  const queryClient = useQueryClient();

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");

  // Booking state
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingDate, setBookingDate] = useState("");
  const [bookingDescription, setBookingDescription] = useState("");

  const bookingMutation = useMutation({
    mutationFn: async (data: { providerId: number; date: string; description: string }) => {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Booking failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "✅ Booking Request Sent!", description: "The provider will review your request." });
      setBookingOpen(false);
      setBookingDate("");
      setBookingDescription("");
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Review Mutation
  const createReview = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, providerId: id }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to submit review");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Review submitted!" });
      setReviewComment("");
      setReviewRating(0);
      queryClient.invalidateQueries({ queryKey: [`/providers/${id}`] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Favorites Logic
  const { data: favData } = useQuery({
    queryKey: [`/api/favorites/${id}/check`],
    enabled: !!user && !!id,
  });
  const isFavorited = favData?.favorited;

  const toggleFavorite = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/favorites/${id}`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to toggle favorite");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData([`/api/favorites/${id}/check`], data);
      toast({
        title: data.favorited ? "Added to favorites ❤️" : "Removed from favorites 💔",
        duration: 2000,
      });
    },
    onError: () => toast({ title: "Error", description: "Could not update favorites", variant: "destructive" }),
  });

  const isProviderAvailable = (dateStr: string) => {
    if (!provider.profile?.workingHours) return true; // Default to available if no hours set

    const date = new Date(dateStr);
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = days[date.getDay()];

    const workingHours = (provider.profile.workingHours as any)[dayName];
    if (!workingHours?.active) return false;

    // Optional: Time check
    // const time = date.getHours() * 60 + date.getMinutes(); // minutes from midnight
    // const [startH, startM] = workingHours.start.split(':').map(Number);
    // const [endH, endM] = workingHours.end.split(':').map(Number);
    // const start = startH * 60 + startM;
    // const end = endH * 60 + endM;
    // return time >= start && time <= end;

    return true;
  };

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return setLocation("/login");
    if (!bookingDate) {
      toast({ title: "Error", description: "Please select a date and time", variant: "destructive" });
      return;
    }

    if (!isProviderAvailable(bookingDate)) {
      toast({
        title: "Provider Unavailable",
        description: "The provider is not accepting bookings on this day/time based on their schedule.",
        variant: "destructive"
      });
      return;
    }

    bookingMutation.mutate({
      providerId: id,
      date: bookingDate,
      description: bookingDescription,
    });
  };

  const handleMessage = async () => {
    if (!user) {
      setLocation("/login");
      return;
    }
    try {
      const conv = await startConversation.mutateAsync(id);
      setLocation(`/messages?id=${conv.id}`);
    } catch (error) {
      toast({ title: "Error", description: "Could not start conversation", variant: "destructive" });
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return setLocation("/login");
    if (reviewRating === 0) return toast({ title: "Please select a rating", variant: "destructive" });

    createReview.mutate({ rating: reviewRating, comment: reviewComment });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12">
          <Skeleton className="h-64 w-full rounded-2xl mb-8" />
          <Skeleton className="h-20 w-1/2 mb-4" />
        </div>
      </Layout>
    );
  }

  if (!provider) return <Layout><div className="p-12 text-center">Provider not found</div></Layout>;

  // Helper for image URLs
  const getImageUrl = (path: string | null | undefined) => {
    if (!path) return undefined;
    if (path.startsWith('http')) return path;
    if (path.startsWith('/')) return path;
    return `/uploads/${path}`;
  };

  const profileImageUrl = getImageUrl(provider.profileImage || provider.profile?.profileImage);

  return (
    <Layout>
      <div className="bg-slate-50 dark:bg-slate-900 border-b overflow-x-hidden">
        <div className="container mx-auto px-4 py-12">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <Avatar className="w-32 h-32 border-4 border-white shadow-xl">
              <AvatarImage src={profileImageUrl} className="object-cover" />
              <AvatarFallback className="text-3xl">{provider.fullName[0]}</AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-3xl font-display font-bold mb-2">{provider.fullName}</h1>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-sm text-muted-foreground mb-4">
                    <span className="flex items-center gap-1">
                      <Briefcase className="w-4 h-4" /> {provider.profile?.serviceCategory || "Professional"}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" /> {provider.profile?.citiesServed?.join(", ") || provider.city || "Remote"}
                    </span>
                    <span className="flex items-center gap-1 text-primary">
                      <CheckCircle2 className="w-4 h-4" /> {provider.profile?.yearsOfExperience || 0} Years Exp
                    </span>
                    {/* Star Rating */}
                    <span className="flex items-center gap-1 text-amber-500 font-bold">
                      <Star className="w-4 h-4 fill-current" /> {(provider as any).rating || "New"} ({(provider as any).reviewCount || 0})
                    </span>
                  </div>
                </div>
                {provider.profile?.isAvailable ? (
                  <Badge className="bg-green-500 hover:bg-green-600">Available Now</Badge>
                ) : (
                  <Badge variant="secondary">Currently Busy</Badge>
                )}
              </div>

              <div className="flex gap-3 mt-2">
                {user && user.id === provider.id ? (
                  <>
                    <Button onClick={() => setLocation("/provider/dashboard")} className="gap-2 shadow-lg shadow-primary/20 bg-emerald-600 hover:bg-emerald-700">
                      <LayoutDashboard className="w-4 h-4" /> Go to Dashboard
                    </Button>
                    <Button onClick={() => setLocation("/profile")} variant="outline" className="gap-2 shadow-sm">
                      <Edit2 className="w-4 h-4" /> Edit Profile
                    </Button>
                  </>
                ) : (
                  <>
                    <Button onClick={handleMessage} className="gap-2 shadow-lg shadow-primary/20">
                      <MessageSquare className="w-4 h-4" /> Contact
                    </Button>

                    <Button
                      variant="outline"
                      size="icon"
                      className={cn(
                        "rounded-full border-2 transition-all duration-300",
                        isFavorited
                          ? "border-red-500 text-red-500 bg-red-50 hover:bg-red-100 hover:border-red-600"
                          : "hover:border-red-200 hover:text-red-500 hover:bg-red-50"
                      )}
                      onClick={() => {
                        if (!user) return setLocation("/login");
                        toggleFavorite.mutate();
                      }}
                      disabled={toggleFavorite.isPending}
                    >
                      <Heart className={cn("w-5 h-5", isFavorited && "fill-current")} />
                    </Button>

                    {/* Book Now Dialog */}
                    <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="gap-2 border-primary/30 hover:bg-primary/5 hover:border-primary/50 transition-all" onClick={() => {
                          if (!user) { setLocation("/login"); return; }
                          setBookingOpen(true);
                        }}>
                          <Calendar className="w-4 h-4" /> Book Now
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden rounded-2xl border-0 shadow-2xl [&>button]:text-white [&>button]:hover:bg-white/30">
                        {/* Gradient Header */}
                        <div className="bg-gradient-to-br from-primary via-primary/90 to-primary/70 px-6 pt-8 pb-6 text-white relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                          <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
                          <div className="relative z-10 flex items-center gap-4">
                            <Avatar className="w-14 h-14 border-2 border-white/30 shadow-lg">
                              <AvatarImage src={profileImageUrl} className="object-cover" />
                              <AvatarFallback className="text-xl bg-white/20 text-white">{provider.fullName[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                              <DialogTitle className="text-xl font-bold text-white mb-1">Book Service</DialogTitle>
                              <DialogDescription className="text-white/80 text-sm">
                                {provider.fullName} • {provider.profile?.serviceCategory}
                              </DialogDescription>
                            </div>
                          </div>
                        </div>

                        {/* Form Body */}
                        <form onSubmit={handleBookingSubmit} className="px-6 py-5 space-y-5">
                          <div className="space-y-2.5">
                            <Label htmlFor="booking-date" className="font-semibold text-sm flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-primary" />
                              Date & Time
                            </Label>
                            <input
                              id="booking-date"
                              type="datetime-local"
                              value={bookingDate}
                              onChange={(e) => setBookingDate(e.target.value)}
                              className="w-full rounded-xl border-2 border-slate-200 bg-slate-50/50 px-4 py-3 text-sm transition-all duration-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 focus:bg-white hover:border-slate-300"
                              required
                            />
                            {bookingDate && !isProviderAvailable(bookingDate) && (
                              <p className="text-destructive text-sm font-medium mt-2 flex items-center gap-1">
                                ⚠️ The provider is closed on this day.
                              </p>
                            )}
                          </div>
                          <div className="space-y-2.5">
                            <Label htmlFor="booking-desc" className="font-semibold text-sm flex items-center gap-2">
                              <Briefcase className="w-4 h-4 text-primary" />
                              Describe Your Need
                            </Label>
                            <Textarea
                              id="booking-desc"
                              placeholder="e.g. I need to fix a leaky faucet in the bathroom..."
                              value={bookingDescription}
                              onChange={(e) => setBookingDescription(e.target.value)}
                              className="min-h-[110px] resize-none rounded-xl border-2 border-slate-200 bg-slate-50/50 px-4 py-3 text-sm transition-all duration-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 focus:bg-white hover:border-slate-300"
                            />
                          </div>

                          <div className="pt-1 pb-1">
                            <Button
                              type="submit"
                              className="w-full h-12 text-base font-bold rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25 transition-all duration-200 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={bookingMutation.isPending || (!!bookingDate && !isProviderAvailable(bookingDate))}
                            >
                              {bookingMutation.isPending ? (
                                <>
                                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                  Sending Request...
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-5 h-5 mr-2" />
                                  Confirm Booking
                                </>
                              )}
                            </Button>
                          </div>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </>
                )}


              </div>
            </div>
          </div>
        </div>
      </div >

      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-8">
            <section>
              <h2 className="text-xl font-bold mb-4">About</h2>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap" dir="ltr">
                {provider.profile?.bio || "This provider has not added a bio yet."}
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4">Portfolio</h2>
              {provider.profile?.portfolioImages && provider.profile.portfolioImages.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {provider.profile.portfolioImages.map((img, i) => (
                    <img
                      key={i}
                      src={getImageUrl(img)}
                      className="rounded-xl w-full h-48 object-cover shadow-sm hover:scale-105 transition-transform"
                      alt="Portfolio item"
                    />
                  ))}
                </div>
              ) : (
                <div className="p-8 bg-secondary/20 rounded-xl text-center text-muted-foreground border border-dashed" dir="ltr">
                  No portfolio images uploaded.
                </div>
              )}
            </section>

            {/* Reviews Section */}
            <div className="mt-12">
              <h2 className="text-2xl font-display font-bold mb-6">Reviews & Ratings</h2>

              {/* Write Review */}
              {user && user.id !== provider.id && ( // Only show if user is logged in and not the provider themselves
                <Card className="mb-8 border-dashed border-2">
                  <CardContent className="p-6">
                    <h3 className="font-bold text-lg mb-4">Write a Review</h3>
                    <div className="flex items-center gap-2 mb-4">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewRating(star)}
                          className={`transition-transform hover:scale-110 ${star <= reviewRating ? "text-amber-500" : "text-gray-300"
                            }`}
                        >
                          <Star className={`w-8 h-8 ${star <= reviewRating ? "fill-current" : ""}`} />
                        </button>
                      ))}
                    </div>
                    <Textarea
                      placeholder="Share your experience..."
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      className="mb-4"
                    />
                    <Button onClick={handleReviewSubmit} disabled={createReview.isPending}>
                      {createReview.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Submit Review
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Reviews List */}
              <div className="grid gap-6">
                {/* @ts-ignore - reviews property added in backend */}
                {reviews && reviews.length > 0 ? (
                  // @ts-ignore
                  reviews.map((review: any) => (
                    <Card key={review.id} className="border-0 shadow-sm bg-slate-50 dark:bg-slate-800/50">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback>{review.client.fullName[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                              <h4 className="font-bold text-sm">{review.client.fullName}</h4>
                              <p className="text-xs text-muted-foreground">{new Date(review.createdAt).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <div className="flex text-amber-500">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} className={`w-4 h-4 ${i < review.rating ? "fill-current" : "text-gray-300"}`} />
                            ))}
                          </div>
                        </div>
                        <p className="text-muted-foreground">{review.comment}</p>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <p className="text-muted-foreground italic">No reviews yet. Be the first to review!</p>
                )}
              </div>
            </div>
          </div>

          <div className="md:col-span-1">
            <Card className="sticky top-24">
              <CardContent className="p-6">
                <h3 className="font-bold mb-4">Availability</h3>
                <div className="space-y-3 text-sm">
                  {provider.profile?.workingHours ? (
                    ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map((day) => {
                      const hours = (provider.profile?.workingHours as any)[day];
                      if (!hours) return null;
                      return (
                        <div key={day} className="flex justify-between">
                          <span className="text-muted-foreground capitalize">{day}</span>
                          {hours.active ? (
                            <span>{hours.start} - {hours.end}</span>
                          ) : (
                            <span className="text-destructive">Closed</span>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-muted-foreground italic">No schedule available.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout >
  );
}
