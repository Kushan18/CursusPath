-- 1. Create a profiles table linked to Supabase Auth Users
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT NOT NULL,
    college_name TEXT DEFAULT 'CMR Engineering College',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Create an offers table to track verification history
CREATE TABLE public.offers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    company_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    trust_score INT NOT NULL CHECK (trust_score BETWEEN 0 AND 100),
    red_flags JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Create a resumes table to track parsed CV data
CREATE TABLE public.resumes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    file_url TEXT NOT NULL,
    ats_score INT NOT NULL,
    analysis_report JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security (RLS) for data privacy
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies allowing users to read/write only their own data
CREATE POLICY "Users can manage their own profile" ON public.profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users can manage their own offers" ON public.offers FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own resumes" ON public.resumes FOR ALL USING (auth.uid() = user_id);

-- 4. Create a user_resumes table to track Resume Builder data
CREATE TABLE public.user_resumes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    resume_name TEXT NOT NULL,
    target_role TEXT,
    job_description TEXT,
    resume_data JSONB DEFAULT '{}'::jsonb,
    skipped_fields JSONB DEFAULT '[]'::jsonb,
    parseability_score INT DEFAULT 0,
    job_match_score INT DEFAULT 0,
    score_deductions JSONB DEFAULT '[]'::jsonb,
    template_id TEXT DEFAULT 'strict_ats',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.user_resumes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own built resumes" ON public.user_resumes FOR ALL USING (auth.uid() = user_id);
