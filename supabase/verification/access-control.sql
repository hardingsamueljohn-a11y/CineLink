-- VERIFICATION PROJECT ONLY, after the RLS migration. Run the WHOLE buffer.
-- Synthetic UUID claims exercise PostgreSQL RLS, not Auth token verification.
-- Actual signup/login and JWT/API tests remain mandatory (docs/security/12).
-- No auth.users INSERT, production data, persistent fixture, or COMMIT.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
SET LOCAL idle_in_transaction_session_timeout = '60s';

DO $fixtures$
BEGIN
  IF current_user<>'postgres' OR NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgrelid='auth.users'::regclass
      AND tgname='on_auth_user_created_profile' AND tgenabled='O'
  ) THEN RAISE EXCEPTION 'Expected postgres in the verification project after migration'; END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id IN
      ('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002'))
    OR EXISTS (SELECT 1 FROM public.movies WHERE tmdb_id IN (2147483001,2147483002)) THEN
    RAISE EXCEPTION 'Fixture identifiers already exist; refusing to reuse them';
  END IF;
  INSERT INTO public.profiles(id,username) VALUES
    ('10000000-0000-4000-8000-000000000001','cinelink_verification_a'),
    ('10000000-0000-4000-8000-000000000002','cinelink_verification_b');
  INSERT INTO public.movies(tmdb_id,title) VALUES (2147483001,'Synthetic RLS film one'),(2147483002,'Synthetic RLS film two');
  INSERT INTO public.reviews(user_id,tmdb_id,rating,content,is_spoiler) VALUES
    ('10000000-0000-4000-8000-000000000001',2147483001,4,'Synthetic A',false),
    ('10000000-0000-4000-8000-000000000002',2147483001,4,'Synthetic B',false);
  INSERT INTO public.wishlists(user_id,tmdb_id,status) VALUES
    ('10000000-0000-4000-8000-000000000001',2147483001,'want'),
    ('10000000-0000-4000-8000-000000000002',2147483001,'want');
  INSERT INTO public.follows(follower_id,following_id) VALUES
    ('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002'),
    ('10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001');
  PERFORM set_config('request.jwt.claim.sub','',true);
  PERFORM set_config('request.jwt.claims','{"role":"anon"}',true);
END;
$fixtures$;

SET LOCAL ROLE anon;
DO $anonymous_tests$
DECLARE statement text; denied boolean; n bigint;
BEGIN
  IF auth.uid() IS NOT NULL THEN RAISE EXCEPTION 'anon unexpectedly has a user id'; END IF;
  SELECT count(tmdb_id) INTO n FROM public.movies WHERE tmdb_id IN (2147483001,2147483002);
  IF n<>2 THEN RAISE EXCEPTION 'anon movie SELECT failed'; END IF;
  FOREACH statement IN ARRAY ARRAY[
    'SELECT id FROM public.profiles', 'SELECT id FROM public.reviews',
    'SELECT id FROM public.wishlists', 'SELECT follower_id FROM public.follows',
    'INSERT INTO public.profiles(id,username) VALUES (gen_random_uuid(),''blocked'')',
    'INSERT INTO public.movies(tmdb_id,title) VALUES (2147483001,''blocked'')',
    'INSERT INTO public.reviews(user_id,tmdb_id,rating,content,is_spoiler) VALUES (''10000000-0000-4000-8000-000000000001'',2147483002,4,''blocked'',false)',
    'INSERT INTO public.wishlists(user_id,tmdb_id,status) VALUES (''10000000-0000-4000-8000-000000000001'',2147483002,''want'')',
    'INSERT INTO public.follows(follower_id,following_id) VALUES (''10000000-0000-4000-8000-000000000001'',''10000000-0000-4000-8000-000000000002'')',
    'UPDATE public.profiles SET bio=''blocked'' WHERE false',
    'UPDATE public.movies SET title=''blocked'' WHERE false',
    'UPDATE public.reviews SET content=''blocked'' WHERE false',
    'UPDATE public.wishlists SET status=''want'' WHERE false',
    'UPDATE public.follows SET following_id=''10000000-0000-4000-8000-000000000001'' WHERE false',
    'DELETE FROM public.profiles WHERE false','DELETE FROM public.movies WHERE false',
    'DELETE FROM public.reviews WHERE false','DELETE FROM public.wishlists WHERE false','DELETE FROM public.follows WHERE false'
  ] LOOP
    denied:=false;
    BEGIN EXECUTE statement; EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
    IF NOT denied THEN RAISE EXCEPTION 'Anonymous operation was unexpectedly permitted: %',split_part(statement,' ',1); END IF;
  END LOOP;
  RAISE NOTICE 'PASS anonymous: public movie read, private reads and all writes denied';
