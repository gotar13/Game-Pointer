# 1. fázis: Build
FROM node:18-alpine AS build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# 2. fázis: Produkciós kiszolgálás
FROM nginx:stable-alpine
# Kimásoljuk a buildelt fájlokat az Nginx könyvtárába
COPY --from=build-stage /app/dist /usr/share/nginx/html
# Saját Nginx konfig (opcionális, de ajánlott a router miatt)
# COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]