import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Route to the right page when a notification is clicked, based on type/source + user role.
export function getNotifTarget(notif: { type: string; link?: string | null }, userRole?: string): string {
  // Legacy booking notifications pointed to the generic messages page — route them properly instead
  if (notif.link && notif.link !== "/messages") return notif.link;
  switch (notif.type) {
    case "booking_update":
      return userRole === "provider" ? "/provider/bookings" : "/bookings";
    case "new_message":
      return "/messages";
    default:
      return notif.link || "/notifications";
  }
}
