-- Supabase Schema Extensions for Phase 5 Part B

CREATE TABLE IF NOT EXISTS college_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    college_name TEXT NOT NULL,
    target_companies TEXT[] DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS company_placement_blueprints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name TEXT UNIQUE NOT NULL,
    recruitment_rounds JSONB NOT NULL,
    selection_criteria TEXT
);

CREATE TABLE IF NOT EXISTS company_mock_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name TEXT NOT NULL REFERENCES company_placement_blueprints(company_name),
    round_type TEXT NOT NULL,
    difficulty_level TEXT NOT NULL,
    question_text TEXT NOT NULL,
    options TEXT[] NOT NULL,
    correct_option_index INT NOT NULL,
    answer_explanation TEXT
);
