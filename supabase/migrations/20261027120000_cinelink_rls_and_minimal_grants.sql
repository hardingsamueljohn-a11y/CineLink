-- CineLink access-control migration draft.
-- NOT APPLIED. Requires verified source metadata and an isolated test run first.
-- This migration does not alter Storage policies/buckets, app rows, or existing constraints.
-- It intentionally aborts if the audited schema has changed or required assumptions differ.
-- Before applying, confirm `private` is not an API-exposed schema in Dashboard settings.
-- CLI: let the migration runner own the transaction; do not embed BEGIN/COMMIT here.
-- Dashboard: never run this body bare or in selected fragments. Use the external
-- BEGIN/body/COMMIT envelope and non-production rehearsal in docs/security/12.

DO $preflight$
DECLARE
  requirement record;
  actual_type text;
  actual_oid oid;
  actual_typmod integer;
  compatible boolean;
  relation_name text;
  relation_oid oid;
  local_attnum smallint;
  referenced_attnum smallint;
  has_unique boolean;
BEGIN
  IF current_user <> 'postgres' THEN
    RAISE EXCEPTION 'Preflight failed: execute migrations as the Supabase postgres role';
  END IF;

  IF to_regprocedure('pg_catalog.gen_random_uuid()') IS NULL THEN
    RAISE EXCEPTION 'Preflight failed: pg_catalog.gen_random_uuid() is unavailable';
  END IF;

  IF to_regprocedure('private.create_profile_for_new_user()') IS NOT NULL THEN
    RAISE EXCEPTION 'Preflight failed: private.create_profile_for_new_user already exists';
  END IF;
  IF to_regnamespace('private') IS NOT NULL THEN
    RAISE EXCEPTION 'Preflight failed: private schema already exists; review its owner, objects, grants, and API exposure before using it';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'auth.users'::regclass
      AND tgname = 'on_auth_user_created_profile'
  ) THEN
    RAISE EXCEPTION 'Preflight failed: profile trigger name already exists on auth.users';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.profiles'::regclass
      AND NOT tgisinternal
      AND (tgtype::integer & 4) = 4
  ) THEN
    RAISE EXCEPTION 'Preflight failed: profiles already has an INSERT trigger; review it before adding Auth profile creation';
  END IF;

  FOR requirement IN
    SELECT * FROM (VALUES
      ('public', 'profiles'), ('public', 'movies'), ('public', 'reviews'),
      ('public', 'wishlists'), ('public', 'follows'), ('auth', 'users')
    ) AS expected(schema_name, table_name)
  LOOP
    relation_name := format('%I.%I', requirement.schema_name, requirement.table_name);
    relation_oid := to_regclass(relation_name);
    IF relation_oid IS NULL THEN
      RAISE EXCEPTION 'Preflight failed: required relation % is missing', relation_name;
    END IF;
    IF requirement.schema_name = 'public' AND (
      SELECT relkind <> 'r' OR relrowsecurity OR relforcerowsecurity
      FROM pg_class WHERE oid = relation_oid
    ) THEN
      RAISE EXCEPTION 'Preflight failed: % kind/RLS state differs from the audited state', relation_name;
    END IF;
  END LOOP;

  IF EXISTS (
    SELECT 1
    FROM pg_policy p
    WHERE p.polrelid IN (
      'public.profiles'::regclass, 'public.movies'::regclass,
      'public.reviews'::regclass, 'public.wishlists'::regclass,
      'public.follows'::regclass
    )
  ) THEN
    RAISE EXCEPTION 'Preflight failed: an app-table policy exists; review it instead of replacing it';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated')
     OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    RAISE EXCEPTION 'Preflight failed: Supabase API roles are missing';
  END IF;

  -- GRANT checks alone cannot detect a role that bypasses row policies.
  IF EXISTS (
    SELECT 1 FROM pg_roles r
    WHERE r.rolname IN ('anon', 'authenticated')
      AND (r.rolsuper OR r.rolbypassrls OR EXISTS (
        SELECT 1 FROM pg_class c
        WHERE c.oid IN (
          'public.profiles'::regclass, 'public.movies'::regclass,
          'public.reviews'::regclass, 'public.wishlists'::regclass,
          'public.follows'::regclass
        ) AND pg_has_role(r.oid, c.relowner, 'USAGE')
      ))
  ) THEN
    RAISE EXCEPTION 'Preflight failed: an API role bypasses RLS or inherits target-table ownership';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_class c CROSS JOIN pg_roles r
    WHERE c.oid = 'public.profiles'::regclass AND r.rolname = current_user
      AND (r.rolsuper OR r.rolbypassrls OR pg_has_role(r.oid, c.relowner, 'USAGE'))
  ) THEN
    RAISE EXCEPTION 'Preflight failed: profile trigger definer cannot bypass profiles RLS';
  END IF;

  FOR requirement IN
    SELECT * FROM (VALUES
      ('public','profiles','id','uuid'),
      ('public','profiles','username','text'),
      ('public','profiles','avatar_url','text'),
      ('public','profiles','bio','text'),
      ('public','movies','tmdb_id','integer'),
      ('public','movies','title','text'),
      ('public','movies','poster_path','text'),
      ('public','reviews','id','scalar'),
      ('public','reviews','user_id','uuid'),
      ('public','reviews','tmdb_id','integer'),
      ('public','reviews','rating','integer'),
      ('public','reviews','content','text'),
      ('public','reviews','is_spoiler','boolean'),
      ('public','reviews','created_at','timestamp'),
      ('public','wishlists','id','scalar'),
      ('public','wishlists','user_id','uuid'),
      ('public','wishlists','tmdb_id','integer'),
      ('public','wishlists','status','text'),
      ('public','wishlists','created_at','timestamp'),
      ('public','follows','follower_id','uuid'),
      ('public','follows','following_id','uuid'),
      ('public','follows','created_at','timestamp'),
      ('auth','users','id','uuid')
    ) AS expected(schema_name, table_name, column_name, type_family)
  LOOP
    relation_name := format('%I.%I', requirement.schema_name, requirement.table_name);
    relation_oid := to_regclass(relation_name);
    SELECT a.atttypid, a.atttypmod, a.atttypid::regtype::text
      INTO actual_oid, actual_typmod, actual_type
    FROM pg_attribute a
    WHERE a.attrelid = relation_oid
      AND a.attname = requirement.column_name
      AND a.attnum > 0 AND NOT a.attisdropped;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Preflight failed: required column %.% is missing', relation_name, requirement.column_name;
    END IF;

    compatible := CASE requirement.type_family
      WHEN 'uuid' THEN actual_oid = 'uuid'::regtype
      WHEN 'text' THEN actual_oid IN ('text'::regtype, 'character varying'::regtype, 'character'::regtype)
      WHEN 'integer' THEN actual_oid IN ('smallint'::regtype, 'integer'::regtype, 'bigint'::regtype)
      WHEN 'boolean' THEN actual_oid = 'boolean'::regtype
      WHEN 'timestamp' THEN actual_oid IN ('timestamp without time zone'::regtype, 'timestamp with time zone'::regtype)
      WHEN 'scalar' THEN actual_oid IN (
        'uuid'::regtype, 'smallint'::regtype, 'integer'::regtype, 'bigint'::regtype,
        'text'::regtype, 'character varying'::regtype
      )
      ELSE false
    END;
    IF NOT compatible THEN
      RAISE EXCEPTION 'Preflight failed: %.% has type %, which is outside the reviewed migration assumptions',
        relation_name, requirement.column_name, actual_type;
    END IF;

    IF requirement.schema_name = 'public'
       AND requirement.table_name = 'profiles'
       AND requirement.column_name = 'username'
       AND actual_oid IN ('character varying'::regtype, 'character'::regtype)
       AND actual_typmod <> -1 AND actual_typmod - 4 < 32 THEN
      RAISE EXCEPTION 'Preflight failed: profiles.username cannot hold the 32-character generated username';
    END IF;
  END LOOP;

  SELECT atttypid INTO actual_oid
  FROM pg_attribute WHERE attrelid = 'public.movies'::regclass AND attname = 'tmdb_id';
  IF EXISTS (
    SELECT 1
    FROM (VALUES ('reviews'), ('wishlists')) AS dependent(table_name)
    JOIN pg_class c ON c.oid = to_regclass(format('public.%I', dependent.table_name))
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attname = 'tmdb_id'
    WHERE a.atttypid <> actual_oid
  ) THEN
    RAISE EXCEPTION 'Preflight failed: TMDB ID column types do not match across movies, reviews, and wishlists';
  END IF;

  SELECT attnum INTO local_attnum
  FROM pg_attribute WHERE attrelid = 'public.profiles'::regclass AND attname = 'id';
  SELECT EXISTS (
    SELECT 1 FROM pg_index i
    WHERE i.indrelid = 'public.profiles'::regclass
      AND i.indisunique AND i.indisvalid AND i.indislive AND i.indimmediate
      AND i.indpred IS NULL AND i.indnkeyatts = 1 AND i.indkey[0] = local_attnum
  ) INTO has_unique;
  IF NOT has_unique THEN
    RAISE EXCEPTION 'Preflight failed: profiles.id must have a valid single-column unique index';
  END IF;

  SELECT attnum INTO local_attnum
  FROM pg_attribute WHERE attrelid = 'public.movies'::regclass AND attname = 'tmdb_id';
  SELECT EXISTS (
    SELECT 1 FROM pg_index i
    WHERE i.indrelid = 'public.movies'::regclass
      AND i.indisunique AND i.indisvalid AND i.indislive AND i.indimmediate
      AND i.indpred IS NULL AND i.indnkeyatts = 1 AND i.indkey[0] = local_attnum
  ) INTO has_unique;
  IF NOT has_unique THEN
    RAISE EXCEPTION 'Preflight failed: movies.tmdb_id must have a valid single-column unique index for conflict-safe upsert';
  END IF;

  FOR requirement IN
    SELECT * FROM (VALUES
      ('reviews','user_id','profiles','id',NULL::text),
      ('reviews','tmdb_id','movies','tmdb_id',NULL::text),
      ('wishlists','user_id','profiles','id',NULL::text),
      ('wishlists','tmdb_id','movies','tmdb_id',NULL::text),
      ('follows','follower_id','profiles','id','follows_follower_id_fkey'),
      ('follows','following_id','profiles','id','follows_following_id_fkey')
    ) AS expected(local_table, local_column, referenced_table, referenced_column, expected_name)
  LOOP
    SELECT attnum INTO local_attnum
    FROM pg_attribute
    WHERE attrelid = to_regclass(format('public.%I', requirement.local_table))
      AND attname = requirement.local_column;
    SELECT attnum INTO referenced_attnum
    FROM pg_attribute
    WHERE attrelid = to_regclass(format('public.%I', requirement.referenced_table))
      AND attname = requirement.referenced_column;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint f
      WHERE f.contype = 'f'
        AND f.conrelid = to_regclass(format('public.%I', requirement.local_table))
        AND f.confrelid = to_regclass(format('public.%I', requirement.referenced_table))
        AND f.conkey = ARRAY[local_attnum]::smallint[]
        AND f.confkey = ARRAY[referenced_attnum]::smallint[]
        AND f.convalidated
        AND (requirement.expected_name IS NULL OR f.conname = requirement.expected_name)
    ) THEN
      RAISE EXCEPTION 'Preflight failed: expected validated relationship %.% -> %.% is missing or differently named',
        requirement.local_table, requirement.local_column,
        requirement.referenced_table, requirement.referenced_column;
    END IF;
  END LOOP;

  -- The trigger and application inserts omit other fields; every omitted required
  -- field must therefore have a default, be generated/identity, or be nullable.
  IF EXISTS (
    WITH supplied(table_name, column_name) AS (VALUES
      ('profiles','id'), ('profiles','username'),
      ('movies','tmdb_id'), ('movies','title'), ('movies','poster_path'),
      ('reviews','user_id'), ('reviews','tmdb_id'), ('reviews','rating'),
      ('reviews','content'), ('reviews','is_spoiler'),
      ('wishlists','user_id'), ('wishlists','tmdb_id'), ('wishlists','status'),
      ('follows','follower_id'), ('follows','following_id')
    )
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
    LEFT JOIN pg_attrdef d ON d.adrelid = c.oid AND d.adnum = a.attnum
    WHERE n.nspname = 'public'
      AND c.relname IN ('profiles','movies','reviews','wishlists','follows')
      AND a.attnotnull AND a.attidentity = '' AND a.attgenerated = ''
      AND d.oid IS NULL
      AND NOT EXISTS (SELECT 1 FROM supplied s WHERE s.table_name = c.relname AND s.column_name = a.attname)
  ) THEN
    RAISE EXCEPTION 'Preflight failed: an omitted NOT NULL column has no default; review insert compatibility before proceeding';
  END IF;

  -- Avoid leaving an unowned nextval() default outside the sequence privilege cleanup below.
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
    JOIN pg_attrdef d ON d.adrelid = c.oid AND d.adnum = a.attnum
    WHERE n.nspname = 'public'
      AND c.relname IN ('profiles','movies','reviews','wishlists','follows')
      AND pg_get_expr(d.adbin, d.adrelid) LIKE 'nextval(%'
      AND pg_get_serial_sequence(format('%I.%I', n.nspname, c.relname), a.attname) IS NULL
  ) THEN
    RAISE EXCEPTION 'Preflight failed: an application sequence default is not owned by its column; review sequence grants first';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_attribute a
    WHERE a.attrelid = 'public.profiles'::regclass
      AND a.attname IN ('avatar_url','bio') AND a.attnotnull
      AND NOT EXISTS (SELECT 1 FROM pg_attrdef d WHERE d.adrelid = a.attrelid AND d.adnum = a.attnum)
  ) THEN
    RAISE EXCEPTION 'Preflight failed: profile trigger omits a required avatar_url/bio field without a default';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass AND contype = 'c'
  ) THEN
    RAISE EXCEPTION 'Preflight failed: profiles has CHECK constraints; review them against generated usernames before proceeding';
  END IF;