END;
$anonymous_tests$;
RESET ROLE;

DO $claims_a$ BEGIN
  PERFORM set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
  PERFORM set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
END; $claims_a$;
SET LOCAL ROLE authenticated;
DO $owner_and_other_tests$
DECLARE statement text; denied boolean; n bigint; affected bigint; tab text; priv text;
BEGIN
  IF auth.uid() IS DISTINCT FROM '10000000-0000-4000-8000-000000000001'::uuid THEN RAISE EXCEPTION 'Unexpected A identity'; END IF;
  SELECT count(id) INTO n FROM public.profiles WHERE id IN ('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002');
  IF n<>2 THEN RAISE EXCEPTION 'Authenticated profile visibility failed'; END IF;
  SELECT count(id) INTO n FROM public.reviews WHERE tmdb_id=2147483001;
  IF n<>2 THEN RAISE EXCEPTION 'Authenticated review visibility failed'; END IF;
  SELECT count(id) INTO n FROM public.wishlists WHERE tmdb_id=2147483001;
  IF n<>2 THEN RAISE EXCEPTION 'Authenticated wishlist visibility failed'; END IF;
  SELECT count(follower_id) INTO n FROM public.follows WHERE follower_id IN ('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002');
  IF n<>2 THEN RAISE EXCEPTION 'Authenticated follow visibility failed'; END IF;

  UPDATE public.profiles SET bio='owner write' WHERE id=auth.uid();
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Own profile update failed'; END IF;
  UPDATE public.reviews SET rating=5,content='owner write',is_spoiler=true WHERE user_id=auth.uid() AND tmdb_id=2147483001;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Own review update failed'; END IF;
  INSERT INTO public.reviews(user_id,tmdb_id,rating,content,is_spoiler) VALUES(auth.uid(),2147483002,4,'owner insert',false);
  DELETE FROM public.reviews WHERE user_id=auth.uid() AND tmdb_id=2147483002;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Own review insert/delete failed'; END IF;
  UPDATE public.wishlists SET status='want' WHERE user_id=auth.uid() AND tmdb_id=2147483001;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Own wishlist update failed'; END IF;
  INSERT INTO public.wishlists(user_id,tmdb_id,status) VALUES(auth.uid(),2147483002,'want');
  DELETE FROM public.wishlists WHERE user_id=auth.uid() AND tmdb_id=2147483002;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Own wishlist insert/delete failed'; END IF;
  DELETE FROM public.follows WHERE follower_id=auth.uid() AND following_id='10000000-0000-4000-8000-000000000002';
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Own follow delete failed'; END IF;
  INSERT INTO public.follows(follower_id,following_id) VALUES(auth.uid(),'10000000-0000-4000-8000-000000000002');

  FOREACH statement IN ARRAY ARRAY[
    'UPDATE public.profiles SET bio=''blocked'' WHERE id=''10000000-0000-4000-8000-000000000002''',
    'UPDATE public.reviews SET content=''blocked'' WHERE user_id=''10000000-0000-4000-8000-000000000002'' AND tmdb_id=2147483001',
    'DELETE FROM public.reviews WHERE user_id=''10000000-0000-4000-8000-000000000002'' AND tmdb_id=2147483001',
    'UPDATE public.wishlists SET status=''want'' WHERE user_id=''10000000-0000-4000-8000-000000000002'' AND tmdb_id=2147483001',
    'DELETE FROM public.wishlists WHERE user_id=''10000000-0000-4000-8000-000000000002'' AND tmdb_id=2147483001',
    'DELETE FROM public.follows WHERE follower_id=''10000000-0000-4000-8000-000000000002'' AND following_id=''10000000-0000-4000-8000-000000000001'''
  ] LOOP
    EXECUTE statement; GET DIAGNOSTICS affected=ROW_COUNT;
    IF affected<>0 THEN RAISE EXCEPTION 'Other user row was modified'; END IF;
  END LOOP;

  FOREACH statement IN ARRAY ARRAY[
    'INSERT INTO public.profiles(id,username) VALUES (gen_random_uuid(),''blocked'')',
    'DELETE FROM public.profiles WHERE id=auth.uid()',
    'UPDATE public.profiles SET id=auth.uid() WHERE id=auth.uid()',
    'INSERT INTO public.movies(tmdb_id,title) VALUES (2147483001,''blocked'')',
    'UPDATE public.movies SET title=''blocked'' WHERE tmdb_id=2147483001',
    'DELETE FROM public.movies WHERE tmdb_id=2147483001',
    'INSERT INTO public.reviews(user_id,tmdb_id,rating,content,is_spoiler) VALUES (''10000000-0000-4000-8000-000000000002'',2147483002,4,''spoofed'',false)',
    'UPDATE public.reviews SET user_id=''10000000-0000-4000-8000-000000000002'' WHERE user_id=auth.uid()',
    'UPDATE public.reviews SET tmdb_id=2147483002 WHERE user_id=auth.uid()',
    'INSERT INTO public.wishlists(user_id,tmdb_id,status) VALUES (''10000000-0000-4000-8000-000000000002'',2147483002,''want'')',
    'UPDATE public.wishlists SET user_id=''10000000-0000-4000-8000-000000000002'' WHERE user_id=auth.uid()',
    'INSERT INTO public.follows(follower_id,following_id) VALUES (''10000000-0000-4000-8000-000000000002'',''10000000-0000-4000-8000-000000000001'')',
    'UPDATE public.follows SET following_id=auth.uid() WHERE follower_id=auth.uid()'
  ] LOOP
    denied:=false;
    BEGIN EXECUTE statement; EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
    IF NOT denied THEN RAISE EXCEPTION 'Forbidden authenticated operation was permitted: %',split_part(statement,' ',1); END IF;
  END LOOP;
  FOREACH tab IN ARRAY ARRAY['profiles','movies','reviews','wishlists','follows'] LOOP
    FOREACH priv IN ARRAY ARRAY['TRUNCATE','REFERENCES','TRIGGER','MAINTAIN'] LOOP
      IF has_table_privilege(current_user,format('public.%I',tab),priv) THEN
        RAISE EXCEPTION 'Unnecessary table privilege remains: % %',tab,priv;
      END IF;
    END LOOP;
  END LOOP;
  RAISE NOTICE 'PASS A: all-user reads, own writes, other-user denial, immutable owner columns and minimal grants';
