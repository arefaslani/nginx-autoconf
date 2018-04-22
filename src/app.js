const Docker = require("dockerode");
const JSONStream = require("JSONStream");
const util = require("util");
const fs = require("fs");
const path = require("path");

const DOCKER_CERT_PATH = "/Users/admin/.docker/machine/machines/node1";
const DOCKER_HOST = "192.168.99.100";
const DOCKER_PORT = 2376;

// const docker = new Docker({ socketPath: "/var/run/docker.sock" });
const docker = new Docker({
  protocol: "https",
  host: DOCKER_HOST,
  port: DOCKER_PORT,
  ca: fs.readFileSync(path.resolve(DOCKER_CERT_PATH, "ca.pem")),
  cert: fs.readFileSync(path.resolve(DOCKER_CERT_PATH, "cert.pem")),
  key: fs.readFileSync(path.resolve(DOCKER_CERT_PATH, "key.pem"))
});

async function handleEvent(event) {
  // filter containers containing `app.virtual_host` label
  const containers = await docker.listContainers({"filters": "{\"label\": [\"app.virtual_host\"]}" });
  const virtualHosts = containers.map(container => {
    // find first networkName
    let networkName;
    for(networkName in container.NetworkSettings.Networks) break;

    return { virtualHost: container.Labels['app.virtual_host'],
             ip: container.NetworkSettings.Networks[networkName].IPAddress };
  })
  console.log(`Containers ${util.inspect(virtualHosts, false, null)}`);
}

async function sendEventStream() {
  const eventStream = await docker.getEvents();
  eventStream
    .pipe(JSONStream.parse())
    .on("data", event => handleEvent(event))
    .on("error", e => console.log(`Error: ${util.inspect(e)}`));
}

async function main() {
  await sendEventStream();
}

main();
