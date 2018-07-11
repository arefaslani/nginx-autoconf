# DEPRECATED: Closed in favor of [this comment](https://github.com/jwilder/nginx-proxy/issues/927#issuecomment-391334432)

# Nginx Autoconf (works with Swarm)
A docker container for automatically create nginx configuration files from a template inspired by [docker-gen](https://github.com/jwilder/docker-gen).

Nginx autoconf listens to Docker socket and regenerate conf files everytime a container starts or stops. It reloads all nginx containers after changing conf files automatically.

## Usage
### with docker compose
Create a compose file and add `nginx` and `arefaslani/nginx-autoconf` services. The `nginx` container must share `/etc/nginx/conf.d` directory. Because nginx-autoconf writes config files there. `nginx-autoconf` service mounts `/var/run/docker.sock` file so that it can listen to docker events and also nginx's `/etc/nginx/conf.d` directory.

Last thing to do is adding app service and add `app.virtual_host` and `app.virtual_port` labels to it.

```yaml
version: "3.1"

volumes:
  nginx-data:

services:
  nginx-autoconf:
    image: arefaslani/nginx-autoconf
    volumes:
      - nginx-data:/etc/nginx/conf.d
      - /var/run/docker.sock:/var/run/docker.sock

  nginx:
    image: nginx
    ports:
      - 80:80
    volumes:
      - nginx-data:/etc/nginx/conf.d

  app:
    image: arefaslani/docker-sample-express
    ports:
      - 3000:3000
    labels:
      - app.virtual_host=sample-express.test
      - app.virtual_port=3000
```

Nginx Autoconf will create a nginx conf file from the template and palces it in `/etc/nginx/conf.d` directory.

```nginx
upstream backend {
  server 10.0.0.2:3000 # ip will be fetched automatically
}

server {
  server_name sample-express.test;
  proxy_buffering off;

  location / {
    proxy_pass http://backend;
    proxy_set_header Host $http_host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # HTTP 1.1 support
    proxy_http_version 1.1;
    proxy_set_header Connection "";
  }
}
```

Add this line to your `/etc/hosts` file:
```bash
# IP must be the IP of docker host.
127.0.0.1 sample-express.test
```
Then run it with `docker-compose up` or
deploy your stack to the swarm by running
```bash
docker stack deploy --compose-file docker-compose.yml mystack
```
Thats all!

## HTTPS support
### Using LetsEncrypt
First of all you should create cert files and store them in a shared volume. Create a named volume

```bash
docker volume create nginx-certs
```

run `certbot` container and connect it to the `nginx-certs` volume to save certificate files there

```bash
docker run -it --rm -p 443:443 -p 80:80 -v nginx-certs:/etc/letsencrypt certbot/certbot certonly
```

and answer the questions

```bash
How would you like to authenticate with the ACME CA?
-------------------------------------------------------------------------------
1: Spin up a temporary webserver (standalone)
2: Place files in webroot directory (webroot)
-------------------------------------------------------------------------------
Select the appropriate number [1-2] then [enter] (press 'c' to cancel): 1

Plugins selected: Authenticator standalone, Installer None
Please enter in your domain name(s) (comma and/or space separated)  (Enter 'c' to cancel): your-public-domain.com
```

change your `docker-compose` file to support `https`:

```yaml
version: "3.1"

volumes:
  nginx-confs:
  nginx-certs:
    external: true

services:
  nginx-autoconf:
    image: arefaslani/nginx-autoconf
    volumes:
      - nginx-data:/etc/nginx/conf.d
      - /var/run/docker.sock:/var/run/docker.sock

  nginx:
    image: nginx
    ports:
      - 80:80
      - 443:443
    volumes:
      - nginx-confs:/etc/nginx/conf.d
      - nginx-certs:/etc/letsencrypt

  app:
    image: arefaslani/docker-sample-express
    ports:
      - 3000:3000
    labels:
      - app.virtual_host=sample-express.test
      - app.virtual_port=3000
      - app.https=true
```

## Custom templates
If you want to use custom templates instead of predefined templates, make another image on top of nginx-autoconf.

Create an nginx template file. For example `./path/to/your/templates/temp.conf`

```nginx
upstream api {
  {{upstreams}}
}

server {
  listen 80;
  server_name {{serverName}};

  location / {
    ...
  }
  ...
}
```

and a Dockerfile

```Dockerfile
FROM arefaslani/nginx-autoconf
COPY ./path/to/your/tamplates/folder /app/src/templates/custom
```

build your docker image

`docker build -t my-nginx-autoconf .`

and use that image in your compose file

```yaml
version: "3.1"

volumes:
  nginx-confs:
  nginx-certs:
    external: true

services:
  nginx-autoconf:
    image: you/my-nginx-autoconf
    volumes:
      - nginx-data:/etc/nginx/conf.d
      - /var/run/docker.sock:/var/run/docker.sock

  nginx:
    image: nginx
    ports:
      - 80:80
      - 443:443
    volumes:
      - nginx-confs:/etc/nginx/conf.d
      - nginx-certs:/etc/letsencrypt

  app:
    image: arefaslani/docker-sample-express
    ports:
      - 3000:3000
    labels:
      - app.virtual_host=sample-express.test
      - app.virtual_port=3000
      - app.template_name=test.conf
```

## Todo
* ~~Support custom templates for apps~~ (done)
* ~~Show how to setup https configuration with `Letsencrupt`~~ (done)
