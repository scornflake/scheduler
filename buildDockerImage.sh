#!/bin/bash
docker build -t scornflake/scheduler-client:latest -f Dockerfile  .
docker tag scornflake/scheduler-client:latest registry.shinywhitebox.com/scheduler-client:latest
docker push registry.shinywhitebox.com/scheduler-client:latest