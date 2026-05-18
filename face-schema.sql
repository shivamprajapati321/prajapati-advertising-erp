-- ═══════════════════════════════════════
-- Face Attendance Schema
-- Run in: Prajapati Advertising Supabase
-- ═══════════════════════════════════════

-- Add face photo columns to staff table
ALTER TABLE prajapati_staff 
  ADD COLUMN IF NOT EXISTS face_photo TEXT,
  ADD COLUMN IF NOT EXISTS face_enrolled_at TIMESTAMPTZ;

-- Add method column to attendance
ALTER TABLE prajapati_attendance 
  ADD COLUMN IF NOT EXISTS attendance_method TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS marked_by TEXT;

-- Update RLS
ALTER TABLE prajapati_staff DISABLE ROW LEVEL SECURITY;
ALTER TABLE prajapati_attendance DISABLE ROW LEVEL SECURITY;
GRANT ALL ON prajapati_staff TO anon;
GRANT ALL ON prajapati_attendance TO anon;

-- Verify
SELECT name, role, 
  CASE WHEN face_photo IS NOT NULL THEN 'enrolled' ELSE 'not enrolled' END as face_status
FROM prajapati_staff 
WHERE status='active' AND role != 'execution'
ORDER BY department, name;
