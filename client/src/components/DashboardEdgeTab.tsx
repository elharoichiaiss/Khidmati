import { useLocation } from "wouter";
import { ChevronLeft, LayoutDashboard } from "lucide-react";

interface DashboardEdgeTabProps {
  href?: string;
}

export function DashboardEdgeTab({ href = "/provider/dashboard" }: DashboardEdgeTabProps) {
  const [, setLocation] = useLocation();

  return (
    <button
      onClick={() => setLocation(href)}
      className="flex md:hidden fixed right-0 top-1/2 -translate-y-1/2 z-50 flex-col items-center justify-center w-8 h-20 bg-emerald-600 text-white rounded-l-2xl shadow-lg transition-all duration-200 hover:w-12 hover:bg-emerald-700 opacity-85 hover:opacity-100 group"
      aria-label="Back to Dashboard"
    >
      <ChevronLeft className="w-4 h-4 mb-1 transition-transform group-hover:-translate-x-0.5" />
      <LayoutDashboard className="w-3 h-3 opacity-70" />
    </button>
  );
}
