#!/bin/bash

compose_file='.github/template/template-compose.yml'

checkUrl() {
    URL=$1

    set +e
    # Call the URL and get the HTTP status code
    HTTP_STATUS=$(curl -o /dev/null -s -w "%{http_code}\n" "$URL")

    set -e
    # Check if the HTTP status code is 200
    if [ "$HTTP_STATUS" -eq 200 ]; then
        echo "✅ $URL returned a 200 OK status"
        return 0
    else
        echo "🚨$URL returned a status of $HTTP_STATUS. Exiting with code 1"
        return 1
    fi
}

startPrototype() {
  set -e
  docker compose -f "$compose_file" up --wait --wait-timeout 60 -d --quiet-pull
  sleep 3
}

clearDown() {
    rv=$?
    echo "cleaning up $rv"
    docker compose -f "$compose_file" down
    exit $rv
}

trap clearDown EXIT

runTests() {
  echo "-- Running prototype template tests ---"

  checkUrl "http://localhost:8085"
}

startPrototype
runTests

