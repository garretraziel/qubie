qubie
=====

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

Installation
------------
Install Node.js, Redis, PostgreSQL, leveldb and Bower. Run `npm install` and
`bower install`. Start Redis and PostgreSQL servers. See
configuration/configuration.js to find out how is qubie configured. Set
`AWS_REGION`, `AWS_SECRET_ACCESS_KEY` and `AWS_ACCESS_KEY_ID` to point to your
AWS instance.

Running
-------
Run with `node server.js` or `npm start`.

Tests
-----
For running tests, you have to install Mocha testing suite. To run tests, run
`mocha` in main directory.

Production
----------
To run qubie in production, you can use misc/qubie.service for running qubie as
a daemon with systemd. Recommended setting is using nginx as forward proxy for
qubie - see misc/nginx.conf. In `/etc/sysconfig/qubie` set
`NODE_ENV=production`, `SECRET_TOKEN` to some secret, `POSTGRES_URL` to URL of
your PostgreSQL instance, `REDIS_URL` to URL of your Redis instance,
`LEVEL_DB` to path to leveldb instance and finally, set appropriate `AWS`
variables. See misc/sysconfig_qubie_template.
