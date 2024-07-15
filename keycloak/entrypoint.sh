#!/bin/bash

echo "Starting keycloak service"
/opt/keycloak/bin/kc.sh start --optimized --spi-theme-static-max-age=-1 --spi-theme-cache-themes=false --spi-theme-cache-templates=false