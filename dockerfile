FROM node:22
WORKDIR /workdir/next-app

COPY next-app/package*.json ./
RUN npm install
COPY next-app ./
EXPOSE 3000
CMD ["npm", "run", "dev"]