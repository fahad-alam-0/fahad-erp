import { createClient, User } from '@supabase/supabase-js';

// Server-side environment variables ONLY (NOT VITE_ PUBLIC VARS)
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vlljngfefkpxawymedcr.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.log('NOTICE: SUPABASE_SERVICE_ROLE_KEY is required for Phase 2 Auth Admin purge execution.');
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/**
 * Helper 1: Retrieve ALL Auth users using paginated calls to listUsers()
 */
async function listAllAuthUsers(): Promise<User[]> {
  const allUsers: User[] = [];
  let page = 1;
  const perPage = 50;

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw new Error(`Failed to list Auth users (page ${page}): ${error.message}`);
    }

    const users = data.users || [];
    allUsers.push(...users);

    if (users.length < perPage) {
      break; // Reached last page
    }
    page++;
  }

  return allUsers;
}

/**
 * Helper 2: Retrieve ALL storage objects using range pagination
 */
async function listAllStorageObjects(): Promise<{ id: string; name: string; bucket_id: string; owner_id: string | null }[]> {
  const allObjects: { id: string; name: string; bucket_id: string; owner_id: string | null }[] = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const { data, error } = await supabaseAdmin
      .schema('storage')
      .from('objects')
      .select('id, name, bucket_id, owner_id')
      .range(offset, offset + limit - 1);

    if (error) {
      // STOP IMMEDIATELY ON ERROR — DO NOT TREAT AS EMPTY OR PARTIAL RESULT
      throw new Error(
        `CRITICAL: Failed to retrieve storage objects at range ${offset}-${offset + limit - 1}: ${error.message}`
      );
    }

    const objects = data || [];
    allObjects.push(...objects);

    if (objects.length < limit) {
      break; // Reached last page
    }
    offset += limit;
  }

  return allObjects;
}

/**
 * Helper 3: Chunk array into batches of specified maximum size (<= 1000)
 */
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

export async function purgeTestAuthUsers() {
  console.log('🚀 Starting Phase 2: Server-Side Supabase Auth Admin Test-User Purge...');

  // Step 1: Retrieve ALL existing Auth Users via paginated Admin API calls
  const testUsers = await listAllAuthUsers();
  console.log(`PAGINATION AUDIT: Retrieved ${testUsers.length} total test Auth users.`);

  if (testUsers.length === 0) {
    console.log('No test Auth users found in system.');
    return;
  }

  const testUserIds = new Set(testUsers.map((u) => u.id));

  // Step 2: Paginated Storage Asset Audit & Chunked Removal via Official Storage API
  const allStorageObjects = await listAllStorageObjects();

  if (allStorageObjects.length > 0) {
    // Filter objects owned by test users using owner_id
    const testStorageObjects = allStorageObjects.filter(
      (obj) => obj.owner_id && testUserIds.has(obj.owner_id)
    );

    console.log(
      `STORAGE PAGINATION AUDIT: Retrieved ${allStorageObjects.length} total storage objects. ${testStorageObjects.length} objects belong to test users.`
    );

    if (testStorageObjects.length > 0) {
      // Group test-owned object paths by bucket_id
      const objectsByBucket: Record<string, string[]> = {};
      for (const obj of testStorageObjects) {
        if (!objectsByBucket[obj.bucket_id]) {
          objectsByBucket[obj.bucket_id] = [];
        }
        objectsByBucket[obj.bucket_id].push(obj.name);
      }

      // Delete storage objects via official Storage API .remove() in batches of max 1000
      for (const [bucketId, objectPaths] of Object.entries(objectsByBucket)) {
        const pathBatches = chunkArray(objectPaths, 1000);
        console.log(`Removing ${objectPaths.length} test storage files from bucket "${bucketId}" in ${pathBatches.length} batch(es) (<= 1000 items each)...`);

        for (let bIndex = 0; bIndex < pathBatches.length; bIndex++) {
          const batch = pathBatches[bIndex];
          console.log(`  Executing Storage API .remove() batch ${bIndex + 1}/${pathBatches.length} (${batch.length} files)...`);
          
          const { error: removeErr } = await supabaseAdmin.storage
            .from(bucketId)
            .remove(batch);

          if (removeErr) {
            // STOP IMMEDIATELY ON ERROR — DO NOT PROCEED TO AUTH DELETION
            throw new Error(
              `CRITICAL: Storage API removal failed for bucket "${bucketId}" batch ${bIndex + 1}: ${removeErr.message}`
            );
          }
        }
      }

      // Re-query storage.objects with range pagination to verify 0 test-owned objects remain
      const verifyStorageObjects = await listAllStorageObjects();
      const remainingTestObjects = verifyStorageObjects.filter(
        (obj) => obj.owner_id && testUserIds.has(obj.owner_id)
      );

      if (remainingTestObjects.length > 0) {
        throw new Error(
          `CRITICAL: Storage API cleanup verification failed. ${remainingTestObjects.length} test-owned storage objects still exist.`
        );
      }

      console.log('✅ Storage API cleanup verification passed: 0 test storage objects remain.');
    }
  }

  // Step 3: Delete each test user permanently & verify ON DELETE CASCADE
  for (const user of testUsers) {
    console.log(`Deleting Auth user: ${user.email} (${user.id})...`);

    // Permanent hard deletion (shouldSoftDelete: false)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id, false);
    if (deleteError) {
      // STOP IMMEDIATELY ON ERROR — DO NOT SWALLOW EXCEPTIONS
      throw new Error(`CRITICAL: Auth deletion failed for user ${user.id} (${user.email}): ${deleteError.message}`);
    }

    // Step 4: Strict ON DELETE CASCADE Integrity Check for public.profiles
    const { data: profileCheck, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', user.id);

    if (profileError) {
      throw new Error(`CRITICAL: Error querying profiles for deleted user ${user.id}: ${profileError.message}`);
    }

    // STRICT BEHAVIOR: Throw critical error if profile still exists instead of silently deleting
    if (profileCheck && profileCheck.length > 0) {
      throw new Error(
        `CRITICAL: Auth user ${user.id} (${user.email}) was deleted but corresponding public.profiles row still exists. ON DELETE CASCADE integrity check failed. Manual investigation required.`
      );
    }
  }

  // Step 5: Final verification of 0 remaining Auth Users across all pages
  const remainingUsers = await listAllAuthUsers();
  const remainingCount = remainingUsers.length;

  if (remainingCount !== 0) {
    throw new Error(`Verification failed: Expected 0 Auth users, but found ${remainingCount} remaining.`);
  }

  console.log('✅ Phase 2 complete: All test Auth users purged permanently. Auth user count = 0.');
}

if (process.argv[1]?.includes('purge-test-users')) {
  purgeTestAuthUsers().catch((err) => {
    console.error('❌ Phase 2 Auth Purge Failed:', err.message);
    process.exit(1);
  });
}