END;
$preflight$;

CREATE SCHEMA private;
REVOKE ALL PRIVILEGES ON SCHEMA private FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION private.create_profile_for_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  username_value text;
  attempt integer := 0;
BEGIN
  LOOP
    attempt := attempt + 1;
    username_value := replace(pg_catalog.gen_random_uuid()::text, '-', '');

    BEGIN
      INSERT INTO public.profiles (id, username)
      VALUES (NEW.id, username_value);
      RETURN NEW;
    EXCEPTION WHEN unique_violation THEN
      IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
        RETURN NEW;
      END IF;
      IF attempt >= 5 THEN
        RAISE;
      END IF;
    END;
  END LOOP;
END;
$function$;

REVOKE ALL PRIVILEGES ON FUNCTION private.create_profile_for_new_user()
  FROM PUBLIC, anon, authenticated, service_role;

CREATE TRIGGER on_auth_user_created_profile
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION private.create_profile_for_new_user();

-- Revoke table-wide and column-wide rights, including INSERT/UPDATE/DELETE,
-- TRUNCATE, REFERENCES, TRIGGER, and MAINTAIN where the PostgreSQL version has it.
REVOKE ALL PRIVILEGES ON TABLE
  public.profiles, public.movies, public.reviews, public.wishlists, public.follows
  FROM PUBLIC, anon, authenticated;

