import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: '.env.development' });
dotenv.config({ path: '.env' });

const tables = [
  'sw_ref_element_types',
  'sw_ref_responsibility_roles',
  'sw_ref_development_kinds',
  'sw_ref_document_kinds',
  'sw_ref_statuses',
  'sw_ref_status_applicability',
  'sw_structure_elements',
  'sw_structure_responsibles',
  'sw_items',
  'sw_documents',
  'sw_files',
  'sw_item_patents',
];

const expectedIndexes = [
  'sw_items_designation_uidx',
  'sw_documents_designation_uidx',
  'sw_documents_kind_seq_uidx',
  'sw_files_object_file_uidx',
  'sw_structure_elements_parent_code_uidx',
  'sw_structure_elements_root_code_uidx',
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log('NO_DATABASE_URL');
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: url });
  await client.connect();

  const existing = await client.query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = ANY($1::text[])`,
    [tables],
  );
  const found = new Set(existing.rows.map((r) => r.tablename));

  console.log('=== TABLES ===');
  for (const t of tables) {
    console.log(`${found.has(t) ? 'OK' : 'MISSING'}\t${t}`);
  }

  const seedChecks: Array<{ label: string; sql: string; expected: number }> = [
    { label: 'element_types', sql: 'SELECT count(*)::int AS c FROM sw_ref_element_types', expected: 5 },
    { label: 'responsibility_roles', sql: 'SELECT count(*)::int AS c FROM sw_ref_responsibility_roles', expected: 3 },
    { label: 'development_kinds', sql: 'SELECT count(*)::int AS c FROM sw_ref_development_kinds', expected: 3 },
    { label: 'document_kinds', sql: 'SELECT count(*)::int AS c FROM sw_ref_document_kinds', expected: 11 },
    { label: 'statuses', sql: 'SELECT count(*)::int AS c FROM sw_ref_statuses', expected: 11 },
    { label: 'status_applicability', sql: 'SELECT count(*)::int AS c FROM sw_ref_status_applicability', expected: 18 },
  ];

  console.log('\n=== SEED DATA ===');
  for (const check of seedChecks) {
    if (!found.has(check.label.split('_')[0] === 'element' ? 'sw_ref_element_types' : '')) {
      // skip if base table missing - handled per query
    }
    try {
      const r = await client.query<{ c: number }>(check.sql);
      const c = r.rows[0]?.c ?? -1;
      const ok = c === check.expected ? 'OK' : c >= check.expected ? 'WARN' : 'FAIL';
      console.log(`${ok}\t${check.label}\t${c} (expected ${check.expected})`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`ERR\t${check.label}\t${msg}`);
    }
  }

  console.log('\n=== RBAC SECTIONS (sw-registry-rbac.sql) ===');
  try {
    const r = await client.query<{ c: number }>(
      `SELECT count(*)::int AS c FROM sections WHERE code = 'sw' OR code LIKE 'sw.%'`,
    );
    console.log(`sections\t${r.rows[0]?.c ?? 0} (expected 5)`);
  } catch (err) {
    console.log(`sections\tERR ${err instanceof Error ? err.message : err}`);
  }

  console.log('\n=== KEY INDEXES ===');
  const idx = await client.query<{ indexname: string }>(
    `SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname = ANY($1::text[])`,
    [expectedIndexes],
  );
  const idxFound = new Set(idx.rows.map((r) => r.indexname));
  for (const name of expectedIndexes) {
    console.log(`${idxFound.has(name) ? 'OK' : 'MISSING'}\t${name}`);
  }

  await client.end();
}

main().catch((err) => {
  console.error('DB_FAIL', err instanceof Error ? err.message : err);
  process.exit(2);
});
