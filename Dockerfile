FROM centos:centos7
MAINTAINER Jan Sedlak <admin@getqubie.com>
RUN rpm -Uvh http://download.fedoraproject.org/pub/epel/7/x86_64/e/epel-release-7-5.noarch.rpm && yum install -y node npm git make && mkdir -p /srv/qubie/ /var/log/qubie
COPY . /src
WORKDIR /src
RUN npm install
ENV PATH /src/node_modules/.bin:$PATH
RUN bower --allow-root install
ENV NODE_ENV docker_production
EXPOSE 5102
CMD ["npm", "start"]
