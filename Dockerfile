FROM node:0.12
MAINTAINER Jan Sedlak <admin@getqubie.com>
RUN mkdir -p /srv/qubie/ /var/log/qubie
COPY . /src
WORKDIR /src
RUN npm install
ENV PATH /src/node_modules/.bin:$PATH
RUN bower --allow-root install

ENV NODE_ENV production
ENV POSTGRES_SERVER db
ENV POSTGRES_DB postgres
ENV REDIS_URI redis://memdb:6379
ENV LEVEL_DB /srv/qubie/level.db
ENV LINK_URL https://www.getqubie.com

EXPOSE 5102
CMD ["npm", "start"]
