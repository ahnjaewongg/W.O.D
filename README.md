## Fitness Tracker (Vite + React + Supabase)

### Quick start
1) Copy `.env.example` to `.env` and set:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

2) Install and run:
```
npm i
npm run dev
```

### Supabase setup
1) Create a new Supabase project.
2) Run SQL in this order via SQL Editor:
   - `supabase/schema.sql`
   - `supabase/policies.sql`
   - `supabase/storage.sql`
3) Create a private storage bucket named `workout-photos` if not created by SQL.
4) Authentication: Email/Password enabled.

### Deployment (Vercel)
1) Push to GitHub.
2) Import to Vercel, Framework: Vite.
3) Set Environment Variables on Vercel:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4) Deploy.

### Notes
- RLS is enabled for all tables; users only see their own rows.
- Images are stored privately; the app generates signed URLs on demand.
- Client-side image compression to JPEG at ~82% quality and max 1600px.
- Code lives under `src/` with simple pages and components.


