import express from "express";

const app = express();
const port = Number(process.env.APP_PORT || 3000);

app.get("/", (_req, res) => {
  res.json({
    ok: true,
    service: process.env.SERVICE_NAME || "template-project",
    port
  });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`listening on ${port}`);
});