DO $privileges$
DECLARE
  relation_record record;
  column_record record;
  sequence_record record;
BEGIN
  FOR relation_record IN
    SELECT c.oid, n.nspname, c.relname
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN ('profiles','movies','reviews','wishlists','follows')
  LOOP
    FOR column_record IN
      SELECT attname FROM pg_attribute
      WHERE attrelid = relation_record.oid AND attnum > 0 AND NOT attisdropped
    LOOP
      EXECUTE format(
        'REVOKE ALL PRIVILEGES (%I) ON TABLE %I.%I FROM PUBLIC, anon, authenticated',
        column_record.attname, relation_record.nspname, relation_record.relname
      );
    END LOOP;
  END LOOP;

  FOR sequence_record IN
    SELECT DISTINCT seq.oid, ns.nspname, seq.relname,
           tbl.relname AS owning_table, owned_column.attname AS owning_column
    FROM pg_class seq
    JOIN pg_namespace ns ON ns.oid = seq.relnamespace
    JOIN pg_depend d ON d.classid = 'pg_class'::regclass AND d.objid = seq.oid
    JOIN pg_class tbl ON tbl.oid = d.refobjid
    JOIN pg_namespace tn ON tn.oid = tbl.relnamespace
    JOIN pg_attribute owned_column
      ON owned_column.attrelid = tbl.oid AND owned_column.attnum = d.refobjsubid
    WHERE seq.relkind = 'S' AND d.refclassid = 'pg_class'::regclass
      AND d.deptype IN ('a','i')
      AND tn.nspname = 'public'
      AND tbl.relname IN ('profiles','movies','reviews','wishlists','follows')
  LOOP
    EXECUTE format('REVOKE ALL PRIVILEGES ON SEQUENCE %I.%I FROM PUBLIC, anon, authenticated',
      sequence_record.nspname, sequence_record.relname);
    IF sequence_record.owning_table IN ('reviews','wishlists','follows')
       AND sequence_record.owning_column = 'id' THEN
      EXECUTE format('GRANT USAGE ON SEQUENCE %I.%I TO authenticated',
        sequence_record.nspname, sequence_record.relname);
    END IF;
  END LOOP;
