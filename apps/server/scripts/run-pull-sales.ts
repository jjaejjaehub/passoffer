import Fastify from 'fastify';
import { eq } from 'drizzle-orm';
import { envPlugin } from '../src/plugins/env';
import { dbPlugin } from '../src/plugins/db';
import { listedProducts, masterProducts } from '../src/db/schema';
import { MasterProductService } from '../src/services/MasterProductService';

const app = Fastify({ logger: { level: 'info' } });
await app.register(envPlugin);
await app.register(dbPlugin);

const code = process.argv[2] ?? 'Q10-TEST-01';
const [mp] = await app.db.select().from(masterProducts).where(eq(masterProducts.code, code));
if (!mp) { console.error('no master'); process.exit(1); }
const [lp] = await app.db.select().from(listedProducts).where(eq(listedProducts.masterProductId, mp.id));
if (!lp) { console.error('no listed'); process.exit(1); }

console.log('listed product id:', lp.id, 'userId:', mp.userId);

const svc = new MasterProductService(app, mp.userId);
const result = await svc.pullSalesFromChannel(lp.id);
console.log('result:', JSON.stringify(result, null, 2));

await app.close();
process.exit(0);
