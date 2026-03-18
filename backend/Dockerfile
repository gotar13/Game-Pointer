FROM node:18-alpine

WORKDIR /app

# Csak a függőségeket másoljuk először (gyorsabb build)
COPY package*.json ./
RUN npm install --production

COPY . .

# Biztonsági okokból nem root felhasználóként futtatjuk
USER node

EXPOSE 3000
CMD ["node", "index.js"]