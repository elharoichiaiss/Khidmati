import { Link } from "wouter";
import { Star, MapPin, CheckCircle2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { User, ProviderProfile } from "@shared/schema";
import { useLanguage } from "@/hooks/use-language";

type ProviderData = User & {
  profile: ProviderProfile | null;
  rating?: number;
  reviewCount?: number;
};

export function ProviderCard({ provider }: { provider: ProviderData }) {
  const { t } = useLanguage();

  // Use user profile image, or fallback to provider profile image
  const rawImage = provider.profileImage || provider.profile?.profileImage;

  // Safe image path handling
  const imageUrl = rawImage?.startsWith('http')
    ? rawImage
    : rawImage
      ? `/objects/${rawImage}`
      : null;

  return (
    <Link href={`/providers/${provider.id}`}>
      <div className="group relative bg-card rounded-2xl border border-border p-5 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 cursor-pointer overflow-hidden">
        {/* Hover Gradient Effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

        <div className="relative flex flex-col h-full">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <Avatar className="w-14 h-14 border-2 border-background shadow-sm">
                <AvatarImage src={imageUrl || undefined} className="object-cover" />
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                  {provider.fullName[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">
                  {provider.fullName}
                </h3>
                <Badge variant="secondary" className="mt-1 font-normal bg-secondary/50">
                  {provider.profile?.serviceCategory || t("professional")}
                </Badge>
              </div>
            </div>
            {/* Rating Badge */}
            <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/30 px-2 py-1 rounded-lg border border-amber-100 dark:border-amber-900/50">
              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              <span className="font-bold text-sm text-amber-700 dark:text-amber-400">
                {provider.rating || t("new")}
              </span>
              {provider.reviewCount ? (
                <span className="text-xs text-amber-600/70 dark:text-amber-500/50">({provider.reviewCount})</span>
              ) : null}
            </div>
          </div>

          {/* Bio Preview */}
          <p className="text-muted-foreground text-sm line-clamp-2 mb-4 flex-grow">
            {provider.profile?.bio || t("noBio")}
          </p>

          {/* Footer Info */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center text-xs text-muted-foreground gap-2">
              <MapPin className="w-3.5 h-3.5 text-primary/70" />
              <span className="truncate max-w-[200px]">
                {provider.profile?.citiesServed?.join(", ") || provider.city || t("remote")}
              </span>
            </div>
            <div className="flex items-center text-xs text-muted-foreground gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              <span>{provider.profile?.yearsOfExperience || 0} {t("yearsExp")}</span>
            </div>
          </div>

          {/* Action Button */}
          <Button className="w-full mt-auto group-hover:bg-primary group-hover:text-white transition-colors" variant="outline">
            {t("book")}
          </Button>
        </div>
      </div >
    </Link >
  );
}
