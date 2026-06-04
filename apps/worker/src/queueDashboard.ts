import express from "express";

import { Queue } from "bullmq";

import { connection } from "@applyai/queue";

import { createBullBoard } from "@bull-board/api";

import { BullMQAdapter }
  from "@bull-board/api/bullMQAdapter";

import { ExpressAdapter }
  from "@bull-board/express";

const queue = new Queue("apply", {
  connection,
});

const serverAdapter =
  new ExpressAdapter();

serverAdapter.setBasePath(
  "/admin/queues"
);

createBullBoard({
  queues: [
    new BullMQAdapter(queue),
  ],
  serverAdapter,
});

const app = express();

app.use(
  "/admin/queues",
  serverAdapter.getRouter()
);

app.listen(4000, () => {
  console.log(
    "Bull Board → http://localhost:4000/admin/queues"
  );
});