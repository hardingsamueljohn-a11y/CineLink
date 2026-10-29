-- Storage-only migration draft. NOT APPLIED to any database.
-- Keep the public avatars bucket and "Allow public view 1oj01fe_0" unchanged.
-- A single DO statement makes the policy replacement atomic, including when
-- executed by a migration runner that already owns the transaction.
-- Re-running replaces avatars_insert_owner with the same reviewed definition.
DO $avatars_policies$
BEGIN
  DROP POLICY IF EXISTS "Allow authenticated updates 1oj01fe_0"
    ON storage.objects;
  DROP POLICY IF EXISTS "Allow authenticated updates 1oj01fe_1"
    ON storage.objects;
  DROP POLICY IF EXISTS "Allow authenticated uploads 1oj01fe_0"
    ON storage.objects;

  DROP POLICY IF EXISTS avatars_insert_owner ON storage.objects;
  CREATE POLICY avatars_insert_owner
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'avatars'
      AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
    );
END;
$avatars_policies$;

-- No UPDATE or DELETE policy is added. Overwriting an existing object (upsert)
-- requires UPDATE permission and is not enabled by this INSERT-only policy.
-- Other policies are not modified; review any additional permissive policies
-- separately, as they can also authorize operations on storage.objects.
