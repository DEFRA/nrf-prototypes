FROM node:20-slim

RUN npm install -g tileserver-gl-light

WORKDIR /data

EXPOSE 8080

CMD ["tileserver-gl-light", "--port", "8080"]
