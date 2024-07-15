#!/bin/bash
 
## These are environment variables used for local development environment
## To setup keycloak in higher environments, you can use the same script with different values
export KEYCLOAK_BASEURL=http://localhost:8080
export KEYCLOAK_USER=admin
export KEYCLOAK_PASSWORD=admin
export REALM_NAME=magikube
export REDIRECT_URL=http://localhost
export CLIENT_SECRET=huj4HGoM2vJRkqU3nmH3yyscgMv9qVLF
 
# Function to extract token from response
extract_token() {
    local response="$1"
    local token=$(echo "$response" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
    echo "$token"
}
 
# First curl command to obtain token
token_response=$(curl -k --silent --show-error --request POST \
--url "${KEYCLOAK_BASEURL}/realms/master/protocol/openid-connect/token" \
--header "Content-Type: application/x-www-form-urlencoded" \
--data "client_id=admin-cli&grant_type=password&username=${KEYCLOAK_USER}&password=${KEYCLOAK_PASSWORD}")
 
# Extract token from response
token=$(extract_token "$token_response")
 
REALM_PAYLOAD=$(node -pe "
  JSON.stringify({
    realm: '${REALM_NAME}',
    displayName: '${REALM_NAME}',
    enabled: true,
    accessTokenLifespan: 86400,
    ssoSessionIdleTimeout: 172800,
    ssoSessionMaxLifespan: 172800,
    registrationEmailAsUsername: true,
    verifyEmail: true,
    loginWithEmailAllowed: true,
    duplicateEmailsAllowed: false,
    resetPasswordAllowed: true,
    browserSecurityHeaders: {
      contentSecurityPolicy: \"frame-src 'self' www.youtube.com; frame-ancestors 'self'; object-src 'none';\",
    },    
  });
")
 
# Second curl command to create realm
curl -k --silent --show-error --request POST \
--url "${KEYCLOAK_BASEURL}/admin/realms" \
--header "Content-Type: application/json" \
--header "Authorization: Bearer ${token}" \
--data "${REALM_PAYLOAD}"
 
# curl -k --silent --show-error --request GET \
# --url "${KEYCLOAK_BASEURL}/admin/realms" \
# --header "Content-Type: application/json" \
# --header "Authorization: Bearer ${token}"
 
# Third curl command to create client
CLIENT_PAYLOAD=$(node -pe "
  JSON.stringify({
    clientId: '${REALM_NAME}-client',
    name: '${REALM_NAME}-client',
    description: 'Client for ${REALM_NAME} realm',
    surrogateAuthRequired: false,
    enabled: true,
    redirectUris: ['${REDIRECT_URL}/callback'],
    webOrigins: ['${REDIRECT_URL}'],
    clientAuthenticatorType: 'client-secret',
    secret: '${CLIENT_SECRET}',
    protocol: 'openid-connect',
    bearerOnly: false,
    frontchannelLogout: true,
    standardFlowEnabled: true,
    implicitFlowEnabled: false,
    directAccessGrantsEnabled: true,
    serviceAccountsEnabled: false,
    fullScopeAllowed: true,
    rootUrl: '${REDIRECT_URL}',
    baseUrl: '${REDIRECT_URL}',
    adminUrl: '${REDIRECT_URL}',
    publicClient: true,
    frontchannelLogout: true,
    attributes: {
      'oidc.ciba.grant.enabled': false,
      'backchannel.logout.session.required': true,
      'login_theme': 'tradefull-connect',
      'oauth2.device.authorization.grant.enabled': true,
      'display.on.consent.screen': false,
      'backchannel.logout.revoke.offline.tokens': false
    },
    authenticationFlowBindingOverrides: {},
    fullScopeAllowed: true,
    });
")
 
##Third curl command to create client
curl -k --silent --show-error --request POST \
--url "${KEYCLOAK_BASEURL}/admin/realms/${REALM_NAME}/clients" \
--header "Content-Type: application/json" \
--header "Authorization: Bearer ${token}" \
--data-raw "$CLIENT_PAYLOAD"
 
# Fourth curl command to create user
emails=('frances@example.com' 'taylor@example.com' 'ben@example.com' 'zachary@example.com' 'lily@example.com' 'rosea@example.com' 'daisyb@example.com' 'johng@example.com')
first=('Frances' 'Taylor' 'Ben' 'Zachary' 'Lily' 'Rose' 'Daisy' 'John')
last=('Liam' 'Schindler' 'Stokes' 'Swenson' 'Gomez' 'Anderson' 'Brandon' 'Gates')
 
for i in {0..7}
do
  USER_PAYLOAD=$(node -pe "
    JSON.stringify({
      username: '${emails[i]}',
      email: '${emails[i]}',
      enabled: true,
      emailVerified: true,
      firstName: '${first[i]}',
      lastName: '${last[i]}',
      credentials: [{
        type: 'password',
        value: 'welcome',
      }],
    });
  ")
 
  curl -k --silent --show-error --request POST \
  --url "${KEYCLOAK_BASEURL}/admin/realms/${REALM_NAME}/users" \
  --header "Content-Type: application/json" \
  --header "Authorization: Bearer ${token}" \
  --data-raw "$USER_PAYLOAD"
done
 
#setup admin client
ADMIN_CLI_CLIENT_ID=`curl -k --silent --show-error --request GET \
--url "${KEYCLOAK_BASEURL}/admin/realms/${REALM_NAME}/clients?clientId=admin-cli" \
--header "Content-Type: application/json" \
--header "Authorization: Bearer ${token}" | jq '.[0].id'`
 
#remove quotes
ADMIN_CLI_CLIENT_ID=$(echo $ADMIN_CLI_CLIENT_ID | tr -d '"')
echo $ADMIN_CLI_CLIENT_ID
 
CLIENT_PAYLOAD=$(node -pe "
  JSON.stringify({
    secret: '${CLIENT_SECRET}',
    publicClient: false,
    standardFlowEnabled: true,
    serviceAccountsEnabled: true,
    attributes: {
      'oidc.ciba.grant.enabled': false,
      'backchannel.logout.session.required': true,
      'oauth2.device.authorization.grant.enabled': true,
      'display.on.consent.screen': false,
      'backchannel.logout.revoke.offline.tokens': false
    }
    });
")
 
curl -k --silent --show-error --request PUT \
--url "${KEYCLOAK_BASEURL}/admin/realms/${REALM_NAME}/clients/${ADMIN_CLI_CLIENT_ID}" \
--header "Content-Type: application/json" \
--header "Authorization: Bearer ${token}" \
--data-raw "$CLIENT_PAYLOAD"
 
 
 
SERVICE_ACCOUNT_ID=`curl -k --silent --show-error --request GET \
--url "${KEYCLOAK_BASEURL}/admin/realms/${REALM_NAME}/users?username=service-account-admin-cli" \
--header "Content-Type: application/json" \
--header "Authorization: Bearer ${token}" | jq '.[0].id' | tr -d '"'`
 
 
  # Retrieve the Role ID
REALM_MANAGEMENT=`curl -k --silent --show-error --request GET \
--url "${KEYCLOAK_BASEURL}/admin/realms/${REALM_NAME}/clients?clientId=realm-management" \
--header "Content-Type: application/json" \
--header "Authorization: Bearer ${token}" | jq '.[0].id' | tr -d '"'`
 
 
ROLE_ID=`curl -k --silent --show-error --request GET \
--url "${KEYCLOAK_BASEURL}/admin/realms/${REALM_NAME}/clients/${REALM_MANAGEMENT}/roles?search=manage-users" \
--header "Content-Type: application/json" \
--header "Authorization: Bearer ${token}" | jq '.[0].id' | tr -d '"'`
 
# Assign the role to the service account
curl -k --silent --show-error --request POST \
--url "${KEYCLOAK_BASEURL}/admin/realms/${REALM_NAME}/users/${SERVICE_ACCOUNT_ID}/role-mappings/clients/${REALM_MANAGEMENT}" \
--header "Content-Type: application/json" \
--header "Authorization: Bearer ${token}" \
--data-raw "[{\"id\":\"${ROLE_ID}\",\"name\":\"manage-users\"}]"