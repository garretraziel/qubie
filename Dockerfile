FROM debian:wheezy
RUN apt-get update -y && apt-get install curl -y && curl -sL https://deb.nodesource.com/setup | bash -
RUN apt-get install -y nodejs git-core build-essential openssl lsb-release python-all g++
RUN mkdir -p /srv/qubie/ /var/log/qubie
COPY . /src
RUN cd /src; npm install
ENV PATH /src/node_modules/.bin:$PATH
RUN cd /src; bower --allow-root install
ENV NODE_ENV docker_production
EXPOSE 5102
CMD ["node", "/src/server.js"]