END;
$owner_and_other_tests$;
RESET ROLE;

DO $claims_b$ BEGIN
  PERFORM set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
  PERFORM set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
END; $claims_b$;
SET LOCAL ROLE authenticated;
DO $reciprocal_tests$
DECLARE n bigint; affected bigint;
BEGIN
  IF auth.uid() IS DISTINCT FROM '10000000-0000-4000-8000-000000000002'::uuid THEN RAISE EXCEPTION 'Unexpected B identity'; END IF;
  SELECT count(id) INTO n FROM public.reviews WHERE user_id='10000000-0000-4000-8000-000000000001' AND tmdb_id=2147483001;
  IF n<>1 THEN RAISE EXCEPTION 'B cannot read A'; END IF;
  UPDATE public.profiles SET bio='B owner write' WHERE id=auth.uid();
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'B own profile update failed'; END IF;
  UPDATE public.reviews SET content='B owner write' WHERE user_id=auth.uid() AND tmdb_id=2147483001;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'B own review update failed'; END IF;
  DELETE FROM public.reviews WHERE user_id='10000000-0000-4000-8000-000000000001' AND tmdb_id=2147483001;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>0 THEN RAISE EXCEPTION 'B deleted A review'; END IF;
  DELETE FROM public.wishlists WHERE user_id='10000000-0000-4000-8000-000000000001' AND tmdb_id=2147483001;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>0 THEN RAISE EXCEPTION 'B deleted A wishlist'; END IF;
  DELETE FROM public.follows WHERE follower_id='10000000-0000-4000-8000-000000000001' AND following_id=auth.uid();
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>0 THEN RAISE EXCEPTION 'B deleted A follow'; END IF;
  RAISE NOTICE 'PASS B: reciprocal owner/other-user behavior';
END;
$reciprocal_tests$;
RESET ROLE;
SELECT 'PASS: role/claim checks complete; all synthetic fixtures are rolled back below' AS result;
ROLLBACK;
