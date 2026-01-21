import { Link } from "wouter";
import { Star, MapPin, CheckCircle2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ProviderWithUser } from "@shared/schema";
import { useLanguage } from "@/hooks/use-language";

export function ProviderCard({ provider }: { provider: ProviderWithUser }) {
  const { t } = useLanguage();
  
  // Safe image path handling
  const imageUrl = provider.profileImage?.startsWith('http') 
    ? provider.profileImage 
    : provider.profileImage 
      ? `/objects/${provider.profileImage}` 
      : null;

  return (
    <Link href={`/providers/${provider.user.id}`}>
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
                  {provider.user.fullName[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-display font-bold text-lg leading-tight group-hover:text-primary transition-colors">
                  {provider.user.fullName}
                </h3>
                <p className="text-sm text-muted-foreground">{provider.serviceCategory}</p>
              </div>
            </div>
            {provider.isAvailable && (
              <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 border-0 text-xs">
                Available
              </Badge>
            )}
          </div>

          {/* Bio Preview */}
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-grow">
            {provider.bio || "No bio provided."}
          </p>

          {/* Meta Info */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
            <div className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>{provider.citiesServed?.[0] || "Remote"}</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
              <span>{provider.yearsOfExperience}y exp</span>
            </div>
            <div className="flex items-center gap-1 text-amber-500 font-medium ml-auto">
              <Star className="w-3.5 h-3.5 fill-current" />
              <span>4.9 (12)</span>
            </div>
          </div>

          {/* Action */}
          <Button className="w-full bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground transition-colors group-hover:shadow-md">
            {t("book")}
          </Button>
        </div>
      </div>
    </Link>
  );
}
