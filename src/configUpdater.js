const fs = require("fs");
const path = require("path");
const Mustache = require("mustache");

const template = fs.readFileSync(path.resolve(__dirname, 'template.conf'), { encoding: 'utf8' });

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
    nginxConf = Mustache.render(template, parseParams(config));
    fs.writeFileSync(`/etc/nginx/conf.d/${config.serverName}.conf`, nginxConf);
  }
}
