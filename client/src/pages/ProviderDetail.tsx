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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Star, MapPin, CheckCircle2, MessageSquare, Briefcase, Calendar } from "lucide-react";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

export default function ProviderDetail() {
  const [match, params] = useRoute("/providers/:id");
  const id = parseInt(params?.id || "0");
  const [location, setLocation] = useLocation();
  
  const { user } = useAuth();
  const { data: provider, isLoading } = useProvider(id);
  const { data: reviews } = useReviews(id);
  const createReview = useCreateReview();
  const startConversation = useStartConversation();

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");

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

  const handleSubmitReview = async () => {
    if (!user) return setLocation("/login");
    try {
      await createReview.mutateAsync({
        providerId: id,
        data: { rating: reviewRating, comment: reviewComment }
      });
      setReviewComment("");
      toast({ title: "Review submitted!" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to submit review", variant: "destructive" });
    }
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

  // Safe image path
  const profileImageUrl = provider.profileImage?.startsWith('http') 
    ? provider.profileImage 
    : provider.profileImage 
      ? `/objects/${provider.profileImage}` 
      : undefined;

  return (
    <Layout>
      <div className="bg-slate-50 dark:bg-slate-900 border-b">
        <div className="container mx-auto px-4 py-12">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <Avatar className="w-32 h-32 border-4 border-white shadow-xl">
              <AvatarImage src={profileImageUrl} className="object-cover" />
              <AvatarFallback className="text-3xl">{provider.user.fullName[0]}</AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-3xl font-display font-bold mb-2">{provider.user.fullName}</h1>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <span className="flex items-center gap-1">
                      <Briefcase className="w-4 h-4" /> {provider.serviceCategory}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" /> {provider.citiesServed?.join(", ") || "Remote"}
                    </span>
                    <span className="flex items-center gap-1 text-primary">
                      <CheckCircle2 className="w-4 h-4" /> {provider.yearsOfExperience} Years Exp
                    </span>
                  </div>
                </div>
                {provider.isAvailable ? (
                  <Badge className="bg-green-500 hover:bg-green-600">Available Now</Badge>
                ) : (
                  <Badge variant="secondary">Currently Busy</Badge>
                )}
              </div>
              
              <div className="flex gap-3 mt-2">
                <Button onClick={handleMessage} className="gap-2 shadow-lg shadow-primary/20">
                  <MessageSquare className="w-4 h-4" /> Contact
                </Button>
                <Button variant="outline" className="gap-2">
                  <Calendar className="w-4 h-4" /> Book Now
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-8">
            <section>
              <h2 className="text-xl font-bold mb-4">About</h2>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {provider.bio || "This provider has not added a bio yet."}
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4">Portfolio</h2>
              {provider.portfolioImages && provider.portfolioImages.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {provider.portfolioImages.map((img, i) => (
                    <img 
                      key={i} 
                      src={`/objects/${img}`} 
                      className="rounded-xl w-full h-48 object-cover shadow-sm hover:scale-105 transition-transform"
                      alt="Portfolio item"
                    />
                  ))}
                </div>
              ) : (
                <div className="p-8 bg-secondary/20 rounded-xl text-center text-muted-foreground border border-dashed">
                  No portfolio images uploaded.
                </div>
              )}
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4">Reviews ({reviews?.length || 0})</h2>
              
              <div className="space-y-6">
                {reviews?.map((review) => (
                  <div key={review.id} className="p-4 bg-card rounded-xl border">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-bold">{review.client.fullName}</div>
                      <div className="flex text-amber-500">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`w-4 h-4 ${i < review.rating ? "fill-current" : "text-slate-300"}`} />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{review.comment}</p>
                  </div>
                ))}

                {user && user.id !== id && (
                  <div className="bg-secondary/30 p-6 rounded-xl mt-8">
                    <h3 className="font-bold mb-4">Write a Review</h3>
                    <div className="flex gap-2 mb-4">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button key={star} onClick={() => setReviewRating(star)} className="focus:outline-none">
                          <Star className={`w-6 h-6 ${star <= reviewRating ? "text-amber-500 fill-current" : "text-slate-300"}`} />
                        </button>
                      ))}
                    </div>
                    <Textarea 
                      placeholder="Share your experience..." 
                      className="mb-4 bg-background"
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                    />
                    <Button onClick={handleSubmitReview} disabled={createReview.isPending}>
                      {createReview.isPending ? "Submitting..." : "Post Review"}
                    </Button>
                  </div>
                )}
              </div>
            </section>
          </div>

          <div className="md:col-span-1">
            <Card className="sticky top-24">
              <CardContent className="p-6">
                <h3 className="font-bold mb-4">Availability</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mon - Fri</span>
                    <span>09:00 - 18:00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Saturday</span>
                    <span>10:00 - 14:00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sunday</span>
                    <span className="text-destructive">Closed</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
