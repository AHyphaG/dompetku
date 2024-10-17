FROM node:22.9.0

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 5500

# CMD ["npm", "start"]
CMD ["npm", "run", "dev"]