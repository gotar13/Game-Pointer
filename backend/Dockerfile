FROM node:lts-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force
COPY server.js ./
COPY models ./models
EXPOSE 3000
CMD ["npm", "start"]