import {readFileSync,writeFileSync,existsSync} from 'node:fs';
const id=process.argv[2];
if(!id||!/^([0-9a-f]{8}-){1}[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)||id==='00000000-0000-4000-8000-000000000000'){
 console.error('Usage: node scripts/configure-cloudflare.mjs YOUR_REAL_D1_DATABASE_ID');process.exit(1);
}
if(!existsSync('dist/server/wrangler.json')){console.error('Run npm run build:worker first.');process.exit(1);}
const built=JSON.parse(readFileSync('dist/server/wrangler.json','utf8'));
const config={name:'campusslot',main:'index.js',compatibility_date:built.compatibility_date,compatibility_flags:built.compatibility_flags,no_bundle:true,rules:built.rules,assets:{directory:'../client'},workers_dev:true,d1_databases:[{binding:'DB',database_name:'campusslot-db',database_id:id,migrations_dir:'../../drizzle'}]};
writeFileSync('dist/server/wrangler.public.json',JSON.stringify(config,null,2)+'\n');
console.log('Created dist/server/wrangler.public.json with your D1 binding. This file is generated; rerun after rebuilding.');
