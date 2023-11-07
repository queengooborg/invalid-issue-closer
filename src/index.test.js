import process from "node:process";
import cp from "node:child_process";
import path from "node:path";

// shows how the runner will run a javascript action with env / stdout protocol
test.skip("test runs", () => {
  // process.env["INPUT_MILLISECONDS"] = 500;
  const ip = path.join(__dirname, "index.js");
  console.log(cp.execSync(`node ${ip}`, { env: process.env }).toString());
});
