import { Link } from "wouter";
import { Star, MapPin, CheckCircle2, BadgeCheck, Briefcase, ArrowRight } from "lucide-react";
import { Card, CardBody, CardFooter, Button, Chip, Avatar } from "@heroui/react";
import { useLanguage } from "@/hooks/use-language";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

export function ProviderCard({ provider, distance }: { provider: any; distance?: number }) {
  const { t, language } = useLanguage();
  const [priceMap, setPriceMap] = useState<Record<string, number>>({});

  useEffect(() => {
    fetch("/api/service-categories")
      .then(r => r.ok ? r.json() : [])
      .then((cats: any) => {
        if (Array.isArray(cats)) {
          const map: Record<string, number> = {};
          cats.forEach(c => { map[c.nameAr] = c.basePrice; map[c.nameFr] = c.basePrice; map[c.nameEn] = c.basePrice; });
          setPriceMap(map);
        }
      })
      .catch(() => {});
  }, []);

  const rawImage = provider.profileImage || provider.profile?.profileImage;
  const imageUrl = rawImage?.startsWith("http") ? rawImage : rawImage ? `/objects/${rawImage}` : null;
  const rating = provider.rating ?? null;
  const isVerified = provider.profile?.isVerified || provider.isVerified;
  const category = provider.profile?.serviceCategory || provider.serviceCategory;
  const bp = category ? priceMap[category] : undefined;

  return (
    <Link href={`/providers/${provider.id}`}>
      <motion.div whileHover={{ y: -6, scale: 1.01 }} transition={{ duration: 0.3, ease: "easeOut" }} className="h-full">
        <Card
          isPressable
          className="group relative bg-white dark:bg-zinc-900/80 h-full cursor-pointer overflow-hidden transition-all duration-300 border border-zinc-100/80 dark:border-zinc-800/60"
          style={{ 
            borderRadius: "24px",
            boxShadow: "0 8px 30px rgba(0,0,0,0.04)"
          }}
        >
          {/* Subtle gradient hover effect in the background */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 via-transparent to-purple-50/50 dark:from-indigo-900/10 dark:to-purple-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          <CardBody className="p-6 flex flex-col gap-5 relative z-10">
            {/* Header row */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                {/* Avatar with very soft shadow */}
                <div className="relative flex-shrink-0">
                  <Avatar
                    src={imageUrl || undefined}
                    name={(provider.fullName || "?").charAt(0).toUpperCase()}
                    showFallback
                    className="w-16 h-16 shadow-[0_4px_12px_rgba(0,0,0,0.08)] text-white font-bold text-xl transition-transform duration-300 group-hover:scale-105"
                    classNames={{
                      base: "bg-gradient-to-br from-indigo-500 to-purple-600",
                    }}
                  />
                  {/* Online dot - modern offset */}
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-400 border-[3px] border-white dark:border-zinc-900 rounded-full" />
                </div>

                {/* Name + category */}
                <div className="min-w-0 flex flex-col justify-center">
                  <h3 className="font-extrabold text-lg leading-tight text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate flex items-center gap-1.5 flex-wrap">
                    {provider.fullName || provider.username || t("provider")}
                    {isVerified && (
                      <BadgeCheck className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                    )}
                  </h3>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Chip
                      size="sm"
                      className="text-[11px] font-bold h-6 px-3 bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 border-none"
                    >
                      {category || t("professional")}
                    </Chip>
                  </div>
                </div>
              </div>

              {/* Right: rating */}
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <Chip
                  size="sm"
                  startContent={<Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />}
                  className="bg-white dark:bg-zinc-900 shadow-sm border border-zinc-100 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 font-bold text-xs h-7 px-3"
                  style={{ borderRadius: "12px" }}
                >
                  {rating ?? t("new")}
                </Chip>
                {provider.reviewCount ? (
                  <span className="text-[11px] text-zinc-400 font-medium">({provider.reviewCount})</span>
                ) : null}
              </div>
            </div>

            {/* Bio */}
            <p className="text-zinc-500 dark:text-zinc-400 text-sm line-clamp-2 flex-grow leading-relaxed font-medium">
              {provider.profile?.bio || provider.bio || t("noBio")}
            </p>

            {/* Meta stats in a soft container */}
            <div className="flex items-center gap-4 flex-wrap text-[13px] text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-2xl border border-zinc-100/50 dark:border-zinc-800/50">
              <span className="flex items-center gap-1.5 font-medium">
                <MapPin className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                <span className="truncate max-w-[120px]">
                  {provider.profile?.citiesServed?.join(", ") || provider.citiesServed?.join(", ") || provider.city || t("remote")}
                </span>
                {distance !== undefined && (
                  <span className="ml-1 text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 px-1.5 py-0.5 rounded-md text-[11px] font-bold">
                    {distance} كم
                  </span>
                )}
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                {provider.profile?.yearsOfExperience || provider.yearsOfExperience || 0} {t("yearsExp")}
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <Briefcase className="w-4 h-4 text-blue-500 flex-shrink-0" />
                {provider.profile?.completedBookings || provider.completedBookings || 0}
              </span>
            </div>
          </CardBody>

          <CardFooter className="px-6 pb-6 pt-0 relative z-10">
            <Button
              className="w-full font-bold text-sm bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-lg shadow-zinc-200 dark:shadow-none hover:scale-[1.02] transition-transform duration-300"
              style={{
                borderRadius: "16px",
                height: "48px"
              }}
              endContent={<ArrowRight className="w-4 h-4" />}
            >
              {t("book")}
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    </Link>
  );
}

