qubie
=====

[![Build Status](https://magnum.travis-ci.com/garretraziel/qubie.svg?token=5QVoyJUFv7JDsLhsxyrx&branch=master)](https://magnum.travis-ci.com/garretraziel/qubie)

Web app for controlling presentations using smartphones and tablets.

Requirements
------------
- Node.js
- PostreSQL
- Redis
- LevelDB
- enabled WebSockets
- AWS S3 instance
- (hopefully) libreoffice with headless plugin for converting ppt -> pdf
- Docker (if you want to use it)

Installation
------------
Install Node.js, Redis, PostgreSQL, leveldb and Bower. Run `npm install` and
`bower install`. Start Redis and PostgreSQL servers. See
configuration/configuration.js to find out how is qubie configured. Set
`AWS_REGION`, `AWS_SECRET_ACCESS_KEY` and `AWS_ACCESS_KEY_ID` to point to your
AWS instance.

Running
-------
Run with `node server.js` or `npm start`. First registered user becomes admin.

Tests
-----
For running tests, you have to install Mocha testing suite. To run tests, run
`mocha` in main directory.

Production
----------
To run qubie in production, you can use misc/qubie.service for running qubie as
a daemon with systemd. Recommended setting is using nginx as forward proxy for
qubie - see misc/nginx.conf. In `/etc/sysconfig/qubie` set
`NODE_ENV=production`, `SECRET_TOKEN` to some secret string, `POSTGRES_USER`,
`POSTGRES_PASSWORD`, `POSTGRES_SERVER` and `POSTRGRES_DB` to user in PostgreSQL,
his password, hostname/address of PostgreSQL server and name of database used,
`REDIS_URI` to URL of your Redis instance, `LEVEL_DB` to path to leveldb instance
`LINK_URL` to URL of your server and finally, set appropriate `AWS`
variables. See misc/sysconfig_qubie_template.

Docker
------
To run qubie as a Docker container, install docker, then:

    docker build -t username/qubie .

to build Docker image from Dockerfile, then install redis and postgres using:

    docker pull redis
    docker pull postgres

next, run redis and postgres with:

    docker run --name db -e "POSTGRES_USER=username" \
     -e "POSTGRES_PASSWORD=password" -d postgres

and

    docker run --name memdb -d redis

and then run qubie with:

    docker run --name qubie --link db:db --link memdb:memdb -e \
     "SECRET_TOKEN=secret" -e "POSTGRES_USER=username" -e \
     "POSTGRES_PASSWORD=password" -e "AWS_ACCESS_KEY_ID=key" -e \
     "AWS_SECRET_ACCESS_KEY=secret" -e "AWS_REGION=region" -d -p 5102:5102 \
     username/qubie

(hopefully we will find better way how to set environment variables)

You will have to use nginx as a forward proxy. There is no clean way of how to
add environment variables into nginx config, so you have to use nginx from system.
qubie will be running on `https://localhost:443`.

If you want to run qubie via docker locally without nginx (not suitable for
production!), run:

    docker run --name qubie --link db:db --link memdb:memdb -e \
     "SECRET_TOKEN=secret" -e "POSTGRES_USER=username" -e \
     "POSTGRES_PASSWORD=password" -e "AWS_ACCESS_KEY_ID=key" -e \
     "AWS_SECRET_ACCESS_KEY=secret" -e "AWS_REGION=region" -e \
     "NODE_ENV=development" -d -p 8080:8080 \
     username/qubie

And then access qubie via `https://localhost:8080`.
