import { z } from 'zod';
import {
  insertUserSchema,
  insertProviderProfileSchema,
  insertReviewSchema,
  insertMessageSchema,
  insertPaymentMethodSchema,
  insertPaymentSchema,
  insertRecurringBookingSchema,
  users,
  providerProfiles,
  reviews,
  conversations,
  messages,
  serviceCategories,
  recurringBookings,
  verificationRequests,
  providerBadges,
  paymentMethods,
  payments,
  bookings,
} from './schema';

export {
  insertUserSchema,
  insertProviderProfileSchema,
  insertReviewSchema,
  insertMessageSchema,
  insertPaymentMethodSchema,
  insertPaymentSchema,
  insertRecurringBookingSchema,
  users,
  providerProfiles,
  reviews,
  conversations,
  messages,
  serviceCategories,
  recurringBookings,
  verificationRequests,
  providerBadges,
  paymentMethods,
  payments,
  bookings,
  // Types exported from schema.ts
  type LoginRequest,
  type InsertUser,
  type InsertProviderProfile,
  type ProviderSearchParams,
  type InsertReview,
  type User,
  type ServiceCategory,
  type RecurringBooking,
  type InsertRecurringBooking,
  type VerificationRequest,
  type ProviderBadge,
  type PaymentMethod,
  type Payment,
  type InsertPaymentMethod,
  type InsertPayment,
} from './schema';

// ============================================
// SHARED ERROR SCHEMAS
// ============================================
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

