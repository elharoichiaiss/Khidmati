import { Layout } from "@/components/Layout";
import { useProviders } from "@/hooks/use-providers";
import { ProviderCard } from "@/components/ProviderCard";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Search as SearchIcon, Filter } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

export default function SearchPage() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const initialQuery = searchParams.get("q") || "";
  const initialCategory = searchParams.get("category") || "";

  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const [city, setCity] = useState("");

  const { data: providers, isLoading } = useProviders({ 
    search: query, 
    category: category === "all" ? undefined : category, 
    city: city === "all" ? undefined : city 
  });

  return (
    <Layout>
      <div className="bg-secondary/30 border-b">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold font-display mb-6">Find Services</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-background rounded-xl shadow-sm border">
            <div className="relative md:col-span-2">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input 
                placeholder="Search by name or keyword..." 
                className="pl-10 border-0 bg-secondary/50 focus-visible:ring-1"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="border-0 bg-secondary/50">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Plumbing">Plumbing</SelectItem>
                <SelectItem value="Electrician">Electrician</SelectItem>
                <SelectItem value="Cleaning">Cleaning</SelectItem>
                <SelectItem value="Beauty">Beauty</SelectItem>
              </SelectContent>
            </Select>

            <Select value={city} onValueChange={setCity}>
              <SelectTrigger className="border-0 bg-secondary/50">
                <SelectValue placeholder="City" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                <SelectItem value="Casablanca">Casablanca</SelectItem>
                <SelectItem value="Rabat">Rabat</SelectItem>
                <SelectItem value="Marrakech">Marrakech</SelectItem>
                <SelectItem value="Tangier">Tangier</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="h-64 w-full rounded-2xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : providers?.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mx-auto mb-6">
              <Filter className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold mb-2">No results found</h2>
            <p className="text-muted-foreground">Try adjusting your filters or search terms.</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-6">Showing {providers?.length} professionals</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {providers?.map((provider) => (
                <ProviderCard key={provider.id} provider={provider} />
              ))}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
