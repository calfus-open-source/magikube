FROM quay.io/keycloak/keycloak:latest as builder
 
ENV KC_HEALTH_ENABLED=true
ENV KC_METRICS_ENABLED=true
 
WORKDIR /opt/keycloak
# COPY --chown=keycloak:keycloak ./keycloak/themes/tradefull-connect /opt/keycloak/themes/tradefull-connect
COPY --chown=keycloak:keycloak ./entrypoint.sh /opt/keycloak/bin/entrypoint.sh
RUN chmod +x /opt/keycloak/bin/entrypoint.sh
 
# for demonstration purposes only, please make sure to use proper certificates in production instead
RUN keytool -genkeypair -storepass password -storetype PKCS12 -keyalg RSA -keysize 2048 -dname "CN=server" -alias server -ext "SAN:c=DNS:localhost,IP:127.0.0.1" -keystore conf/server.keystore
 
ENV KC_DB=postgres
RUN /opt/keycloak/bin/kc.sh build
 
FROM quay.io/keycloak/keycloak:latest
COPY --from=builder /opt/keycloak/ /opt/keycloak/
 
ENTRYPOINT ["/opt/keycloak/bin/entrypoint.sh"]