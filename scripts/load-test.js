// Run only against your own staging environment: k6 run scripts/load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';
export const options = {
  scenarios: {
    catalogue: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 1000 },
        { duration: '5m', target: 10000 },
        { duration: '5m', target: 10000 },
        { duration: '1m', target: 0 },
      ],
    },
  },
  thresholds: { http_req_failed: ['rate<0.01'], http_req_duration: ['p(95)<500'] },
};
export default function () {
  const response = http.get(`${__ENV.BASE_URL || 'http://localhost:3000'}/api/catalog`);
  check(response, {
    'catalogue available': (r) => r.status === 200 && r.json('products').length > 0,
  });
  sleep(5 + Math.random() * 10);
}
