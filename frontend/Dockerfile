# Build Stage
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install

# Build static files
COPY . .
# You can override REACT_APP_BACKEND_URL at build time if needed
ARG REACT_APP_BACKEND_URL=http://localhost:8001
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL

RUN npm run build

# Serve Stage with Nginx
FROM nginx:alpine
# Copy built files to NGINX serve directory
COPY --from=builder /app/build /usr/share/nginx/html

# Copy a custom nginx configuration to handle React Router correctly (SPA routing)
RUN echo 'server { \
    listen 3000; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
