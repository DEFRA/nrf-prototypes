FROM node:20-slim

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
RUN npm install -g tileserver-gl-light

WORKDIR /data

EXPOSE 8080

CMD ["tileserver-gl-light", "--config", "config.json", "--port", "8080"]
