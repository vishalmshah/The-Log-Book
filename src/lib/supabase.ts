import {
  createBrowserClient,
  createServerClient as createSSRServerClient,
} from "@supabase/ssr";
import { cookies } from "next/headers";

/** Use in Client Components and browser-side code */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

/** Use in Server Components, server actions, and route handlers */
export async function createServerClient() {
  const cookieStore = await cookies();
  return createSSRServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, { ...options, maxAge: 60 * 60 * 24 * 365 })
            );
          } catch {
            // Called from a Server Component — middleware handles session refresh
          }
        },
      },
    }
  );
}
