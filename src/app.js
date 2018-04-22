const Docker = require("dockerode");
const JSONStream = require("JSONStream");
const util = require("util");
const fs = require("fs");
const find = require('lodash').find

const DOCKER_CERT_PATH = "/Users/admin/.docker/machine/machines/node1";

// const docker = new Docker({ socketPath: "/var/run/docker.sock" });
const docker = new Docker({
  protocol: "https",
  host: "192.168.99.100",
  port: 2376,
  ca: fs.readFileSync(DOCKER_CERT_PATH + "/ca.pem"),
  cert: fs.readFileSync(DOCKER_CERT_PATH + "/cert.pem"),
  key: fs.readFileSync(DOCKER_CERT_PATH + "/key.pem")
});

async function handleEvent(event) {
  let upstreams = {};
  if (event.Type == 'container') {
    if (['start', 'stop'].includes(event.Action)) {
      const container = docker.getContainer(event.Actor.ID);
      const inspect = await container.inspect();
      let envKeys = [];
      const envKeyValues = inspect.Config.Env.map(v => {
        const [key, value] = v.split('=');
        envKeys.push(key);
        return { key, value };
      });

      if (envKeys.includes('VIRTUAL_HOST')) {
        const res = find(envKeyValues, o => {
          return o.key === 'VIRTUAL_HOST'
        });

        for(let networkName in inspect.NetworkSettings.Networks) {
          upstreams[res.value] = inspect.NetworkSettings.Networks[networkName].IPAddress;
          break;
        }
      }
      console.log(util.inspect(upstreams, false, null));
    }
  }
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