// ============================================
// API CONTRACT
// ============================================
export const api = {
  auth: {
    register: {
      method: 'POST' as const,
      path: '/api/register',
      input: insertUserSchema.extend({
        username: z.string().min(3, "Username must be at least 3 characters").max(20, "Username must be less than 20 characters"),
        password: z.string().min(12, "Password must be at least 12 characters").optional().or(z.literal('')),
        fullName: z.string().min(2, "Full name is required"),
        email: z.string().email("Please enter a valid email address").optional().or(z.literal('')),
        googleId: z.string().optional(),
        // Optional profile data during registration if role is provider
        providerProfile: insertProviderProfileSchema.omit({ userId: true }).optional(),
      }),
      responses: {
        201: z.custom<typeof users.$inferSelect>(), // Returns User
        400: errorSchemas.validation,
      },
    },
    login: {
      method: 'POST' as const,
      path: '/api/login',
      input: z.object({
        username: z.string(),
        password: z.string(),
      }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/logout',
      responses: {
        200: z.void(),
      },
    },
    completeProfile: {
      method: 'POST' as const,
      path: '/api/complete-profile',
      input: z.object({
        role: z.enum(["client", "provider"]),
        fullName: z.string().min(2).optional(),
        username: z.string().min(3).max(20).optional(),
        phone: z.string().nullable().optional(),
        city: z.string().min(1),
        serviceCategory: z.string().optional(),
        yearsOfExperience: z.number().optional(),
        bio: z.string().optional(),
      }),
      responses: {
        200: z.custom<typeof users.$inferSelect & { providerProfile?: typeof providerProfiles.$inferSelect }>(),
        401: errorSchemas.unauthorized,
        400: errorSchemas.validation,
      },
    },
    me: {
      method: 'GET' as const,
      path: '/api/user',
      responses: {
        200: z.custom<typeof users.$inferSelect & { providerProfile?: typeof providerProfiles.$inferSelect }>(),
        401: errorSchemas.unauthorized,
      },
    },
    forgotPassword: {
      method: 'POST' as const,
      path: '/api/forgot-password',
      input: z.object({ email: z.string() }),
      responses: {
        200: z.object({ message: z.string() }),
      },
    },
    resetPassword: {
      method: 'POST' as const,
      path: '/api/reset-password',
      input: z.object({ token: z.string(), password: z.string() }),
      responses: {
        200: z.object({ message: z.string() }),
        400: errorSchemas.validation,
      },
    },
  },
  account: {
    deleteAccount: {
      method: 'POST' as const,
      path: '/api/user/delete',
      input: z.object({
        reason: z.string().max(500).optional(),
        confirmation: z.literal(true),
      }),
      responses: {
        200: z.object({ success: z.boolean(), message: z.string() }),
        401: errorSchemas.unauthorized,
        400: errorSchemas.validation,
      },
    },
  },
  providers: {
    list: {
      method: 'GET' as const,
      path: '/api/providers',
      input: z.object({
        city: z.string().optional(),
        category: z.string().optional(),
        search: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof users.$inferSelect & { profile: typeof providerProfiles.$inferSelect | null }>()),
      },
    },
    nearby: {
      method: 'GET' as const,
      path: '/api/providers/nearby',
      input: z.object({
        lat: z.string(),
        lng: z.string(),
        radius: z.string().optional(),
        category: z.string().optional(),
      }),
      responses: {
        200: z.array(z.custom<typeof users.$inferSelect & { profile: typeof providerProfiles.$inferSelect | null, distance: number }>()),
        400: errorSchemas.validation,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/providers/:id',
      responses: {
        200: z.custom<typeof users.$inferSelect & { profile: typeof providerProfiles.$inferSelect | null }>(),
        404: errorSchemas.notFound,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/providers/profile', // Current user's profile
      input: insertProviderProfileSchema.partial().omit({ userId: true }),
      responses: {
        200: z.custom<typeof providerProfiles.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
  },
  reviews: {
    list: {
      method: 'GET' as const,
      path: '/api/providers/:id/reviews',
      responses: {
        200: z.array(z.custom<typeof reviews.$inferSelect & { client: typeof users.$inferSelect }>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/providers/:id/reviews',
      input: insertReviewSchema.omit({ providerId: true, clientId: true }),
      responses: {
        201: z.custom<typeof reviews.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
  },
  conversations: {
    list: {
      method: 'GET' as const,
      path: '/api/conversations',
      responses: {
        200: z.array(z.custom<typeof conversations.$inferSelect & { 
          otherUser: typeof users.$inferSelect,
          unreadCount: number,
          lastMessage?: string,
          updatedAt?: string | Date
        }>()),
        401: errorSchemas.unauthorized,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/conversations/:id',
      responses: {
        200: z.custom<typeof conversations.$inferSelect & { messages: typeof messages.$inferSelect[] }>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/conversations',
      input: z.object({ targetUserId: z.number() }),
      responses: {
        201: z.custom<typeof conversations.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
  },
  messages: {
    create: {
      method: 'POST' as const,
      path: '/api/conversations/:id/messages',
      input: z.object({ content: z.string() }),
      responses: {
        201: z.custom<typeof messages.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/messages/:id',
      responses: {
        200: z.object({ success: z.boolean() }),
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      },
    },
  },
  bookings: {
    myBookings: {
      method: 'GET' as const,
      path: '/api/my-bookings',
      responses: {
        200: z.array(z.object({
          booking: z.custom<typeof bookings.$inferSelect>(),
          provider: z.custom<typeof users.$inferSelect>(),
          profile: z.custom<typeof providerProfiles.$inferSelect>().nullable(),
        })),
        401: errorSchemas.unauthorized,
      },
    },
    providerMyBookings: {
      method: 'GET' as const,
      path: '/api/provider/my-bookings',
      responses: {
        200: z.array(z.object({
          booking: z.custom<typeof bookings.$inferSelect>(),
          client: z.custom<typeof users.$inferSelect>(),
        })),
        403: errorSchemas.unauthorized,
      },
    },
  },
  categories: {
    list: {
      method: 'GET' as const,
      path: '/api/service-categories',
      responses: {
        200: z.array(z.custom<typeof serviceCategories.$inferSelect>()),
      },
    },
  },
  push: {
    subscribe: {
      method: 'POST' as const,
      path: '/api/push/subscribe',
      input: z.object({
        endpoint: z.string(),
        keys: z.object({
          p256dh: z.string(),
          auth: z.string(),
        }),
      }),
      responses: {
        201: z.object({ success: z.boolean() }),
        401: errorSchemas.unauthorized,
      },
    }
  },
  recurringBookings: {
    list: {
      method: 'GET' as const,
      path: '/api/recurring-bookings',
      responses: {
        200: z.array(z.custom<typeof recurringBookings.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/recurring-bookings',
      input: insertRecurringBookingSchema,
      responses: {
        201: z.custom<typeof recurringBookings.$inferSelect>(),
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/recurring-bookings/:id',
      input: insertRecurringBookingSchema.partial(),
      responses: {
        200: z.custom<typeof recurringBookings.$inferSelect>(),
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/recurring-bookings/:id',
      responses: {
        200: z.object({ success: z.boolean() }),
      },
    },
  },
  verification: {
    request: {
      method: 'POST' as const,
      path: '/api/verification/request',
      input: z.object({
        idDocument: z.string().optional(),
        professionalLicense: z.string().optional(),
        additionalDocs: z.array(z.string()).optional(),
      }),
      responses: {
        201: z.custom<typeof verificationRequests.$inferSelect>(),
        401: errorSchemas.unauthorized,
        400: errorSchemas.validation,
      },
    },
    status: {
      method: 'GET' as const,
      path: '/api/verification/status',
      responses: {
        200: z.custom<typeof verificationRequests.$inferSelect | { status: string }>(),
        401: errorSchemas.unauthorized,
      },
    },
    adminList: {
      method: 'GET' as const,
      path: '/api/admin/verification-requests',
      responses: {
        200: z.array(z.custom<typeof verificationRequests.$inferSelect>()),
      },
    },
    adminReview: {
      method: 'PUT' as const,
      path: '/api/admin/verification-requests/:id',
      input: z.object({
        status: z.enum(["approved", "rejected"]),
        notes: z.string().optional(),
      }),
      responses: {
        200: z.custom<typeof verificationRequests.$inferSelect>(),
      },
    },
  },
  providerBadges: {
    list: {
      method: 'GET' as const,
      path: '/api/providers/:id/badges',
      responses: {
        200: z.array(z.custom<typeof providerBadges.$inferSelect>()),
      },
    },
  },
  admin: {
    stats: {
      method: 'GET' as const,
      path: '/api/admin/stats',
      responses: {
        200: z.object({
          totalUsers: z.number(),
          totalProviders: z.number(),
          totalBookings: z.number(),
          pendingVerifications: z.number(),
          totalRevenue: z.number(),
          recentUsers: z.array(z.any()),
          recentBookings: z.array(z.any()),
        }),
      },
    },
    users: {
      list: {
        method: 'GET' as const,
        path: '/api/admin/users',
        responses: {
          200: z.array(z.any()),
        },
      },
      update: {
        method: 'PUT' as const,
        path: '/api/admin/users/:id',
        responses: {
          200: z.any(),
        },
      },
    },
    bookings: {
      list: {
        method: 'GET' as const,
        path: '/api/admin/bookings',
        responses: {
          200: z.array(z.any()),
        },
      },
    },
    verifications: {
      list: {
        method: 'GET' as const,
        path: '/api/admin/verifications',
        responses: {
          200: z.array(z.any()),
        },
      },
    },
    revenue: {
      list: {
        method: 'GET' as const,
        path: '/api/admin/revenue',
        responses: {
          200: z.object({
            payments: z.array(z.any()),
            period: z.string(),
          }),
        },
      },
    },
  },
  paymentMethods: {
    list: {
      method: 'GET' as const,
      path: '/api/payment-methods',
      responses: {
        200: z.array(z.custom<typeof paymentMethods.$inferSelect>()),
        401: errorSchemas.unauthorized,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/payment-methods',
      input: insertPaymentMethodSchema,
      responses: {
        201: z.custom<typeof paymentMethods.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/payment-methods/:id',
      responses: {
        200: z.object({ success: z.boolean() }),
        401: errorSchemas.unauthorized,
      },
    },
  },
  payments: {
    process: {
      method: 'POST' as const,
      path: '/api/payments/process',
      input: z.object({
        bookingId: z.number(),
        method: z.enum(["cash_plus", "cmi", "card", "cash"]),
        phoneNumber: z.string().optional(),
      }),
      responses: {
        200: z.object({
          payment: z.custom<typeof payments.$inferSelect>(),
          message: z.string(),
          requiresOtp: z.boolean().optional(),
          otpSent: z.boolean().optional(),
        }),
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      },
    },
    getByBooking: {
      method: 'GET' as const,
      path: '/api/payments/booking/:bookingId',
      responses: {
        200: z.array(z.custom<typeof payments.$inferSelect>()),
        401: errorSchemas.unauthorized,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
