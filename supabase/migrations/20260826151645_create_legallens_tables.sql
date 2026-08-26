/*
# Create LegalLens core tables (single-tenant, no auth)

1. New Tables
- `documents`
  - `id` (uuid, primary key)
  - `filename` (text, not null) — original uploaded file name
  - `document_type` (text) — AI-detected type (contract, NDA, etc.)
  - `extracted_text` (text) — full text extracted from the uploaded file
  - `file_size` (integer) — file size in bytes
  - `file_type` (text) — mime/extension of uploaded file
  - `upload_date` (timestamptz, default now)
  - `status` (text, default 'pending') — pending | analyzing | completed | failed
- `analyses`
  - `id` (uuid, primary key)
  - `document_id` (uuid, foreign key to documents, cascade delete)
  - `summary` (text)
  - `risk_score` (integer)
  - `risk_level` (text)
  - `key_clauses` (jsonb) — array of clause objects
  - `risks` (jsonb) — array of risk objects
  - `obligations` (jsonb) — { user: [], otherParty: [] }
  - `important_dates` (jsonb) — array of date objects
  - `financial_terms` (jsonb) — array of financial term objects
  - `missing_information` (jsonb) — array of strings
  - `created_at` (timestamptz, default now)
- `chat_messages`
  - `id` (uuid, primary key)
  - `document_id` (uuid, foreign key to documents, cascade delete)
  - `question` (text)
  - `answer` (text)
  - `created_at` (timestamptz, default now)

2. Security
- Enable RLS on all three tables.
- Allow anon + authenticated full CRUD because this is a single-tenant educational app with no sign-in screen.
*/

CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename text NOT NULL,
  document_type text,
  extracted_text text,
  file_size integer,
  file_type text,
  upload_date timestamptz DEFAULT now(),
  status text DEFAULT 'pending'
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_documents" ON documents;
CREATE POLICY "anon_select_documents" ON documents FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_documents" ON documents;
CREATE POLICY "anon_insert_documents" ON documents FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_documents" ON documents;
CREATE POLICY "anon_update_documents" ON documents FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_documents" ON documents;
CREATE POLICY "anon_delete_documents" ON documents FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  summary text,
  risk_score integer,
  risk_level text,
  key_clauses jsonb DEFAULT '[]'::jsonb,
  risks jsonb DEFAULT '[]'::jsonb,
  obligations jsonb DEFAULT '{"user":[],"otherParty":[]}'::jsonb,
  important_dates jsonb DEFAULT '[]'::jsonb,
  financial_terms jsonb DEFAULT '[]'::jsonb,
  missing_information jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_analyses" ON analyses;
CREATE POLICY "anon_select_analyses" ON analyses FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_analyses" ON analyses;
CREATE POLICY "anon_insert_analyses" ON analyses FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_analyses" ON analyses;
CREATE POLICY "anon_update_analyses" ON analyses FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_analyses" ON analyses;
CREATE POLICY "anon_delete_analyses" ON analyses FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  question text,
  answer text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_chat_messages" ON chat_messages;
CREATE POLICY "anon_select_chat_messages" ON chat_messages FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_chat_messages" ON chat_messages;
CREATE POLICY "anon_insert_chat_messages" ON chat_messages FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_chat_messages" ON chat_messages;
CREATE POLICY "anon_delete_chat_messages" ON chat_messages FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_analyses_document_id ON analyses(document_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_document_id ON chat_messages(document_id);
CREATE INDEX IF NOT EXISTS idx_documents_upload_date ON documents(upload_date DESC);