END;
$privileges$;

REVOKE CREATE ON SCHEMA public FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Column-level SELECT keeps unexpected/private columns out of the Data API.
GRANT SELECT (tmdb_id, title, poster_path) ON TABLE public.movies TO anon, authenticated;
GRANT SELECT (id, username, avatar_url, bio) ON TABLE public.profiles TO authenticated;
GRANT SELECT (id, user_id, tmdb_id, rating, content, is_spoiler, created_at)
  ON TABLE public.reviews TO authenticated;
GRANT SELECT (id, user_id, tmdb_id, status, created_at)
  ON TABLE public.wishlists TO authenticated;
GRANT SELECT (follower_id, following_id, created_at)
  ON TABLE public.follows TO authenticated;

-- User writes are limited to the columns used by current actions.
GRANT UPDATE (username, avatar_url, bio) ON TABLE public.profiles TO authenticated;

GRANT INSERT (user_id, tmdb_id, rating, content, is_spoiler)
  ON TABLE public.reviews TO authenticated;
GRANT UPDATE (rating, content, is_spoiler) ON TABLE public.reviews TO authenticated;
GRANT DELETE ON TABLE public.reviews TO authenticated;

GRANT INSERT (user_id, tmdb_id, status) ON TABLE public.wishlists TO authenticated;
GRANT UPDATE (status) ON TABLE public.wishlists TO authenticated;
GRANT DELETE ON TABLE public.wishlists TO authenticated;

