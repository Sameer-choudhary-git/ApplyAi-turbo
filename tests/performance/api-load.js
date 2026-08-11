import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "30s", target: 10 },
    { duration: "1m", target: 25 },
    { duration: "1m", target: 50 },
    { duration: "1m", target: 100 },
    { duration: "30s", target: 0 },
  ],

  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<1000"],
  },
};

const BASE_URL = __ENV.BASE_URL;
const TOKEN = __ENV.TEST_TOKEN;

export default function () {
  const response = http.get(
    `${BASE_URL}/api/applications`,
    {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
      },
    }
  );

  check(response, {
    "status is 200": (r) => r.status === 200,
  });

  sleep(1);
}