import { createClient } from '@base44/sdk';

const ids = ['6a06705273a0d647b565a73f', '6a13883dde526dee1105b467'];

for (const appId of ids) {
  console.log('\n---', appId, '---');
  const api = createClient({
    appId,
    serverUrl: 'https://base44.app',
    requiresAuth: false,
    appBaseUrl: '',
  });
  try {
    const services = await api.entities.Service.list('-created_date', 100);
    console.log('count:', services.length);
    console.log(JSON.stringify(services, null, 2));
  } catch (e) {
    console.error('error:', e.message);
    if (e.data) console.error(JSON.stringify(e.data));
  }
}
