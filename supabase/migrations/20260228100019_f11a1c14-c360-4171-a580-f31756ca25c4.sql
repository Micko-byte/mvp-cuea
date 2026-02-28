
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, name, email, admission_number, program, course, course_name, year, semester)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    NEW.raw_user_meta_data->>'admission_number',
    NEW.raw_user_meta_data->>'program',
    NEW.raw_user_meta_data->>'course',
    NEW.raw_user_meta_data->>'course_name',
    NEW.raw_user_meta_data->>'year',
    NEW.raw_user_meta_data->>'semester'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    admission_number = EXCLUDED.admission_number,
    program = EXCLUDED.program,
    course = EXCLUDED.course,
    course_name = EXCLUDED.course_name,
    year = EXCLUDED.year,
    semester = EXCLUDED.semester;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$function$;

-- Also fix the existing test user's profile
UPDATE public.profiles
SET
  admission_number = '78907',
  program = 'information technology',
  course = 'CS',
  course_name = 'Computer Science',
  year = '3',
  semester = '2'
WHERE user_id = 'a34149dd-63c8-4a5a-bded-3cc01f634d2e';
