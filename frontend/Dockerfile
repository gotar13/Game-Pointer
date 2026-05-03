FROM node:lts-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps && npm cache clean --force
COPY public ./public
COPY src ./src
EXPOSE 3000
CMD ["npm", "start"]