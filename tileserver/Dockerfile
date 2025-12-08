FROM node:20-slim

RUN npm install -g tileserver-gl-light

WORKDIR /data

EXPOSE 8080

CMD ["tileserver-gl-light", "--config", "config.json", "--port", "8080"]