GRANT INSERT (follower_id, following_id) ON TABLE public.follows TO authenticated;
GRANT DELETE ON TABLE public.follows TO authenticated;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_read_authenticated
  ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY profiles_update_owner
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY movies_read_public
  ON public.movies FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY reviews_read_authenticated
  ON public.reviews FOR SELECT TO authenticated USING (true);
CREATE POLICY reviews_insert_owner
  ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY reviews_update_owner
  ON public.reviews FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY reviews_delete_owner
  ON public.reviews FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY wishlists_read_authenticated
  ON public.wishlists FOR SELECT TO authenticated USING (true);
CREATE POLICY wishlists_insert_owner
  ON public.wishlists FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY wishlists_update_owner
  ON public.wishlists FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY wishlists_delete_owner
  ON public.wishlists FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY follows_read_authenticated
  ON public.follows FOR SELECT TO authenticated USING (true);
CREATE POLICY follows_insert_follower
  ON public.follows FOR INSERT TO authenticated
  WITH CHECK (follower_id = (SELECT auth.uid()));
CREATE POLICY follows_delete_follower
  ON public.follows FOR DELETE TO authenticated
  USING (follower_id = (SELECT auth.uid()));

DO $postflight$
DECLARE
  relation_record record;
  column_record record;
  subject_role text;
  requested_privilege text;
  expected_privilege boolean;
  effective_privilege boolean;
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    WHERE c.oid IN (
      'public.profiles'::regclass, 'public.movies'::regclass,
      'public.reviews'::regclass, 'public.wishlists'::regclass,
      'public.follows'::regclass
    ) AND NOT c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'Postflight failed: RLS is not enabled on every target table';
  END IF;

  IF (SELECT count(*) FROM pg_policy p WHERE p.polrelid IN (
      'public.profiles'::regclass, 'public.movies'::regclass,
      'public.reviews'::regclass, 'public.wishlists'::regclass,
      'public.follows'::regclass
  )) <> 14 THEN
    RAISE EXCEPTION 'Postflight failed: target policy count differs from the expected 14';
  END IF;

  FOREACH subject_role IN ARRAY ARRAY['public','anon','authenticated'] LOOP
    FOREACH requested_privilege IN ARRAY ARRAY['TRUNCATE','TRIGGER','REFERENCES'] LOOP
      FOR relation_record IN
        SELECT c.oid, n.nspname, c.relname
        FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relname IN ('profiles','movies','reviews','wishlists','follows')
      LOOP
        IF has_table_privilege(subject_role, relation_record.oid, requested_privilege) THEN
          RAISE EXCEPTION 'Postflight failed: % retains % on %.%',
            subject_role, requested_privilege, relation_record.nspname, relation_record.relname;
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;

  IF current_setting('server_version_num')::integer >= 170000 THEN
    FOREACH subject_role IN ARRAY ARRAY['public','anon','authenticated'] LOOP
      FOR relation_record IN
        SELECT c.oid, n.nspname, c.relname
        FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relname IN ('profiles','movies','reviews','wishlists','follows')
      LOOP
        IF has_table_privilege(subject_role, relation_record.oid, 'MAINTAIN') THEN
          RAISE EXCEPTION 'Postflight failed: % retains MAINTAIN on %.%',
            subject_role, relation_record.nspname, relation_record.relname;
        END IF;
      END LOOP;
    END LOOP;
  END IF;

  -- Confirm every column privilege exactly matches the reviewed least-privilege matrix.
  FOR relation_record IN
    SELECT c.oid, n.nspname, c.relname, a.attname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
    WHERE n.nspname = 'public'
      AND c.relname IN ('profiles','movies','reviews','wishlists','follows')
  LOOP
    FOREACH subject_role IN ARRAY ARRAY['public','anon','authenticated'] LOOP
      FOREACH requested_privilege IN ARRAY ARRAY['SELECT','INSERT','UPDATE','REFERENCES'] LOOP
        SELECT EXISTS (
          SELECT 1 FROM (VALUES
            ('movies','anon','tmdb_id','SELECT'), ('movies','anon','title','SELECT'), ('movies','anon','poster_path','SELECT'),
            ('movies','authenticated','tmdb_id','SELECT'), ('movies','authenticated','title','SELECT'), ('movies','authenticated','poster_path','SELECT'),
            ('profiles','authenticated','id','SELECT'), ('profiles','authenticated','username','SELECT'), ('profiles','authenticated','avatar_url','SELECT'), ('profiles','authenticated','bio','SELECT'),
            ('profiles','authenticated','username','UPDATE'), ('profiles','authenticated','avatar_url','UPDATE'), ('profiles','authenticated','bio','UPDATE'),
            ('reviews','authenticated','id','SELECT'), ('reviews','authenticated','user_id','SELECT'), ('reviews','authenticated','tmdb_id','SELECT'), ('reviews','authenticated','rating','SELECT'), ('reviews','authenticated','content','SELECT'), ('reviews','authenticated','is_spoiler','SELECT'), ('reviews','authenticated','created_at','SELECT'),
            ('reviews','authenticated','user_id','INSERT'), ('reviews','authenticated','tmdb_id','INSERT'), ('reviews','authenticated','rating','INSERT'), ('reviews','authenticated','content','INSERT'), ('reviews','authenticated','is_spoiler','INSERT'),
            ('reviews','authenticated','rating','UPDATE'), ('reviews','authenticated','content','UPDATE'), ('reviews','authenticated','is_spoiler','UPDATE'),
            ('wishlists','authenticated','id','SELECT'), ('wishlists','authenticated','user_id','SELECT'), ('wishlists','authenticated','tmdb_id','SELECT'), ('wishlists','authenticated','status','SELECT'), ('wishlists','authenticated','created_at','SELECT'),
            ('wishlists','authenticated','user_id','INSERT'), ('wishlists','authenticated','tmdb_id','INSERT'), ('wishlists','authenticated','status','INSERT'),
            ('wishlists','authenticated','status','UPDATE'),
            ('follows','authenticated','follower_id','SELECT'), ('follows','authenticated','following_id','SELECT'), ('follows','authenticated','created_at','SELECT'),
            ('follows','authenticated','follower_id','INSERT'), ('follows','authenticated','following_id','INSERT')
          ) AS allowed(table_name, grantee_name, column_name, acl_privilege)
          WHERE allowed.table_name = relation_record.relname
            AND allowed.grantee_name = subject_role
            AND allowed.column_name = relation_record.attname
            AND allowed.acl_privilege = requested_privilege
        ) INTO expected_privilege;

        IF subject_role = 'public' THEN
          effective_privilege := has_column_privilege('public', relation_record.oid, relation_record.attname, requested_privilege);
        ELSE
          effective_privilege := has_column_privilege(subject_role, relation_record.oid, relation_record.attname, requested_privilege);
        END IF;

        IF effective_privilege IS DISTINCT FROM expected_privilege THEN
          RAISE EXCEPTION 'Postflight failed: unexpected % privilege for % on %.%.%',
            requested_privilege, subject_role, relation_record.nspname, relation_record.relname, relation_record.attname;
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;

  -- DELETE is the one table-wide write grant used by current server actions.
  FOR relation_record IN
    SELECT c.oid, n.nspname, c.relname
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN ('profiles','movies','reviews','wishlists','follows')
  LOOP
    FOREACH subject_role IN ARRAY ARRAY['public','anon','authenticated'] LOOP
      expected_privilege := subject_role = 'authenticated'
        AND relation_record.relname IN ('reviews','wishlists','follows');
      effective_privilege := has_table_privilege(subject_role, relation_record.oid, 'DELETE');
      IF effective_privilege IS DISTINCT FROM expected_privilege THEN
        RAISE EXCEPTION 'Postflight failed: unexpected DELETE privilege for % on %.%',
          subject_role, relation_record.nspname, relation_record.relname;
      END IF;
    END LOOP;
  END LOOP;

  FOREACH subject_role IN ARRAY ARRAY['public','anon','authenticated'] LOOP
    IF has_schema_privilege(subject_role, 'public', 'CREATE') THEN
      RAISE EXCEPTION 'Postflight failed: % retains CREATE on schema public', subject_role;
    END IF;
  END LOOP;

  FOREACH subject_role IN ARRAY ARRAY['public','anon','authenticated','service_role'] LOOP
    IF has_schema_privilege(subject_role, 'private', 'USAGE')
       OR has_schema_privilege(subject_role, 'private', 'CREATE') THEN
      RAISE EXCEPTION 'Postflight failed: % can access or create objects in the private schema', subject_role;
    END IF;
  END LOOP;

  FOR relation_record IN
    SELECT DISTINCT seq.oid, ns.nspname, seq.relname,
           tbl.relname AS owning_table, owned_column.attname AS owning_column
    FROM pg_class seq
    JOIN pg_namespace ns ON ns.oid = seq.relnamespace
    JOIN pg_depend d ON d.classid = 'pg_class'::regclass AND d.objid = seq.oid
    JOIN pg_class tbl ON tbl.oid = d.refobjid
    JOIN pg_namespace tn ON tn.oid = tbl.relnamespace
    JOIN pg_attribute owned_column
      ON owned_column.attrelid = tbl.oid AND owned_column.attnum = d.refobjsubid
    WHERE seq.relkind = 'S' AND d.refclassid = 'pg_class'::regclass
      AND d.deptype IN ('a','i') AND tn.nspname = 'public'
      AND tbl.relname IN ('profiles','movies','reviews','wishlists','follows')
  LOOP
    FOREACH subject_role IN ARRAY ARRAY['public','anon','authenticated'] LOOP
      FOREACH requested_privilege IN ARRAY ARRAY['USAGE','SELECT','UPDATE'] LOOP
        expected_privilege := subject_role = 'authenticated'
          AND requested_privilege = 'USAGE'
          AND relation_record.owning_table IN ('reviews','wishlists','follows')
          AND relation_record.owning_column = 'id';
        effective_privilege := has_sequence_privilege(
          subject_role, relation_record.oid, requested_privilege
        );
        IF effective_privilege IS DISTINCT FROM expected_privilege THEN
          RAISE EXCEPTION 'Postflight failed: unexpected % sequence privilege for % on %.%',
            requested_privilege, subject_role, relation_record.nspname, relation_record.relname;
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;

  IF has_function_privilege('public', 'private.create_profile_for_new_user()', 'EXECUTE')
     OR has_function_privilege('anon', 'private.create_profile_for_new_user()', 'EXECUTE')
     OR has_function_privilege('authenticated', 'private.create_profile_for_new_user()', 'EXECUTE') THEN
    RAISE EXCEPTION 'Postflight failed: trigger function is directly executable by an API role';
  END IF;

  IF NOT has_column_privilege(current_user, 'public.profiles', 'id', 'INSERT')
     OR NOT has_column_privilege(current_user, 'public.profiles', 'username', 'INSERT')
     OR NOT has_column_privilege(current_user, 'public.profiles', 'id', 'SELECT') THEN
    RAISE EXCEPTION 'Postflight failed: trigger definer lacks required profiles privileges after revocation';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    WHERE p.oid = 'private.create_profile_for_new_user()'::regprocedure
      AND p.prosecdef AND p.proowner = current_user::regrole
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    WHERE t.tgrelid = 'auth.users'::regclass
      AND t.tgname = 'on_auth_user_created_profile'
      AND t.tgfoid = 'private.create_profile_for_new_user()'::regprocedure
      AND NOT t.tgisinternal AND t.tgenabled = 'O' AND t.tgtype = 5
  ) THEN
    RAISE EXCEPTION 'Postflight failed: expected SECURITY DEFINER function or active Auth INSERT trigger is missing';
  END IF;
END;
$postflight$;
