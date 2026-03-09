-- Academic calendar events table
CREATE TABLE public.academic_calendar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  start_date date NOT NULL,
  end_date date,
  category text NOT NULL DEFAULT 'academic',
  trimester text,
  description text,
  is_student_created boolean DEFAULT false,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.academic_calendar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view calendar events" ON public.academic_calendar FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own events" ON public.academic_calendar FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by AND is_student_created = true);
CREATE POLICY "Users can delete own events" ON public.academic_calendar FOR DELETE TO authenticated USING (auth.uid() = created_by AND is_student_created = true);
CREATE POLICY "Admins manage all calendar events" ON public.academic_calendar FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.academic_calendar (event_name, start_date, end_date, category, trimester, description) VALUES
('University Reopens', '2025-09-02', '2025-09-02', 'academic', 'Trimester 1', 'University reopens for Trimester 1'),
('Registration Period', '2025-09-02', '2025-09-13', 'registration', 'Trimester 1', 'Student registration for Trimester 1'),
('Lectures Begin', '2025-09-08', '2025-09-08', 'academic', 'Trimester 1', 'Lectures commence for Trimester 1'),
('Orientation (New Students)', '2025-09-09', '2025-09-10', 'orientation', 'Trimester 1', 'New student orientation'),
('Interfaith Youth Forum', '2025-09-19', '2025-09-19', 'event', 'Trimester 1', 'Interfaith Youth Forum'),
('Results Released', '2025-09-19', '2025-09-19', 'academic', 'Trimester 1', 'Previous trimester results released'),
('Special Senate', '2025-09-19', '2025-09-19', 'governance', 'Trimester 1', 'Special Senate meeting'),
('Add/Drop Deadline', '2025-09-26', '2025-09-26', 'deadline', 'Trimester 1', 'Last day to add or drop units'),
('Global Mission Conference', '2025-09-25', '2025-09-27', 'event', 'Trimester 1', 'Global Mission Conference'),
('Amani Communities Africa Summit', '2025-09-02', '2025-09-04', 'event', 'Trimester 1', 'Amani Communities Africa Summit'),
('Academic Convocation', '2025-09-11', '2025-09-11', 'event', 'Trimester 1', 'Academic Convocation'),
('Full Senate', '2025-10-03', '2025-10-03', 'governance', 'Trimester 1', 'Full Senate meeting'),
('General Student Assembly', '2025-10-08', '2025-10-08', 'event', 'Trimester 1', 'General Student Assembly'),
('University Reopens', '2026-01-05', '2026-01-05', 'academic', 'Trimester 2', 'University reopens for Trimester 2'),
('Lectures Begin', '2026-01-06', '2026-01-06', 'academic', 'Trimester 2', 'Lectures commence for Trimester 2'),
('Registration Period', '2026-01-06', '2026-01-23', 'registration', 'Trimester 2', 'Student registration for Trimester 2'),
('Orientation (New Students)', '2026-01-06', '2026-01-09', 'orientation', 'Trimester 2', 'New student orientation'),
('Results Released', '2026-01-23', '2026-01-23', 'academic', 'Trimester 2', 'Previous trimester results released'),
('Special Senate', '2026-01-23', '2026-01-23', 'governance', 'Trimester 2', 'Special Senate meeting'),
('Add/Drop Deadline', '2026-01-30', '2026-01-30', 'deadline', 'Trimester 2', 'Last day to add or drop units'),
('General Student Assembly', '2026-02-11', '2026-02-11', 'event', 'Trimester 2', 'General Student Assembly'),
('University Prayer Day', '2026-02-12', '2026-02-12', 'event', 'Trimester 2', 'University Prayer Day'),
('Ash Wednesday', '2026-02-18', '2026-02-18', 'event', 'Trimester 2', 'Ash Wednesday'),
('Full Senate', '2026-03-20', '2026-03-20', 'governance', 'Trimester 2', 'Full Senate meeting'),
('University Reopens', '2026-05-05', '2026-05-05', 'academic', 'Trimester 3', 'University reopens for Trimester 3'),
('Lectures Begin', '2026-05-05', '2026-05-05', 'academic', 'Trimester 3', 'Lectures commence for Trimester 3'),
('Registration Period', '2026-05-05', '2026-05-16', 'registration', 'Trimester 3', 'Student registration for Trimester 3'),
('Orientation (New Students)', '2026-05-06', '2026-05-07', 'orientation', 'Trimester 3', 'New student orientation'),
('Results Released', '2026-05-22', '2026-05-22', 'academic', 'Trimester 3', 'Previous trimester results released'),
('Special Senate', '2026-05-22', '2026-05-22', 'governance', 'Trimester 3', 'Special Senate meeting'),
('Add/Drop Deadline', '2026-05-30', '2026-05-30', 'deadline', 'Trimester 3', 'Last day to add or drop units'),
('General Student Assembly', '2026-06-10', '2026-06-10', 'event', 'Trimester 3', 'General Student Assembly'),
('Full Senate', '2026-07-17', '2026-07-17', 'governance', 'Trimester 3', 'Full Senate meeting');