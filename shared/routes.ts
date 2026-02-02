import { z } from 'zod';
export {
  insertUserSchema,
  insertProviderProfileSchema,
  insertReviewSchema,
  insertMessageSchema,
  users,
  providerProfiles,
  reviews,
  conversations,
  messages
} from './schema';
import {
  insertUserSchema,
  insertProviderProfileSchema,
  insertReviewSchema,
  insertMessageSchema,
  users,
  providerProfiles,
  reviews,
  conversations,
  messages
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
        password: z.string().min(6, "Password must be at least 6 characters"),
        fullName: z.string().min(2, "Full name is required"),
        email: z.string().email("Please enter a valid email address").optional().or(z.literal('')),
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
    me: {
      method: 'GET' as const,
      path: '/api/user',
      responses: {
        200: z.custom<typeof users.$inferSelect & { providerProfile?: typeof providerProfiles.$inferSelect }>(),
        401: errorSchemas.unauthorized,
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
        200: z.array(z.custom<typeof providerProfiles.$inferSelect & { user: typeof users.$inferSelect }>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/providers/:id',
      responses: {
        200: z.custom<typeof providerProfiles.$inferSelect & { user: typeof users.$inferSelect }>(),
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
        200: z.array(z.custom<typeof conversations.$inferSelect & { otherUser: typeof users.$inferSelect }>()),
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
  }
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
