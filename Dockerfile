FROM centos:centos7
RUN rpm -Uvh http://download.fedoraproject.org/pub/epel/7/x86_64/e/epel-release-7-5.noarch.rpm
RUN yum install -y npm git
COPY . /src
RUN cd /src; npm install
ENV PATH /src/node_modules/.bin:$PATH
RUN cd /src; bower --allow-root install
ENV NODE_ENV production
EXPOSE 5102
CMD ["node", "/src/server.js"]