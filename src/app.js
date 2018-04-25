const Docker = require("dockerode");
const JSONStream = require("JSONStream");
const util = require("util");
const fs = require("fs");
const path = require("path");
const _ = require("lodash");

const updateConfig = require("./configUpdater").updateConfig;
const nginx = require("./nginx");

const docker = new Docker();

async function findVirtualHosts() {
  // filter containers containing `app.virtual_host` label
  const containers = await docker.listContainers({
    filters: '{"label": ["app.virtual_host"]}'
  });
  const virtualHosts = containers.map(container => {
    // find first networkName
    let networkName;
    for (networkName in container.NetworkSettings.Networks) break;

    return {
      virtualHost: container.Labels["app.virtual_host"],
      virtualPort: container.Labels["app.virtual_port"],
      https: container.Labels["app.https"],
      ip: container.NetworkSettings.Networks[networkName].IPAddress
    };
  });

  return virtualHosts;
}

async function groupVirtualHostsByServerName(virtualHosts) {
  // create config object as: `{ servername: 'foo.test', ips: [192.168.99.100] }`
  const data = _.chain(virtualHosts)
    .groupBy("virtualHost")
    .toPairs()
    .map(item => {
      i = _.clone(item);
      i[0] = item[0];
      i[1] = item[1][0].virtualPort;
      i[2] = item[1][0].https;
      i[3] = item[1].map(currentItem => currentItem.ip);
      return _.zipObject(["serverName", "port", "https", "ips"], i);
    })
    .value();

  return data;
}

async function handleEvent(event) {
  if (
    !(
      event.Type === "container" &&
      ["stop", "start", "restart", "create", "destroy"].includes(event.Action)
    )
  ) {
    return false;
  }
  console.log(`Container ${event.Action}: ${event.Actor.ID}`);
  await handleContainersChanges();
}

async function sendEventStream() {
  const eventStream = await docker.getEvents();
  eventStream
    .pipe(JSONStream.parse())
    .on("data", event => handleEvent(event))
    .on("error", e => console.log(`Error: ${util.inspect(e)}`));
}

async function main() {
  handleContainersChanges();
  await sendEventStream();
}

async function handleContainersChanges() {
  const virtualHosts = await findVirtualHosts();
  const data = await groupVirtualHostsByServerName(virtualHosts);
  data.map(conf => updateConfig(conf));
  await nginx.reload(docker);
}

main();
