const fs = require("fs");
const path = require("path");
const Mustache = require("mustache");
const { inspect } = require("util");

let templateName = "template.conf";

function parseParams(config) {
  upstreamServers = config.ips.map(ip => {
    if (config.port) {
      return `server ${ip}:${config.port};\n  `
    } else {
      return `server ${ip};\n  `
    }
  });
  return {
    upstreams: upstreamServers.join('').trim(),
    serverName: config.serverName
  };
}

module.exports = {
  updateConfig(config) {
    if (config.https === 'true') {
      templateName = "ssl_template.conf";
    }

    console.log(`Using template ${templateName}`);

    const template = fs.readFileSync(
      path.resolve(__dirname, templateName),
      { encoding: "utf8" }
    );

    nginxConf = Mustache.render(template, parseParams(config));
    fs.writeFileSync(`/etc/nginx/conf.d/${config.serverName}.conf`, nginxConf);
  }
}
