import {
  createSign,
  generateKeyPairSync,
  randomUUID
} from 'node:crypto'
import { createServer } from 'node:http'

const port = Number(process.env.PORT || 3100)
const issuer = process.env.OIDC_MOCK_ISSUER_URL || `http://localhost:${port}`
const tenantId = process.env.AZURE_TENANT_ID
const clientId = process.env.AZURE_CLIENT_ID
const clientSecret = process.env.AZURE_CLIENT_SECRET
const apiClientId = process.env.AZURE_API_CLIENT_ID
const keyId = 'journey-tests'
const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048
})
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: keyId, alg: 'RS256', use: 'sig' }

const json = (response, status, body) => {
  response.writeHead(status, { 'content-type': 'application/json' })
  response.end(JSON.stringify(body))
}

function accessToken() {
  const now = Math.floor(Date.now() / 1000)
  const header = Buffer.from(
    JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: keyId })
  ).toString('base64url')
  const claims = Buffer.from(
    JSON.stringify({
      iss: issuer,
      sub: clientId,
      aud: apiClientId,
      exp: now + 3600,
      iat: now,
      nbf: now,
      tid: tenantId,
      azp: clientId,
      azpacr: '1',
      idtyp: 'app',
      oid: clientId,
      ver: '2.0',
      uti: randomUUID()
    })
  ).toString('base64url')
  const unsigned = `${header}.${claims}`
  const signature = createSign('RSA-SHA256')
    .update(unsigned)
    .end()
    .sign(privateKey)
    .toString('base64url')

  return `${unsigned}.${signature}`
}

const server = createServer(async (request, response) => {
  if (request.method === 'GET' && request.url === '/health') {
    response.writeHead(200)
    response.end('ok')
    return
  }

  if (request.method === 'GET' && request.url === '/jwks') {
    json(response, 200, { keys: [jwk] })
    return
  }

  if (
    request.method === 'GET' &&
    request.url === '/.well-known/openid-configuration'
  ) {
    json(response, 200, {
      issuer,
      authorization_endpoint: `${issuer}/authorize`,
      token_endpoint: `${issuer}/token`,
      jwks_uri: `${issuer}/jwks`,
      response_types_supported: ['code'],
      grant_types_supported: ['client_credentials'],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['RS256'],
      token_endpoint_auth_methods_supported: [
        'client_secret_post',
        'client_secret_basic'
      ]
    })
    return
  }

  if (request.method === 'POST' && request.url === '/token') {
    let body = ''
    for await (const chunk of request) {
      body += chunk
      if (body.length > 8192) {
        json(response, 413, { error: 'invalid_request' })
        return
      }
    }

    const form = new URLSearchParams(body)
    const basic = request.headers.authorization?.match(/^Basic (.+)$/)
    const [basicClientId, basicSecret] = basic
      ? Buffer.from(basic[1], 'base64').toString().split(':')
      : []
    const presentedClientId = basicClientId || form.get('client_id')
    const presentedSecret = basicSecret || form.get('client_secret')

    if (
      form.get('grant_type') !== 'client_credentials' ||
      presentedClientId !== clientId ||
      presentedSecret !== clientSecret ||
      form.get('scope') !== `api://${apiClientId}/.default`
    ) {
      json(response, 401, { error: 'invalid_client' })
      return
    }

    json(response, 200, {
      access_token: accessToken(),
      token_type: 'Bearer',
      expires_in: 3600,
      scope: form.get('scope')
    })
    return
  }

  json(response, 404, { error: 'not_found' })
})

server.listen(port, '0.0.0.0')
