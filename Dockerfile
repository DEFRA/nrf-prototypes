ARG PARENT_VERSION=2.8.5-node22.16.0
ARG PORT=3000

FROM defradigital/node-development:${PARENT_VERSION} AS development
ARG PARENT_VERSION
LABEL uk.gov.defra.ffc.parent-image=defradigital/node-development:${PARENT_VERSION}

ARG PORT
ENV PORT=${PORT}

COPY --chown=node:node package*.json ./
RUN npm install
COPY --chown=node:node ./app ./app

CMD [ "npm", "run", "dev" ]

FROM defradigital/node:${PARENT_VERSION} AS production
ARG PARENT_VERSION
LABEL uk.gov.defra.ffc.parent-image=defradigital/node:${PARENT_VERSION}

# Add curl to template.
# CDP platform healthcheck requirement
USER root
RUN apk add --no-cache curl
USER node

# CDP takes care of https in the nginx layer, so we don't need to force https in the app
ENV USE_HTTPS=false
ENV NODE_ENV=production

COPY --from=development /home/node/package*.json ./
COPY --from=development /home/node/app ./app/

RUN npm ci --omit=dev

ARG PORT
ENV PORT=${PORT}
EXPOSE ${PORT}

CMD [ "npm", "start" ]
